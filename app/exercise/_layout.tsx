import React from 'react';
import { Stack } from 'expo-router';

export default function ExerciseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0E1A' } }}>
      <Stack.Screen name="[type]" />
    </Stack>
  );
}
