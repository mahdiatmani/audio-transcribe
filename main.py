from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from datetime import datetime, timedelta
import hashlib
import jwt
import requests
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import psycopg2.pool
from decimal import Decimal

# Load environment variables
load_dotenv()

app = FastAPI(title="TranscribeAI API", version="2.0.0")

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))
DATABASE_URL = os.getenv("DATABASE_URL")
WHISPER_API_URL = os.getenv("WHISPER_API_URL", "https://your-space-name.hf.space/transcribe")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database connection pool
db_pool = None

# Initialize database connection pool
def init_db_pool():
    global db_pool
    if DATABASE_URL:
        try:
            db_pool = psycopg2.pool.SimpleConnectionPool(1, 20, DATABASE_URL)
            print("✅ Database pool created successfully")
        except Exception as e:
            print(f"❌ Database pool creation failed: {e}")
            db_pool = None
    else:
        print("⚠️  No DATABASE_URL configured")

# Get database connection
def get_db():
    if db_pool:
        conn = db_pool.getconn()
        try:
            yield conn
        finally:
            db_pool.putconn(conn)
    else:
        yield None

# Pricing tiers
TIER_LIMITS = {
    "free": {"minutes": int(os.getenv("TIER_FREE_LIMIT", 15)), "price": 0.00},
    "starter": {"minutes": int(os.getenv("TIER_STARTER_LIMIT", 300)), "price": 9.00},
    "pro": {"minutes": int(os.getenv("TIER_PRO_LIMIT", 1000)), "price": 29.00},
    "enterprise": {"minutes": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000)), "price": 99.00}
}

# Supported languages
SUPPORTED_LANGUAGES = {
    "auto": "Auto-detect", "en": "English", "es": "Spanish", "fr": "French",
    "de": "German", "it": "Italian", "pt": "Portuguese", "nl": "Dutch",
    "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean",
    "ar": "Arabic", "hi": "Hindi", "tr": "Turkish", "pl": "Polish",
    "uk": "Ukrainian", "vi": "Vietnamese", "th": "Thai", "id": "Indonesian"
}

# ============= Models =============
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class SubscriptionUpdate(BaseModel):
    tier: str

# ============= Helper Functions =============
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
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def optional_verify_token(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    try:
        if not authorization.startswith("Bearer "):
            return None
        token = authorization.replace("Bearer ", "")
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.JWTError):
        return None

def transcribe_with_self_hosted_whisper(audio_bytes: bytes, filename: str, language: str = "auto") -> str:
    try:
        files = {'file': (filename, audio_bytes, 'audio/mpeg')}
        data = {'language': language}
        response = requests.post(WHISPER_API_URL, files=files, data=data, timeout=120)
        
        if response.status_code == 200:
            return response.json().get("transcription", "Transcription completed.")
        elif response.status_code == 503:
            return "⚠️ Whisper service starting. Try again in 30 seconds."
        else:
            return f"⚠️ Service unavailable. Status: {response.status_code}"
    except Exception as e:
        print(f"Transcription error: {e}")
        return "⚠️ Transcription failed."

# ============= Database Functions =============

def create_user_in_db(conn, username: str, email: str, password_hash: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO users (username, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, username, email, tier, usage_minutes, transcription_count, created_at
            """, (username, email, password_hash))
            user = cur.fetchone()
            conn.commit()
            return dict(user)
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_user_with_subscription(conn, email: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    u.id, u.username, u.email, u.password_hash, u.tier, 
                    u.usage_minutes, u.transcription_count, u.created_at,
                    s.id as subscription_id, s.status as subscription_status,
                    s.next_billing_date, s.price_monthly, s.auto_renew
                FROM users u
                LEFT JOIN subscriptions s ON u.email = s.user_email AND s.status = 'active'
                WHERE u.email = %s
            """, (email,))
            return dict(cur.fetchone()) if cur.fetchone() else None
    except Exception as e:
        print(f"Database error: {e}")
        return None

def update_user_usage(conn, email: str, usage_minutes: int, transcription_count: int):
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE users 
                SET usage_minutes = %s, transcription_count = %s, updated_at = NOW()
                WHERE email = %s
            """, (usage_minutes, transcription_count, email))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Failed to update usage: {e}")

def save_transcription(conn, email: str, filename: str, transcription: str, duration: int, language: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO transcriptions (user_email, filename, transcription, duration, language)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (email, filename, transcription, duration, language))
            result = cur.fetchone()
            conn.commit()
            return dict(result)
    except Exception as e:
        conn.rollback()
        print(f"Failed to save transcription: {e}")
        return None

def get_active_subscription(conn, email: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM subscriptions 
                WHERE user_email = %s AND status = 'active'
                ORDER BY created_at DESC LIMIT 1
            """, (email,))
            result = cur.fetchone()
            return dict(result) if result else None
    except Exception as e:
        print(f"Failed to get subscription: {e}")
        return None

def update_subscription(conn, email: str, new_tier: str):
    try:
        # Cancel old subscriptions
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE subscriptions 
                SET status = 'cancelled', cancelled_at = NOW()
                WHERE user_email = %s AND status = 'active'
            """, (email,))
            
            # Create new subscription
            next_billing = datetime.utcnow() + timedelta(days=30) if new_tier != 'free' else None
            cur.execute("""
                INSERT INTO subscriptions 
                (user_email, tier, status, price_monthly, next_billing_date, auto_renew)
                VALUES (%s, %s, 'active', %s, %s, TRUE)
                RETURNING id
            """, (email, new_tier, TIER_LIMITS[new_tier]['price'], next_billing))
            
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        print(f"Failed to update subscription: {e}")
        return False

def get_user_transcriptions(conn, email: str, limit: int = 10):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, filename, transcription, duration, language, created_at
                FROM transcriptions
                WHERE user_email = %s
                ORDER BY created_at DESC LIMIT %s
            """, (email, limit))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"Failed to get transcriptions: {e}")
        return []

def get_subscription_stats(conn, email: str):
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    s.tier,
                    s.status,
                    s.price_monthly,
                    s.next_billing_date,
                    s.auto_renew,
                    u.usage_minutes,
                    u.transcription_count
                FROM subscriptions s
                JOIN users u ON s.user_email = u.email
                WHERE s.user_email = %s AND s.status = 'active'
            """, (email,))
            result = cur.fetchone()
            return dict(result) if result else None
    except Exception as e:
        print(f"Failed to get stats: {e}")
        return None

# ============= Startup/Shutdown =============
@app.on_event("startup")
async def startup_event():
    init_db_pool()

@app.on_event("shutdown")
async def shutdown_event():
    if db_pool:
        db_pool.closeall()

# ============= Routes =============

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "TranscribeAI API v2.0 - WITH SUBSCRIPTIONS!",
        "version": "2.0.0",
        "database": "connected" if db_pool else "in-memory",
        "features": ["auth", "subscriptions", "payments", "transcriptions"],
        "config": {
            "whisper_configured": bool(WHISPER_API_URL),
            "tier_limits": {k: v['minutes'] for k, v in TIER_LIMITS.items()},
            "supported_languages": len(SUPPORTED_LANGUAGES)
        }
    }

@app.get("/api/languages")
async def get_supported_languages():
    return {"languages": SUPPORTED_LANGUAGES}

@app.get("/api/pricing")
async def get_pricing():
    return {
        "tiers": [
            {"tier": k, "minutes": v['minutes'], "price": v['price']} 
            for k, v in TIER_LIMITS.items()
        ]
    }

@app.post("/auth/signup")
async def signup(user: UserCreate, conn = Depends(get_db)):
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    password_hash = hash_password(user.password)
    db_user = create_user_in_db(conn, user.username, user.email, password_hash)
    token = create_access_token({"email": user.email})
    
    # Get subscription info (auto-created by trigger)
    subscription = get_active_subscription(conn, user.email)
    
    return {
        "message": "User created successfully",
        "token": token,
        "user": {
            "email": db_user["email"],
            "username": db_user["username"],
            "tier": db_user["tier"],
            "usage_minutes": db_user["usage_minutes"],
            "transcription_count": db_user["transcription_count"],
            "subscription": {
                "status": subscription['status'] if subscription else "active",
                "next_billing": subscription['next_billing_date'].isoformat() if subscription and subscription['next_billing_date'] else None
            }
        }
    }

@app.post("/auth/login")
async def login(credentials: UserLogin, conn = Depends(get_db)):
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    user = get_user_with_subscription(conn, credentials.email)
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"email": credentials.email})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "email": user["email"],
            "username": user["username"],
            "tier": user["tier"],
            "usage_minutes": user["usage_minutes"],
            "transcription_count": user["transcription_count"],
            "subscription": {
                "status": user.get("subscription_status", "active"),
                "next_billing": user["next_billing_date"].isoformat() if user.get("next_billing_date") else None,
                "auto_renew": user.get("auto_renew", True)
            }
        }
    }

@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    user_data: Optional[dict] = Depends(optional_verify_token),
    conn = Depends(get_db)
):
    if language not in SUPPORTED_LANGUAGES:
        language = "auto"
    
    # Guest users
    if not user_data:
        try:
            audio_bytes = await file.read()
            transcription_text = transcribe_with_self_hosted_whisper(audio_bytes, file.filename, language)
            return {
                "success": True,
                "transcription": transcription_text,
                "duration": 2,
                "filename": file.filename,
                "language": language,
                "language_name": SUPPORTED_LANGUAGES.get(language, "Auto-detect"),
                "usage": {"used": 0, "limit": 15, "remaining": 15},
                "note": "Guest mode - Create account to save transcriptions!"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # Authenticated users
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    email = user_data.get("email")
    user = get_user_with_subscription(conn, email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limit = TIER_LIMITS[user["tier"]]["minutes"]
    estimated_duration = 2
    
    if user["usage_minutes"] + estimated_duration > tier_limit:
        raise HTTPException(status_code=403, detail=f"Usage limit reached. Upgrade to continue.")
    
    try:
        audio_bytes = await file.read()
        transcription_text = transcribe_with_self_hosted_whisper(audio_bytes, file.filename, language)
        
        new_usage_minutes = user["usage_minutes"] + estimated_duration
        new_transcription_count = user["transcription_count"] + 1
        
        update_user_usage(conn, email, new_usage_minutes, new_transcription_count)
        save_transcription(conn, email, file.filename, transcription_text, estimated_duration, language)
        
        return {
            "success": True,
            "transcription": transcription_text,
            "duration": estimated_duration,
            "filename": file.filename,
            "language": language,
            "language_name": SUPPORTED_LANGUAGES.get(language, "Auto-detect"),
            "usage": {
                "used": new_usage_minutes,
                "limit": tier_limit,
                "remaining": tier_limit - new_usage_minutes
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/subscription")
async def get_user_subscription(user_data: dict = Depends(verify_token), conn = Depends(get_db)):
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    email = user_data.get("email")
    stats = get_subscription_stats(conn, email)
    
    if not stats:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    tier_info = TIER_LIMITS[stats["tier"]]
    
    return {
        "tier": stats["tier"],
        "status": stats["status"],
        "price_monthly": float(stats["price_monthly"]),
        "usage_minutes": stats["usage_minutes"],
        "transcription_count": stats["transcription_count"],
        "limit_minutes": tier_info["minutes"],
        "remaining_minutes": tier_info["minutes"] - stats["usage_minutes"],
        "next_billing_date": stats["next_billing_date"].isoformat() if stats["next_billing_date"] else None,
        "auto_renew": stats["auto_renew"]
    }

@app.post("/api/user/subscription/upgrade")
async def upgrade_subscription(
    subscription: SubscriptionUpdate,
    user_data: dict = Depends(verify_token),
    conn = Depends(get_db)
):
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    if subscription.tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    email = user_data.get("email")
    
    if update_subscription(conn, email, subscription.tier):
        return {
            "message": f"Upgraded to {subscription.tier}",
            "tier": subscription.tier,
            "price": TIER_LIMITS[subscription.tier]["price"],
            "new_limit": TIER_LIMITS[subscription.tier]["minutes"]
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to update subscription")

@app.get("/api/transcriptions/history")
async def get_transcription_history(
    limit: int = 10,
    user_data: dict = Depends(verify_token),
    conn = Depends(get_db)
):
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    email = user_data.get("email")
    transcriptions = get_user_transcriptions(conn, email, limit)
    
    return {"history": transcriptions, "total": len(transcriptions)}

if __name__ == "__main__":
    import uvicorn
    print("=" * 70)
    print("🚀 TranscribeAI Backend v2.0 - WITH SUBSCRIPTIONS & PAYMENTS!")
    print("=" * 70)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(f"🎙️ Whisper API: {WHISPER_API_URL}")
    print(f"🗄️  Database: {'PostgreSQL (Supabase)' if DATABASE_URL else 'In-Memory'}")
    print(f"💳 Subscriptions: ENABLED")
    print("💰 Cost: $0.00")
    print("=" * 70)
    
    uvicorn.run("main:app", host=os.getenv("HOST", "0.0.0.0"), 
                port=int(os.getenv("PORT", 8000)), 
                reload=os.getenv("DEBUG", "True") == "True")
