from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta
import hashlib
import jwt
import requests
import stripe
from dotenv import load_dotenv
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager

# -------------------------------------------------
# Environment & basic config
# -------------------------------------------------
load_dotenv()

app = FastAPI(title="Voxify API", version="2.0.0")

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))

WHISPER_API_URL = os.getenv("WHISPER_API_URL", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
DATABASE_URL = os.getenv("DATABASE_URL")

# Stripe Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Stripe Price IDs (create these in your Stripe Dashboard)
STRIPE_PRICES = {
    "starter": os.getenv("STRIPE_STARTER_PRICE_ID"),
    "pro": os.getenv("STRIPE_PRO_PRICE_ID"),
    "enterprise": os.getenv("STRIPE_ENTERPRISE_PRICE_ID"),
}

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Pricing tiers (in minutes)
TIER_LIMITS: Dict[str, int] = {
    "free": int(os.getenv("TIER_FREE_LIMIT", 15)),
    "starter": int(os.getenv("TIER_STARTER_LIMIT", 300)),
    "pro": int(os.getenv("TIER_PRO_LIMIT", 1000)),
    "enterprise": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000)),
}

# Supported languages for Whisper
SUPPORTED_LANGUAGES = {
    "auto": "Auto-detect",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
    "ms": "Malay",
    "fil": "Filipino",
    "uk": "Ukrainian",
    "cs": "Czech",
    "ro": "Romanian",
    "hu": "Hungarian",
    "el": "Greek",
    "he": "Hebrew",
    "sv": "Swedish",
    "da": "Danish",
    "fi": "Finnish",
    "no": "Norwegian",
}

# -------------------------------------------------
# Database pool
# -------------------------------------------------
db_pool: Optional[SimpleConnectionPool] = None


@app.on_event("startup")
def startup_event():
    global db_pool
    if not DATABASE_URL:
        print("⚠️ DATABASE_URL is not set - running in memory mode")
        return

    db_pool = SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=DATABASE_URL,
        sslmode="require" if "sslmode" not in DATABASE_URL else None,
    )
    print("✅ Database pool created successfully")

    # Ensure tables exist
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            # Add stripe columns if they don't exist
            cur.execute("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='users' AND column_name='stripe_customer_id') THEN
                        ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='users' AND column_name='stripe_subscription_id') THEN
                        ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='users' AND column_name='subscription_status') THEN
                        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive';
                    END IF;
                END $$;
            """)
    print("✅ Database tables ready")


@app.on_event("shutdown")
def shutdown_event():
    global db_pool
    if db_pool:
        db_pool.closeall()


@contextmanager
def get_db_conn():
    if db_pool is None:
        raise RuntimeError("Database pool is not initialized")
    conn = db_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        db_pool.putconn(conn)


# -------------------------------------------------
# Pydantic models
# -------------------------------------------------
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class CheckoutRequest(BaseModel):
    tier: str


# -------------------------------------------------
# Helper functions
# -------------------------------------------------
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def optional_verify_token(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def transcribe_with_whisper(audio_bytes: bytes, filename: str, language: str = "auto") -> dict:
    """
    Transcribe using self-hosted Whisper API with language selection
    """
    if not WHISPER_API_URL:
        return {
            "transcription": "⚠️ Whisper API not configured",
            "language": "unknown",
            "success": False
        }
    
    try:
        files = {"file": (filename, audio_bytes, "audio/mpeg")}
        data = {}
        
        # Only send language if not auto-detect
        if language and language != "auto":
            data["language"] = language
        
        response = requests.post(
            WHISPER_API_URL, 
            files=files, 
            data=data,
            timeout=120
        )

        if response.status_code == 200:
            result = response.json()
            return {
                "transcription": result.get("transcription", ""),
                "language": result.get("language", language if language != "auto" else "detected"),
                "success": True
            }
        elif response.status_code == 503:
            return {
                "transcription": "⚠️ Whisper service is starting up. Please try again in 20-30 seconds.",
                "language": "unknown",
                "success": False
            }
        else:
            return {
                "transcription": f"⚠️ Service error. Status: {response.status_code}",
                "language": "unknown",
                "success": False
            }

    except requests.exceptions.Timeout:
        return {
            "transcription": "⚠️ Transcription timed out. Try a shorter audio file.",
            "language": "unknown",
            "success": False
        }
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return {
            "transcription": "⚠️ Transcription failed. Please try again.",
            "language": "unknown",
            "success": False
        }


# -------------------------------------------------
# DB helper functions
# -------------------------------------------------
def db_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, email, password_hash, tier,
                       usage_minutes, transcription_count, stripe_customer_id,
                       stripe_subscription_id, subscription_status,
                       created_at, updated_at
                FROM users WHERE email = %s
                """,
                (email,),
            )
            row = cur.fetchone()

    if not row:
        return None

    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "password_hash": row[3],
        "tier": row[4],
        "usage_minutes": row[5],
        "transcription_count": row[6],
        "stripe_customer_id": row[7],
        "stripe_subscription_id": row[8],
        "subscription_status": row[9],
        "created_at": row[10],
        "updated_at": row[11],
    }


def db_create_user(username: str, email: str, password_hash: str) -> Dict[str, Any]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, tier, usage_minutes, transcription_count)
                VALUES (%s, %s, %s, %s, 0, 0)
                RETURNING id, username, email, tier, usage_minutes, transcription_count
                """,
                (username, email, password_hash, "free"),
            )
            row = cur.fetchone()

    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "tier": row[3],
        "usage_minutes": row[4],
        "transcription_count": row[5],
    }


def db_update_user_usage(email: str, minutes_delta: int) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET usage_minutes = usage_minutes + %s,
                    transcription_count = transcription_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (minutes_delta, email),
            )


def db_insert_transcription(user_email: str, filename: str, transcription: str, duration: int, language: str = "auto") -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            # Get user id
            cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
            row = cur.fetchone()
            if not row:
                return
            user_id = row[0]
            
            cur.execute(
                """
                INSERT INTO transcriptions (user_id, filename, transcription, duration, language)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, filename, transcription, duration, language),
            )


def db_update_stripe_customer(email: str, customer_id: str) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users SET stripe_customer_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (customer_id, email),
            )


def db_update_subscription(email: str, subscription_id: str, tier: str, status: str) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users 
                SET stripe_subscription_id = %s, 
                    tier = %s, 
                    subscription_status = %s,
                    usage_minutes = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (subscription_id, tier, status, email),
            )


def db_cancel_subscription(customer_id: str) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users 
                SET tier = 'free', 
                    subscription_status = 'cancelled',
                    stripe_subscription_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE stripe_customer_id = %s
                """,
                (customer_id,),
            )


def db_get_user_stats(email: str) -> Dict[str, Any]:
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limit = TIER_LIMITS.get(user["tier"], TIER_LIMITS["free"])
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_minutes": user["usage_minutes"],
        "transcription_count": user["transcription_count"],
        "limit": tier_limit,
        "remaining": tier_limit - user["usage_minutes"],
        "subscription_status": user.get("subscription_status", "inactive"),
    }


def db_get_transcription_history(email: str, limit: int = 10):
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            if not row:
                return {"history": [], "total": 0}
            user_id = row[0]

            cur.execute(
                """
                SELECT id, filename, transcription, duration, language, created_at
                FROM transcriptions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()

    history = [
        {
            "id": r[0],
            "filename": r[1],
            "transcription": r[2],
            "duration": r[3],
            "language": r[4] or "auto",
            "timestamp": r[5].isoformat() if r[5] else None,
        }
        for r in rows
    ]
    return {"history": history, "total": len(history)}


# -------------------------------------------------
# Routes
# -------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Voxify API",
        "version": "2.0.0",
        "stripe_configured": bool(stripe.api_key),
        "whisper_configured": bool(WHISPER_API_URL),
    }


@app.get("/api/languages")
async def get_languages():
    """Get list of supported languages for transcription"""
    return {
        "languages": SUPPORTED_LANGUAGES,
        "default": "auto"
    }


@app.get("/api/whisper/health")
async def check_whisper_health():
    try:
        health_url = WHISPER_API_URL.replace("/transcribe", "/health")
        response = requests.get(health_url, timeout=5)
        return {
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "whisper_api": "online" if response.status_code == 200 else "offline",
        }
    except Exception:
        return {"status": "unhealthy", "whisper_api": "unreachable"}


# -------- Auth --------
@app.post("/auth/signup")
async def signup(user: UserCreate):
    if db_pool:
        existing = db_get_user_by_email(user.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        password_hash = hash_password(user.password)
        created_user = db_create_user(user.username, user.email, password_hash)
        token = create_access_token({"email": created_user["email"]})
        
        return {
            "message": "User created successfully",
            "token": token,
            "user": {
                "email": created_user["email"],
                "username": created_user["username"],
                "tier": created_user["tier"],
                "usage_minutes": created_user["usage_minutes"],
                "transcription_count": created_user["transcription_count"],
            },
        }
    else:
        raise HTTPException(status_code=500, detail="Database not configured")


@app.post("/auth/login")
async def login(credentials: UserLogin):
    if db_pool:
        user = db_get_user_by_email(credentials.email)
        if not user or not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_access_token({"email": user["email"]})
        
        return {
            "message": "Login successful",
            "token": token,
            "user": {
                "email": user["email"],
                "username": user["username"],
                "tier": user["tier"],
                "usage_minutes": user["usage_minutes"],
                "transcription_count": user["transcription_count"],
            },
        }
    else:
        raise HTTPException(status_code=500, detail="Database not configured")


# -------- Transcription with Language Support --------
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
    user_data: Optional[dict] = Depends(optional_verify_token),
):
    """
    Transcribe audio file with optional language selection.
    - language: Language code (e.g., 'en', 'es', 'fr') or 'auto' for auto-detection
    """
    # Validate language
    if language not in SUPPORTED_LANGUAGES:
        language = "auto"
    
    # Guest mode
    if not user_data:
        try:
            audio_bytes = await file.read()
            result = transcribe_with_whisper(audio_bytes, file.filename, language)
            
            return {
                "success": result["success"],
                "transcription": result["transcription"],
                "language": result["language"],
                "duration": 2,
                "filename": file.filename,
                "usage": {"used": 0, "limit": 3, "remaining": 3},
                "guest": True,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Authenticated mode
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user["tier"]
    tier_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    estimated_duration = 2

    if user["usage_minutes"] + estimated_duration > tier_limit:
        raise HTTPException(
            status_code=403,
            detail="Usage limit reached. Please upgrade your plan.",
        )

    try:
        audio_bytes = await file.read()
        result = transcribe_with_whisper(audio_bytes, file.filename, language)

        # Update usage
        db_update_user_usage(email, estimated_duration)

        # Store transcription with language
        db_insert_transcription(
            user_email=email,
            filename=file.filename,
            transcription=result["transcription"],
            duration=estimated_duration,
            language=result["language"],
        )

        updated_user = db_get_user_by_email(email)

        return {
            "success": result["success"],
            "transcription": result["transcription"],
            "language": result["language"],
            "duration": estimated_duration,
            "filename": file.filename,
            "usage": {
                "used": updated_user["usage_minutes"],
                "limit": tier_limit,
                "remaining": tier_limit - updated_user["usage_minutes"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------- Stripe Payment Endpoints --------
@app.post("/api/create-checkout-session")
async def create_checkout_session(
    request: CheckoutRequest,
    user_data: dict = Depends(verify_token)
):
    """Create Stripe Checkout session for subscription"""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    tier = request.tier
    if tier not in STRIPE_PRICES or tier == "free":
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    price_id = STRIPE_PRICES[tier]
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for {tier}")
    
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Get or create Stripe customer
        customer_id = user.get("stripe_customer_id")
        
        if not customer_id:
            customer = stripe.Customer.create(
                email=email,
                name=user["username"],
                metadata={"user_email": email}
            )
            customer_id = customer.id
            db_update_stripe_customer(email, customer_id)
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1
            }],
            mode="subscription",
            success_url=f"{FRONTEND_URL}?payment=success&tier={tier}",
            cancel_url=f"{FRONTEND_URL}?payment=cancelled",
            metadata={
                "user_email": email,
                "tier": tier
            }
        )
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for subscription events"""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle subscription events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_email = session["metadata"].get("user_email")
        tier = session["metadata"].get("tier")
        subscription_id = session.get("subscription")
        
        if user_email and tier:
            db_update_subscription(user_email, subscription_id, tier, "active")
            print(f"✅ User {user_email} upgraded to {tier}")
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        status = subscription["status"]
        customer_id = subscription["customer"]
        
        # Update subscription status
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET subscription_status = %s WHERE stripe_customer_id = %s",
                    (status, customer_id)
                )
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        db_cancel_subscription(customer_id)
        print(f"⚠️ Subscription cancelled for customer {customer_id}")
    
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]
        
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = %s",
                    (customer_id,)
                )
        print(f"⚠️ Payment failed for customer {customer_id}")
    
    return {"status": "success"}


@app.post("/api/cancel-subscription")
async def cancel_subscription(user_data: dict = Depends(verify_token)):
    """Cancel user's subscription at end of billing period"""
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription_id = user.get("stripe_subscription_id")
    if not subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    
    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        return {"message": "Subscription will be cancelled at end of billing period"}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/billing-portal")
async def get_billing_portal(user_data: dict = Depends(verify_token)):
    """Get Stripe Customer Portal URL for managing subscription"""
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=FRONTEND_URL
        )
        return {"portal_url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------- User Stats & History --------
@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_user_stats(email)


@app.get("/api/transcriptions/history")
async def get_transcription_history(
    limit: int = 10, 
    user_data: dict = Depends(verify_token)
):
    email = user_data.get("email")
    return db_get_transcription_history(email, limit=limit)


# -------------------------------------------------
# Run server
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("🚀 Voxify API v2.0")
    print("=" * 60)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(f"💳 Stripe: {'✅ Configured' if stripe.api_key else '❌ Not configured'}")
    print(f"🎙️ Whisper: {'✅ Configured' if WHISPER_API_URL else '❌ Not configured'}")
    print(f"🗄️ Database: {'✅ Configured' if DATABASE_URL else '❌ Not configured'}")
    print("=" * 60)

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True") == "True",
    )
