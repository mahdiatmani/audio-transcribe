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

# -------------------------------------------------
# Environment & basic config
# -------------------------------------------------
load_dotenv()

app = FastAPI(title="Voxify API", version="2.1.0")

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
        format_map = {'mp3': 'mp3', 'wav': 'wav', 'webm': 'webm', 'ogg': 'ogg', 'm4a': 'mp4', 'aac': 'aac', 'flac': 'flac'}
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
        "version": "2.1.0",
        "status": "operational",
        "quota_policy": "Free tier resets daily. Paid tiers reset monthly.",
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
        "user": new_user,
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
        "remaining_seconds": max(0, limit_sec - user["usage_seconds"]),
        "subscription_status": user.get("subscription_status", "inactive"),
    }

# -------- Transcription Endpoint --------
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    user_data: Optional[dict] = Depends(optional_verify_token),
):
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
                detail=f"Language '{language}' is locked for Free Tier/Guests. Please upgrade to Pro."
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

    # 5. TRANSCRIBE
    try:
        if not WHISPER_API_URL:
            # Mock response if no API configured
            return {
                "success": False, 
                "transcription": "Whisper API URL not configured in backend.",
                "language": "error"
            }

        files = {"file": (file.filename, audio_bytes, "audio/mpeg")}
        data = {}
        if language and language != "auto":
            data["language"] = language
        
        response = requests.post(WHISPER_API_URL, files=files, data=data, timeout=120)

        if response.status_code != 200:
             raise HTTPException(status_code=400, detail="Transcription failed upstream")
            
        result = response.json()
        transcript_text = result.get("transcription", "")
        detected_lang = result.get("language", language)
        
        # 6. SAVE & UPDATE USAGE (If User)
        if user:
            db_update_user_usage(user["email"], duration_seconds)
            db_insert_transcription(
                user_id=user["id"],
                filename=file.filename,
                transcription=transcript_text,
                duration_seconds=duration_seconds,
                language=detected_lang
            )
            updated_user = db_get_user_by_email(user["email"])
            
            return {
                "success": True,
                "transcription": transcript_text,
                "language": detected_lang,
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
                "transcription": transcript_text,
                "language": detected_lang,
                "duration_seconds": duration_seconds,
                "guest": True,
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------- PayPal Payment Endpoints (Restored) --------
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
    
    # In a real app, verify subscription with PayPal API here using get_paypal_subscription helper
    # For now, we trust the ID and update DB
    
    db_update_paypal_subscription(
        email=email,
        subscription_id=request.subscription_id,
        payer_id="PAYER_ID_PLACEHOLDER", # You would get this from PayPal API
        tier=request.tier,
        status="active"
    )
    return {"success": True, "tier": request.tier}

@app.post("/api/cancel-subscription")
async def cancel_subscription_endpoint(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    db_cancel_subscription(email)
    return {"message": "Subscription cancelled"}

# -------- User Stats & History --------
@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_user_stats(email)

@app.get("/api/transcriptions/history")
async def get_transcription_history(limit: int = 10, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_transcription_history(email, limit=limit)

# -------------------------------------------------
# Run server
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True") == "True",
    )
