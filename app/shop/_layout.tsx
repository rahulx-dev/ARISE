import React from 'react';
import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0E1A' } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
