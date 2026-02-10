from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudflare config
CF_API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', '')
CF_ZONE_ID = os.environ.get('CLOUDFLARE_ZONE_ID', '')
CF_API_BASE = "https://api.cloudflare.com/client/v4"
DOMAIN_NAME = os.environ.get('DOMAIN_NAME', 'khalilv2.com')

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# Plan limits
PLAN_LIMITS = {"free": 2, "pro": 50, "enterprise": 500}

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    plan: str
    role: str
    record_count: int
    record_limit: int
    created_at: str

class DNSRecordCreate(BaseModel):
    name: str = Field(min_length=1, description="Subdomain name")
    record_type: str = Field(description="A, AAAA, or CNAME")
    content: str = Field(min_length=1, description="IP or target domain")
    ttl: int = Field(default=1, ge=1, le=86400)
    proxied: bool = Field(default=False)

class AdminDNSRecordCreate(BaseModel):
    user_id: str
    name: str = Field(min_length=1)
    record_type: str
    content: str = Field(min_length=1)
    ttl: int = Field(default=1, ge=1, le=86400)
    proxied: bool = Field(default=False)

class DNSRecordUpdate(BaseModel):
    content: Optional[str] = None
    ttl: Optional[int] = Field(default=None, ge=1, le=86400)
    proxied: Optional[bool] = None

class PlanUpdate(BaseModel):
    plan: str = Field(description="free, pro, or enterprise")

class SettingsUpdate(BaseModel):
    telegram_id: Optional[str] = None
    telegram_url: Optional[str] = None
    contact_message_en: Optional[str] = None
    contact_message_fa: Optional[str] = None

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============== CLOUDFLARE API ==============

async def cf_create_record(name: str, record_type: str, content: str, ttl: int = 1, proxied: bool = False):
    full_name = f"{name}.{DOMAIN_NAME}" if name != "@" else DOMAIN_NAME
    async with httpx.AsyncClient() as client_http:
        response = await client_http.post(
            f"{CF_API_BASE}/zones/{CF_ZONE_ID}/dns_records",
            headers={"Authorization": f"Bearer {CF_API_TOKEN}", "Content-Type": "application/json"},
            json={"type": record_type, "name": full_name, "content": content, "ttl": ttl, "proxied": proxied}
        )
        data = response.json()
        if not data.get("success"):
            errors = data.get("errors", [])
            error_msg = errors[0].get("message", "Unknown error") if errors else "Failed to create record"
            raise HTTPException(status_code=400, detail=error_msg)
        return data["result"]

async def cf_update_record(cf_record_id: str, record_type: str, name: str, content: str, ttl: int = 1, proxied: bool = False):
    async with httpx.AsyncClient() as client_http:
        response = await client_http.put(
            f"{CF_API_BASE}/zones/{CF_ZONE_ID}/dns_records/{cf_record_id}",
            headers={"Authorization": f"Bearer {CF_API_TOKEN}", "Content-Type": "application/json"},
            json={"type": record_type, "name": name, "content": content, "ttl": ttl, "proxied": proxied}
        )
        data = response.json()
        if not data.get("success"):
            errors = data.get("errors", [])
            error_msg = errors[0].get("message", "Unknown error") if errors else "Failed to update record"
            raise HTTPException(status_code=400, detail=error_msg)
        return data["result"]

async def cf_delete_record(cf_record_id: str):
    async with httpx.AsyncClient() as client_http:
        response = await client_http.delete(
            f"{CF_API_BASE}/zones/{CF_ZONE_ID}/dns_records/{cf_record_id}",
            headers={"Authorization": f"Bearer {CF_API_TOKEN}"}
        )
        data = response.json()
        if not data.get("success"):
            errors = data.get("errors", [])
            error_msg = errors[0].get("message", "Unknown error") if errors else "Failed to delete record"
            raise HTTPException(status_code=400, detail=error_msg)
        return True

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "plan": "free",
        "role": "user",
        "record_count": 0,
        "record_limit": PLAN_LIMITS["free"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "plan": "free",
            "role": "user",
            "record_count": 0,
            "record_limit": PLAN_LIMITS["free"],
            "created_at": user_doc["created_at"]
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user["plan"],
            "role": user.get("role", "user"),
            "record_count": user["record_count"],
            "record_limit": user["record_limit"],
            "created_at": user["created_at"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    record_count = await db.dns_records.count_documents({"user_id": current_user["id"]})
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "plan": current_user["plan"],
        "role": current_user.get("role", "user"),
        "record_count": record_count,
        "record_limit": current_user["record_limit"],
        "created_at": current_user["created_at"]
    }

# ============== DNS ROUTES ==============

@api_router.get("/dns/records")
async def list_records(current_user: dict = Depends(get_current_user)):
    records = await db.dns_records.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    return {"records": records, "count": len(records)}

@api_router.post("/dns/records", status_code=201)
async def create_record(record_data: DNSRecordCreate, current_user: dict = Depends(get_current_user)):
    # Validate record type
    if record_data.record_type not in ["A", "AAAA", "CNAME"]:
        raise HTTPException(status_code=400, detail="Only A, AAAA, and CNAME records are supported")
    
    # Check plan limits
    record_count = await db.dns_records.count_documents({"user_id": current_user["id"]})
    if record_count >= current_user["record_limit"]:
        raise HTTPException(
            status_code=403,
            detail=f"Record limit reached ({current_user['record_limit']}). Upgrade your plan for more records."
        )
    
    # Check for duplicate subdomain
    full_name = f"{record_data.name}.{DOMAIN_NAME}" if record_data.name != "@" else DOMAIN_NAME
    existing = await db.dns_records.find_one(
        {"full_name": full_name, "record_type": record_data.record_type},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Record {full_name} ({record_data.record_type}) already exists")
    
    # Create on Cloudflare
    cf_result = await cf_create_record(
        name=record_data.name,
        record_type=record_data.record_type,
        content=record_data.content,
        ttl=record_data.ttl,
        proxied=record_data.proxied
    )
    
    # Store in MongoDB
    record_id = str(uuid.uuid4())
    record_doc = {
        "id": record_id,
        "cf_record_id": cf_result["id"],
        "user_id": current_user["id"],
        "name": record_data.name,
        "full_name": full_name,
        "record_type": record_data.record_type,
        "content": record_data.content,
        "ttl": record_data.ttl,
        "proxied": record_data.proxied,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.dns_records.insert_one(record_doc)
    
    # Update user record count
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"record_count": 1}}
    )
    
    return {
        "id": record_id,
        "cf_record_id": cf_result["id"],
        "user_id": current_user["id"],
        "name": record_data.name,
        "full_name": full_name,
        "record_type": record_data.record_type,
        "content": record_data.content,
        "ttl": record_data.ttl,
        "proxied": record_data.proxied,
        "created_at": record_doc["created_at"]
    }

@api_router.put("/dns/records/{record_id}")
async def update_record(record_id: str, update_data: DNSRecordUpdate, current_user: dict = Depends(get_current_user)):
    record = await db.dns_records.find_one(
        {"id": record_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Build update fields
    content = update_data.content if update_data.content is not None else record["content"]
    ttl = update_data.ttl if update_data.ttl is not None else record["ttl"]
    proxied = update_data.proxied if update_data.proxied is not None else record["proxied"]
    
    # Update on Cloudflare
    await cf_update_record(
        cf_record_id=record["cf_record_id"],
        record_type=record["record_type"],
        name=record["full_name"],
        content=content,
        ttl=ttl,
        proxied=proxied
    )
    
    # Update in MongoDB
    update_fields = {"content": content, "ttl": ttl, "proxied": proxied}
    await db.dns_records.update_one(
        {"id": record_id},
        {"$set": update_fields}
    )
    
    record.update(update_fields)
    return record

@api_router.delete("/dns/records/{record_id}")
async def delete_record(record_id: str, current_user: dict = Depends(get_current_user)):
    record = await db.dns_records.find_one(
        {"id": record_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Delete from Cloudflare
    await cf_delete_record(record["cf_record_id"])
    
    # Delete from MongoDB
    await db.dns_records.delete_one({"id": record_id})
    
    # Update user record count
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"record_count": -1}}
    )
    
    return {"message": "Record deleted successfully"}

# ============== PLANS ROUTES ==============

@api_router.get("/plans")
async def get_plans():
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "name_fa": "رایگان",
                "price": "$0",
                "price_fa": "رایگان",
                "record_limit": 2,
                "features": [
                    "2 DNS Records",
                    "A, AAAA, CNAME Support",
                    "Basic Dashboard",
                    "Community Support"
                ],
                "features_fa": [
                    "۲ رکورد DNS",
                    "پشتیبانی A، AAAA، CNAME",
                    "داشبورد پایه",
                    "پشتیبانی انجمن"
                ],
                "popular": False
            },
            {
                "id": "pro",
                "name": "Pro",
                "name_fa": "حرفه‌ای",
                "price": "$5/mo",
                "price_fa": "۵ دلار/ماه",
                "record_limit": 50,
                "features": [
                    "50 DNS Records",
                    "A, AAAA, CNAME Support",
                    "Advanced Dashboard",
                    "Priority Support",
                    "API Access"
                ],
                "features_fa": [
                    "۵۰ رکورد DNS",
                    "پشتیبانی A، AAAA، CNAME",
                    "داشبورد پیشرفته",
                    "پشتیبانی اولویت‌دار",
                    "دسترسی API"
                ],
                "popular": True
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "name_fa": "سازمانی",
                "price": "$20/mo",
                "price_fa": "۲۰ دلار/ماه",
                "record_limit": 500,
                "features": [
                    "500 DNS Records",
                    "All Record Types",
                    "Premium Dashboard",
                    "24/7 Support",
                    "API Access",
                    "Custom Domain"
                ],
                "features_fa": [
                    "۵۰۰ رکورد DNS",
                    "تمام انواع رکورد",
                    "داشبورد ویژه",
                    "پشتیبانی ۲۴/۷",
                    "دسترسی API",
                    "دامنه اختصاصی"
                ],
                "popular": False
            }
        ]
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.dns_records.create_index("user_id")
    await db.dns_records.create_index("id", unique=True)
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
