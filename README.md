# ARISE — Hardware-Accelerated Discipline OS

<div align="center">

```
   _____  _____  _____  _____  ______ 
  /  _  \ \______ \  |  /  ___/ /  ___/ 
 /  /_\  \ |  |  \  |  \___ \  \___ \  
/    |    \|  |   /  |/____  >/____  > 
\____|__  /|____/  |______/  /______/  
        \/                             
```

**Real-Life RPG Self-Discipline Engine & Screen Time Lock for Android**

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000000?style=for-the-badge&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev)
[![Google ML Kit](https://img.shields.io/badge/ML%20Kit-On--Device%20Pose-4285F4?style=for-the-badge&logo=google)](https://developers.google.com/ml-kit)
[![SQLite](https://img.shields.io/badge/SQLite-Drizzle%20ORM-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org)
[![Kotlin](https://img.shields.io/badge/Kotlin-Native%20Modules-7F52FF?style=for-the-badge&logo=kotlin)](https://kotlinlang.org)

</div>

---

## ⚡ Overview

**ARISE** is a 100% offline, privacy-first Android application designed to eliminate dopamine-driven phone addiction through physical exertion and deep work sprints. 

Unlike conventional productivity apps that rely on easily dismissible timers or web mockups, ARISE integrates directly with the **Android Native OS subsystem** (UsageStatsManager, System Alert Window Overlay, and Accessibility services) to physically lock distracting apps until earned screen time tokens are unlocked via physical exercise or deep focus sessions.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       ARISE ENGINE                          │
├──────────────────────────────┬──────────────────────────────┤
│         CORE RUNTIME         │       NATIVE SUBSYSTEMS      │
│  • React Native (Expo 54)    │  • Kotlin Native Modules     │
│  • Expo Router Navigation    │  • Google ML Kit Pose Model  │
│  • Zustand Global Stores     │  • Android UsageStatsManager │
│  • Reanimated Glow System    │  • System Alert Window Lock  │
├──────────────────────────────┴──────────────────────────────┤
│                OFFLINE PERSISTENCE (SSOT)                   │
│  • SQLite WAL-mode Engine (expo-sqlite)                     │
│  • Drizzle ORM Single Source of Truth                       │
│  • 100% On-Device Storage (Zero Cloud Telemetry)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔥 Key Pillars & Features

### 1. 🤖 On-Device AI Pose Detection & Rep Counting
- **Hardware-Accelerated ML Kit**: Custom Kotlin module (`modules/pose-detector`) running Google ML Kit Pose Detection on-device with zero cloud latency.
- **Biomechanical Kinematics**: Computes joint angles (elbows, hips, knees) across 33 landmarks mapped to MoveNet keypoint topologies.
- **Holographic HUD**: Real-time bounding alignment brackets, joint angle readout, and dynamic voice coach cues.
- **Zero-Flash Frame Pipeline**: High-performance isolated inference loop that eliminates camera shutter flash and OpenGL surface memory leaks.

### 2. 🔒 Native Android App Lock & Shield Protocol
- **Installed App Discovery**: Reads true on-device package names via Android PackageManager.
- **Hardened Overlay Lock**: Uses foreground service polling with `UsageStatsManager` and `SYSTEM_ALERT_WINDOW` to immediately block blacklisted distraction apps (Instagram, YouTube, Twitter, Games).
- **Time Pass Token Economy**: Locked apps can only be accessed by redeeming Coins earned through physical workouts or focus sessions.

### 3. 🏋️ Comprehensive Gym Engine & 200+ Exercise Database
- **Local Structured Catalog**: Over 200 exercises across all 11 muscle groups (Chest, Back, Shoulders, Biceps, Triceps, Legs, Glutes, Core, Full Body, Cardio, Mobility) with equipment tags and safety cues.
- **Deterministic Workout Generator**: Generates 3, 4, 5, and 6-day splits (PPL, Upper/Lower, Full Body) calibrated to lifter experience, equipment, and duration targets.
- **Live Workout Tracker**: Multi-mode set logging (AI Camera, Timer, Manual), interactive Rest Timer (+15s / -15s / Skip), volume calculations, and automated Personal Record (PR) celebration triggers.

### 4. 📱 iOS-Inspired Translucent Design System
- **Glassmorphism UI**: Translucent glass cards (`rgba(22, 22, 26, 0.75)` / `rgba(255, 255, 255, 0.85)`), subtle 1px border highlights, and tactile haptic feedback.
- **Watch-Style Chronometer**: Compact timepiece widget (`HH:MM:SS`, Day, Date) with an isolated 1-second interval engine to prevent root re-renders.
- **12-Week GitHub-Style Activity Heatmap**: 84-day contribution grid computed from real SQLite events (completed quests, focus sprints, gym volume). Tap any cell to view the exact activity summary.
- **7-Day Telemetry Switcher**: Real-time bar chart toggling between XP, Focus Minutes, Workouts, and Quests.
- **Multi-Theme Engine**: Dark Void (Obsidian `#050505` & Cyber Lime `#D1FF00`) and Light Clean (Pearl `#F8FAFC` & Volt Emerald `#10B981`).

### 5. 🎵 Procedural 44.1kHz Soundscape Synthesizer
- **100% Offline Audio Engine**: Mathematical PCM WAV buffer synthesis running locally on `expo-av` without external MP3 asset downloads.
- **Soundscape Library**:
  - `Deep Alpha State`: 14Hz binaural beats on a 108Hz carrier wave.
  - `Gamma Surge`: 40Hz resonance tuned for rapid problem solving and deep work.
  - `Deep Space Brown Noise`: Warm $1/f^2$ low-frequency atmospheric rumble.
  - `Neon Rain on Glass`: Resonant acoustic rain simulation.
  - `Cyber Forest Breeze`: Modulated mountain wind and soft leaf rustle.
  - `Cyberpunk Lo-Fi`: Warm Dm7–G7–Cmaj7 analog chord progressions.
  - `432Hz Solar Ambient`: Cinematic reverberant atmospheric pads.

### 6. 📸 Daily Physique Transformation Timeline
- 100% private, on-device camera & gallery check-ins stored directly in SQLite with baseline Day 1 vs Latest comparison.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Expo SDK 54 (`~54.0.37`), React Native `0.81.5`, React 19 |
| **Language** | TypeScript (Strict mode), Kotlin |
| **Routing** | Expo Router (File-based navigation) |
| **Database** | SQLite WAL-mode via `expo-sqlite`, Drizzle ORM |
| **State Management** | Zustand |
| **Machine Learning** | Google ML Kit Pose Detection (`18.0.0-beta5`) |
| **Camera** | Expo Camera (`CameraView`) |
| **Audio** | Expo AV with 16-bit 44.1kHz PCM Synthesizer |
| **Icons** | Lucide React Native |

---

## 🚀 Getting Started

### Prerequisites
- Node.js $\ge$ 18.x
- Android SDK (API Level 34 / 35 recommended)
- Java 17 (JDK)

### 1. Clone & Install
```bash
git clone https://github.com/rahulx-dev/ARISE.git
cd ARISE
npm install
```

### 2. Type Check & Verification
```bash
npx tsc --noEmit
npx expo-doctor
```

### 3. Run on Android Device / Emulator
```bash
npx expo run:android
```

### 4. Build Standalone Android APK (EAS)
```bash
npx eas-cli build -p android --profile preview
```

---

## 🔒 Permissions Used

- `PACKAGE_USAGE_STATS`: Detects running foreground applications to enforce screen time limits.
- `SYSTEM_ALERT_WINDOW`: Renders full-screen lockdown overlay over blocked apps.
- `CAMERA`: Required strictly for local ML Kit exercise joint detection and daily physique check-in photos (no images leave device).
- `POST_NOTIFICATIONS`: Triggers scheduled local daily streak and quest reminders.

---

## 🤝 Contributing & Road Ahead

ARISE is an actively evolving, community-driven project. While the core native engine, ML Kit kinematics, and offline SQLite architecture are solidly built, you may encounter minor edge-case bugs or device-specific quirks as we continue to push updates.

We're continuously improving stability, pose accuracy, and performance! 

**Want to help make ARISE better?**
- Found a bug or have an idea? Open an [Issue](https://github.com/rahulx-dev/ARISE/issues).
- Want to contribute code, optimize ML models, or add new exercises? Fork the repo, create a branch, and open a **Pull Request** — all contributions are warmly welcomed!

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
Crafted with discipline by <b><a href="https://github.com/rahulx-dev">Rahul</a></b>.
</div>
