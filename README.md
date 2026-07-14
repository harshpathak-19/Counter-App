# 🕉️ Bhakti Naam Jaap

A devotional Naam Jaap (chanting) counter mobile app — chant, track, and grow spiritually.

Built for devotees who wish to count their daily japa of Radha Rani, Krishna ji, Shiv ji, Hanuman ji, and Shri Radhavallabh Harivansh, while tracking discipline (Brahmacharya), receiving reminders, and engaging with devotional media.

---

## ✨ Features

### 🙏 Naam Jaap Counter
- Tap-to-count chanting for 5 deities: Radha Rani, Krishna ji, Shiv ji, Hanuman ji, Radhavallabh Shri Harivansh
- Add your own custom mantra
- Mala counter (cycles of 108) with haptic feedback on completion
- Handwritten Naam Jaap — write the name by hand on a canvas; each entry adds to your count
- Daily, streak, and lifetime count tracking
- 
### 📊 Analytics & Insights
- Calendar heatmap of daily jaap intensity
- Per-deity progress graphs
- Combined graph across all deities
- Today's count, day streak, and lifetime total at a glance

### 🔔 Reminders & Notifications
- Custom daily chanting reminders
- Daily Suvichar (spiritual thought) notification
- End-of-day nudge if today's jaap is incomplete
- Hindu festival & Ekadashi alerts

### 💬 Naam-Guru Chatbot
- AI chatbot that answers questions about Radha Rani's leela and mahima
- Answers grounded in the teachings and satsang of Shri Premanand Govind Sharan Ji Maharaj
- Responds warmly in Hindi, staying within devotional scope

### 🎬 Bhakti Media
- Video feed (YouTube / Instagram Reels) categorized by Kirtan, Satsang, etc.
- Podcast/audio section with playback controls
- Admin panel to add/manage videos and podcasts

### 🔐 Authentication
- Guest mode (local data) by default
- Optional Login/Register with JWT-based authentication
- Guest data auto-migrates to account on first login/registration

### 🌐 Language
- Full Hindi and English support via i18n

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native + Expo |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Auth | JWT (verified against database per request) |
| Notifications | Expo Push Notifications |
| Chatbot | Claude Sonnet 4.5 (LLM API) |
| Charts | Victory Native / react-native-chart-kit |
| Handwriting Canvas | react-native-skia / react-native-svg |
| Local Storage | AsyncStorage / expo-sqlite (offline-first) |

---

## 📁 Folder Structure

```
Counter-App/
├── .emergent/            # Emergent platform config (internal)
├── backend/              # FastAPI backend
│   ├── models/           # Database models (User, Deity, JaapEntry, etc.)
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic (auth, notifications, chatbot)
│   └── ...
├── frontend/             # React Native + Expo app
│   ├── screens/          # App screens (Jaap, Tracker, Chat, Media, Settings)
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Bottom tab & stack navigation
│   ├── locales/          # en.json / hi.json translation files
│   └── ...
├── tests/                # Automated test files
├── test_reports/         # Test run reports
├── design_guidelines.json # App design tokens (colors, typography)
├── test_result.md        # Latest test results summary
└── README.md
```
### Prerequisites
- Node.js and npm/yarn
- Python 3.10+
- MongoDB instance (local or Atlas)
- Expo Go app (for testing on your phone)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Set up your .env file (see .env.example)
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npx expo start
```
Scan the QR code with the Expo Go app to preview on your device.

### Environment Variables
Create a `.env` file in `backend/` with:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
LLM_API_KEY=your_llm_api_key
EXPO_ACCESS_TOKEN=your_expo_push_token
ADMIN_PASSWORD=your_admin_panel_password
```

---

## 📌 Project Status

Currently in active development. Core features (counter, Brahmacharya tracker, chatbot) are functional. Media playback (video/audio) is being debugged before Play Store submission.

---

## 🤝 Contributing

This is a devotional project built with love for the bhakti community. Contributions — bug fixes, UI improvements, new features — are welcome. Feel free to fork the repo and open a pull request, or reach out directly.

**Radhe Radhe 🙏**
