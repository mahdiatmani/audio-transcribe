from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
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
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

# Load environment variables
load_dotenv()

app = FastAPI(title="TranscribeAI API", version="2.0.0")

# Configuration from .env
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))

# Self-hosted Whisper API URL
WHISPER_API_URL = os.getenv("WHISPER_API_URL", "")

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Parse CORS origins from .env
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now - you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pricing tiers
TIER_LIMITS = {
    "free": int(os.getenv("TIER_FREE_LIMIT", 15)),
    "starter": int(os.getenv("TIER_STARTER_LIMIT", 300)),
    "pro": int(os.getenv("TIER_PRO_LIMIT", 1000)),
    "enterprise": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000))
}

# ============= Database Connection =============
db_pool = None

def init_db():
    """Initialize database connection pool"""
    global db_pool
    try:
        if DATABASE_URL:
            db_pool = psycopg2.pool.SimpleConnectionPool(
                1, 10, DATABASE_URL
            )
            print("✅ Database pool created successfully")
            
            # Create tables if they don't exist
            conn = None
            try:
                conn = db_pool.getconn()
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            CREATE TABLE IF NOT EXISTS users (
                                id SERIAL PRIMARY KEY,
                                email VARCHAR(255) UNIQUE NOT NULL,
                                username VARCHAR(255) NOT NULL,
                                password VARCHAR(255) NOT NULL,
                                tier VARCHAR(50) DEFAULT 'free',
                                usage_minutes INTEGER DEFAULT 0,
                                transcription_count INTEGER DEFAULT 0,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )
                        """)
                        cur.execute("""
                            CREATE TABLE IF NOT EXISTS transcriptions (
                                id SERIAL PRIMARY KEY,
                                user_email VARCHAR(255),
                                filename VARCHAR(255),
                                transcription TEXT,
                                duration INTEGER,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )
                        """)
                        conn.commit()
                    print("✅ Database tables ready")
            finally:
                if conn:
                    db_pool.putconn(conn)
        else:
            print("⚠️ No DATABASE_URL set - using in-memory storage")
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        db_pool = None

@contextmanager
def get_db_connection():
    """Get a database connection from the pool"""
    conn = None
    try:
        if db_pool:
            conn = db_pool.getconn()
            yield conn
        else:
            yield None
    finally:
        if conn and db_pool:
            db_pool.putconn(conn)

# In-memory fallback storage
users_memory = {}
transcriptions_memory = {}

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

# ============= Database Operations =============
def db_get_user(email: str) -> Optional[dict]:
    """Get user from database or memory"""
    try:
        if db_pool:
            with get_db_connection() as conn:
                if conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                        result = cur.fetchone()
                        if result:
                            return dict(result)
                        return None
        # Fallback to memory
        return users_memory.get(email)
    except Exception as e:
        print(f"Database error in db_get_user: {e}")
        # Fallback to memory on error
        return users_memory.get(email)

def db_create_user(email: str, username: str, password_hash: str) -> bool:
    """Create user in database or memory"""
    try:
        if db_pool:
            with get_db_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO users (email, username, password, tier, usage_minutes, transcription_count)
                            VALUES (%s, %s, %s, 'free', 0, 0)
                        """, (email, username, password_hash))
                        conn.commit()
                        # Also store in memory as cache
                        users_memory[email] = {
                            "email": email,
                            "username": username,
                            "password": password_hash,
                            "tier": "free",
                            "usage_minutes": 0,
                            "transcription_count": 0
                        }
                        return True
        # Fallback to memory
        users_memory[email] = {
            "email": email,
            "username": username,
            "password": password_hash,
            "tier": "free",
            "usage_minutes": 0,
            "transcription_count": 0
        }
        return True
    except Exception as e:
        print(f"Database error in db_create_user: {e}")
        return False

def db_update_user_usage(email: str, minutes: int, count: int) -> bool:
    """Update user usage in database"""
    try:
        if db_pool:
            with get_db_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            UPDATE users 
                            SET usage_minutes = usage_minutes + %s, transcription_count = transcription_count + %s
                            WHERE email = %s
                        """, (minutes, count, email))
                        conn.commit()
        # Also update memory cache
        if email in users_memory:
            users_memory[email]["usage_minutes"] += minutes
            users_memory[email]["transcription_count"] += count
        return True
    except Exception as e:
        print(f"Database error in db_update_user_usage: {e}")
        return False

def db_check_email_exists(email: str) -> bool:
    """Check if email already exists"""
    try:
        if db_pool:
            with get_db_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
                        return cur.fetchone() is not None
        return email in users_memory
    except Exception as e:
        print(f"Database error in db_check_email_exists: {e}")
        return email in users_memory

def transcribe_with_self_hosted_whisper(audio_bytes: bytes, filename: str) -> str:
    """Transcribe using self-hosted Whisper API"""
    if not WHISPER_API_URL:
        return "⚠️ Whisper API not configured. Please set WHISPER_API_URL in environment variables."
    
    try:
        files = {'file': (filename, audio_bytes, 'audio/mpeg')}
        response = requests.post(WHISPER_API_URL, files=files, timeout=120)
        
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

# ============= Startup Event =============
@app.on_event("startup")
async def startup_event():
    init_db()

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
            "tier_limits": TIER_LIMITS,
            "supported_languages": 20
        }
    }

@app.get("/api/whisper/health")
async def check_whisper_health():
    """Check if the self-hosted Whisper API is available"""
    if not WHISPER_API_URL:
        return {"status": "not_configured", "whisper_api": "not set"}
    
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
async def signup(user: UserCreate):
    # Check if email already exists
    if db_check_email_exists(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    password_hash = hash_password(user.password)
    
    if not db_create_user(user.email, user.username, password_hash):
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    # Generate token
    token = create_access_token({"email": user.email})
    
    return {
        "message": "User created successfully",
        "token": token,
        "user": {
            "email": user.email,
            "username": user.username,
            "tier": "free",
            "usage_minutes": 0,
            "transcription_count": 0
        }
    }

@app.post("/auth/login")
async def login(credentials: UserLogin):
    # Get user from database
    user = db_get_user(credentials.email)
    
    # Check if user exists
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = create_access_token({"email": credentials.email})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "email": user.get("email", ""),
            "username": user.get("username", ""),
            "tier": user.get("tier", "free"),
            "usage_minutes": user.get("usage_minutes", 0),
            "transcription_count": user.get("transcription_count", 0)
        }
    }

@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user_data: Optional[dict] = Depends(optional_verify_token)
):
    """Transcribe audio file - Works for both logged in and guest users"""
    
    # For guest users (no authentication)
    if not user_data:
        try:
            audio_bytes = await file.read()
            transcription_text = transcribe_with_self_hosted_whisper(audio_bytes, file.filename)
            
            return {
                "success": True,
                "transcription": transcription_text,
                "duration": 2,
                "filename": file.filename,
                "usage": {"used": 0, "limit": 15, "remaining": 15},
                "note": "Guest mode - Create an account to save your transcriptions!"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # For authenticated users
    email = user_data.get("email")
    user = db_get_user(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limit = TIER_LIMITS.get(user.get("tier", "free"), 15)
    current_usage = user.get("usage_minutes", 0)
    estimated_duration = 2
    
    if current_usage + estimated_duration > tier_limit:
        raise HTTPException(status_code=403, detail="Usage limit reached. Please upgrade your plan.")
    
    try:
        audio_bytes = await file.read()
        transcription_text = transcribe_with_self_hosted_whisper(audio_bytes, file.filename)
        
        # Update user usage
        db_update_user_usage(email, estimated_duration, 1)
        new_usage = current_usage + estimated_duration
        
        return {
            "success": True,
            "transcription": transcription_text,
            "duration": estimated_duration,
            "filename": file.filename,
            "usage": {
                "used": new_usage,
                "limit": tier_limit,
                "remaining": tier_limit - new_usage
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    user = db_get_user(email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limit = TIER_LIMITS.get(user.get("tier", "free"), 15)
    usage = user.get("usage_minutes", 0)
    
    return {
        "email": user.get("email", ""),
        "username": user.get("username", ""),
        "tier": user.get("tier", "free"),
        "usage_minutes": usage,
        "transcription_count": user.get("transcription_count", 0),
        "limit": tier_limit,
        "remaining": tier_limit - usage
    }

@app.post("/api/user/upgrade")
async def upgrade_tier(tier: str, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    
    if tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    try:
        if db_pool:
            with get_db_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("UPDATE users SET tier = %s WHERE email = %s", (tier, email))
                        conn.commit()
        
        if email in users_memory:
            users_memory[email]["tier"] = tier
        
        return {"message": f"Upgraded to {tier}", "tier": tier, "new_limit": TIER_LIMITS[tier]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 TranscribeAI Backend v2.0")
    print("=" * 60)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(f"🎙️ Whisper API: {WHISPER_API_URL if WHISPER_API_URL else '❌ Not configured'}")
    print(f"🗄️ Database: {'PostgreSQL' if DATABASE_URL else 'In-Memory'}")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"), 
        port=int(os.getenv("PORT", 8000)), 
        reload=os.getenv("DEBUG", "True") == "True"
    )
