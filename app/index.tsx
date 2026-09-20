import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { getIsOnboardingCompleted } from '../src/services/appStateService';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    try {
      const isStoreDone = useSettingsStore.getState().onboardingCompleted;
      if (isStoreDone) {
        router.replace('/(tabs)');
        return;
      }
      const isSqliteDone = getIsOnboardingCompleted();
      if (isSqliteDone) {
        useSettingsStore.setState({ onboardingCompleted: true });
        router.replace('/(tabs)');
        return;
      }
      router.replace('/(onboarding)');
    } catch {
      router.replace('/(onboarding)');
    }
  }, [router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
