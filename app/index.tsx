import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { getIsOnboardingCompleted } from '../src/services/appStateService';
import { colors } from '../src/theme/colors';

export default function RootIndex() {
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

  useEffect(() => {
    checkInitialRoute();
  }, [onboardingCompleted]);

  const checkInitialRoute = () => {
    try {
      // 1. Check Zustand store
      if (onboardingCompleted) {
        setTargetRoute('/(tabs)');
        return;
      }

      // 2. Synchronous direct SQLite query
      const isDone = getIsOnboardingCompleted();
      if (isDone) {
        useSettingsStore.setState({ onboardingCompleted: true });
        setTargetRoute('/(tabs)');
        return;
      }

      // 3. First time launch -> onboarding
      setTargetRoute('/(onboarding)');
    } catch {
      setTargetRoute('/(tabs)');
    }
  };

  if (targetRoute) {
    return <Redirect href={targetRoute as any} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ARISE</Text>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      <Text style={styles.subtext}>INITIALIZING PROTOCOL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070D',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 3,
    marginTop: 12,
  },
});
