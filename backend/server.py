from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta, date
from collections import defaultdict


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ----------------------------- MODELS -----------------------------

class Deity(BaseModel):
    id: str
    name_en: str
    name_hi: str
    mantra_en: str
    mantra_hi: str
    image_url: str
    color: str
    is_default: bool = True


class JaapEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guest_id: str
    deity_id: str
    count: int = 1
    mode: Literal["tap", "handwritten"] = "tap"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class JaapCreate(BaseModel):
    guest_id: str
    deity_id: str
    count: int = 1
    mode: Literal["tap", "handwritten"] = "tap"


class CustomMantraCreate(BaseModel):
    guest_id: str
    name_en: str
    name_hi: Optional[str] = None
    mantra_en: str
    mantra_hi: Optional[str] = None


class BrahmacharyaLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guest_id: str
    date: str  # YYYY-MM-DD
    status: Literal["success", "relapse"] = "success"


class BrahmacharyaCreate(BaseModel):
    guest_id: str
    date: str
    status: Literal["success", "relapse"] = "success"


class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guest_id: str
    hour: int
    minute: int
    repeat_days: List[int] = Field(default_factory=list)  # 0=Sun ... 6=Sat, empty=every day
    deity_id: Optional[str] = None
    message: Optional[str] = None
    enabled: bool = True
    notification_ids: List[str] = Field(default_factory=list)


class ReminderCreate(BaseModel):
    guest_id: str
    hour: int
    minute: int
    repeat_days: List[int] = Field(default_factory=list)
    deity_id: Optional[str] = None
    message: Optional[str] = None
    enabled: bool = True
    notification_ids: List[str] = Field(default_factory=list)


class VideoContent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    video_url: str
    platform: Literal["youtube", "instagram"]
    thumbnail_url: Optional[str] = None
    category: str
    upload_date: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class VideoCreate(BaseModel):
    admin_password: str
    title: str
    video_url: str
    platform: Literal["youtube", "instagram"]
    thumbnail_url: Optional[str] = None
    category: str


class AdminCheck(BaseModel):
    admin_password: str


# ----------------------------- SEED -----------------------------

DEFAULT_DEITIES: List[dict] = [
    {
        "id": "radha",
        "name_en": "Radha Rani",
        "name_hi": "राधा रानी",
        "mantra_en": "Radhe Radhe",
        "mantra_hi": "राधे राधे",
        "image_url": "https://images.pexels.com/photos/25398353/pexels-photo-25398353.jpeg",
        "color": "#E57A00",
        "is_default": True,
    },
    {
        "id": "krishna",
        "name_en": "Krishna Ji",
        "name_hi": "कृष्ण जी",
        "mantra_en": "Hare Krishna Hare Krishna Krishna Krishna Hare Hare, Hare Rama Hare Rama Rama Rama Hare Hare",
        "mantra_hi": "हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे, हरे राम हरे राम राम राम हरे हरे",
        "image_url": "https://images.pexels.com/photos/16354577/pexels-photo-16354577.jpeg",
        "color": "#D4AF37",
        "is_default": True,
    },
    {
        "id": "shiva",
        "name_en": "Shiv Ji",
        "name_hi": "शिव जी",
        "mantra_en": "Om Namah Shivaya",
        "mantra_hi": "ॐ नमः शिवाय",
        "image_url": "https://images.unsplash.com/photo-1609609830354-8f615d61b9c8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxsb3JkJTIwc2hpdmF8ZW58MHx8fHwxNzgzOTU2NTQ1fDA&ixlib=rb-4.1.0&q=85",
        "color": "#8C4A00",
        "is_default": True,
    },
    {
        "id": "hanuman",
        "name_en": "Hanuman Ji",
        "name_hi": "हनुमान जी",
        "mantra_en": "Om Hanumate Namah",
        "mantra_hi": "ॐ हनुमते नमः",
        "image_url": "https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxsb3JkJTIwaGFudW1hbnxlbnwwfHx8fDE3ODM5NTY1NDR8MA&ixlib=rb-4.1.0&q=85",
        "color": "#C25953",
        "is_default": True,
    },
    {
        "id": "radhavallabh",
        "name_en": "Radhavallabh Shri Harivansh",
        "name_hi": "राधावल्लभ श्री हरिवंश",
        "mantra_en": "Shri Radhavallabhaya Namah",
        "mantra_hi": "श्री राधावल्लभाय नमः",
        "image_url": "https://images.pexels.com/photos/25398353/pexels-photo-25398353.jpeg",
        "color": "#4A7C59",
        "is_default": True,
    },
]


async def seed_deities():
    existing = await db.deities.count_documents({"is_default": True})
    if existing >= len(DEFAULT_DEITIES):
        return
    for d in DEFAULT_DEITIES:
        await db.deities.update_one({"id": d["id"]}, {"$set": d}, upsert=True)


SEED_VIDEOS = [
    {
        "title": "Hare Krishna Maha Mantra",
        "video_url": "https://www.youtube.com/watch?v=sO14X3iCVIw",
        "platform": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/sO14X3iCVIw/hqdefault.jpg",
        "category": "Kirtan",
    },
    {
        "title": "Achyutam Keshavam Krishna Damodaram",
        "video_url": "https://www.youtube.com/watch?v=TwUvpFTuwvA",
        "platform": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/TwUvpFTuwvA/hqdefault.jpg",
        "category": "Kirtan",
    },
    {
        "title": "Shiv Tandav Stotram",
        "video_url": "https://www.youtube.com/watch?v=jhQpXaTS3Do",
        "platform": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/jhQpXaTS3Do/hqdefault.jpg",
        "category": "Satsang",
    },
    {
        "title": "Hanuman Chalisa",
        "video_url": "https://www.youtube.com/watch?v=AETFvQonfV8",
        "platform": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/AETFvQonfV8/hqdefault.jpg",
        "category": "Kirtan",
    },
    {
        "title": "Krishna Leela — Bal Krishna Stories",
        "video_url": "https://www.youtube.com/watch?v=Kn9zPHRGY9E",
        "platform": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/Kn9zPHRGY9E/hqdefault.jpg",
        "category": "Krishna Leela",
    },
]


async def seed_videos():
    existing = await db.videos.count_documents({})
    if existing > 0:
        return
    for v in SEED_VIDEOS:
        video = VideoContent(**v)
        await db.videos.insert_one(video.dict())


# ----------------------------- HELPERS -----------------------------

def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _today_utc_date() -> date:
    return datetime.now(timezone.utc).date()


# ----------------------------- ROUTES -----------------------------

@api_router.get("/")
async def root():
    return {"message": "NaamSmaran API", "status": "ok"}


@api_router.get("/deities", response_model=List[Deity])
async def list_deities(guest_id: Optional[str] = None):
    query = {"$or": [{"is_default": True}]}
    if guest_id:
        query["$or"].append({"guest_id": guest_id})
    docs = await db.deities.find(query, {"_id": 0}).to_list(1000)
    return [Deity(**d) for d in docs]


@api_router.post("/deities/custom", response_model=Deity)
async def create_custom_deity(payload: CustomMantraCreate):
    deity = {
        "id": str(uuid.uuid4()),
        "name_en": payload.name_en,
        "name_hi": payload.name_hi or payload.name_en,
        "mantra_en": payload.mantra_en,
        "mantra_hi": payload.mantra_hi or payload.mantra_en,
        "image_url": "https://images.unsplash.com/photo-1726501604891-19fb7f7cd37b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMHRlbXBsZSUyMGFyY2hpdGVjdHVyZSUyMGFic3RyYWN0fGVufDB8fHx8MTc4MjI4MjIxMHww&ixlib=rb-4.1.0&q=85",
        "color": "#8C4A00",
        "is_default": False,
        "guest_id": payload.guest_id,
    }
    await db.deities.insert_one(dict(deity))
    return Deity(**{k: v for k, v in deity.items() if k != "guest_id"})


@api_router.delete("/deities/custom/{deity_id}")
async def delete_custom_deity(deity_id: str, guest_id: str):
    result = await db.deities.delete_one({"id": deity_id, "guest_id": guest_id, "is_default": False})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom deity not found")
    return {"deleted": True}


@api_router.post("/jaap", response_model=JaapEntry)
async def create_jaap(payload: JaapCreate):
    entry = JaapEntry(**payload.dict())
    await db.jaap_entries.insert_one(entry.dict())
    return entry


@api_router.get("/jaap/summary")
async def jaap_summary(guest_id: str):
    """Returns per-deity today/lifetime counts + overall streak."""
    today = _today_utc_date().isoformat()
    per_deity_today: dict = defaultdict(int)
    per_deity_lifetime: dict = defaultdict(int)
    total_today = 0
    total_lifetime = 0
    dates_with_activity: set = set()

    async for doc in db.jaap_entries.find({"guest_id": guest_id}, {"_id": 0}):
        cnt = int(doc.get("count", 0))
        deity_id = doc.get("deity_id")
        ts = doc.get("timestamp", "")
        day = ts[:10] if ts else ""
        per_deity_lifetime[deity_id] += cnt
        total_lifetime += cnt
        if day == today:
            per_deity_today[deity_id] += cnt
            total_today += cnt
        if day:
            dates_with_activity.add(day)

    # Compute streak: consecutive days ending today or yesterday with activity
    streak = 0
    d = _today_utc_date()
    if d.isoformat() not in dates_with_activity:
        d = d - timedelta(days=1)
    while d.isoformat() in dates_with_activity:
        streak += 1
        d = d - timedelta(days=1)

    return {
        "today": total_today,
        "lifetime": total_lifetime,
        "streak": streak,
        "per_deity_today": dict(per_deity_today),
        "per_deity_lifetime": dict(per_deity_lifetime),
    }


@api_router.get("/jaap/history")
async def jaap_history(guest_id: str, days: int = Query(30, ge=1, le=365)):
    """Returns daily totals for last N days: {date: {total, per_deity: {..}}}"""
    since = _today_utc_date() - timedelta(days=days - 1)
    since_iso = since.isoformat()
    result: dict = {}
    async for doc in db.jaap_entries.find(
        {"guest_id": guest_id, "timestamp": {"$gte": since_iso}}, {"_id": 0}
    ):
        ts = doc.get("timestamp", "")
        day = ts[:10]
        if not day:
            continue
        entry = result.setdefault(day, {"total": 0, "per_deity": {}})
        cnt = int(doc.get("count", 0))
        entry["total"] += cnt
        deity = doc.get("deity_id", "")
        entry["per_deity"][deity] = entry["per_deity"].get(deity, 0) + cnt

    # Fill missing days with zeros
    filled = []
    for i in range(days):
        day = (since + timedelta(days=i)).isoformat()
        e = result.get(day, {"total": 0, "per_deity": {}})
        filled.append({"date": day, "total": e["total"], "per_deity": e["per_deity"]})
    return {"days": filled}


@api_router.post("/brahmacharya", response_model=BrahmacharyaLog)
async def upsert_brahmacharya(payload: BrahmacharyaCreate):
    existing = await db.brahmacharya.find_one(
        {"guest_id": payload.guest_id, "date": payload.date}, {"_id": 0}
    )
    if existing:
        await db.brahmacharya.update_one(
            {"guest_id": payload.guest_id, "date": payload.date},
            {"$set": {"status": payload.status}},
        )
        existing["status"] = payload.status
        return BrahmacharyaLog(**existing)
    log = BrahmacharyaLog(**payload.dict())
    await db.brahmacharya.insert_one(log.dict())
    return log


@api_router.get("/brahmacharya")
async def get_brahmacharya(guest_id: str, days: int = Query(120, ge=1, le=400)):
    since = (_today_utc_date() - timedelta(days=days - 1)).isoformat()
    docs = await db.brahmacharya.find(
        {"guest_id": guest_id, "date": {"$gte": since}}, {"_id": 0}
    ).to_list(1000)
    # Compute current streak of success
    by_date = {d["date"]: d["status"] for d in docs}
    streak = 0
    d = _today_utc_date()
    if by_date.get(d.isoformat()) != "success":
        d = d - timedelta(days=1)
    while by_date.get(d.isoformat()) == "success":
        streak += 1
        d = d - timedelta(days=1)
    success_days = sum(1 for v in by_date.values() if v == "success")
    relapse_days = sum(1 for v in by_date.values() if v == "relapse")
    return {
        "entries": docs,
        "streak": streak,
        "success_days": success_days,
        "relapse_days": relapse_days,
    }


@api_router.get("/reminders", response_model=List[Reminder])
async def list_reminders(guest_id: str):
    docs = await db.reminders.find({"guest_id": guest_id}, {"_id": 0}).to_list(1000)
    return [Reminder(**d) for d in docs]


@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(payload: ReminderCreate):
    reminder = Reminder(**payload.dict())
    await db.reminders.insert_one(reminder.dict())
    return reminder


@api_router.patch("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, payload: ReminderCreate):
    update_data = payload.dict()
    result = await db.reminders.update_one(
        {"id": reminder_id, "guest_id": payload.guest_id}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    doc = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
    return Reminder(**doc)


@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, guest_id: str):
    result = await db.reminders.delete_one({"id": reminder_id, "guest_id": guest_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"deleted": True}


# ----------------------------- VIDEOS -----------------------------

def _admin_ok(pw: Optional[str]) -> bool:
    admin_pw = os.environ.get("ADMIN_PASSWORD", "")
    return bool(admin_pw) and pw == admin_pw


@api_router.post("/admin/check")
async def admin_check(payload: AdminCheck):
    if not _admin_ok(payload.admin_password):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return {"ok": True}


@api_router.get("/videos", response_model=List[VideoContent])
async def list_videos(category: Optional[str] = None):
    query: dict = {}
    if category and category != "all":
        query["category"] = category
    docs = (
        await db.videos.find(query, {"_id": 0})
        .sort("upload_date", -1)
        .to_list(500)
    )
    return [VideoContent(**d) for d in docs]


@api_router.get("/videos/categories")
async def video_categories():
    cats = await db.videos.distinct("category")
    return {"categories": sorted([c for c in cats if c])}


@api_router.post("/videos", response_model=VideoContent)
async def create_video(payload: VideoCreate):
    if not _admin_ok(payload.admin_password):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    data = payload.dict(exclude={"admin_password"})
    video = VideoContent(**data)
    await db.videos.insert_one(video.dict())
    return video


@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, admin_password: str):
    if not _admin_ok(admin_password):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    result = await db.videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_deities()
    await seed_videos()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
