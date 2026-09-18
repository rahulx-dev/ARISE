import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function AdminPayoutsScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings' as any);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color="#0A84FF" />
    </View>
  );
}
