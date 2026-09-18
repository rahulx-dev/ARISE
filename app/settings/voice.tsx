import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function VoiceStudioScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings' as any);
  }, [router]);

  return <View style={{ flex: 1 }} />;
}
