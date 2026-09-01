import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { initializeDatabase } from '../src/database/client';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { usePlayerStore } from '../src/stores/usePlayerStore';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { colors } from '../src/theme/colors';

/**
 * ARISE App Startup States:
 *
 * INITIALIZING     - DB init + font loading + settings/profile load from SQLite
 * PROFILE_REQUIRED - onboardingCompleted === false -> show onboarding
 * READY            - onboardingCompleted === true  -> show home tabs
 */
type AppState = 'INITIALIZING' | 'PROFILE_REQUIRED' | 'READY';

export default function RootLayout() {
  const [appState, setAppState] = useState<AppState>('INITIALIZING');

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    bootstrapApp();
  }, []);

  const bootstrapApp = async () => {
    try {
      // 1. Initialize database (create tables, seed if first launch)
      await initializeDatabase();
      console.log('[ARISE Startup] Database initialized');

      // 2. Load settings from SQLite (source of truth)
      await useSettingsStore.getState().loadSettings();
      console.log('[ARISE Startup] Settings loaded');

      // 3. Load player profile from SQLite
      await usePlayerStore.getState().loadProfile();
      console.log('[ARISE Startup] Profile loaded');

      // 4. Check onboarding status from SQLite-backed store
      const onboardingCompleted = useSettingsStore.getState().onboardingCompleted;
      console.log('[ARISE Startup] onboardingCompleted:', onboardingCompleted);

      if (onboardingCompleted) {
        setAppState('READY');
      } else {
        setAppState('PROFILE_REQUIRED');
      }
    } catch (e) {
      console.error('[ARISE Startup] Bootstrap failed:', e);
      // On error, still try to proceed to home
      setAppState('READY');
    }
  };

  // Wait for both fonts AND bootstrap to complete
  if (!fontsLoaded || appState === 'INITIALIZING') {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Text style={styles.splashLogo}>ARISE</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        <Text style={styles.splashSubtext}>INITIALIZING PROTOCOL</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
            // Gate initial route based on SQLite onboardingCompleted flag
            initialRouteName={appState === 'PROFILE_REQUIRED' ? '(onboarding)' : '(tabs)'}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
            <Stack.Screen name="exercise" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="focus" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen
              name="shop"
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="permissions" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="photos" options={{ animation: 'slide_from_right' }} />
          </Stack>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  splashLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 8,
  },
  splashSubtext: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 3,
    marginTop: 12,
  },
});
