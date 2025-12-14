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

app = FastAPI(title="Voxify API", version="2.3.0")

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))

WHISPER_API_URL = os.getenv("WHISPER_API_URL", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
DATABASE_URL = os.getenv("DATABASE_URL")

# PayPal Configuration
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")
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

# Pricing tiers (in minutes per month)
TIER_LIMITS: Dict[str, int] = {
    "free": int(os.getenv("TIER_FREE_LIMIT", 15)),
    "starter": int(os.getenv("TIER_STARTER_LIMIT", 300)),
    "pro": int(os.getenv("TIER_PRO_LIMIT", 1000)),
    "enterprise": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000)),
}

# Supported languages
SUPPORTED_LANGUAGES = {
    "auto": "Auto-detect",
    "ar": "Arabic",
    "fr": "French",
    "en": "English",
}

# All languages (for display)
ALL_LANGUAGES = {
    "auto": "Auto-detect",
    "ar": "Arabic",
    "fr": "French",
    "en": "English",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "hi": "Hindi",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
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
    try:
        file_ext = filename.lower().split('.')[-1]
        format_map = {
            'mp3': 'mp3', 'wav': 'wav', 'webm': 'webm', 'ogg': 'ogg',
            'm4a': 'mp4', 'aac': 'aac', 'flac': 'flac',
        }
        audio_format = format_map.get(file_ext, 'mp3')
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=audio_format)
        duration_seconds = int(audio.duration_seconds)
        return max(1, duration_seconds)
    except Exception as e:
        print(f"Error calculating duration: {str(e)}")
        estimated_seconds = max(1, len(audio_bytes) // (16000 * 2))
        return estimated_seconds

def seconds_to_minutes(seconds: int) -> int:
    return (seconds + 59) // 60

def check_and_reset_monthly_quota(user: Dict[str, Any]) -> None:
    today = datetime.now().date()
    reset_date = user.get('monthly_reset_date')
    
    if reset_date is None or reset_date <= today:
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
                        monthly_reset_date = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = %s
                    """,
                    (next_reset, user['email'])
                )

# -------------------------------------------------
# PayPal Helper Functions
# -------------------------------------------------
def get_paypal_access_token() -> str:
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
def transcribe_with_whisper(audio_bytes: bytes, filename: str, language: str = "auto", mode: str = "fast") -> dict:
    """
    Transcribe using self-hosted Whisper API
    UPDATED: Now accepts 'mode' parameter ('fast' or 'quality')
    """
    if not WHISPER_API_URL:
        return {
            "transcription": "⚠️ Whisper API not configured",
            "language": "unknown",
            "success": False
        }
    
    if language not in SUPPORTED_LANGUAGES:
        return {
            "transcription": f"⚠️ Language '{language}' is not supported. Please use Arabic, French, or English.",
            "language": "unknown",
            "success": False
        }
    
    try:
        files = {"file": (filename, audio_bytes, "audio/mpeg")}
        
        # Build payload with mode
        data = {"mode": mode}
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
            detected_language = result.get("language", language if language != "auto" else "detected")
            
            if detected_language not in SUPPORTED_LANGUAGES and detected_language != "detected":
                return {
                    "transcription": f"⚠️ Detected language '{detected_language}' is not supported. Please use Arabic, French, or English.",
                    "language": detected_language,
                    "success": False
                }
            
            return {
                "transcription": result.get("transcription", ""),
                "language": detected_language,
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
                       usage_seconds, transcription_count, paypal_subscription_id,
                       paypal_payer_id, subscription_status, monthly_reset_date,
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
        "monthly_reset_date": row[10],
        "created_at": row[11],
        "updated_at": row[12],
    }

def db_create_user(username: str, email: str, password_hash: str) -> Dict[str, Any]:
    today = datetime.now().date()
    if today.month == 12:
        next_reset = datetime(today.year + 1, 1, 1).date()
    else:
        next_reset = datetime(today.year, today.month + 1, 1).date()
    
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, tier, usage_seconds, transcription_count, monthly_reset_date)
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

def db_insert_transcription(user_email: str, filename: str, transcription: str, duration_seconds: int, language: str = "auto") -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
            row = cur.fetchone()
            if not row: return
            user_id = row[0]
            
            cur.execute(
                """
                INSERT INTO transcriptions (user_id, filename, transcription, duration_seconds, language)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, filename, transcription, duration_seconds, language),
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
                    usage_seconds = 0,
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
    
    check_and_reset_monthly_quota(user)
    user = db_get_user_by_email(email)
    
    tier_limit_minutes = TIER_LIMITS.get(user["tier"], TIER_LIMITS["free"])
    tier_limit_seconds = tier_limit_minutes * 60
    usage_minutes = seconds_to_minutes(user["usage_seconds"])
    
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_seconds": user["usage_seconds"],
        "usage_minutes": usage_minutes,
        "transcription_count": user["transcription_count"],
        "limit_minutes": tier_limit_minutes,
        "limit_seconds": tier_limit_seconds,
        "remaining_seconds": max(0, tier_limit_seconds - user["usage_seconds"]),
        "remaining_minutes": max(0, tier_limit_minutes - usage_minutes),
        "subscription_status": user.get("subscription_status", "inactive"),
        "monthly_reset_date": user.get("monthly_reset_date").isoformat() if user.get("monthly_reset_date") else None,
    }

def db_get_transcription_history(email: str, limit: int = 10):
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            if not row: return {"history": [], "total": 0}
            user_id = row[0]

            cur.execute(
                """
                SELECT id, filename, transcription, duration_seconds, language, created_at
                FROM transcriptions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) FROM transcriptions WHERE user_id = %s", (user_id,))
            total = cur.fetchone()[0]

    history = [
        {
            "id": r[0],
            "filename": r[1],
            "transcription": r[2],
            "duration_seconds": r[3],
            "duration_minutes": seconds_to_minutes(r[3]),
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
        "version": "2.3.0",
        "status": "operational",
        "payment_provider": "PayPal",
        "supported_languages": list(SUPPORTED_LANGUAGES.keys())
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/languages")
async def get_languages():
    return {"supported": SUPPORTED_LANGUAGES, "all": ALL_LANGUAGES}

@app.post("/auth/signup")
async def signup(user: UserCreate):
    existing_user = db_get_user_by_email(user.email)
    if existing_user: raise HTTPException(status_code=400, detail="Email already registered")
    
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
            "usage_minutes": seconds_to_minutes(new_user["usage_seconds"]),
            "transcription_count": new_user["transcription_count"],
        },
    }

@app.post("/auth/login")
async def login(user: UserLogin):
    db_user = db_get_user_by_email(user.email)
    if not db_user: raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(user.password, db_user["password_hash"]): raise HTTPException(status_code=401, detail="Invalid credentials")
    
    check_and_reset_monthly_quota(db_user)
    db_user = db_get_user_by_email(user.email)
    
    token = create_access_token({"email": db_user["email"], "user_id": db_user["id"]})
    return {
        "token": token,
        "user": {
            "email": db_user["email"],
            "username": db_user["username"],
            "tier": db_user["tier"],
            "usage_seconds": db_user["usage_seconds"],
            "usage_minutes": seconds_to_minutes(db_user["usage_seconds"]),
            "transcription_count": db_user["transcription_count"],
        },
    }

@app.get("/auth/me")
async def get_current_user(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    check_and_reset_monthly_quota(user)
    user = db_get_user_by_email(email)
    
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_seconds": user["usage_seconds"],
        "usage_minutes": seconds_to_minutes(user["usage_seconds"]),
        "transcription_count": user["transcription_count"],
        "subscription_status": user.get("subscription_status", "inactive"),
    }

# -------- Transcription Endpoint --------
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    mode: str = Form("fast"),  # UPDATED: Accept mode
    user_data: Optional[dict] = Depends(optional_verify_token),
):
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Language '{language}' is not supported.")
    
    audio_bytes = await file.read()
    duration_seconds = get_audio_duration_seconds(audio_bytes, file.filename)
    
    # Guest Mode
    if not user_data:
        try:
            result = transcribe_with_whisper(audio_bytes, file.filename, language, mode)
            return {
                "success": result["success"],
                "transcription": result["transcription"],
                "language": result["language"],
                "filename": file.filename,
                "duration_seconds": duration_seconds,
                "duration_minutes": seconds_to_minutes(duration_seconds),
                "guest": True,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Logged-in User
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user: raise HTTPException(status_code=404, detail="User not found")

    check_and_reset_monthly_quota(user)
    user = db_get_user_by_email(email)

    tier = user.get("tier", "free")
    tier_limit_seconds = TIER_LIMITS.get(tier, TIER_LIMITS["free"]) * 60
    current_usage_seconds = user.get("usage_seconds", 0)

    if current_usage_seconds + duration_seconds > tier_limit_seconds:
        raise HTTPException(status_code=403, detail="Usage limit reached. Please upgrade your plan.")

    try:
        result = transcribe_with_whisper(audio_bytes, file.filename, language, mode)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["transcription"])

        db_update_user_usage(email, duration_seconds)
        db_insert_transcription(email, file.filename, result["transcription"], duration_seconds, result["language"])
        updated_user = db_get_user_by_email(email)

        return {
            "success": result["success"],
            "transcription": result["transcription"],
            "language": result["language"],
            "duration_seconds": duration_seconds,
            "duration_minutes": seconds_to_minutes(duration_seconds),
            "filename": file.filename,
            "usage": {
                "used_seconds": updated_user["usage_seconds"],
                "remaining_seconds": tier_limit_seconds - updated_user["usage_seconds"],
            },
        }
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/paypal/config")
async def get_paypal_config():
    if not PAYPAL_CLIENT_ID: raise HTTPException(status_code=500, detail="PayPal not configured")
    return {"client_id": PAYPAL_CLIENT_ID, "mode": PAYPAL_MODE}

@app.post("/api/create-subscription")
async def create_subscription(request: CheckoutRequest, user_data: dict = Depends(verify_token)):
    tier = request.tier
    if tier not in PAYPAL_PLANS or tier == "free": raise HTTPException(status_code=400, detail="Invalid tier")
    return {
        "plan_id": PAYPAL_PLANS[tier],
        "tier": tier,
        "return_url": f"{FRONTEND_URL}?payment=success&tier={tier}",
        "cancel_url": f"{FRONTEND_URL}?payment=cancelled"
    }

@app.post("/api/capture-subscription")
async def capture_subscription(request: PayPalCaptureRequest, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    try:
        subscription = get_paypal_subscription(request.subscription_id)
        if subscription["status"] not in ["ACTIVE", "APPROVED"]: raise HTTPException(status_code=400, detail="Subscription not active")
        payer_id = subscription.get("subscriber", {}).get("payer_id", "")
        db_update_paypal_subscription(email, request.subscription_id, payer_id, request.tier, "active")
        return {"success": True, "message": f"Successfully upgraded to {request.tier}"}
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/webhook/paypal")
async def paypal_webhook(request: Request):
    try:
        body = await request.json()
        event_type = body.get("event_type", "")
        resource = body.get("resource", {})
        if event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            sub_id = resource.get("id")
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT email FROM users WHERE paypal_subscription_id = %s", (sub_id,))
                    row = cur.fetchone()
                    if row: db_cancel_subscription(row[0])
        return {"status": "success"}
    except Exception as e: return {"status": "error", "message": str(e)}

@app.post("/api/cancel-subscription")
async def cancel_subscription_endpoint(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user or not user.get("paypal_subscription_id"): raise HTTPException(status_code=400, detail="No active subscription")
    try:
        cancel_paypal_subscription(user["paypal_subscription_id"])
        db_cancel_subscription(email)
        return {"message": "Subscription cancelled successfully"}
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_user_stats(email)

@app.get("/api/transcriptions/history")
async def get_transcription_history(limit: int = 10, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_transcription_history(email, limit=limit)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Voxify API v2.3.0")
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
