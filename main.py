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
# Environment & Configuration
# -------------------------------------------------
load_dotenv()

app = FastAPI(title="Voxify API", version="2.1.0")

# Security & Secrets
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 30))

# External Services
WHISPER_API_URL = os.getenv("WHISPER_API_URL", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
DATABASE_URL = os.getenv("DATABASE_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# PayPal Configuration
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
PAYPAL_PLANS = {
    "starter": os.getenv("PAYPAL_STARTER_PLAN_ID"),
    "pro": os.getenv("PAYPAL_PRO_PLAN_ID"),
    "enterprise": os.getenv("PAYPAL_ENTERPRISE_PLAN_ID"),
}

# -------------------------------------------------
# Business Logic & Constants
# -------------------------------------------------

# Quota Limits (Minutes)
TIER_LIMITS: Dict[str, int] = {
    "free": 15,        # 15 Minutes PER DAY
    "starter": 300,    # 300 Minutes PER MONTH
    "pro": 1000,
    "enterprise": 10000,
}

# Locked Languages (Allowed for Free/Guest)
ALLOWED_FREE_LANGUAGES = ["auto", "ar", "fr", "en"]

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer()

# -------------------------------------------------
# Database Connection Pool
# -------------------------------------------------
db_pool: Optional[SimpleConnectionPool] = None

@app.on_event("startup")
def startup_event():
    global db_pool
    if not DATABASE_URL:
        print("⚠️ DATABASE_URL is not set")
        return
    
    # Initialize connection pool
    try:
        db_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL,
            sslmode="require" if "sslmode" not in DATABASE_URL else None,
        )
        print("✅ Database connected successfully")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

@app.on_event("shutdown")
def shutdown_event():
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
# Helper Functions
# -------------------------------------------------

def get_audio_duration_seconds(audio_bytes: bytes, filename: str) -> int:
    """Calculate accurate audio duration in seconds."""
    try:
        file_ext = filename.lower().split('.')[-1]
        # Pydub format mapping
        fmt = 'mp4' if file_ext == 'm4a' else file_ext if file_ext in ['mp3','wav','ogg','flac'] else 'mp3'
        
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
        return max(1, int(audio.duration_seconds))
    except Exception as e:
        print(f"Duration calc error: {e}")
        # Fallback: Estimate 1 min per MB roughly if parsing fails (very rough)
        return max(1, len(audio_bytes) // (32000)) 

def minutes_to_display(seconds: int) -> int:
    """Convert seconds to minutes (rounded up for safety)."""
    return (seconds + 59) // 60

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def check_and_reset_quota(user: Dict[str, Any]) -> None:
    """
    Resets usage if the quota period has passed.
    - Free Tier: Resets DAILY.
    - Paid Tiers: Resets MONTHLY.
    """
    today = datetime.now().date()
    reset_date = user.get('quota_reset_date')
    
    # If reset date is missing or passed, reset usage
    if reset_date is None or reset_date <= today:
        tier = user.get("tier", "free")
        
        if tier == "free":
            # Free tier resets tomorrow (Daily)
            next_reset = today + timedelta(days=1)
        else:
            # Paid tiers reset 1st of next month
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
# Database Operations
# -------------------------------------------------

def db_get_user(email: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, email, password_hash, tier,
                       usage_seconds, transcription_count, quota_reset_date,
                       paypal_subscription_id, subscription_status
                FROM users WHERE email = %s
                """,
                (email,),
            )
            row = cur.fetchone()

    if not row: return None

    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "password_hash": row[3],
        "tier": row[4],
        "usage_seconds": row[5],
        "transcription_count": row[6],
        "quota_reset_date": row[7],
        "paypal_subscription_id": row[8],
        "subscription_status": row[9]
    }

def db_create_user(username: str, email: str, password_hash: str) -> Dict[str, Any]:
    # Set first reset date to tomorrow (for daily free tier)
    next_reset = datetime.now().date() + timedelta(days=1)
    
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, tier, usage_seconds, quota_reset_date)
                VALUES (%s, %s, %s, 'free', 0, %s)
                RETURNING id, username, email, tier
                """,
                (username, email, password_hash, next_reset),
            )
            row = cur.fetchone()

    return {"id": row[0], "username": row[1], "email": row[2], "tier": row[3]}

def db_log_transcription(user_id: int, filename: str, text: str, duration: int, lang: str):
    """Log transcription linked to USER ID (not email)."""
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO transcriptions (user_id, filename, transcription, duration_seconds, language)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, filename, text, duration, lang),
            )

def db_update_usage(email: str, seconds: int):
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
                (seconds, email),
            )

# -------------------------------------------------
# API Routes
# -------------------------------------------------

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@app.post("/auth/signup")
async def signup(user: UserCreate):
    if db_get_user(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    new_user = db_create_user(user.username, user.email, hashed)
    token = create_access_token({"email": new_user["email"], "sub": str(new_user["id"])})
    
    return {"token": token, "user": new_user}

@app.post("/auth/login")
async def login(user: UserLogin):
    db_user = db_get_user(user.email)
    if not db_user or db_user["password_hash"] != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check and reset quota immediately upon login check
    check_and_reset_quota(db_user)
    db_user = db_get_user(user.email) # Refresh data
    
    token = create_access_token({"email": db_user["email"], "sub": str(db_user["id"])})
    return {"token": token, "user": db_user}

@app.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db_get_user(payload.get("email"))
        if not user: raise HTTPException(404, "User not found")
        
        check_and_reset_quota(user)
        user = db_get_user(payload.get("email")) # Refresh
        
        limit_min = TIER_LIMITS.get(user["tier"], 15)
        limit_sec = limit_min * 60
        
        return {
            "user": user,
            "usage_minutes": minutes_to_display(user["usage_seconds"]),
            "limit_minutes": limit_min,
            "remaining_seconds": max(0, limit_sec - user["usage_seconds"])
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    authorization: Optional[str] = Header(None),
):
    # 1. READ FILE & CALCULATE DURATION
    audio_bytes = await file.read()
    duration_seconds = get_audio_duration_seconds(audio_bytes, file.filename)
    
    # 2. IDENTIFY USER (Optional)
    user = None
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user = db_get_user(payload.get("email"))
            if user:
                check_and_reset_quota(user)
                user = db_get_user(payload.get("email")) # Refresh
        except:
            pass # Treat as guest if token invalid

    # 3. ENFORCE LANGUAGE LOCK (Guest & Free Tier)
    # If user is None (Guest) OR user is Free Tier -> Check Allowed Languages
    if (not user) or (user and user["tier"] == "free"):
        if language not in ALLOWED_FREE_LANGUAGES:
            raise HTTPException(
                status_code=403, 
                detail=f"Language '{language}' is locked for Free Tier. Upgrade to Pro to unlock 30+ languages."
            )

    # 4. ENFORCE QUOTA (Registered Users)
    if user:
        tier_limit_min = TIER_LIMITS.get(user["tier"], 15)
        tier_limit_sec = tier_limit_min * 60
        
        if user["usage_seconds"] + duration_seconds > tier_limit_sec:
             raise HTTPException(
                status_code=403,
                detail=f"Daily limit exceeded. You have {minutes_to_display(max(0, tier_limit_sec - user['usage_seconds']))} mins left, but file is {minutes_to_display(duration_seconds)} mins."
            )

    # 5. PERFORM TRANSCRIPTION
    try:
        if not WHISPER_API_URL:
            raise Exception("Whisper API URL not configured")
            
        files = {"file": (file.filename, audio_bytes, "audio/mpeg")}
        data = {}
        if language != "auto":
            data["language"] = language
            
        resp = requests.post(WHISPER_API_URL, files=files, data=data, timeout=120)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Transcription service error")
            
        result = resp.json()
        transcript_text = result.get("transcription", "")
        detected_lang = result.get("language", language)

        # 6. SAVE HISTORY & UPDATE USAGE (Registered Users Only)
        if user:
            db_update_usage(user["email"], duration_seconds)
            db_log_transcription(
                user_id=user["id"], 
                filename=file.filename, 
                transcription=transcript_text, 
                duration=duration_seconds, 
                lang=detected_lang
            )
            
        return {
            "success": True,
            "transcription": transcript_text,
            "language": detected_lang,
            "duration_seconds": duration_seconds,
            "duration_minutes": minutes_to_display(duration_seconds),
            "usage_updated": bool(user)
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/transcriptions/history")
async def get_history(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user = db_get_user(payload.get("email"))
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            # Join not strictly needed if we have user_id, but good for safety
            cur.execute(
                """
                SELECT id, filename, transcription, duration_seconds, language, created_at 
                FROM transcriptions 
                WHERE user_id = %s 
                ORDER BY created_at DESC 
                LIMIT 50
                """,
                (user["id"],)
            )
            rows = cur.fetchall()
            
    history = []
    for r in rows:
        history.append({
            "id": r[0],
            "filename": r[1],
            "transcription": r[2],
            "duration": minutes_to_display(r[3]),
            "language": r[4],
            "date": r[5].isoformat() if r[5] else None
        })
        
    return history

# -------------------------------------------------
# PayPal Integration (Simplified)
# -------------------------------------------------

@app.get("/api/paypal/config")
async def get_paypal_config():
    return {"client_id": PAYPAL_CLIENT_ID, "mode": PAYPAL_MODE}

@app.post("/api/create-subscription")
async def create_subscription(request: Request, authorization: Optional[str] = Header(None)):
    # ... Standard PayPal Create Subscription Logic ...
    # (Kept brief as focus was on DB/Quota logic, but add standard implementation if needed)
    body = await request.json()
    tier = body.get("tier")
    if tier not in PAYPAL_PLANS:
        raise HTTPException(400, "Invalid tier")
    return {"plan_id": PAYPAL_PLANS[tier]}

@app.post("/api/capture-subscription")
async def capture_subscription(request: Request, authorization: Optional[str] = Header(None)):
    if not authorization: raise HTTPException(401)
    token = authorization.split(" ")[1]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    email = payload.get("email")
    
    body = await request.json()
    sub_id = body.get("subscription_id")
    tier = body.get("tier")
    
    # Update User to New Tier
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            # When upgrading, we reset the usage so they get their full new quota immediately
            # Reset date becomes 1st of next month (since it's a paid monthly plan)
            today = datetime.now().date()
            if today.month == 12:
                next_reset = datetime(today.year + 1, 1, 1).date()
            else:
                next_reset = datetime(today.year, today.month + 1, 1).date()

            cur.execute(
                """
                UPDATE users 
                SET tier = %s, 
                    paypal_subscription_id = %s, 
                    subscription_status = 'active',
                    usage_seconds = 0,
                    quota_reset_date = %s
                WHERE email = %s
                """,
                (tier, sub_id, next_reset, email)
            )
    return {"success": True}

# -------------------------------------------------
# Run
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
