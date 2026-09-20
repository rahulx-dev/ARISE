import React, { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { getIsOnboardingCompleted } from '../src/services/appStateService';

export default function RootIndex() {
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    const isStoreDone = useSettingsStore.getState().onboardingCompleted;
    const isSqliteDone = getIsOnboardingCompleted();
    if (isStoreDone || isSqliteDone) {
      useSettingsStore.setState({ onboardingCompleted: true });
      setDestination('/(tabs)');
    } else {
      setDestination('/(onboarding)');
    }
  }, []);

  if (!destination) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#979797" />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
