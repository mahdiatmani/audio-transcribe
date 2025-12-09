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

# Load environment variables
load_dotenv()

app = FastAPI(title="TranscribeAI API", version="2.0.0")

# Configuration from .env
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))

# Database Configuration (Supabase PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")

# Self-hosted Whisper API URL
WHISPER_API_URL = os.getenv("WHISPER_API_URL", "https://your-space-name.hf.space/transcribe")

# Parse CORS origins from .env
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
            db_pool = psycopg2.pool.SimpleConnectionPool(
                1, 20,  # min and max connections
                DATABASE_URL
            )
            print("✅ Database pool created successfully")
        except Exception as e:
            print(f"❌ Database pool creation failed: {e}")
            db_pool = None
    else:
        print("⚠️  No DATABASE_URL configured - using in-memory storage")

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

# Pricing tiers from .env
TIER_LIMITS = {
    "free": int(os.getenv("TIER_FREE_LIMIT", 15)),
    "starter": int(os.getenv("TIER_STARTER_LIMIT", 300)),
    "pro": int(os.getenv("TIER_PRO_LIMIT", 1000)),
    "enterprise": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000))
}

# Supported languages
SUPPORTED_LANGUAGES = {
    "auto": "Auto-detect",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "tr": "Turkish",
    "pl": "Polish",
    "uk": "Ukrainian",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian"
}

# ============= Models =============
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ============= Helper Functions =============
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def optional_verify_token(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Verify JWT token if provided, otherwise return None for guest access"""
    if not authorization:
        return None
    
    try:
        if not authorization.startswith("Bearer "):
            return None
        
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.JWTError):
        return None

def transcribe_with_self_hosted_whisper(audio_bytes: bytes, filename: str, language: str = "auto") -> str:
    """Transcribe using self-hosted Whisper API"""
    try:
        files = {'file': (filename, audio_bytes, 'audio/mpeg')}
        data = {'language': language}
        
        response = requests.post(WHISPER_API_URL, files=files, data=data, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            return result.get("transcription", "Transcription completed successfully.")
        elif response.status_code == 503:
            return "⚠️ Whisper service is starting up. Please try again in 20-30 seconds."
        else:
            return f"⚠️ Service temporarily unavailable. Status: {response.status_code}"
            
    except requests.exceptions.Timeout:
        return "⚠️ Transcription took too long. Try with a shorter audio file."
    except requests.exceptions.RequestException as e:
        print(f"Transcription error: {str(e)}")
        return "⚠️ Failed to connect to transcription service. Please try again."
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return "⚠️ Transcription failed. Please try again."

# ============= Database Functions =============

def create_user_in_db(conn, username: str, email: str, password_hash: str):
    """Create a new user in the database"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO users (username, email, password_hash, tier, usage_minutes, transcription_count)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, username, email, tier, usage_minutes, transcription_count, created_at
            """, (username, email, password_hash, 'free', 0, 0))
            
            user = cur.fetchone()
            conn.commit()
            return dict(user)
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_user_by_email(conn, email: str):
    """Get user by email from database"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, username, email, password_hash, tier, usage_minutes, transcription_count, created_at
                FROM users WHERE email = %s
            """, (email,))
            
            user = cur.fetchone()
            return dict(user) if user else None
    except Exception as e:
        print(f"Database error: {e}")
        return None

def update_user_usage(conn, email: str, usage_minutes: int, transcription_count: int):
    """Update user usage statistics"""
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
    """Save transcription to database"""
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

def get_user_transcriptions(conn, email: str, limit: int = 10):
    """Get user's transcription history"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, filename, transcription, duration, language, created_at
                FROM transcriptions
                WHERE user_email = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (email, limit))
            
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"Failed to get transcriptions: {e}")
        return []

# ============= Startup Event =============
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
        "message": "TranscribeAI API - 100% FREE!",
        "version": "2.0.0",
        "database": "connected" if db_pool else "in-memory",
        "config": {
            "whisper_configured": bool(WHISPER_API_URL),
            "whisper_endpoint": WHISPER_API_URL if WHISPER_API_URL else "Not configured",
            "cors_origins": CORS_ORIGINS,
            "tier_limits": TIER_LIMITS,
            "supported_languages": list(SUPPORTED_LANGUAGES.keys())
        }
    }

@app.get("/api/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {"languages": SUPPORTED_LANGUAGES}

@app.get("/api/whisper/health")
async def check_whisper_health():
    """Check if the self-hosted Whisper API is available"""
    try:
        health_url = WHISPER_API_URL.replace("/transcribe", "/health")
        response = requests.get(health_url, timeout=5)
        
        if response.status_code == 200:
            return {"status": "healthy", "whisper_api": "online", "endpoint": WHISPER_API_URL}
        else:
            return {"status": "unhealthy", "whisper_api": "offline", "endpoint": WHISPER_API_URL}
    except:
        return {"status": "unhealthy", "whisper_api": "unreachable", "endpoint": WHISPER_API_URL}

@app.post("/auth/signup")
async def signup(user: UserCreate, conn = Depends(get_db)):
    """Create a new user account"""
    
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    # Hash password
    password_hash = hash_password(user.password)
    
    # Create user in database
    db_user = create_user_in_db(conn, user.username, user.email, password_hash)
    
    # Create JWT token
    token = create_access_token({"email": user.email})
    
    return {
        "message": "User created successfully",
        "token": token,
        "user": {
            "email": db_user["email"],
            "username": db_user["username"],
            "tier": db_user["tier"],
            "usage_minutes": db_user["usage_minutes"],
            "transcription_count": db_user["transcription_count"]
        }
    }

@app.post("/auth/login")
async def login(credentials: UserLogin, conn = Depends(get_db)):
    """Login to existing account"""
    
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    # Get user from database
    user = get_user_by_email(conn, credentials.email)
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create JWT token
    token = create_access_token({"email": credentials.email})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "email": user["email"],
            "username": user["username"],
            "tier": user["tier"],
            "usage_minutes": user["usage_minutes"],
            "transcription_count": user["transcription_count"]
        }
    }

@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    user_data: Optional[dict] = Depends(optional_verify_token),
    conn = Depends(get_db)
):
    """Transcribe audio file - Works for both logged in and guest users"""
    
    # Validate language
    if language not in SUPPORTED_LANGUAGES:
        language = "auto"
    
    # For guest users (no authentication)
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
                "note": "Guest mode - Create an account to save your transcriptions!"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # For authenticated users
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    email = user_data.get("email")
    user = get_user_by_email(conn, email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limit = TIER_LIMITS[user["tier"]]
    estimated_duration = 2
    
    if user["usage_minutes"] + estimated_duration > tier_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Usage limit reached. Please upgrade your plan."
        )
    
    try:
        audio_bytes = await file.read()
        transcription_text = transcribe_with_self_hosted_whisper(audio_bytes, file.filename, language)
        
        # Update usage
        new_usage_minutes = user["usage_minutes"] + estimated_duration
        new_transcription_count = user["transcription_count"] + 1
        
        update_user_usage(conn, email, new_usage_minutes, new_transcription_count)
        
        # Save transcription to database
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

@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token), conn = Depends(get_db)):
    """Get user statistics"""
    
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    email = user_data.get("email")
    user = get_user_by_email(conn, email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limit = TIER_LIMITS[user["tier"]]
    
    return {
        "email": user["email"],
        "username": user["username"],
        "tier": user["tier"],
        "usage_minutes": user["usage_minutes"],
        "transcription_count": user["transcription_count"],
        "limit": tier_limit,
        "remaining": tier_limit - user["usage_minutes"]
    }

@app.get("/api/transcriptions/history")
async def get_transcription_history(
    limit: int = 10,
    user_data: dict = Depends(verify_token),
    conn = Depends(get_db)
):
    """Get user's transcription history"""
    
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    email = user_data.get("email")
    transcriptions = get_user_transcriptions(conn, email, limit)
    
    return {
        "history": transcriptions,
        "total": len(transcriptions)
    }

@app.post("/api/user/upgrade")
async def upgrade_tier(
    tier: str,
    user_data: dict = Depends(verify_token),
    conn = Depends(get_db)
):
    """Upgrade user tier"""
    
    if not conn:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    if tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    email = user_data.get("email")
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE users SET tier = %s, updated_at = NOW()
                WHERE email = %s
            """, (tier, email))
            conn.commit()
        
        return {
            "message": f"Upgraded to {tier}",
            "tier": tier,
            "new_limit": TIER_LIMITS[tier]
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 TranscribeAI Backend v2.0 - WITH DATABASE!")
    print("=" * 60)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(f"🎙️ Whisper API: {WHISPER_API_URL}")
    print(f"🗄️  Database: {'PostgreSQL (Supabase)' if DATABASE_URL else 'In-Memory'}")
    print(f"🌍 Supported Languages: {len(SUPPORTED_LANGUAGES)}")
    print("💰 Cost: $0.00")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"), 
        port=int(os.getenv("PORT", 8000)), 
        reload=os.getenv("DEBUG", "True") == "True"
    )
