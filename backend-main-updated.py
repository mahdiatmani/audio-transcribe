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

# Load environment variables
load_dotenv()

app = FastAPI(title="TranscribeAI API", version="1.0.0")

# Configuration from .env
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))

# Self-hosted Whisper API URL (your Hugging Face Space URL)
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

# In-memory database
users_db = {}
transcriptions_db = {}

# Pricing tiers from .env
TIER_LIMITS = {
    "free": int(os.getenv("TIER_FREE_LIMIT", 15)),
    "starter": int(os.getenv("TIER_STARTER_LIMIT", 300)),
    "pro": int(os.getenv("TIER_PRO_LIMIT", 1000)),
    "enterprise": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000))
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

def transcribe_with_self_hosted_whisper(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe using self-hosted Whisper API on Hugging Face Spaces
    100% FREE - No API keys needed!
    """
    try:
        # Prepare file for upload
        files = {
            'file': (filename, audio_bytes, 'audio/mpeg')
        }
        
        # Call the self-hosted Whisper API
        response = requests.post(
            WHISPER_API_URL,
            files=files,
            timeout=120  # 2 minutes timeout for longer audio files
        )
        
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

# ============= Routes =============

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "TranscribeAI API - 100% FREE!",
        "version": "1.0.0",
        "config": {
            "whisper_configured": bool(WHISPER_API_URL),
            "whisper_endpoint": WHISPER_API_URL if WHISPER_API_URL else "Not configured",
            "cors_origins": CORS_ORIGINS,
            "tier_limits": TIER_LIMITS
        }
    }

@app.get("/api/whisper/health")
async def check_whisper_health():
    """Check if the self-hosted Whisper API is available"""
    try:
        health_url = WHISPER_API_URL.replace("/transcribe", "/health")
        response = requests.get(health_url, timeout=5)
        
        if response.status_code == 200:
            return {
                "status": "healthy",
                "whisper_api": "online",
                "endpoint": WHISPER_API_URL
            }
        else:
            return {
                "status": "unhealthy",
                "whisper_api": "offline",
                "endpoint": WHISPER_API_URL
            }
    except:
        return {
            "status": "unhealthy",
            "whisper_api": "unreachable",
            "endpoint": WHISPER_API_URL
        }

@app.post("/auth/signup")
async def signup(user: UserCreate):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    users_db[user.email] = {
        "username": user.username,
        "email": user.email,
        "password": hash_password(user.password),
        "tier": "free",
        "usage_minutes": 0,
        "transcription_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    
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
    user = users_db.get(credentials.email)
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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
    user_data: Optional[dict] = Depends(optional_verify_token)
):
    """
    Transcribe audio file - Works for both logged in and guest users
    Uses self-hosted Whisper API (100% FREE!)
    """
    
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
                "usage": {
                    "used": 0,
                    "limit": 15,
                    "remaining": 15
                },
                "note": "Guest mode - Create an account to save your transcriptions!"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # For authenticated users
    email = user_data.get("email")
    
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_db[email]
    tier_limit = TIER_LIMITS[user["tier"]]
    estimated_duration = 2
    
    if user["usage_minutes"] + estimated_duration > tier_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Usage limit reached. Please upgrade your plan."
        )
    
    try:
        audio_bytes = await file.read()
        transcription_text = transcribe_with_self_hosted_whisper(audio_bytes, file.filename)
        
        user["usage_minutes"] += estimated_duration
        user["transcription_count"] += 1
        
        transcription_id = f"{email}_{datetime.utcnow().timestamp()}"
        transcriptions_db[transcription_id] = {
            "email": email,
            "filename": file.filename,
            "transcription": transcription_text,
            "duration": estimated_duration,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "transcription": transcription_text,
            "duration": estimated_duration,
            "filename": file.filename,
            "usage": {
                "used": user["usage_minutes"],
                "limit": tier_limit,
                "remaining": tier_limit - user["usage_minutes"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_db[email]
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
    user_data: dict = Depends(verify_token)
):
    email = user_data.get("email")
    
    user_transcriptions = [
        {
            "id": tid,
            "filename": t["filename"],
            "transcription": t["transcription"],
            "duration": t["duration"],
            "timestamp": t["timestamp"]
        }
        for tid, t in transcriptions_db.items()
        if t["email"] == email
    ]
    
    user_transcriptions.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "history": user_transcriptions[:limit],
        "total": len(user_transcriptions)
    }

@app.post("/api/user/upgrade")
async def upgrade_tier(tier: str, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    if tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    users_db[email]["tier"] = tier
    
    return {
        "message": f"Upgraded to {tier}",
        "tier": tier,
        "new_limit": TIER_LIMITS[tier]
    }

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 TranscribeAI Backend - 100% FREE & SELF-HOSTED")
    print("=" * 60)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(f"🎙️ Whisper API: {WHISPER_API_URL if WHISPER_API_URL else '❌ Not configured'}")
    print("💰 Cost: $0.00")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"), 
        port=int(os.getenv("PORT", 8000)), 
        reload=os.getenv("DEBUG", "True") == "True"
    )
