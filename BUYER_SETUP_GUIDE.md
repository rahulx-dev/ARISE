# ARISE — Buyer Takeover & Engineering Setup Guide

Welcome to the **ARISE** codebase. This guide provides step-by-step instructions for an acquiring buyer or engineering team to configure, build, and deploy ARISE under their own independent accounts (EAS, Supabase, Google Play, AdMob, Sentry, and CPX/BitLabs).

---

## 1. Prerequisites & Environment

- **Node.js**: `v20.x` LTS or `v22.x` LTS (do **not** use deprecated global `expo-cli`)
- **Package Manager**: `npm` (v10+)
- **JDK**: OpenJDK 17 (`JAVA_HOME` pointing to JDK 17)
- **Android Studio & SDK**:
  - Android SDK Platform 34 and 35
  - Android SDK Build-Tools 35.0.0
  - Android NDK (r26b or newer)
  - CMake (3.22.1)
- **Expo Framework**: Expo SDK 54 (`npx expo`) with React Native 0.81.5 and Kotlin Native Modules

---

## 2. Quick Local Setup

1. **Clone or Extract Repository**:
   ```bash
   cd ARISE
   npm install
   ```

2. **Verify TypeScript & Linting**:
   ```bash
   npx tsc --noEmit
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` (or create `.env`) in the root directory:
   ```env
   # Supabase Backend
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-public-key>

   # CPX Research / Survey Wall (Optional)
   EXPO_PUBLIC_CPX_APP_ID=<your-cpx-app-id>

   # Sentry Error Reporting (Optional)
   SENTRY_DSN=https://<public-key>@o<org-id>.ingest.sentry.io/<project-id>
   ```

---

## 3. Account Takeover & Ownership Checklist

Follow this checklist to completely transition ARISE away from previous developer credentials into your organization's infrastructure:

### A. Supabase Database & Auth (Backend)
1. Create a new organization and project at [Supabase](https://supabase.com).
2. Navigate to **SQL Editor** in your Supabase project dashboard.
3. Open `supabase/schema.sql` from this repository and run the entire script. It provisions:
   - Tables: `user_wallets`, `user_cloud_saves`, `crystal_leaderboard`, `crystal_ledger`, `crystal_redemptions`, `payout_requests`, `cpx_postback_log`.
   - Row Level Security (RLS) policies on all tables.
   - Procedures: `request_redemption_secure`, `grant_crystals_secure`, `sync_hunter_profile_secure`.
4. Navigate to **Project Settings → API** and copy:
   - `Project URL` → set as `EXPO_PUBLIC_SUPABASE_URL` in `.env`.
   - `anon public` key → set as `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
   - **Never** place the `service_role` key into client code or `.env`.

### B. Google Cloud & OAuth (Google Sign-In)
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create an OAuth 2.0 Client ID:
   - **Web Application Client**: Used as the Supabase Auth Google provider client ID.
   - **Android Client**: Using your package name (`com.arise.app`) and your release keystore SHA-1 fingerprint.
3. In Supabase Dashboard → **Authentication → Providers → Google**:
   - Enable Google provider.
   - Paste the Google Web Client ID and Client Secret.

### C. Google AdMob (Monetization)
1. Create an app in [Google AdMob](https://admob.google.com) for Android.
2. Generate your Ad Unit IDs:
   - Banner Ad Unit ID
   - Rewarded Video Ad Unit ID
   - Interstitial Ad Unit ID
3. Update `app.json` with your own AdMob App ID:
   ```json
   "react-native-google-mobile-ads": {
     "android_app_id": "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
   }
   ```
4. Update ad unit IDs in `src/config/ads.ts`.

### D. Sentry (Crash Diagnostics)
1. Create a project at [Sentry.io](https://sentry.io) for React Native.
2. In `app.config.ts` or `.env`, update the `sentry.dsn` configuration with your project DSN.

### E. EAS (Expo Application Services) Setup
1. Log in to your organization's Expo account:
   ```bash
   npx eas login
   ```
2. Initialize and re-link the project to your own EAS account:
   ```bash
   npx eas init --id <your-eas-project-id>
   ```

---

## 4. Production Release Builds

### Local Release Build (Gradle)
To compile a signed production APK or AAB locally on your workstation:
```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```
The compiled APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

To generate an Android App Bundle (`.aab`) for Google Play submission:
```bash
./gradlew bundleRelease
```
The bundle will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Cloud Release Build (EAS Build)
If building via EAS Cloud:
```bash
# Production Android App Bundle (.aab)
npx eas build --platform android --profile production

# Standalone Test APK (.apk)
npx eas build --platform android --profile preview
```

### Google Play Store Submission (EAS Submit)
Once your Google Play Service Account JSON key is generated:
```bash
npx eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab
```

---

## 5. Native Modules & Architecture

ARISE includes two custom high-performance Kotlin native modules:

1. **`modules/pose-detector`**:
   - Google ML Kit / MediaPipe on-device real-time pose tracking.
   - Zero remote transmission: frames are processed exclusively in volatile memory.
   - Thread-safe lifecycle synchronization (`detectorLock`) preventing C++ MediaPipe graph races and SIGBUS faults on fast navigation unmounts.

2. **`modules/app-blocker`**:
   - `BlockPolicyController`: Single source of truth policy engine. Package reverse-domain regex normalization (`^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$`), monotonic elapsed time (`SystemClock.elapsedRealtime`), and emergency pass counted inside daily budget.
   - `UnlockLedger`: Persistent append-only audit trail of all unlock grants.
   - `AppMonitorService`: Foreground service with real-time sub-second session tracking and Digital Wellbeing integration.
   - `LockScreenActivity` & `BlockOverlayService`: Dual-layer kiosk presentation with modal touch interception.

---

## 6. Security & Policy Verification

Before releasing to production or conducting security assessments:
- **Static Analysis**: Verify MobSF reports clean of hardcoded secrets and unencrypted sensitive data.
- **Dynamic Interception**: Confirm via Burp Suite that all reward grants and crystal redemptions require valid Supabase JWTs and reject client-tampered parameters.
- **TypeScript**: Run `npx tsc --noEmit` (clean exit 0).
