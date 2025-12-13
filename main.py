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
import base64
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

# PayPal Configuration
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")  # "sandbox" or "live"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# PayPal API URLs
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

# PayPal Plan IDs (create these in your PayPal Dashboard)
PAYPAL_PLANS = {
    "starter": os.getenv("PAYPAL_STARTER_PLAN_ID"),
    "pro": os.getenv("PAYPAL_PRO_PLAN_ID"),
    "enterprise": os.getenv("PAYPAL_ENTERPRISE_PLAN_ID"),
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
            # Create users table if not exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    tier VARCHAR(50) DEFAULT 'free',
                    usage_minutes INTEGER DEFAULT 0,
                    transcription_count INTEGER DEFAULT 0,
                    paypal_subscription_id VARCHAR(255),
                    paypal_payer_id VARCHAR(255),
                    subscription_status VARCHAR(50) DEFAULT 'inactive',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create transcriptions table if not exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS transcriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    filename VARCHAR(255),
                    transcription TEXT,
                    duration INTEGER,
                    language VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Add PayPal columns if they don't exist (migration from Stripe)
            cur.execute("""
                DO $$ 
                BEGIN
                    -- Add PayPal columns
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='users' AND column_name='paypal_subscription_id') THEN
                        ALTER TABLE users ADD COLUMN paypal_subscription_id VARCHAR(255);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='users' AND column_name='paypal_payer_id') THEN
                        ALTER TABLE users ADD COLUMN paypal_payer_id VARCHAR(255);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='users' AND column_name='subscription_status') THEN
                        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive';
                    END IF;
                    
                    -- Remove old Stripe columns if they exist
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='users' AND column_name='stripe_customer_id') THEN
                        ALTER TABLE users DROP COLUMN stripe_customer_id;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='users' AND column_name='stripe_subscription_id') THEN
                        ALTER TABLE users DROP COLUMN stripe_subscription_id;
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


class PayPalCaptureRequest(BaseModel):
    subscription_id: str
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


# -------------------------------------------------
# PayPal Helper Functions
# -------------------------------------------------
def get_paypal_access_token() -> str:
    """Get PayPal OAuth access token"""
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="PayPal not configured")
    
    auth = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode()).decode()
    
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data="grant_type=client_credentials"
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to get PayPal access token")
    
    return response.json()["access_token"]


def get_paypal_subscription(subscription_id: str) -> dict:
    """Get subscription details from PayPal"""
    access_token = get_paypal_access_token()
    
    response = requests.get(
        f"{PAYPAL_API_BASE}/v1/billing/subscriptions/{subscription_id}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get subscription details")
    
    return response.json()


def cancel_paypal_subscription(subscription_id: str, reason: str = "User requested cancellation") -> bool:
    """Cancel a PayPal subscription"""
    access_token = get_paypal_access_token()
    
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/billing/subscriptions/{subscription_id}/cancel",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={"reason": reason}
    )
    
    return response.status_code == 204


# -------------------------------------------------
# Whisper Transcription
# -------------------------------------------------
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
                       usage_minutes, transcription_count, paypal_subscription_id,
                       paypal_payer_id, subscription_status,
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
        "paypal_subscription_id": row[7],
        "paypal_payer_id": row[8],
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


def db_update_paypal_subscription(email: str, subscription_id: str, payer_id: str, tier: str, status: str) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users 
                SET paypal_subscription_id = %s,
                    paypal_payer_id = %s,
                    tier = %s, 
                    subscription_status = %s,
                    usage_minutes = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (subscription_id, payer_id, tier, status, email),
            )


def db_cancel_subscription(email: str) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users 
                SET tier = 'free', 
                    subscription_status = 'cancelled',
                    paypal_subscription_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (email,),
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

            cur.execute(
                "SELECT COUNT(*) FROM transcriptions WHERE user_id = %s",
                (user_id,),
            )
            total = cur.fetchone()[0]

    history = [
        {
            "id": r[0],
            "filename": r[1],
            "transcription": r[2],
            "duration": r[3],
            "language": r[4],
            "created_at": r[5].isoformat() if r[5] else None,
        }
        for r in rows
    ]

    return {"history": history, "total": total}


# -------------------------------------------------
# API Routes
# -------------------------------------------------
@app.get("/")
async def root():
    return {
        "service": "Voxify API",
        "version": "2.0.0",
        "status": "operational",
        "payment_provider": "PayPal"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# -------- Auth Endpoints --------
@app.post("/auth/signup")
async def signup(user: UserCreate):
    existing_user = db_get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    new_user = db_create_user(user.username, user.email, hashed)
    
    token = create_access_token({"email": new_user["email"], "user_id": new_user["id"]})
    
    return {
        "token": token,
        "user": {
            "email": new_user["email"],
            "username": new_user["username"],
            "tier": new_user["tier"],
            "usage_minutes": new_user["usage_minutes"],
            "transcription_count": new_user["transcription_count"],
        },
    }


@app.post("/auth/login")
async def login(user: UserLogin):
    db_user = db_get_user_by_email(user.email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"email": db_user["email"], "user_id": db_user["id"]})
    
    return {
        "token": token,
        "user": {
            "email": db_user["email"],
            "username": db_user["username"],
            "tier": db_user["tier"],
            "usage_minutes": db_user["usage_minutes"],
            "transcription_count": db_user["transcription_count"],
        },
    }


@app.get("/auth/me")
async def get_current_user(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_minutes": user["usage_minutes"],
        "transcription_count": user["transcription_count"],
        "subscription_status": user.get("subscription_status", "inactive"),
    }


# -------- Transcription Endpoint --------
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    user_data: Optional[dict] = Depends(optional_verify_token),
):
    # Validate language
    if language not in SUPPORTED_LANGUAGES:
        language = "auto"
    
    # Guest mode (no token)
    if not user_data:
        try:
            audio_bytes = await file.read()
            result = transcribe_with_whisper(audio_bytes, file.filename, language)
            return {
                "success": result["success"],
                "transcription": result["transcription"],
                "language": result["language"],
                "filename": file.filename,
                "guest": True,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Logged-in user
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user.get("tier", "free")
    tier_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    current_usage = user.get("usage_minutes", 0)

    # Estimate duration
    file_size = 0
    audio_bytes = await file.read()
    file_size = len(audio_bytes)
    estimated_duration = max(1, file_size // (16000 * 2))  # Rough estimate

    if current_usage + estimated_duration > tier_limit:
        raise HTTPException(
            status_code=403,
            detail="Usage limit reached. Please upgrade your plan.",
        )

    try:
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


# -------- PayPal Payment Endpoints --------
@app.get("/api/paypal/config")
async def get_paypal_config():
    """Return PayPal client ID for frontend"""
    if not PAYPAL_CLIENT_ID:
        raise HTTPException(status_code=500, detail="PayPal not configured")
    
    return {
        "client_id": PAYPAL_CLIENT_ID,
        "mode": PAYPAL_MODE
    }


@app.post("/api/create-subscription")
async def create_subscription(
    request: CheckoutRequest,
    user_data: dict = Depends(verify_token)
):
    """Return PayPal plan ID for frontend to create subscription"""
    tier = request.tier
    if tier not in PAYPAL_PLANS or tier == "free":
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    plan_id = PAYPAL_PLANS[tier]
    if not plan_id:
        raise HTTPException(status_code=500, detail=f"Plan ID not configured for {tier}")
    
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "plan_id": plan_id,
        "tier": tier,
        "return_url": f"{FRONTEND_URL}?payment=success&tier={tier}",
        "cancel_url": f"{FRONTEND_URL}?payment=cancelled"
    }


@app.post("/api/capture-subscription")
async def capture_subscription(
    request: PayPalCaptureRequest,
    user_data: dict = Depends(verify_token)
):
    """Capture/activate a PayPal subscription after user approval"""
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Verify subscription with PayPal
        subscription = get_paypal_subscription(request.subscription_id)
        
        if subscription["status"] not in ["ACTIVE", "APPROVED"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Subscription not active. Status: {subscription['status']}"
            )
        
        # Get payer ID
        payer_id = subscription.get("subscriber", {}).get("payer_id", "")
        
        # Update user's subscription in database
        db_update_paypal_subscription(
            email=email,
            subscription_id=request.subscription_id,
            payer_id=payer_id,
            tier=request.tier,
            status="active"
        )
        
        print(f"✅ User {email} upgraded to {request.tier}")
        
        return {
            "success": True,
            "message": f"Successfully upgraded to {request.tier}",
            "tier": request.tier,
            "subscription_id": request.subscription_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error capturing subscription: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/webhook/paypal")
async def paypal_webhook(request: Request):
    """Handle PayPal webhooks for subscription events"""
    try:
        body = await request.json()
        event_type = body.get("event_type", "")
        resource = body.get("resource", {})
        
        print(f"📨 PayPal webhook: {event_type}")
        
        if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            subscription_id = resource.get("id")
            # Subscription activated - already handled in capture
            print(f"✅ Subscription activated: {subscription_id}")
            
        elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            subscription_id = resource.get("id")
            # Find user by subscription ID and cancel
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT email FROM users WHERE paypal_subscription_id = %s",
                        (subscription_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        db_cancel_subscription(row[0])
                        print(f"⚠️ Subscription cancelled for {row[0]}")
                        
        elif event_type == "BILLING.SUBSCRIPTION.SUSPENDED":
            subscription_id = resource.get("id")
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE users SET subscription_status = 'suspended' 
                           WHERE paypal_subscription_id = %s""",
                        (subscription_id,)
                    )
            print(f"⚠️ Subscription suspended: {subscription_id}")
            
        elif event_type == "PAYMENT.SALE.COMPLETED":
            # Recurring payment successful
            print(f"💰 Payment completed")
            
        elif event_type == "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
            subscription_id = resource.get("id")
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE users SET subscription_status = 'past_due' 
                           WHERE paypal_subscription_id = %s""",
                        (subscription_id,)
                    )
            print(f"⚠️ Payment failed for subscription: {subscription_id}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@app.post("/api/cancel-subscription")
async def cancel_subscription_endpoint(user_data: dict = Depends(verify_token)):
    """Cancel user's PayPal subscription"""
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription_id = user.get("paypal_subscription_id")
    if not subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    
    try:
        # Cancel subscription with PayPal
        success = cancel_paypal_subscription(subscription_id)
        
        if success:
            db_cancel_subscription(email)
            return {"message": "Subscription cancelled successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel subscription")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/subscription-status")
async def get_subscription_status(user_data: dict = Depends(verify_token)):
    """Get current subscription status"""
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription_id = user.get("paypal_subscription_id")
    
    result = {
        "tier": user["tier"],
        "subscription_status": user.get("subscription_status", "inactive"),
        "has_subscription": bool(subscription_id)
    }
    
    # If there's an active subscription, get details from PayPal
    if subscription_id:
        try:
            subscription = get_paypal_subscription(subscription_id)
            result["paypal_status"] = subscription.get("status")
            result["next_billing"] = subscription.get("billing_info", {}).get("next_billing_time")
        except:
            pass
    
    return result


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
    print("🚀 Voxify API v2.0 (PayPal Edition)")
    print("=" * 60)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(f"💳 PayPal: {'✅ Configured' if PAYPAL_CLIENT_ID else '❌ Not configured'}")
    print(f"🎙️ Whisper: {'✅ Configured' if WHISPER_API_URL else '❌ Not configured'}")
    print(f"🗄️ Database: {'✅ Configured' if DATABASE_URL else '❌ Not configured'}")
    print("=" * 60)

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True") == "True",
    )
