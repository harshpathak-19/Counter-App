# NaamSmaran — Product Requirements Document

## Overview
NaamSmaran is a devotional japa (chanting) counter mobile app built with React Native + Expo, FastAPI backend, and MongoDB. Designed for daily spiritual practice with offline-first counters, discipline tracking, native reminders, and bilingual (Hindi/English) UX.

## Status
MVP (Phase 1) — Complete and tested.

## Users
- Devotees seeking a private, warm digital japa mala.
- Guest mode by default (no signup) — data stored per-device via a generated `guest_id` in AsyncStorage; synced to backend for durability.

## MVP Features (Phase 1 — shipped)
1. **Jaap Counter (Home tab)**
   - 5 seeded deities: Radha Rani, Krishna Ji, Shiv Ji, Hanuman Ji, Radhavallabh Shri Harivansh.
   - Custom mantra creation (name + mantra).
   - Large tap-to-count button with animated 108-mala circular ring, `Medium` haptic per tap, `Success` haptic + 🌸 celebration overlay on mala completion.
   - Optimistic local UI + debounced backend sync (`/api/jaap`).
   - Per-deity Today / Streak / Lifetime stat cards.
2. **Brahmacharya Tracker (Tracker tab)**
   - Daily Success/Relapse check-in (idempotent upsert per date).
   - Current streak card + 17-week GitHub-style heatmap.
   - Success-days / Relapse-days summary.
3. **Insights (Insights tab)**
   - Summary: Today, Streak, Lifetime.
   - Deity filter chips (All + each deity) — horizontal, single-row, scrollable.
   - 30-day SVG bar chart (per-deity or combined).
   - 30-day daily-intensity heatmap.
   - Milestone cards (First mala, 1000 chants, 10 malas, 100 malas).
4. **Settings (Settings tab)**
   - Language toggle: English / हिन्दी (full UI translated live).
   - Native local reminders via `expo-notifications` (daily or per-weekday) with time picker and day chips.
   - Delete individual reminders (also cancels scheduled OS notifications).

## Phase 2 (deferred)
- Handwritten Naam Jaap (Skia canvas)
- Video/Reels feed with categories
- Email/JWT auth + cross-device sync
- Data backup/export

## Data Models
- `deities` (id, name_en/hi, mantra_en/hi, image_url, color, is_default, [guest_id for custom])
- `jaap_entries` (id, guest_id, deity_id, count, mode, timestamp)
- `brahmacharya` (id, guest_id, date, status)
- `reminders` (id, guest_id, hour, minute, repeat_days, deity_id, message, enabled, notification_ids)

## API Endpoints (all `/api` prefix)
- GET `/deities?guest_id=...`
- POST `/deities/custom`, DELETE `/deities/custom/{id}?guest_id=...`
- POST `/jaap`, GET `/jaap/summary?guest_id=...`, GET `/jaap/history?guest_id=...&days=30`
- POST `/brahmacharya`, GET `/brahmacharya?guest_id=...&days=120`
- GET/POST/PATCH/DELETE `/reminders`

## Design
- Palette: warm saffron `#E57A00`, temple gold `#D4AF37`, cream `#FFFDF9`, deep brown `#3B2E24`. No blue/indigo.
- 4 bottom tabs: Jaap · Tracker · Insights · Settings.
- Deity images from Pexels/Unsplash. Warm surfaceSecondary/Tertiary layering. Zero shadow, subtle borders.
- Haptics: Medium tap, Success on 108, Light on selection/tab change.

## Tech Stack
- Frontend: Expo SDK 54, React Native 0.81, expo-router, react-native-reanimated, react-native-svg, expo-notifications, expo-haptics.
- Backend: FastAPI + Motor (async MongoDB), Pydantic v2.
- Storage: MongoDB (server), AsyncStorage (device `guest_id`, language preference).

## Notes
- **Notifications flag**: Local reminders work end-to-end on Expo Go / production builds. Web preview cannot request OS notification permission, so scheduling silently no-ops in the browser — this is expected.
- Guest data is per-device. There is no cross-device sync in Phase 1 by design.
