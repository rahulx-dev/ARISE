import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { initializeDatabase } from '../src/database/client';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    initializeDatabase()
      .catch((e) => {
        console.warn('Database initialization error:', e);
      })
      .finally(() => {
        setDbReady(true);
      });
  }, []);

  const isAppReady = dbReady && fontsLoaded;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          {!isAppReady ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade',
              }}
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
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
