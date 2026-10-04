# ARISE - Solo Leveling Gamified Fitness & App Blocker
## Production Source Code & Deployment Guide

Thank you for purchasing **ARISE**! This package contains the full source code for the mobile app, native Android modules (ML Kit Pose Detection and Foreground App Blocker), and pre-configured cloud/database hooks.

---

### 📱 Quick Start: Test the App Immediately
A pre-built, signed production release APK is included inside the `APK/` directory:
- `APK/ARISE-Release.apk`
Install this APK on any physical Android device (Android 8.0+) to test real-time AI pose detection, habit quests, and app blocking out of the box.

---

### 🛠️ Development & Build Setup

#### 1. Prerequisites
- **Node.js**: v18.x or v20.x
- **JDK**: Java Development Kit 17
- **Android Studio**: Android SDK (API 34 / 35 recommended)
- **Expo CLI**: `npm install -g expo-cli`

#### 2. Project Installation
Extract the zip file, open your terminal inside the root project directory, and run:
```bash
npm install
```

#### 3. Environment Configuration
Create a `.env` file in the root directory (or update existing `.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_CPX_APP_ID=your_cpx_app_id
```

#### 4. Running the Development Build
To start the development server:
```bash
npx expo start
```

To run on an Android emulator or connected device:
```bash
npx expo run:android
```

---

### 📦 Building a New Production Release (AAB / APK)
The project is configured with EAS and local Gradle build scripts.
To generate a standalone signed APK locally:
```bash
cd android
./gradlew assembleRelease
```
The resulting APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

---

### 🛡️ Native Modules Included
1. `modules/pose-detector`: Custom Google ML Kit Kotlin native module for on-device real-time exercise rep counting (Push-ups, Squats, Planks).
2. `modules/app-blocker`: Custom Android native module for UsageStats monitoring and distraction screen overlay blocking.

---

### 💬 Buyer Support
If you have any questions, encounter build issues, or need help with custom reskinning, please contact us via the marketplace messaging dashboard. We are happy to help!
