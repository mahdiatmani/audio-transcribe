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
import io
from pydub import AudioSegment
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# -------------------------------------------------
# Environment & basic config
# -------------------------------------------------
load_dotenv()

app = FastAPI(title="Voxify API", version="2.2.0")

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 30))

WHISPER_API_URL = os.getenv("WHISPER_API_URL", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
DATABASE_URL = os.getenv("DATABASE_URL")

# PayPal Configuration
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")  # "sandbox" or "live"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Email Configuration for Contact Form
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "support@ai-need-tools.online")
# PayPal API URLs
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

# PayPal Plan IDs
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

# -------------------------------------------------
# Business Logic Constants
# -------------------------------------------------

# Pricing tiers (in minutes)
# Free Tier = 15 Minutes PER DAY
# Paid Tiers = Monthly limits
TIER_LIMITS: Dict[str, int] = {
    "free": 15,
    "starter": 300,
    "pro": 1000,
    "enterprise": 10000,
}

# Languages allowed for Free Tier & Guests
ALLOWED_FREE_LANGUAGES = ["auto", "ar", "fr", "en"]

# Supported languages (For display/validation)
SUPPORTED_LANGUAGES = {
    "auto": "Auto-detect",
    "ar": "Arabic",
    "fr": "French",
    "en": "English",
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
        
class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str
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

def get_audio_duration_seconds(audio_bytes: bytes, filename: str) -> int:
    """Accurately calculate audio duration in seconds using pydub"""
    try:
        file_ext = filename.lower().split('.')[-1]
        format_map = {
            'mp3': 'mp3', 'wav': 'wav', 'webm': 'webm', 'ogg': 'ogg',
            'm4a': 'mp4', 'aac': 'aac', 'flac': 'flac'
        }
        audio_format = format_map.get(file_ext, 'mp3')
        
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=audio_format)
        duration_seconds = int(audio.duration_seconds)
        return max(1, duration_seconds)
    except Exception as e:
        print(f"Error calculating duration: {str(e)}")
        # Fallback: 1 min per MB roughly
        return max(1, len(audio_bytes) // (32000))

def minutes_to_display(seconds: int) -> int:
    """Convert seconds to minutes, rounding up"""
    return (seconds + 59) // 60

def check_and_reset_quota(user: Dict[str, Any]) -> None:
    """
    Reset quota based on Tier:
    - FREE: Resets DAILY
    - PAID: Resets MONTHLY
    """
    today = datetime.now().date()
    reset_date = user.get('quota_reset_date')
    
    if reset_date is None or reset_date <= today:
        tier = user.get('tier', 'free')
        
        if tier == 'free':
            # Free tier resets tomorrow (Daily)
            next_reset = today + timedelta(days=1)
        else:
            # Paid tier resets next month
            if today.month == 12:
                next_reset = datetime(today.year + 1, 1, 1).date()
            else:
                next_reset = datetime(today.year, today.month + 1, 1).date()
        
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE users 
                    SET usage_seconds = 0, 
                        quota_reset_date = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = %s
                    """,
                    (next_reset, user['email'])
                )

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
# Whisper Transcription - UPDATED WITH MODE SUPPORT
# -------------------------------------------------
def transcribe_with_whisper(audio_bytes: bytes, filename: str, language: str = "auto", mode: str = "fast") -> dict:
    """
    Transcribe using self-hosted Whisper API with mode selection
    
    Args:
        audio_bytes: Audio file bytes
        filename: Original filename
        language: Language code or "auto"
        mode: "fast" or "quality" (NEW!)
    
    Returns:
        dict with transcription, language, success, mode
    """
    if not WHISPER_API_URL:
        return {
            "transcription": "⚠️ Whisper API not configured",
            "language": "unknown",
            "success": False,
            "mode": mode
        }
    
    try:
        files = {"file": (filename, audio_bytes, "audio/mpeg")}
        
        # Build payload with mode and language
        data = {"mode": mode}  # Pass mode to Whisper API
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
                "language": result.get("language", "detected"),
                "success": True,
                "mode": mode
            }
        else:
            return {
                "transcription": f"⚠️ Service error. Status: {response.status_code}",
                "language": "unknown",
                "success": False,
                "mode": mode
            }
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return {
            "transcription": "⚠️ Transcription failed. Please try again.",
            "language": "unknown",
            "success": False,
            "mode": mode
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
                       usage_seconds, transcription_count, paypal_subscription_id,
                       paypal_payer_id, subscription_status, quota_reset_date,
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
        "usage_seconds": row[5],
        "transcription_count": row[6],
        "paypal_subscription_id": row[7],
        "paypal_payer_id": row[8],
        "subscription_status": row[9],
        "quota_reset_date": row[10],
        "created_at": row[11],
        "updated_at": row[12],
    }

def db_create_user(username: str, email: str, password_hash: str) -> Dict[str, Any]:
    """Create a new user with free tier and set DAILY reset date"""
    # Free tier resets daily, so next reset is tomorrow
    next_reset = datetime.now().date() + timedelta(days=1)
    
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, tier, usage_seconds, transcription_count, quota_reset_date)
                VALUES (%s, %s, %s, %s, 0, 0, %s)
                RETURNING id, username, email, tier, usage_seconds, transcription_count
                """,
                (username, email, password_hash, "free", next_reset),
            )
            row = cur.fetchone()

    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "tier": row[3],
        "usage_seconds": row[4],
        "transcription_count": row[5],
    }

def db_update_user_usage(email: str, seconds_delta: int) -> None:
    """Update user usage in seconds"""
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET usage_seconds = usage_seconds + %s,
                    transcription_count = transcription_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (seconds_delta, email),
            )

def db_insert_transcription(user_id: int, filename: str, transcription: str, duration_seconds: int, language: str = "auto") -> None:
    """Insert transcription record linked to USER ID"""
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO transcriptions (user_id, filename, transcription, duration_seconds, language)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, filename, transcription, duration_seconds, language),
            )

def db_update_paypal_subscription(email: str, subscription_id: str, payer_id: str, tier: str, status: str) -> None:
    # Paid plans reset monthly. Set next reset to 1st of next month.
    today = datetime.now().date()
    if today.month == 12:
        next_reset = datetime(today.year + 1, 1, 1).date()
    else:
        next_reset = datetime(today.year, today.month + 1, 1).date()

    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users 
                SET paypal_subscription_id = %s,
                    paypal_payer_id = %s,
                    tier = %s, 
                    subscription_status = %s,
                    usage_seconds = 0,
                    quota_reset_date = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (subscription_id, payer_id, tier, status, next_reset, email),
            )

def db_cancel_subscription(email: str) -> None:
    # Revert to Free tier (Daily reset)
    next_reset = datetime.now().date() + timedelta(days=1)
    
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users 
                SET tier = 'free', 
                    subscription_status = 'cancelled',
                    paypal_subscription_id = NULL,
                    quota_reset_date = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (next_reset, email),
            )

def db_get_user_stats(email: str) -> Dict[str, Any]:
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    check_and_reset_quota(user)
    user = db_get_user_by_email(email) # Refresh
    
    tier_limit_minutes = TIER_LIMITS.get(user["tier"], TIER_LIMITS["free"])
    tier_limit_seconds = tier_limit_minutes * 60
    
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_seconds": user["usage_seconds"],
        "usage_minutes": minutes_to_display(user["usage_seconds"]),
        "transcription_count": user["transcription_count"],
        "limit_minutes": tier_limit_minutes,
        "limit_seconds": tier_limit_seconds,
        "remaining_seconds": max(0, tier_limit_seconds - user["usage_seconds"]),
        "subscription_status": user.get("subscription_status", "inactive"),
        "quota_reset_date": user.get("quota_reset_date").isoformat() if user.get("quota_reset_date") else None,
    }

def db_get_transcription_history(email: str, limit: int = 10):
    user = db_get_user_by_email(email)
    if not user: return {"history": [], "total": 0}

    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, filename, transcription, duration_seconds, language, created_at
                FROM transcriptions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user["id"], limit),
            )
            rows = cur.fetchall()

            cur.execute("SELECT COUNT(*) FROM transcriptions WHERE user_id = %s", (user["id"],))
            total = cur.fetchone()[0]

    history = [
        {
            "id": r[0],
            "filename": r[1],
            "transcription": r[2],
            "duration_seconds": r[3],
            "duration_minutes": minutes_to_display(r[3]),
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
        "version": "2.2.0",
        "status": "operational",
        "quota_policy": "Free tier resets daily. Paid tiers reset monthly.",
        "supported_languages": list(SUPPORTED_LANGUAGES.keys()),
        "modes": ["fast", "quality"]  # NEW!
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/languages")
async def get_languages():
    return {
        "supported": SUPPORTED_LANGUAGES,
        "free_tier_allowed": ALLOWED_FREE_LANGUAGES
    }

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
            "usage_seconds": new_user["usage_seconds"],
            "usage_minutes": minutes_to_display(new_user["usage_seconds"]),
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
    
    check_and_reset_quota(db_user)
    db_user = db_get_user_by_email(user.email) # Refresh
    
    token = create_access_token({"email": db_user["email"], "user_id": db_user["id"]})
    
    return {
        "token": token,
        "user": {
            "email": db_user["email"],
            "username": db_user["username"],
            "tier": db_user["tier"],
            "usage_seconds": db_user["usage_seconds"],
            "usage_minutes": minutes_to_display(db_user["usage_seconds"]),
            "transcription_count": db_user["transcription_count"],
        },
    }

@app.get("/auth/me")
async def get_current_user(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    check_and_reset_quota(user)
    user = db_get_user_by_email(email) # Refresh
    
    limit_min = TIER_LIMITS.get(user["tier"], 15)
    limit_sec = limit_min * 60
    
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_seconds": user["usage_seconds"],
        "usage_minutes": minutes_to_display(user["usage_seconds"]),
        "transcription_count": user["transcription_count"],
        "limit_minutes": limit_min,
        "limit_seconds": limit_sec,
        "remaining_seconds": max(0, limit_sec - user["usage_seconds"]),
        "subscription_status": user.get("subscription_status", "inactive"),
    }

# -------- Transcription Endpoint - WITH MODE SUPPORT --------
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    mode: str = Form("fast"),  # NEW PARAMETER - "fast" or "quality"
    user_data: Optional[dict] = Depends(optional_verify_token),
):
    """
    Transcribe audio with mode selection
    
    Args:
        file: Audio file
        language: Language code
        mode: "fast" for quick results, "quality" for best accuracy
    """
    
    # 1. READ FILE & DURATION
    audio_bytes = await file.read()
    duration_seconds = get_audio_duration_seconds(audio_bytes, file.filename)
    
    # 2. IDENTIFY USER
    user = None
    if user_data:
        email = user_data.get("email")
        user = db_get_user_by_email(email)
        if user:
            check_and_reset_quota(user)
            user = db_get_user_by_email(email) # Refresh

    # 3. ENFORCE LANGUAGE LOCK (Guest & Free Tier)
    if (not user) or (user["tier"] == "free"):
        if language not in ALLOWED_FREE_LANGUAGES:
            raise HTTPException(
                status_code=403, 
                detail=f"Language '{language}' is locked for Free Tier/Guests. Supported: {', '.join(ALLOWED_FREE_LANGUAGES)}. Please upgrade."
            )

    # 4. ENFORCE QUOTA (Registered Users)
    if user:
        tier_limit_min = TIER_LIMITS.get(user["tier"], 15)
        tier_limit_sec = tier_limit_min * 60
        
        if user["usage_seconds"] + duration_seconds > tier_limit_sec:
            raise HTTPException(
                status_code=403,
                detail=f"Quota exceeded. You need {minutes_to_display(duration_seconds)} mins, but have {minutes_to_display(max(0, tier_limit_sec - user['usage_seconds']))} mins left today."
            )

    # 5. TRANSCRIBE WITH MODE
    try:
        # Pass the 'mode' parameter to Whisper API
        result = transcribe_with_whisper(audio_bytes, file.filename, language, mode)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["transcription"])
        
        # 6. SAVE & UPDATE USAGE (If User)
        if user:
            db_update_user_usage(user["email"], duration_seconds)
            db_insert_transcription(
                user_id=user["id"],
                filename=file.filename,
                transcription=result["transcription"],
                duration_seconds=duration_seconds,
                language=result["language"]
            )
            updated_user = db_get_user_by_email(user["email"])
            tier_limit_min = TIER_LIMITS.get(updated_user["tier"], 15)
            tier_limit_sec = tier_limit_min * 60
            
            return {
                "success": True,
                "transcription": result["transcription"],
                "language": result["language"],
                "mode": mode,  # Include mode in response
                "duration_seconds": duration_seconds,
                "duration_minutes": minutes_to_display(duration_seconds),
                "filename": file.filename,
                "usage": {
                    "used_seconds": updated_user["usage_seconds"],
                    "remaining_seconds": max(0, tier_limit_sec - updated_user["usage_seconds"])
                }
            }
        else:
            # Guest Response
            return {
                "success": True,
                "transcription": result["transcription"],
                "language": result["language"],
                "mode": mode,  # Include mode in response
                "duration_seconds": duration_seconds,
                "guest": True,
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------- PayPal Payment Endpoints --------
@app.get("/api/paypal/config")
async def get_paypal_config():
    if not PAYPAL_CLIENT_ID:
        raise HTTPException(status_code=500, detail="PayPal not configured")
    return {"client_id": PAYPAL_CLIENT_ID, "mode": PAYPAL_MODE}

@app.post("/api/create-subscription")
async def create_subscription(request: CheckoutRequest, user_data: dict = Depends(verify_token)):
    tier = request.tier
    if tier not in PAYPAL_PLANS or tier == "free":
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    plan_id = PAYPAL_PLANS[tier]
    return {
        "plan_id": plan_id,
        "tier": tier,
        "return_url": f"{FRONTEND_URL}?payment=success&tier={tier}",
        "cancel_url": f"{FRONTEND_URL}?payment=cancelled"
    }

@app.post("/api/capture-subscription")
async def capture_subscription(request: PayPalCaptureRequest, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user: raise HTTPException(status_code=404)
    
    try:
        # Verify with PayPal
        subscription = get_paypal_subscription(request.subscription_id)
        if subscription["status"] not in ["ACTIVE", "APPROVED"]:
             raise HTTPException(status_code=400, detail="Subscription not active")

        payer_id = subscription.get("subscriber", {}).get("payer_id", "")
        
        db_update_paypal_subscription(
            email=email,
            subscription_id=request.subscription_id,
            payer_id=payer_id,
            tier=request.tier,
            status="active"
        )
        return {"success": True, "tier": request.tier}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/webhook/paypal")
async def paypal_webhook(request: Request):
    """Handle PayPal webhooks"""
    try:
        body = await request.json()
        event_type = body.get("event_type", "")
        resource = body.get("resource", {})
        
        print(f"📨 PayPal webhook: {event_type}")
        
        if event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            subscription_id = resource.get("id")
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT email FROM users WHERE paypal_subscription_id = %s",
                        (subscription_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        db_cancel_subscription(row[0])
                        
        elif event_type == "BILLING.SUBSCRIPTION.SUSPENDED":
            subscription_id = resource.get("id")
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE users SET subscription_status = 'suspended' 
                           WHERE paypal_subscription_id = %s""",
                        (subscription_id,)
                    )
        
        return {"status": "success"}
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/api/cancel-subscription")
async def cancel_subscription_endpoint(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user: raise HTTPException(status_code=404)
    
    sub_id = user.get("paypal_subscription_id")
    if sub_id:
        try:
            cancel_paypal_subscription(sub_id)
        except:
            pass # Proceed to cancel locally even if PayPal API fails
            
    db_cancel_subscription(email)
    return {"message": "Subscription cancelled"}

@app.get("/api/subscription-status")
async def get_subscription_status(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    return {
        "tier": user["tier"],
        "subscription_status": user.get("subscription_status", "inactive"),
        "has_subscription": bool(user.get("paypal_subscription_id"))
    }

# -------- User Stats & History --------
@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_user_stats(email)

@app.get("/api/transcriptions/history")
async def get_transcription_history(limit: int = 10, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_transcription_history(email, limit=limit)
# -------- Contact Form Endpoint --------
@app.post("/api/contact")
async def send_contact_email(contact: ContactRequest):
    """
    Receive contact form submissions and send email to support@ai-need-tools.online
    """
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            raise HTTPException(
                status_code=500, 
                detail="Email service not configured"
            )
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"Voxify Contact Form <{SMTP_USERNAME}>"
        msg['To'] = CONTACT_EMAIL
        msg['Subject'] = f"📧 Contact Form: {contact.name}"
        msg['Reply-To'] = contact.email
        
        # Plain text version
        text_content = f"""
New Contact Form Submission from Voxify

From: {contact.name}
Email: {contact.email}

Message:
{contact.message}

---
Sent from Voxify Contact Form
Reply to: {contact.email}
        """
        
        # HTML version
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
              <h2 style="color: #10b981; margin-bottom: 20px;">📧 New Contact Form Submission</h2>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 10px 0;"><strong>From:</strong> {contact.name}</p>
                <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:{contact.email}">{contact.email}</a></p>
              </div>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px;">
                <p style="margin: 10px 0;"><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; background-color: #f3f4f6; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981;">
{contact.message}
                </p>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Sent from Voxify Contact Form</p>
                <p>Reply directly to <a href="mailto:{contact.email}">{contact.email}</a></p>
              </div>
            </div>
          </body>
        </html>
        """
        
        # Attach both versions
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Contact email sent from {contact.name} ({contact.email})")
        
        return {
            "success": True,
            "message": "Your message has been sent successfully! We'll get back to you soon."
        }
    
    except smtplib.SMTPException as e:
        print(f"❌ SMTP Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send email. Please try again or contact us directly at support@ai-need-tools.online"
        )
    except Exception as e:
        print(f"❌ Error sending contact email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while sending your message. Please try again."
        )

# -------------------------------------------------
# Run server
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    print("🚀 Voxify API v2.2.0 - Dual Mode Support")
    print("   Modes: fast (quantized) | quality (full precision)")
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True") == "True",
    )
