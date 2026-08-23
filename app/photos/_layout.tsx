import { Stack } from 'expo-router';

export default function PhotosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0E1A' },
      }}
    />
  );
}
