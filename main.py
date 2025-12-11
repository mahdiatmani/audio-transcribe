from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
import os
from datetime import datetime, timedelta
import hashlib
import jwt
import requests
from dotenv import load_dotenv
from psycopg2.pool import SimpleConnectionPool
import psycopg2
from contextlib import contextmanager

# -------------------------------------------------
# Environment & basic config
# -------------------------------------------------
load_dotenv()

app = FastAPI(title="TranscribeAI API", version="1.0.0")

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 7))

WHISPER_API_URL = os.getenv("WHISPER_API_URL", "https://your-space-name.hf.space/transcribe")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

DATABASE_URL = os.getenv("DATABASE_URL")  # Supabase / Postgres connection string

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Pricing tiers from .env (in minutes)
TIER_LIMITS: Dict[str, int] = {
    "free": int(os.getenv("TIER_FREE_LIMIT", 15)),
    "starter": int(os.getenv("TIER_STARTER_LIMIT", 300)),
    "pro": int(os.getenv("TIER_PRO_LIMIT", 1000)),
    "enterprise": int(os.getenv("TIER_ENTERPRISE_LIMIT", 10000)),
}

# -------------------------------------------------
# Database pool
# -------------------------------------------------
db_pool: Optional[SimpleConnectionPool] = None


@app.on_event("startup")
def startup_event():
    global db_pool
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set in environment variables")

    # Create connection pool
    db_pool = SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=DATABASE_URL,
        sslmode="require" if "sslmode" not in DATABASE_URL else None,
    )
    print("✅ Database pool created successfully")

    # Simple check: ensure users table exists
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users LIMIT 1;")
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


# -------------------------------------------------
# Helper functions (auth, hashing, etc.)
# -------------------------------------------------
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
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def optional_verify_token(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Verify JWT token if provided, otherwise return None for guest access"""
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def transcribe_with_self_hosted_whisper(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe using self-hosted Whisper API on Hugging Face Spaces
    """
    try:
        files = {"file": (filename, audio_bytes, "audio/mpeg")}
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


# -------------------------------------------------
# DB helper functions
# -------------------------------------------------
def db_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, email, password_hash, tier,
                       usage_minutes, transcription_count,
                       created_at, updated_at
                FROM users
                WHERE email = %s
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
        "created_at": row[7],
        "updated_at": row[8],
    }


def db_create_user(username: str, email: str, password_hash: str) -> Dict[str, Any]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, tier, usage_minutes, transcription_count)
                VALUES (%s, %s, %s, %s, 0, 0)
                RETURNING id, username, email, tier, usage_minutes, transcription_count, created_at, updated_at
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
        "created_at": row[6],
        "updated_at": row[7],
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


def db_insert_transcription(
    user_email: str,
    filename: str,
    transcription: str,
    duration: int,
    language: str = "auto",
) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO transcriptions (user_email, filename, transcription, duration, language)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_email, filename, transcription, duration, language),
            )


def db_get_user_stats(email: str) -> Dict[str, Any]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT username, email, tier, usage_minutes, transcription_count
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    username, email, tier, usage_minutes, transcription_count = row
    tier_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

    return {
        "email": email,
        "username": username,
        "tier": tier,
        "usage_minutes": usage_minutes,
        "transcription_count": transcription_count,
        "limit": tier_limit,
        "remaining": tier_limit - usage_minutes,
    }


def db_get_transcription_history(email: str, limit: int = 10) -> Dict[str, Any]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, filename, transcription, duration, created_at
                FROM transcriptions
                WHERE user_email = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (email, limit),
            )
            rows = cur.fetchall()

    history = [
        {
            "id": r[0],
            "filename": r[1],
            "transcription": r[2],
            "duration": r[3],
            "timestamp": r[4].isoformat() if isinstance(r[4], datetime) else r[4],
        }
        for r in rows
    ]

    return {"history": history, "total": len(history)}


def db_update_user_tier(email: str, tier: str) -> None:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET tier = %s, updated_at = CURRENT_TIMESTAMP
                WHERE email = %s
                """,
                (tier, email),
            )


# -------------------------------------------------
# Routes
# -------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "TranscribeAI API",
        "version": "1.0.0",
        "config": {
            "whisper_configured": bool(WHISPER_API_URL),
            "whisper_endpoint": WHISPER_API_URL if WHISPER_API_URL else "Not configured",
            "cors_origins": CORS_ORIGINS,
            "tier_limits": TIER_LIMITS,
        },
    }


@app.get("/api/whisper/health")
async def check_whisper_health():
    try:
        health_url = WHISPER_API_URL.replace("/transcribe", "/health")
        response = requests.get(health_url, timeout=5)

        if response.status_code == 200:
            return {
                "status": "healthy",
                "whisper_api": "online",
                "endpoint": WHISPER_API_URL,
            }
        else:
            return {
                "status": "unhealthy",
                "whisper_api": "offline",
                "endpoint": WHISPER_API_URL,
            }
    except Exception:
        return {
            "status": "unhealthy",
            "whisper_api": "unreachable",
            "endpoint": WHISPER_API_URL,
        }


# -------- Auth --------
@app.post("/auth/signup")
async def signup(user: UserCreate):
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


@app.post("/auth/login")
async def login(credentials: UserLogin):
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


# -------- Transcription --------
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user_data: Optional[dict] = Depends(optional_verify_token),
):
    """
    Transcribe audio file.
    - Guest users: no DB, just call Whisper and return result.
    - Auth users: enforce tier limits and store usage + transcription in DB.
    """
    # Guest mode
    if not user_data:
        try:
            audio_bytes = await file.read()
            transcription_text = transcribe_with_self_hosted_whisper(
                audio_bytes, file.filename
            )

            return {
                "success": True,
                "transcription": transcription_text,
                "duration": 2,  # you can compute real duration if you want
                "filename": file.filename,
                "usage": {"used": 0, "limit": 15, "remaining": 15},
                "note": "Guest mode - create an account to save your transcriptions!",
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Authenticated mode
    email = user_data.get("email")
    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user["tier"]
    tier_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

    # Here we fake a 2-minute duration.
    # Ideally, get real audio duration from the file.
    estimated_duration = 2

    if user["usage_minutes"] + estimated_duration > tier_limit:
        raise HTTPException(
            status_code=403,
            detail="Usage limit reached. Please upgrade your plan.",
        )

    try:
        audio_bytes = await file.read()
        transcription_text = transcribe_with_self_hosted_whisper(
            audio_bytes, file.filename
        )

        # Update usage + count
        db_update_user_usage(email, estimated_duration)

        # Store transcription
        db_insert_transcription(
            user_email=email,
            filename=file.filename,
            transcription=transcription_text,
            duration=estimated_duration,
        )

        # Fetch updated stats for response
        updated_user = db_get_user_by_email(email)

        return {
            "success": True,
            "transcription": transcription_text,
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


# -------- User stats / history / upgrade --------
@app.get("/api/user/stats")
async def get_user_stats(user_data: dict = Depends(verify_token)):
    email = user_data.get("email")
    return db_get_user_stats(email)


@app.get("/api/transcriptions/history")
async def get_transcription_history(
    limit: int = 10, user_data: dict = Depends(verify_token)
):
    email = user_data.get("email")
    return db_get_transcription_history(email, limit=limit)


@app.post("/api/user/upgrade")
async def upgrade_tier(tier: str, user_data: dict = Depends(verify_token)):
    email = user_data.get("email")

    if tier not in TIER_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid tier")

    user = db_get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_update_user_tier(email, tier)

    return {
        "message": f"Upgraded to {tier}",
        "tier": tier,
        "new_limit": TIER_LIMITS[tier],
    }


# -------------------------------------------------
# Dev entrypoint
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("🚀 TranscribeAI Backend")
    print("=" * 60)
    print(f"📝 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    print(
        f"🎙️ Whisper API: {WHISPER_API_URL if WHISPER_API_URL else '❌ Not configured'}"
    )
    print("=" * 60)

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True") == "True",
    )
