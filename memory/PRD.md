# NaamSmaran — Product Requirements Document

## Overview
NaamSmaran is a devotional japa (chanting) counter mobile app built with React Native + Expo, FastAPI backend, and MongoDB. Designed for daily spiritual practice with offline-first counters, discipline tracking, native reminders, handwritten naam jaap, a video feed, and bilingual (Hindi/English) UX.

## Status
Phase 1 (MVP) + Phase 2 (handwritten + videos) — Complete and tested.

## Users
- Devotees seeking a private, warm digital japa mala.
- Guest mode by default (no signup) — data stored per-device via a generated `guest_id` in AsyncStorage; synced to backend for durability.

## Phase 1 Features (shipped)
1. **Jaap Counter (Home tab)** — 5 seeded deities + custom mantra; large tap-to-count with 108-mala ring, haptics, celebration.
2. **Brahmacharya Tracker** — Daily Success/Relapse check-in, streak card, 17-week heatmap.
3. **Insights** — Today/Streak/Lifetime, per-deity filter, 30-day bar chart, intensity heatmap, milestones.
4. **Settings** — Hindi/English toggle, native local reminders via expo-notifications.

## Phase 2 Features (shipped)
5. **Handwritten Naam Jaap** — accessible from the Jaap tab header via the pen icon. SVG-based finger-drawing canvas per deity. Tapping **Done +1** POSTs to `/api/jaap` with `mode: "handwritten"` — count unifies into the same summary/streak/lifetime as the tap counter. Canvas auto-clears; session counter + today counter displayed.
6. **Video/Reels Feed (Videos tab)** — 5 seed videos across categories (Krishna Leela, Satsang, Kirtan). Horizontal category filter chips. YouTube URLs play inline via `react-native-webview` with embed URL. Instagram URLs open externally via `Linking.openURL`. Admin add-video form at `/video-admin` protected by `ADMIN_PASSWORD` env var. Platform auto-detected from URL.

## Data Models
- `deities` (id, name_en/hi, mantra_en/hi, image_url, color, is_default, [guest_id for custom])
- `jaap_entries` (id, guest_id, deity_id, count, mode: tap|handwritten, timestamp)
- `brahmacharya` (id, guest_id, date, status: success|relapse)
- `reminders` (id, guest_id, hour, minute, repeat_days, deity_id, message, enabled, notification_ids)
- `videos` (id, title, video_url, platform: youtube|instagram, thumbnail_url, category, upload_date)

## API Endpoints (all `/api` prefix)
- GET `/deities?guest_id=...` · POST `/deities/custom` · DELETE `/deities/custom/{id}?guest_id=...`
- POST `/jaap` · GET `/jaap/summary?guest_id=...` · GET `/jaap/history?guest_id=...&days=30`
- POST `/brahmacharya` · GET `/brahmacharya?guest_id=...&days=120`
- GET/POST/PATCH/DELETE `/reminders`
- POST `/admin/check` (verify admin password)
- GET `/videos?category=...` · GET `/videos/categories`
- POST `/videos` (admin) · DELETE `/videos/{id}?admin_password=...` (admin)

## Design
- Palette: warm saffron `#E57A00`, temple gold `#D4AF37`, cream `#FFFDF9`, deep brown `#3B2E24`. No blue/indigo.
- 5 bottom tabs: **Jaap · Tracker · Videos · Insights · Settings**.
- Deity images from Pexels/Unsplash. Warm surfaceSecondary/Tertiary layering. Zero shadow, subtle borders.
- Haptics: Medium tap, Success on 108, Light on selection/tab change.

## Tech Stack
- Frontend: Expo SDK 54, React Native 0.81, expo-router, react-native-reanimated, react-native-svg, react-native-webview, expo-notifications, expo-haptics, expo-image.
- Backend: FastAPI + Motor (async MongoDB), Pydantic v2.
- Storage: MongoDB (server), AsyncStorage (device `guest_id`, language, admin password).

## Environment
- Backend `.env`:
  - `MONGO_URL`, `DB_NAME` (existing)
  - `ADMIN_PASSWORD` — required for the video admin form. Default value: `naamsmaran-admin`.

## Notes
- **Notifications**: Local reminders work end-to-end on Expo Go / production builds. Web preview cannot request OS notification permission — expected.
- **WebView / YouTube inline playback**: works on Expo Go / native builds via `react-native-webview`. On the browser preview the WebView renders empty — this is a react-native-webview limitation on web only.
- **Instagram Reels**: intentionally opened externally (Instagram blocks in-app embedding on both iOS and Android).
- Guest data is per-device. There is no cross-device sync in Phase 1/2 by design.

## Deferred / Future
- Email/JWT auth + cross-device sync
- Data backup/export
- Push notifications via Emergent-managed FCM (only usable after deployment/build)
- Community/satsang feed
