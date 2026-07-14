import os, uuid, requests, pytest
from datetime import date, timezone, datetime

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://bhakti-daily-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
GUEST = f"TEST_{uuid.uuid4().hex[:8]}"

@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess

# ---------- Deities ----------
def test_default_deities(s):
    r = s.get(f"{API}/deities")
    assert r.status_code == 200
    ids = {d["id"] for d in r.json()}
    for k in ["radha", "krishna", "shiva", "hanuman", "radhavallabh"]:
        assert k in ids, f"missing {k}"

def test_custom_deity_lifecycle(s):
    r = s.post(f"{API}/deities/custom", json={"guest_id": GUEST, "name_en": "TEST_Rama", "mantra_en": "Om Sri Ramaya Namah"})
    assert r.status_code == 200, r.text
    did = r.json()["id"]
    # list includes it
    r2 = s.get(f"{API}/deities", params={"guest_id": GUEST})
    assert did in {d["id"] for d in r2.json()}
    # delete
    r3 = s.delete(f"{API}/deities/custom/{did}", params={"guest_id": GUEST})
    assert r3.status_code == 200
    r4 = s.get(f"{API}/deities", params={"guest_id": GUEST})
    assert did not in {d["id"] for d in r4.json()}

# ---------- Jaap ----------
def test_jaap_create_and_summary(s):
    for _ in range(3):
        r = s.post(f"{API}/jaap", json={"guest_id": GUEST, "deity_id": "krishna", "count": 1})
        assert r.status_code == 200
    r2 = s.get(f"{API}/jaap/summary", params={"guest_id": GUEST})
    assert r2.status_code == 200
    d = r2.json()
    assert d["today"] >= 3
    assert d["lifetime"] >= 3
    assert d["streak"] >= 1
    assert d["per_deity_today"].get("krishna", 0) >= 3

def test_jaap_history_zero_filled(s):
    r = s.get(f"{API}/jaap/history", params={"guest_id": GUEST, "days": 30})
    assert r.status_code == 200
    days = r.json()["days"]
    assert len(days) == 30
    today = date.today().isoformat()
    today_entry = [d for d in days if d["date"] == today]
    assert today_entry and today_entry[0]["total"] >= 3

# ---------- Brahmacharya ----------
def test_brahmacharya_upsert(s):
    today = date.today().isoformat()
    r1 = s.post(f"{API}/brahmacharya", json={"guest_id": GUEST, "date": today, "status": "success"})
    assert r1.status_code == 200
    assert r1.json()["status"] == "success"
    # upsert to relapse
    r2 = s.post(f"{API}/brahmacharya", json={"guest_id": GUEST, "date": today, "status": "relapse"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "relapse"
    # switch back to success
    s.post(f"{API}/brahmacharya", json={"guest_id": GUEST, "date": today, "status": "success"})
    r3 = s.get(f"{API}/brahmacharya", params={"guest_id": GUEST})
    assert r3.status_code == 200
    j = r3.json()
    assert j["success_days"] >= 1
    assert j["streak"] >= 1

# ---------- Reminders ----------
def test_reminder_lifecycle(s):
    r = s.post(f"{API}/reminders", json={"guest_id": GUEST, "hour": 7, "minute": 30, "repeat_days": [1, 2, 3]})
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    r2 = s.get(f"{API}/reminders", params={"guest_id": GUEST})
    assert rid in {x["id"] for x in r2.json()}
    r3 = s.delete(f"{API}/reminders/{rid}", params={"guest_id": GUEST})
    assert r3.status_code == 200
    r4 = s.get(f"{API}/reminders", params={"guest_id": GUEST})
    assert rid not in {x["id"] for x in r4.json()}

def test_delete_nonexistent_reminder_404(s):
    r = s.delete(f"{API}/reminders/does-not-exist", params={"guest_id": GUEST})
    assert r.status_code == 404


# ---------- Handwritten jaap unification (Phase 2) ----------
def test_handwritten_and_tap_unified_summary(s):
    guest = f"TEST_hw_{uuid.uuid4().hex[:8]}"
    # Baseline summary
    for _ in range(2):
        r = s.post(f"{API}/jaap", json={"guest_id": guest, "deity_id": "radha", "count": 1, "mode": "tap"})
        assert r.status_code == 200, r.text
        assert r.json()["mode"] == "tap"
    for _ in range(3):
        r = s.post(f"{API}/jaap", json={"guest_id": guest, "deity_id": "radha", "count": 1, "mode": "handwritten"})
        assert r.status_code == 200, r.text
        assert r.json()["mode"] == "handwritten"
    r2 = s.get(f"{API}/jaap/summary", params={"guest_id": guest})
    assert r2.status_code == 200
    d = r2.json()
    # Combined = 5 for both today and lifetime, streak >=1
    assert d["today"] == 5, d
    assert d["lifetime"] == 5, d
    assert d["streak"] >= 1
    assert d["per_deity_today"].get("radha") == 5

def test_jaap_invalid_mode_rejected(s):
    r = s.post(f"{API}/jaap", json={"guest_id": GUEST, "deity_id": "krishna", "count": 1, "mode": "bogus"})
    assert r.status_code == 422

# ---------- Videos (Phase 2) ----------
def test_videos_seeded_and_categories(s):
    r = s.get(f"{API}/videos")
    assert r.status_code == 200
    vids = r.json()
    assert len(vids) >= 5
    for v in vids:
        assert "id" in v and "video_url" in v and "platform" in v and "category" in v
        assert "_id" not in v
    r2 = s.get(f"{API}/videos/categories")
    assert r2.status_code == 200
    cats = r2.json()["categories"]
    for expected in ("Krishna Leela", "Satsang", "Kirtan"):
        assert expected in cats, cats

def test_videos_category_filter(s):
    r = s.get(f"{API}/videos", params={"category": "Kirtan"})
    assert r.status_code == 200
    vids = r.json()
    assert len(vids) >= 1
    assert all(v["category"] == "Kirtan" for v in vids)

# ---------- Admin (Phase 2) ----------
def test_admin_check_wrong_password_401(s):
    r = s.post(f"{API}/admin/check", json={"admin_password": "wrong"})
    assert r.status_code == 401

def test_admin_check_correct_password_200(s):
    r = s.post(f"{API}/admin/check", json={"admin_password": "naamsmaran-admin"})
    assert r.status_code == 200
    assert r.json()["ok"] is True

def test_create_video_requires_admin(s):
    payload = {
        "admin_password": "wrong",
        "title": "TEST_bad",
        "video_url": "https://www.youtube.com/watch?v=XYZ",
        "platform": "youtube",
        "category": "Kirtan",
    }
    r = s.post(f"{API}/videos", json=payload)
    assert r.status_code == 401

def test_create_and_delete_video_admin(s):
    payload = {
        "admin_password": "naamsmaran-admin",
        "title": "TEST_admin_video",
        "video_url": "https://www.youtube.com/watch?v=TESTID12345",
        "platform": "youtube",
        "category": "Kirtan",
        "thumbnail_url": None,
    }
    r = s.post(f"{API}/videos", json=payload)
    assert r.status_code == 200, r.text
    vid = r.json()
    assert "admin_password" not in vid
    assert vid["title"] == "TEST_admin_video"
    vid_id = vid["id"]
    # Verify persistence
    r2 = s.get(f"{API}/videos")
    assert vid_id in {v["id"] for v in r2.json()}
    # Delete requires password
    r3 = s.delete(f"{API}/videos/{vid_id}", params={"admin_password": "wrong"})
    assert r3.status_code == 401
    r4 = s.delete(f"{API}/videos/{vid_id}", params={"admin_password": "naamsmaran-admin"})
    assert r4.status_code == 200
    # Verify gone
    r5 = s.get(f"{API}/videos")
    assert vid_id not in {v["id"] for v in r5.json()}
