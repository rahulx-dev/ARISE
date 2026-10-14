import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, View, ActivityIndicator, Text, Platform } from "react-native";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { initializeDatabase, db } from "../src/database/client";
import { appRestriction, settings } from "../src/database/schema";
import { appBlockerService } from "../src/native";
import { useSettingsStore } from "../src/stores/useSettingsStore";
import { usePlayerStore } from "../src/stores/usePlayerStore";
import { ErrorBoundary } from "../src/components/ui/ErrorBoundary";
import { colors } from "../src/theme/colors";

import {
  IOSAlertProvider,
  showIOSAlert,
} from "../src/components/ios/IOSAlertModal";
import { getIsOnboardingCompleted, setIsOnboardingCompletedSync } from "../src/services/appStateService";
import { adMobService } from "../src/services/adMobService";
import { coinService } from "../src/services/coinService";
import * as Linking from "expo-linking";
import { Camera } from "expo-camera";
import { AriseLogo } from "../src/components/ui/AriseLogo";
import { PermissionsGateModal } from "../src/components/permissions/PermissionsGateModal";
import { LevelUpModal } from "../src/components/level/LevelUpModal";
import { syncService } from "../src/services/syncService";
import { initSentry, Sentry, logErrorToSentry, setSentryUser } from "../src/services/sentryService";
import { googleAuthService } from "../src/services/googleAuthService";
import { notificationService } from "../src/services/notificationService";
import { useQuestStore } from "../src/stores/useQuestStore";

// Initialize Sentry SDK immediately upon module load
initSentry();

/**
 * ARISE App Startup States:
 *
 * INITIALIZING         - DB init + font loading + settings/profile load from SQLite
 * PROFILE_REQUIRED     - onboardingCompleted === false -> show onboarding
 * PERMISSIONS_REQUIRED - mandatory 4-permissions not yet granted -> show gate
 * READY                - all ready -> show home tabs
 */
type AppState =
  | "INITIALIZING"
  | "PROFILE_REQUIRED"
  | "PERMISSIONS_REQUIRED"
  | "READY";

function RootLayout() {
  const [appState, setAppState] = useState<AppState>("INITIALIZING");

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    Inter_400Regular: require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    SpaceGrotesk_400Regular: require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    SpaceGrotesk_500Medium: require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    SpaceGrotesk_600SemiBold: require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    SpaceGrotesk_700Bold: require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'arise-plus-jakarta-sans-webfont';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }

      const styleId = 'arise-typography-smoothing';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
          }
          body, html, #root {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
    const unsubscribeGoogleAuth = googleAuthService.initAuthListener(async (user) => {
      try {
        console.log('[ARISE Startup] Google user linked via OAuth:', user.email);
        await usePlayerStore.getState().loadProfile();
        const restoredProfile = usePlayerStore.getState().profile;
        if (restoredProfile) {
          setSentryUser(restoredProfile.id, restoredProfile.displayName);
        }
      } catch (authErr) {
        console.warn('[ARISE Startup] Google auth listener handler note:', authErr);
      }
    });

    bootstrapApp();

    return () => {
      unsubscribeGoogleAuth?.();
    };
  }, []);

  const bootstrapApp = async () => {
    try {
      // 1. Initialize database (create tables, seed if first launch)
      await initializeDatabase();

      // 2. Load settings from SQLite (source of truth)
      await useSettingsStore.getState().loadSettings();

      // 3. Load player profile from SQLite
      await usePlayerStore.getState().loadProfile();
      const loadedProfile = usePlayerStore.getState().profile;
      if (loadedProfile) {
        setSentryUser(loadedProfile.id, loadedProfile.displayName);
      }

      // 3b. Populate daily quests and scale to current level
      useQuestStore.getState().loadQuests().catch(() => {});

      // 3c. Schedule daily alarms & notification channels
      notificationService.scheduleDailyTimelyReminders().catch(() => {});

      // 4. Initialize Google Mobile Ads (AdMob)
      adMobService.initialize();

      // 5. Restore background app blocker for active restricted apps
      try {
        const restrictions = await db.select().from(appRestriction);
        const activeBlocked = restrictions
          .filter(
            (r: { isRestricted: number; packageName: string }) =>
              r.isRestricted === 1,
          )
          .map((r: { packageName: string }) => r.packageName);
        const settingsRec = await db.select().from(settings).limit(1);
        const dailyBudget =
          settingsRec.length > 0 && typeof settingsRec[0]?.dailyBudgetMinutes === 'number'
            ? settingsRec[0].dailyBudgetMinutes
            : 30;
        appBlockerService.setAppBudget?.(null, dailyBudget);
        if (activeBlocked.length > 0) {
          appBlockerService.startMonitoring(activeBlocked);
          console.log(
            `[ARISE Startup] Background app blocker restored for ${activeBlocked.length} apps with ${dailyBudget}m daily budget`,
          );
        } else {
          appBlockerService.setRestrictedPackages([]);
        }
      } catch (blockerErr) {
        console.warn("[ARISE Startup] Blocker restore note:", blockerErr);
      }

      // 6. Check onboarding status from SQLite-backed store & synchronous SQLite query
      let onboardingCompleted = useSettingsStore.getState().onboardingCompleted;
      if (!onboardingCompleted) {
        onboardingCompleted = getIsOnboardingCompleted();
        if (onboardingCompleted) {
          useSettingsStore.setState({ onboardingCompleted: true });
        }
      }

      if (onboardingCompleted) {
        // Enforce mandatory 4-permissions check before allowing Home Screen
        const usage = await appBlockerService.hasUsagePermission();
        const overlay = await appBlockerService.hasOverlayPermission();
        const battery =
          (await appBlockerService.hasBatteryOptimizationExemption?.()) ?? true;
        const cam = await Camera.getCameraPermissionsAsync();
        const allPermsGranted = usage && overlay && battery && cam.granted;

        let isAuthCallback = false;
        try {
          const initialUrl = await Linking.getInitialURL();
          isAuthCallback =
            !!initialUrl &&
            (initialUrl.includes('auth/callback') ||
              initialUrl.includes('callback') ||
              initialUrl.includes('access_token') ||
              initialUrl.includes('code='));
        } catch {}

        if (allPermsGranted || isAuthCallback) {
          setAppState("READY");
          syncService.syncAll().catch(() => {});
        } else {
          setAppState("PERMISSIONS_REQUIRED");
        }
      } else {
        let isAuthCallback = false;
        try {
          const initialUrl = await Linking.getInitialURL();
          isAuthCallback =
            !!initialUrl &&
            (initialUrl.includes('auth/callback') ||
              initialUrl.includes('callback') ||
              initialUrl.includes('access_token') ||
              initialUrl.includes('code='));
        } catch {}

        if (isAuthCallback) {
          setAppState("READY");
        } else {
          setAppState("PROFILE_REQUIRED");
        }
      }
    } catch (e) {
      console.error("[ARISE Startup] Bootstrap failed:", e);
      logErrorToSentry(e, { module: 'Startup', action: 'bootstrapApp' });
      setAppState("PROFILE_REQUIRED");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  // Mandatory 4-permissions gate: user CANNOT reach home until all 4 are granted
  if (appState === "PERMISSIONS_REQUIRED") {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <PermissionsGateModal
            onAllGranted={() => {
              useSettingsStore.setState({ onboardingCompleted: true });
              setIsOnboardingCompletedSync(true);
              setAppState("READY");
            }}
          />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <IOSAlertProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: "fade",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="(onboarding)"
                options={{ animation: "fade" }}
              />
              <Stack.Screen
                name="auth"
                options={{ animation: "fade" }}
              />
              <Stack.Screen
                name="callback"
                options={{ animation: "fade" }}
              />
              <Stack.Screen
                name="exercise"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="focus"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="shop"
                options={{
                  animation: "slide_from_bottom",
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="settings"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="permissions"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="photos"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="leaderboard"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="rewards"
                options={{ animation: "slide_from_right" }}
              />
            </Stack>
            <LevelUpModal />
          </IOSAlertProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  splashLogo: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 8,
  },
  splashSubtext: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 3,
    marginTop: 12,
  },
});

export default Sentry.wrap(RootLayout);
