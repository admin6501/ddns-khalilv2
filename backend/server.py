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
import string
import random
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
DOMAIN_NAME = os.environ.get('DOMAIN_NAME', 'example.com')

# DNS zone domain (auto-detected from Cloudflare, fallback to DOMAIN_NAME)
CF_ZONE_DOMAIN = DOMAIN_NAME

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
    referral_code: Optional[str] = None

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
    plan: str = Field(description="plan id")

class PasswordUpdate(BaseModel):
    new_password: str = Field(min_length=6)

class BulkPlanUpdate(BaseModel):
    user_ids: List[str] = Field(min_length=1)
    plan: str

class BulkDeleteUsers(BaseModel):
    user_ids: List[str] = Field(min_length=1)

class PlanCreate(BaseModel):
    plan_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    name_fa: str = Field(min_length=1)
    price: str
    price_fa: str
    record_limit: int = Field(ge=0)
    features: List[str] = []
    features_fa: List[str] = []
    popular: bool = False
    sort_order: int = Field(default=0)

class PlanEdit(BaseModel):
    name: Optional[str] = None
    name_fa: Optional[str] = None
    price: Optional[str] = None
    price_fa: Optional[str] = None
    record_limit: Optional[int] = Field(default=None, ge=0)
    features: Optional[List[str]] = None
    features_fa: Optional[List[str]] = None
    popular: Optional[bool] = None
    sort_order: Optional[int] = None

class SettingsUpdate(BaseModel):
    telegram_id: Optional[str] = None
    telegram_url: Optional[str] = None
    contact_message_en: Optional[str] = None
    contact_message_fa: Optional[str] = None
    referral_bonus_per_invite: Optional[int] = None

# ============== HELPERS ==============

def generate_referral_code(length=8):
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choices(chars, k=length))

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

# ============== ACTIVITY LOG HELPER ==============

async def log_activity(user_id: str, user_email: str, action: str, details: str = "", ip: str = ""):
    """Log user/admin activity to activity_logs collection."""
    log_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "details": details,
        "ip": ip,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        await db.activity_logs.insert_one(log_doc)
    except Exception as e:
        logger.warning(f"Failed to log activity: {e}")

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

async def cf_fetch_zone_domain():
    """Fetch actual domain name from Cloudflare zone. Called on startup."""
    global CF_ZONE_DOMAIN
    if not CF_ZONE_ID or not CF_API_TOKEN:
        logger.warning("Cloudflare zone ID or API token not set, using DOMAIN_NAME as fallback")
        return
    try:
        async with httpx.AsyncClient() as client_http:
            response = await client_http.get(
                f"{CF_API_BASE}/zones/{CF_ZONE_ID}",
                headers={"Authorization": f"Bearer {CF_API_TOKEN}"}
            )
            data = response.json()
            if data.get("success") and data.get("result"):
                CF_ZONE_DOMAIN = data["result"]["name"]
                logger.info(f"Cloudflare zone domain detected: {CF_ZONE_DOMAIN}")
            else:
                logger.warning(f"Could not fetch zone domain, using DOMAIN_NAME: {DOMAIN_NAME}")
    except Exception as e:
        logger.warning(f"Failed to fetch zone domain from Cloudflare: {e}")

async def cf_create_record(name: str, record_type: str, content: str, ttl: int = 1, proxied: bool = False):
    full_name = f"{name}.{CF_ZONE_DOMAIN}" if name != "@" else CF_ZONE_DOMAIN
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
    
    # Generate unique referral code
    ref_code = generate_referral_code()
    while await db.users.find_one({"referral_code": ref_code}):
        ref_code = generate_referral_code()
    
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
        "referral_code": ref_code,
        "referred_by": None,
        "referral_count": 0,
        "referral_bonus": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Process referral
    if user_data.referral_code:
        referrer = await db.users.find_one({"referral_code": user_data.referral_code}, {"_id": 0})
        if referrer:
            user_doc["referred_by"] = referrer["id"]
            
            # Get bonus amount from settings
            settings = await db.settings.find_one({"key": "site_settings"}, {"_id": 0})
            bonus = (settings or {}).get("referral_bonus_per_invite", 1)
            
            # Give referrer bonus records
            await db.users.update_one(
                {"id": referrer["id"]},
                {
                    "$inc": {
                        "record_limit": bonus,
                        "referral_count": 1,
                        "referral_bonus": bonus
                    }
                }
            )
            logger.info(f"Referral: {referrer['email']} gets +{bonus} records from {user_data.email}")
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email)
    await log_activity(user_id, user_data.email, "register", "New account created")
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
            "referral_code": ref_code,
            "referral_count": 0,
            "referral_bonus": 0,
            "created_at": user_doc["created_at"]
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    await log_activity(user["id"], user["email"], "login", "User logged in")
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
            "referral_code": user.get("referral_code", ""),
            "referral_count": user.get("referral_count", 0),
            "referral_bonus": user.get("referral_bonus", 0),
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
        "referral_code": current_user.get("referral_code", ""),
        "referral_count": current_user.get("referral_count", 0),
        "referral_bonus": current_user.get("referral_bonus", 0),
        "created_at": current_user["created_at"]
    }

# ============== REFERRAL ROUTES ==============

@api_router.get("/referral/stats")
async def get_referral_stats(current_user: dict = Depends(get_current_user)):
    # Get list of users referred by current user
    referred_users = await db.users.find(
        {"referred_by": current_user["id"]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "created_at": 1}
    ).to_list(100)
    
    # Get bonus per invite from settings
    settings = await db.settings.find_one({"key": "site_settings"}, {"_id": 0})
    bonus_per_invite = (settings or {}).get("referral_bonus_per_invite", 1)
    
    return {
        "referral_code": current_user.get("referral_code", ""),
        "referral_count": current_user.get("referral_count", 0),
        "referral_bonus": current_user.get("referral_bonus", 0),
        "bonus_per_invite": bonus_per_invite,
        "referred_users": [
            {"name": u["name"], "date": u["created_at"]}
            for u in referred_users
        ]
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
    full_name = f"{record_data.name}.{CF_ZONE_DOMAIN}" if record_data.name != "@" else CF_ZONE_DOMAIN
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
    
    await log_activity(current_user["id"], current_user["email"], "record_created",
                       f"{record_data.record_type} {full_name} → {record_data.content}")
    
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
    
    await log_activity(current_user["id"], current_user["email"], "record_updated",
                       f"{record['record_type']} {record['full_name']} → {content}")
    
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
    
    await log_activity(current_user["id"], current_user["email"], "record_deleted",
                       f"{record['record_type']} {record['full_name']}")
    
    return {"message": "Record deleted successfully"}

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/users")
async def admin_list_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        u["record_count"] = await db.dns_records.count_documents({"user_id": u["id"]})
    return {"users": users, "count": len(users)}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    # Delete all user's CF records
    user_records = await db.dns_records.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    for rec in user_records:
        try:
            await cf_delete_record(rec["cf_record_id"])
        except Exception as e:
            logger.warning(f"Failed to delete CF record {rec['cf_record_id']}: {e}")
    
    await db.dns_records.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"message": f"User {user['email']} and {len(user_records)} records deleted"}

@api_router.put("/admin/users/{user_id}/plan")
async def admin_update_plan(user_id: str, plan_data: PlanUpdate, admin: dict = Depends(get_admin_user)):
    # Look up plan from DB
    plan_doc = await db.plans.find_one({"plan_id": plan_data.plan}, {"_id": 0})
    if not plan_doc:
        # Fallback to hardcoded
        if plan_data.plan not in PLAN_LIMITS:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {plan_data.plan}")
        new_limit = PLAN_LIMITS[plan_data.plan]
    else:
        new_limit = plan_doc["record_limit"]
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"plan": plan_data.plan, "record_limit": new_limit}}
    )
    return {"message": f"User plan updated to {plan_data.plan}", "record_limit": new_limit}

@api_router.put("/admin/users/{user_id}/password")
async def admin_change_password(user_id: str, pw_data: PasswordUpdate, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = hash_password(pw_data.new_password)
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash}})
    return {"message": f"Password updated for {user['email']}"}

@api_router.post("/admin/users/bulk/plan")
async def admin_bulk_update_plan(data: BulkPlanUpdate, admin: dict = Depends(get_admin_user)):
    plan_doc = await db.plans.find_one({"plan_id": data.plan}, {"_id": 0})
    if not plan_doc:
        if data.plan not in PLAN_LIMITS:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")
        new_limit = PLAN_LIMITS[data.plan]
    else:
        new_limit = plan_doc["record_limit"]
    
    # Filter out admin users
    non_admin_ids = []
    for uid in data.user_ids:
        u = await db.users.find_one({"id": uid, "role": {"$ne": "admin"}}, {"_id": 0, "id": 1})
        if u:
            non_admin_ids.append(uid)
    
    if not non_admin_ids:
        raise HTTPException(status_code=400, detail="No eligible users to update")
    
    result = await db.users.update_many(
        {"id": {"$in": non_admin_ids}},
        {"$set": {"plan": data.plan, "record_limit": new_limit}}
    )
    return {"message": f"{result.modified_count} users updated to {data.plan}", "updated_count": result.modified_count}

@api_router.post("/admin/users/bulk/delete")
async def admin_bulk_delete_users(data: BulkDeleteUsers, admin: dict = Depends(get_admin_user)):
    deleted_count = 0
    deleted_records = 0
    
    for uid in data.user_ids:
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user or user.get("role") == "admin":
            continue
        
        # Delete CF records
        user_records = await db.dns_records.find({"user_id": uid}, {"_id": 0}).to_list(500)
        for rec in user_records:
            try:
                await cf_delete_record(rec["cf_record_id"])
            except Exception as e:
                logger.warning(f"Failed to delete CF record {rec['cf_record_id']}: {e}")
        
        await db.dns_records.delete_many({"user_id": uid})
        await db.users.delete_one({"id": uid})
        deleted_count += 1
        deleted_records += len(user_records)
    
    return {"message": f"{deleted_count} users and {deleted_records} records deleted", "deleted_count": deleted_count}

@api_router.get("/admin/users/{user_id}/records")
async def admin_get_user_records(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    records = await db.dns_records.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    return {"user": user, "records": records, "count": len(records)}

@api_router.get("/admin/records")
async def admin_list_all_records(admin: dict = Depends(get_admin_user)):
    records = await db.dns_records.find({}, {"_id": 0}).to_list(1000)
    # Attach user email to each record
    user_cache = {}
    for rec in records:
        uid = rec["user_id"]
        if uid not in user_cache:
            u = await db.users.find_one({"id": uid}, {"_id": 0, "email": 1, "name": 1})
            user_cache[uid] = u or {"email": "unknown", "name": "unknown"}
        rec["user_email"] = user_cache[uid].get("email", "unknown")
        rec["user_name"] = user_cache[uid].get("name", "unknown")
    return {"records": records, "count": len(records)}

@api_router.post("/admin/dns/records", status_code=201)
async def admin_create_record(record_data: AdminDNSRecordCreate, admin: dict = Depends(get_admin_user)):
    if record_data.record_type not in ["A", "AAAA", "CNAME"]:
        raise HTTPException(status_code=400, detail="Only A, AAAA, and CNAME records are supported")
    
    user = await db.users.find_one({"id": record_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    full_name = f"{record_data.name}.{CF_ZONE_DOMAIN}" if record_data.name != "@" else CF_ZONE_DOMAIN
    
    cf_result = await cf_create_record(
        name=record_data.name, record_type=record_data.record_type,
        content=record_data.content, ttl=record_data.ttl, proxied=record_data.proxied
    )
    
    record_id = str(uuid.uuid4())
    record_doc = {
        "id": record_id, "cf_record_id": cf_result["id"], "user_id": record_data.user_id,
        "name": record_data.name, "full_name": full_name, "record_type": record_data.record_type,
        "content": record_data.content, "ttl": record_data.ttl, "proxied": record_data.proxied,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.dns_records.insert_one(record_doc)
    await db.users.update_one({"id": record_data.user_id}, {"$inc": {"record_count": 1}})
    
    return {k: v for k, v in record_doc.items() if k != "_id"}

@api_router.delete("/admin/dns/records/{record_id}")
async def admin_delete_record(record_id: str, admin: dict = Depends(get_admin_user)):
    record = await db.dns_records.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await cf_delete_record(record["cf_record_id"])
    await db.dns_records.delete_one({"id": record_id})
    await db.users.update_one({"id": record["user_id"]}, {"$inc": {"record_count": -1}})
    return {"message": "Record deleted successfully"}

# ============== SETTINGS ROUTES ==============

@api_router.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(get_admin_user)):
    settings = await db.settings.find_one({"key": "site_settings"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "site_settings",
            "telegram_id": "",
            "telegram_url": "",
            "contact_message_en": "Contact us on Telegram for pricing",
            "contact_message_fa": "برای استعلام قیمت در تلگرام تماس بگیرید",
            "referral_bonus_per_invite": 1
        }
    return settings

@api_router.put("/admin/settings")
async def admin_update_settings(settings_data: SettingsUpdate, admin: dict = Depends(get_admin_user)):
    update_fields = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.settings.update_one(
        {"key": "site_settings"},
        {"$set": update_fields},
        upsert=True
    )
    settings = await db.settings.find_one({"key": "site_settings"}, {"_id": 0})
    return settings

# Public endpoint for site config (domain, contact info)
@api_router.get("/config")
async def get_site_config():
    settings = await db.settings.find_one({"key": "site_settings"}, {"_id": 0})
    return {
        "domain": DOMAIN_NAME,
        "dns_domain": CF_ZONE_DOMAIN,
        "telegram_id": (settings or {}).get("telegram_id", ""),
        "telegram_url": (settings or {}).get("telegram_url", ""),
        "contact_message_en": (settings or {}).get("contact_message_en", ""),
        "contact_message_fa": (settings or {}).get("contact_message_fa", ""),
        "referral_bonus_per_invite": (settings or {}).get("referral_bonus_per_invite", 1),
    }

# Public endpoint for contact info (legacy)
@api_router.get("/settings/contact")
async def get_contact_info():
    settings = await db.settings.find_one({"key": "site_settings"}, {"_id": 0})
    if not settings:
        return {"telegram_id": "", "telegram_url": "", "contact_message_en": "", "contact_message_fa": "", "domain": DOMAIN_NAME, "dns_domain": CF_ZONE_DOMAIN}
    return {
        "telegram_id": settings.get("telegram_id", ""),
        "telegram_url": settings.get("telegram_url", ""),
        "contact_message_en": settings.get("contact_message_en", ""),
        "contact_message_fa": settings.get("contact_message_fa", ""),
        "domain": DOMAIN_NAME,
        "dns_domain": CF_ZONE_DOMAIN
    }

# ============== PLANS ROUTES ==============

@api_router.get("/plans")
async def get_plans():
    plans = await db.plans.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    if not plans:
        # Fallback to defaults if DB empty
        plans = DEFAULT_PLANS
    return {"plans": plans}

# Admin plan CRUD
@api_router.get("/admin/plans")
async def admin_list_plans(admin: dict = Depends(get_admin_user)):
    plans = await db.plans.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return {"plans": plans, "count": len(plans)}

@api_router.post("/admin/plans", status_code=201)
async def admin_create_plan(plan_data: PlanCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.plans.find_one({"plan_id": plan_data.plan_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail=f"Plan '{plan_data.plan_id}' already exists")
    
    plan_doc = plan_data.model_dump()
    await db.plans.insert_one(plan_doc)
    # Update PLAN_LIMITS cache
    PLAN_LIMITS[plan_data.plan_id] = plan_data.record_limit
    return {k: v for k, v in plan_doc.items() if k != "_id"}

@api_router.put("/admin/plans/{plan_id}")
async def admin_update_plan_details(plan_id: str, plan_data: PlanEdit, admin: dict = Depends(get_admin_user)):
    existing = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_fields = {k: v for k, v in plan_data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.plans.update_one({"plan_id": plan_id}, {"$set": update_fields})
    
    # Update PLAN_LIMITS cache if record_limit changed
    if "record_limit" in update_fields:
        PLAN_LIMITS[plan_id] = update_fields["record_limit"]
    
    updated = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, admin: dict = Depends(get_admin_user)):
    existing = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check if any users are on this plan
    users_on_plan = await db.users.count_documents({"plan": plan_id})
    if users_on_plan > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete plan: {users_on_plan} users are on this plan")
    
    await db.plans.delete_one({"plan_id": plan_id})
    PLAN_LIMITS.pop(plan_id, None)
    return {"message": f"Plan '{plan_id}' deleted"}

# Default plans for seeding
DEFAULT_PLANS = [
    {
        "plan_id": "free", "name": "Free", "name_fa": "رایگان",
        "price": "$0", "price_fa": "رایگان", "record_limit": 2,
        "features": ["2 DNS Records", "A, AAAA, CNAME Support", "Basic Dashboard", "Community Support"],
        "features_fa": ["۲ رکورد DNS", "پشتیبانی A، AAAA، CNAME", "داشبورد پایه", "پشتیبانی انجمن"],
        "popular": False, "sort_order": 0
    },
    {
        "plan_id": "pro", "name": "Pro", "name_fa": "حرفه‌ای",
        "price": "$5/mo", "price_fa": "۵ دلار/ماه", "record_limit": 50,
        "features": ["50 DNS Records", "A, AAAA, CNAME Support", "Advanced Dashboard", "Priority Support", "API Access"],
        "features_fa": ["۵۰ رکورد DNS", "پشتیبانی A، AAAA، CNAME", "داشبورد پیشرفته", "پشتیبانی اولویت‌دار", "دسترسی API"],
        "popular": True, "sort_order": 1
    },
    {
        "plan_id": "enterprise", "name": "Enterprise", "name_fa": "سازمانی",
        "price": "$20/mo", "price_fa": "۲۰ دلار/ماه", "record_limit": 500,
        "features": ["500 DNS Records", "All Record Types", "Premium Dashboard", "24/7 Support", "API Access", "Custom Domain"],
        "features_fa": ["۵۰۰ رکورد DNS", "تمام انواع رکورد", "داشبورد ویژه", "پشتیبانی ۲۴/۷", "دسترسی API", "دامنه اختصاصی"],
        "popular": False, "sort_order": 2
    }
]

# ============== ACTIVITY LOG ROUTES ==============

@api_router.get("/activity/logs")
async def get_user_activity_logs(page: int = 1, limit: int = 20, current_user: dict = Depends(get_current_user)):
    skip = (page - 1) * limit
    total = await db.activity_logs.count_documents({"user_id": current_user["id"]})
    logs = await db.activity_logs.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "page": page, "pages": (total + limit - 1) // limit if total > 0 else 1}

@api_router.get("/admin/activity/logs")
async def admin_get_activity_logs(page: int = 1, limit: int = 50, user_id: Optional[str] = None, action: Optional[str] = None, admin: dict = Depends(get_admin_user)):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    skip = (page - 1) * limit
    total = await db.activity_logs.count_documents(query)
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "page": page, "pages": (total + limit - 1) // limit if total > 0 else 1}

# ============== TELEGRAM BOT ==============

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
telegram_bot_app = None

async def start_telegram_bot():
    """Start the Telegram bot in polling mode if token is configured."""
    global telegram_bot_app
    if not TELEGRAM_BOT_TOKEN:
        logger.info("Telegram bot: No token configured, skipping.")
        return

    try:
        from telegram import Update, BotCommand, InlineKeyboardButton, InlineKeyboardMarkup
        from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, MessageHandler, ContextTypes, filters
    except ImportError:
        logger.warning("Telegram bot: python-telegram-bot not installed, skipping.")
        return

    # ── Translations ──────────────────────────────────────────
    T = {
        "fa": {
            "welcome_logged_in": "👋 سلام {name}!\n🌐 مدیریت DNS {domain}\n\nاز دکمه‌های زیر استفاده کنید:",
            "welcome_new": "👋 به ربات مدیریت DNS {domain} خوش آمدید!\n\nبرای شروع، اکانت خود را متصل کنید:",
            "not_logged_in": "❌ ابتدا باید وارد اکانت خود شوید.",
            "btn_login": "🔑 ورود به اکانت",
            "btn_records": "📝 رکوردهای من",
            "btn_add": "➕ ساخت رکورد",
            "btn_status": "📊 وضعیت اکانت",
            "btn_delete": "🗑 حذف رکورد",
            "btn_referral": "🔗 لینک دعوت",
            "btn_logout": "🚪 خروج",
            "btn_lang": "🌐 English",
            "btn_back": "🔙 منوی اصلی",
            "btn_cancel": "❌ انصراف",
            "btn_refresh": "🔄 بروزرسانی",
            "btn_view_records": "📝 مشاهده رکوردها",
            "btn_add_another": "➕ ساخت دیگر",
            "btn_yes_delete": "✅ بله، حذف شود",
            "btn_yes_logout": "✅ بله، خروج",
            "btn_relogin": "🔑 ورود مجدد",
            "help_login_title": "🔑 **ورود به اکانت**",
            "help_login_body": "📧 لطفاً ایمیل خود را وارد کنید:",
            "login_enter_password": "🔒 حالا رمز عبور خود را وارد کنید:",
            "login_usage": "📧 لطفاً ایمیل خود را وارد کنید:",
            "login_fail": "❌ ایمیل یا رمز عبور اشتباه است.",
            "login_success": "✅ اکانت {name} ({email}) با موفقیت متصل شد!",
            "no_records": "📭 هیچ رکوردی ندارید.",
            "records_title": "📝 رکوردهای شما ({count}/{limit}):\n\n",
            "status_title": "📊 **وضعیت اکانت**\n\n",
            "status_body": "👤 {name}\n📧 `{email}`\n📋 پلن: **{plan}**\n📝 رکوردها: **{count}** از {limit}\n🔗 کد دعوت: `{ref_code}`\n👥 دعوت موفق: {ref_count}",
            "referral_title": "🔗 **لینک دعوت شما:**\n\n",
            "referral_body": "`{link}`\n\n👥 دعوت موفق: {count}\n🎁 رکورد جایزه: {bonus}\n\nلینک بالا را کپی و برای دوستان ارسال کنید!",
            "add_choose_type": "➕ **نوع رکورد را انتخاب کنید:**",
            "add_limit_reached": "❌ به سقف رکورد ({limit}) رسیدید.\nپلن خود را ارتقا دهید.",
            "add_enter_name": "📝 نوع: **{type}**\n\nنام ساب‌دامین را بنویسید:\n{example}\n\nفقط نام را بدون دامنه تایپ کنید:",
            "add_name_invalid": "❌ نام نامعتبر. دوباره تلاش کنید:",
            "add_enter_value_A": "آدرس IPv4 را وارد کنید:\nمثال: `1.2.3.4`",
            "add_enter_value_AAAA": "آدرس IPv6 را وارد کنید:\nمثال: `2001:db8::1`",
            "add_enter_value_CNAME": "دامنه مقصد را وارد کنید:\nمثال: `example.com`",
            "add_name_confirm": "✅ نام: `{name}.{domain}`\n\n{hint}",
            "add_exists": "❌ رکورد `{name}` ({type}) قبلاً وجود دارد.",
            "add_success": "✅ رکورد ساخته شد!\n\n`{type}` │ {name} → `{value}`",
            "add_example_A": "مثال: `mysite`  →  mysite.{domain}",
            "add_example_AAAA": "مثال: `mysite`  →  mysite.{domain}",
            "add_example_CNAME": "مثال: `blog`  →  blog.{domain}",
            "delete_title": "🗑 **کدام رکورد حذف شود؟**",
            "delete_no_records": "📭 رکوردی برای حذف وجود ندارد.",
            "delete_confirm": "⚠️ **آیا مطمئنید؟**\n\nنوع: `{type}`\nnام: `{name}`\nمقدار: `{value}`",
            "delete_success": "✅ رکورد حذف شد!\n\n`{type}` {name}",
            "delete_not_found": "❌ رکورد پیدا نشد.",
            "logout_confirm": "⚠️ آیا مطمئنید می‌خواهید خارج شوید؟",
            "logout_success": "✅ اکانت شما از ربات قطع شد.",
            "lang_changed": "🌐 زبان به فارسی تغییر کرد.",
            "error": "❌ خطا: {err}",
        },
        "en": {
            "welcome_logged_in": "👋 Hello {name}!\n🌐 DNS Management for {domain}\n\nUse the buttons below:",
            "welcome_new": "👋 Welcome to {domain} DNS Bot!\n\nConnect your account to get started:",
            "not_logged_in": "❌ Please log in first.",
            "btn_login": "🔑 Login",
            "btn_records": "📝 My Records",
            "btn_add": "➕ Add Record",
            "btn_status": "📊 Account Status",
            "btn_delete": "🗑 Delete Record",
            "btn_referral": "🔗 Referral Link",
            "btn_logout": "🚪 Logout",
            "btn_lang": "🌐 فارسی",
            "btn_back": "🔙 Main Menu",
            "btn_cancel": "❌ Cancel",
            "btn_refresh": "🔄 Refresh",
            "btn_view_records": "📝 View Records",
            "btn_add_another": "➕ Add Another",
            "btn_yes_delete": "✅ Yes, Delete",
            "btn_yes_logout": "✅ Yes, Logout",
            "btn_relogin": "🔑 Login Again",
            "help_login_title": "🔑 **Login**",
            "help_login_body": "📧 Please enter your email:",
            "login_enter_password": "🔒 Now enter your password:",
            "login_usage": "📧 Please enter your email:",
            "login_fail": "❌ Invalid email or password.",
            "login_success": "✅ Account {name} ({email}) connected!",
            "no_records": "📭 You have no records.",
            "records_title": "📝 Your Records ({count}/{limit}):\n\n",
            "status_title": "📊 **Account Status**\n\n",
            "status_body": "👤 {name}\n📧 `{email}`\n📋 Plan: **{plan}**\n📝 Records: **{count}** of {limit}\n🔗 Referral: `{ref_code}`\n👥 Invites: {ref_count}",
            "referral_title": "🔗 **Your Referral Link:**\n\n",
            "referral_body": "`{link}`\n\n👥 Successful invites: {count}\n🎁 Bonus records: {bonus}\n\nShare this link with friends!",
            "add_choose_type": "➕ **Choose record type:**",
            "add_limit_reached": "❌ Record limit reached ({limit}).\nUpgrade your plan.",
            "add_enter_name": "📝 Type: **{type}**\n\nEnter subdomain name:\n{example}\n\nType only the name without the domain:",
            "add_name_invalid": "❌ Invalid name. Try again:",
            "add_enter_value_A": "Enter IPv4 address:\nExample: `1.2.3.4`",
            "add_enter_value_AAAA": "Enter IPv6 address:\nExample: `2001:db8::1`",
            "add_enter_value_CNAME": "Enter target domain:\nExample: `example.com`",
            "add_name_confirm": "✅ Name: `{name}.{domain}`\n\n{hint}",
            "add_exists": "❌ Record `{name}` ({type}) already exists.",
            "add_success": "✅ Record created!\n\n`{type}` │ {name} → `{value}`",
            "add_example_A": "Example: `mysite`  →  mysite.{domain}",
            "add_example_AAAA": "Example: `mysite`  →  mysite.{domain}",
            "add_example_CNAME": "Example: `blog`  →  blog.{domain}",
            "delete_title": "🗑 **Which record to delete?**",
            "delete_no_records": "📭 No records to delete.",
            "delete_confirm": "⚠️ **Are you sure?**\n\nType: `{type}`\nName: `{name}`\nValue: `{value}`",
            "delete_success": "✅ Record deleted!\n\n`{type}` {name}",
            "delete_not_found": "❌ Record not found.",
            "logout_confirm": "⚠️ Are you sure you want to logout?",
            "logout_success": "✅ Your account has been disconnected.",
            "lang_changed": "🌐 Language changed to English.",
            "error": "❌ Error: {err}",
        }
    }

    def get_lang(user):
        """Get user's bot language, default Persian."""
        if user:
            return user.get("telegram_lang", "fa")
        return "fa"

    def t(lang, key, **kwargs):
        """Get translated string."""
        return T.get(lang, T["fa"]).get(key, key).format(**kwargs) if kwargs else T.get(lang, T["fa"]).get(key, key)

    # ── Helper: get user from chat id ────────────────────────
    async def get_user_by_chat(chat_id):
        return await db.users.find_one({"telegram_chat_id": str(chat_id)}, {"_id": 0})

    async def send_not_logged_in(update_or_query, lang="fa"):
        kb = [[InlineKeyboardButton(t(lang, "btn_login"), callback_data="help_login")]]
        msg = t(lang, "not_logged_in")
        if hasattr(update_or_query, 'message') and update_or_query.message:
            await update_or_query.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(kb))
        else:
            await update_or_query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(kb))

    # ── Main Menu Keyboard ───────────────────────────────────
    def main_menu_kb(lang="fa"):
        return InlineKeyboardMarkup([
            [InlineKeyboardButton(t(lang, "btn_records"), callback_data="records"),
             InlineKeyboardButton(t(lang, "btn_add"), callback_data="add_start")],
            [InlineKeyboardButton(t(lang, "btn_status"), callback_data="status"),
             InlineKeyboardButton(t(lang, "btn_delete"), callback_data="delete_list")],
            [InlineKeyboardButton(t(lang, "btn_referral"), callback_data="referral"),
             InlineKeyboardButton(t(lang, "btn_logout"), callback_data="logout")],
            [InlineKeyboardButton(t(lang, "btn_lang"), callback_data="toggle_lang")],
        ])

    def back_menu_kb(lang="fa"):
        return InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")]])

    # ── /start ───────────────────────────────────────────────
    async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        try:
            context.user_data.clear()
            chat_id = update.effective_chat.id
            logger.info(f"Telegram /start from chat_id={chat_id}")
            user = await get_user_by_chat(chat_id)
            lang = get_lang(user)
            if user:
                await update.message.reply_text(
                    t(lang, "welcome_logged_in", name=user['name'], domain=CF_ZONE_DOMAIN),
                    reply_markup=main_menu_kb(lang)
                )
            else:
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(t(lang, "btn_login"), callback_data="help_login")],
                    [InlineKeyboardButton("🌐 English", callback_data="set_lang_en"),
                     InlineKeyboardButton("🌐 فارسی", callback_data="set_lang_fa")]
                ])
                await update.message.reply_text(
                    t(lang, "welcome_new", domain=CF_ZONE_DOMAIN),
                    reply_markup=kb
                )
        except Exception as e:
            logger.error(f"Error in cmd_start: {e}", exc_info=True)

    # ── /login (redirect to button flow) ───────────────────
    async def cmd_login(update: Update, context: ContextTypes.DEFAULT_TYPE):
        context.user_data.clear()
        lang = context.user_data.get("lang", "fa")
        context.user_data["login_step"] = "email"
        kb = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]])
        await update.message.reply_text(t(lang, "help_login_body"), reply_markup=kb)

    # ── Callback Handler ─────────────────────────────────────
    async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        try:
            await query.answer()
        except Exception:
            pass
        data = query.data
        chat_id = update.effective_chat.id
        logger.info(f"Telegram callback: {data} from chat_id={chat_id}")
        user = await get_user_by_chat(chat_id)
        lang = get_lang(user) if user else context.user_data.get("lang", "fa")

        try:

        # ── Set language (before login) ──
        if data in ("set_lang_fa", "set_lang_en"):
            new_lang = "fa" if data == "set_lang_fa" else "en"
            context.user_data["lang"] = new_lang
            if user:
                await db.users.update_one({"id": user["id"]}, {"$set": {"telegram_lang": new_lang}})
            await query.edit_message_text(
                t(new_lang, "lang_changed"),
                reply_markup=main_menu_kb(new_lang) if user else InlineKeyboardMarkup([
                    [InlineKeyboardButton(t(new_lang, "btn_login"), callback_data="help_login")]
                ])
            )
            return

        # ── Toggle language ──
        if data == "toggle_lang":
            new_lang = "en" if lang == "fa" else "fa"
            context.user_data["lang"] = new_lang
            if user:
                await db.users.update_one({"id": user["id"]}, {"$set": {"telegram_lang": new_lang}})
                lang = new_lang
            await query.edit_message_text(
                t(new_lang, "welcome_logged_in", name=user['name'], domain=CF_ZONE_DOMAIN) if user else t(new_lang, "lang_changed"),
                reply_markup=main_menu_kb(new_lang)
            )
            return

        # ── Main Menu ──
        if data == "main_menu":
            if not user:
                await send_not_logged_in(query, lang)
                return
            await query.edit_message_text(
                t(lang, "welcome_logged_in", name=user['name'], domain=CF_ZONE_DOMAIN),
                reply_markup=main_menu_kb(lang)
            )

        # ── Help Login (start login flow) ──
        elif data == "help_login":
            context.user_data.clear()
            context.user_data["login_step"] = "email"
            context.user_data["lang"] = lang
            kb = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]])
            await query.edit_message_text(
                t(lang, "help_login_title") + "\n\n" + t(lang, "help_login_body"),
                parse_mode="Markdown",
                reply_markup=kb
            )

        # ── Records List ──
        elif data == "records":
            if not user:
                await send_not_logged_in(query, lang)
                return
            records = await db.dns_records.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
            if not records:
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(t(lang, "btn_add"), callback_data="add_start")],
                    [InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")]
                ])
                await query.edit_message_text(t(lang, "no_records"), reply_markup=kb)
                return
            text = t(lang, "records_title", count=len(records), limit=user['record_limit'])
            for r in records:
                proxy = "🟠" if r.get("proxied") else "⚪️"
                text += f"{proxy} `{r['record_type']}` │ {r['full_name']} → `{r['content']}`\n"
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton(t(lang, "btn_add"), callback_data="add_start"),
                 InlineKeyboardButton(t(lang, "btn_delete"), callback_data="delete_list")],
                [InlineKeyboardButton(t(lang, "btn_refresh"), callback_data="records"),
                 InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")]
            ])
            await query.edit_message_text(text, reply_markup=kb, parse_mode="Markdown")

        # ── Status ──
        elif data == "status":
            if not user:
                await send_not_logged_in(query, lang)
                return
            record_count = await db.dns_records.count_documents({"user_id": user["id"]})
            text = t(lang, "status_title") + t(lang, "status_body",
                name=user['name'], email=user['email'], plan=user['plan'],
                count=record_count, limit=user['record_limit'],
                ref_code=user.get('referral_code', '-'), ref_count=user.get('referral_count', 0))
            await query.edit_message_text(text, reply_markup=back_menu_kb(lang), parse_mode="Markdown")

        # ── Referral ──
        elif data == "referral":
            if not user:
                await send_not_logged_in(query, lang)
                return
            ref_link = f"https://{DOMAIN_NAME}/register?ref={user.get('referral_code', '')}"
            text = t(lang, "referral_title") + t(lang, "referral_body",
                link=ref_link, count=user.get('referral_count', 0), bonus=user.get('referral_bonus', 0))
            await query.edit_message_text(text, reply_markup=back_menu_kb(lang), parse_mode="Markdown")

        # ── Add Record: Choose Type ──
        elif data == "add_start":
            if not user:
                await send_not_logged_in(query, lang)
                return
            record_count = await db.dns_records.count_documents({"user_id": user["id"]})
            if record_count >= user["record_limit"]:
                await query.edit_message_text(
                    t(lang, "add_limit_reached", limit=user['record_limit']),
                    reply_markup=back_menu_kb(lang))
                return
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton("🅰️ A", callback_data="add_type_A"),
                 InlineKeyboardButton("🔤 AAAA", callback_data="add_type_AAAA"),
                 InlineKeyboardButton("🔀 CNAME", callback_data="add_type_CNAME")],
                [InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")]
            ])
            await query.edit_message_text(t(lang, "add_choose_type"), reply_markup=kb, parse_mode="Markdown")

        elif data.startswith("add_type_"):
            record_type = data.replace("add_type_", "")
            context.user_data["add_type"] = record_type
            context.user_data["add_step"] = "name"
            example = t(lang, f"add_example_{record_type}", domain=CF_ZONE_DOMAIN)
            kb = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]])
            await query.edit_message_text(
                t(lang, "add_enter_name", type=record_type, example=example),
                reply_markup=kb, parse_mode="Markdown")

        # ── Delete Record: List ──
        elif data == "delete_list":
            if not user:
                await send_not_logged_in(query, lang)
                return
            records = await db.dns_records.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
            if not records:
                await query.edit_message_text(t(lang, "delete_no_records"), reply_markup=back_menu_kb(lang))
                return
            buttons = []
            for r in records:
                label = f"🗑 {r['record_type']} | {r['name']}.{CF_ZONE_DOMAIN}"
                buttons.append([InlineKeyboardButton(label, callback_data=f"del_{r['id']}")])
            buttons.append([InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")])
            await query.edit_message_text(t(lang, "delete_title"), reply_markup=InlineKeyboardMarkup(buttons), parse_mode="Markdown")

        elif data.startswith("del_") and not data.startswith("confirm_del_"):
            record_id = data[4:]
            record = await db.dns_records.find_one({"id": record_id}, {"_id": 0})
            if not record:
                await query.edit_message_text(t(lang, "delete_not_found"), reply_markup=back_menu_kb(lang))
                return
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton(t(lang, "btn_yes_delete"), callback_data=f"confirm_del_{record_id}"),
                 InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]
            ])
            await query.edit_message_text(
                t(lang, "delete_confirm", type=record['record_type'], name=record['full_name'], value=record['content']),
                reply_markup=kb, parse_mode="Markdown")

        elif data.startswith("confirm_del_"):
            record_id = data[12:]
            if not user:
                await send_not_logged_in(query, lang)
                return
            record = await db.dns_records.find_one({"id": record_id, "user_id": user["id"]}, {"_id": 0})
            if not record:
                await query.edit_message_text(t(lang, "delete_not_found"), reply_markup=back_menu_kb(lang))
                return
            try:
                await cf_delete_record(record["cf_record_id"])
                await db.dns_records.delete_one({"id": record_id})
                await db.users.update_one({"id": user["id"]}, {"$inc": {"record_count": -1}})
                await log_activity(user["id"], user["email"], "record_deleted", f"{record['record_type']} {record['full_name']} (via Telegram)")
                await query.edit_message_text(
                    t(lang, "delete_success", type=record['record_type'], name=record['full_name']),
                    reply_markup=back_menu_kb(lang), parse_mode="Markdown")
            except Exception as e:
                await query.edit_message_text(t(lang, "error", err=str(e)), reply_markup=back_menu_kb(lang))

        # ── Logout ──
        elif data == "logout":
            if not user:
                await send_not_logged_in(query, lang)
                return
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton(t(lang, "btn_yes_logout"), callback_data="confirm_logout"),
                 InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]
            ])
            await query.edit_message_text(t(lang, "logout_confirm"), reply_markup=kb)

        elif data == "confirm_logout":
            if user:
                await db.users.update_one({"id": user["id"]}, {"$unset": {"telegram_chat_id": ""}})
            kb = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_relogin"), callback_data="help_login")]])
            await query.edit_message_text(t(lang, "logout_success"), reply_markup=kb)

        except Exception as e:
            logger.error(f"Error in callback_handler ({data}): {e}", exc_info=True)
            try:
                await query.edit_message_text(t(lang, "error", err=str(e)), reply_markup=back_menu_kb(lang))
            except Exception:
                pass

    # ── Message Handler (for login & add record flows) ────────
    async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        text = update.message.text.strip()
        lang = context.user_data.get("lang", "fa")

        # ── Login Flow ──
        login_step = context.user_data.get("login_step")
        if login_step == "email":
            context.user_data["login_email"] = text
            context.user_data["login_step"] = "password"
            kb = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]])
            await update.message.reply_text(t(lang, "login_enter_password"), reply_markup=kb)
            return

        if login_step == "password":
            email = context.user_data.get("login_email", "")
            password = text
            context.user_data.pop("login_step", None)
            context.user_data.pop("login_email", None)

            user = await db.users.find_one({"email": email}, {"_id": 0})
            if not user or not verify_password(password, user["password_hash"]):
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(t(lang, "btn_login"), callback_data="help_login")],
                    [InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")]
                ])
                await update.message.reply_text(t(lang, "login_fail"), reply_markup=kb)
                return

            bot_lang = context.user_data.get("lang", "fa")
            await db.users.update_one({"id": user["id"]}, {"$set": {"telegram_chat_id": str(chat_id), "telegram_lang": bot_lang}})
            await log_activity(user["id"], user["email"], "telegram_linked", f"Telegram linked: {chat_id}")
            await update.message.reply_text(
                t(bot_lang, "login_success", name=user['name'], email=email),
                reply_markup=main_menu_kb(bot_lang)
            )
            return

        # ── Add Record Flow ──
        if not context.user_data.get("add_step"):
            return

        user = await get_user_by_chat(chat_id)
        lang = get_lang(user) if user else lang
        if not user:
            await send_not_logged_in(update, lang)
            context.user_data.clear()
            return

        step = context.user_data.get("add_step")

        if step == "name":
            name = text.lower().replace(" ", "")
            if not name or len(name) > 63:
                await update.message.reply_text(t(lang, "add_name_invalid"))
                return
            context.user_data["add_name"] = name
            context.user_data["add_step"] = "value"
            record_type = context.user_data["add_type"]
            hint = t(lang, f"add_enter_value_{record_type}")
            kb = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "btn_cancel"), callback_data="main_menu")]])
            await update.message.reply_text(
                t(lang, "add_name_confirm", name=name, domain=CF_ZONE_DOMAIN, hint=hint),
                reply_markup=kb, parse_mode="Markdown"
            )

        elif step == "value":
            content = text.strip()
            record_type = context.user_data["add_type"]
            name = context.user_data["add_name"]
            full_name = f"{name}.{CF_ZONE_DOMAIN}"
            context.user_data.clear()

            existing = await db.dns_records.find_one({"full_name": full_name, "record_type": record_type})
            if existing:
                await update.message.reply_text(
                    t(lang, "add_exists", name=full_name, type=record_type),
                    reply_markup=back_menu_kb(lang), parse_mode="Markdown"
                )
                return
            try:
                cf_result = await cf_create_record(name=name, record_type=record_type, content=content)
                record_id = str(uuid.uuid4())
                record_doc = {
                    "id": record_id, "cf_record_id": cf_result["id"], "user_id": user["id"],
                    "name": name, "full_name": full_name, "record_type": record_type,
                    "content": content, "ttl": 1, "proxied": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.dns_records.insert_one(record_doc)
                await db.users.update_one({"id": user["id"]}, {"$inc": {"record_count": 1}})
                await log_activity(user["id"], user["email"], "record_created", f"{record_type} {full_name} → {content} (via Telegram)")
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(t(lang, "btn_view_records"), callback_data="records"),
                     InlineKeyboardButton(t(lang, "btn_add_another"), callback_data="add_start")],
                    [InlineKeyboardButton(t(lang, "btn_back"), callback_data="main_menu")]
                ])
                await update.message.reply_text(
                    t(lang, "add_success", type=record_type, name=full_name, value=content),
                    reply_markup=kb, parse_mode="Markdown"
                )
            except Exception as e:
                await update.message.reply_text(t(lang, "error", err=str(e)), reply_markup=back_menu_kb(lang))

    # ── Global Error Handler ────────────────────────────────
    async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
        """Log errors caused by handlers."""
        logger.error(f"Telegram bot error: {context.error}", exc_info=context.error)
        # Try to notify user
        try:
            if update and hasattr(update, 'effective_chat') and update.effective_chat:
                chat_id = update.effective_chat.id
                user = await get_user_by_chat(chat_id)
                lang = get_lang(user) if user else "fa"
                error_msg = t(lang, "error", err="Internal error. Please try /start again.")
                await context.bot.send_message(chat_id=chat_id, text=error_msg)
        except Exception:
            pass

    try:
        telegram_bot_app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
        telegram_bot_app.add_handler(CommandHandler("start", cmd_start))
        telegram_bot_app.add_handler(CommandHandler("login", cmd_login))
        telegram_bot_app.add_handler(CallbackQueryHandler(callback_handler))
        telegram_bot_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))
        telegram_bot_app.add_error_handler(error_handler)

        commands = [
            BotCommand("start", "منوی اصلی / Main Menu"),
        ]

        await telegram_bot_app.initialize()
        await telegram_bot_app.bot.set_my_commands(commands)
        await telegram_bot_app.start()
        await telegram_bot_app.updater.start_polling(
            drop_pending_updates=True,
            allowed_updates=Update.ALL_TYPES
        )
        bot_info = await telegram_bot_app.bot.get_me()
        logger.info(f"Telegram bot started successfully: @{bot_info.username} (ID: {bot_info.id})")
    except Exception as e:
        logger.error(f"Telegram bot failed to start: {e}", exc_info=True)
        telegram_bot_app = None

async def stop_telegram_bot():
    """Stop the Telegram bot gracefully."""
    global telegram_bot_app
    if telegram_bot_app:
        try:
            await telegram_bot_app.updater.stop()
            await telegram_bot_app.stop()
            await telegram_bot_app.shutdown()
            logger.info("Telegram bot stopped")
        except Exception as e:
            logger.warning(f"Telegram bot stop error: {e}")
        telegram_bot_app = None

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
    # Auto-detect Cloudflare zone domain
    await cf_fetch_zone_domain()
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.dns_records.create_index("user_id")
    await db.dns_records.create_index("id", unique=True)
    await db.plans.create_index("plan_id", unique=True)
    await db.users.create_index("referral_code", unique=True, sparse=True)
    
    await db.activity_logs.create_index("user_id")
    await db.activity_logs.create_index("created_at")
    await db.users.create_index("telegram_chat_id", sparse=True)
    
    # Seed admin user if not exists
    admin_email = os.environ.get('ADMIN_EMAIL', f'admin@{DOMAIN_NAME}')
    admin_pass = os.environ.get('ADMIN_PASSWORD', 'admin123456')
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_pass),
            "plan": "enterprise",
            "role": "admin",
            "record_count": 0,
            "record_limit": PLAN_LIMITS["enterprise"],
            "referral_code": generate_referral_code(),
            "referred_by": None,
            "referral_count": 0,
            "referral_bonus": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Admin user created: {admin_email}")
    else:
        # Ensure existing admin has referral_code
        if not existing_admin.get("referral_code"):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {
                    "referral_code": generate_referral_code(),
                    "referred_by": None,
                    "referral_count": 0,
                    "referral_bonus": 0
                }}
            )
    
    # Seed default plans if empty
    plans_count = await db.plans.count_documents({})
    if plans_count == 0:
        for p in DEFAULT_PLANS:
            await db.plans.insert_one(dict(p))
        logger.info("Default plans seeded")
    else:
        # Load plan limits from DB into cache
        db_plans = await db.plans.find({}, {"_id": 0}).to_list(50)
        for p in db_plans:
            PLAN_LIMITS[p["plan_id"]] = p["record_limit"]
    
    # Seed default settings if not exists
    existing_settings = await db.settings.find_one({"key": "site_settings"})
    if not existing_settings:
        await db.settings.insert_one({
            "key": "site_settings",
            "telegram_id": "",
            "telegram_url": "https://t.me/",
            "contact_message_en": "Contact us on Telegram for pricing",
            "contact_message_fa": "برای استعلام قیمت در تلگرام تماس بگیرید",
            "referral_bonus_per_invite": 1
        })
    else:
        # Ensure referral_bonus_per_invite field exists
        if "referral_bonus_per_invite" not in (existing_settings or {}):
            await db.settings.update_one(
                {"key": "site_settings"},
                {"$set": {"referral_bonus_per_invite": 1}}
            )
    
    logger.info("Database indexes created")
    
    # Start Telegram bot
    await start_telegram_bot()

@app.on_event("shutdown")
async def shutdown_db_client():
    await stop_telegram_bot()
    client.close()
