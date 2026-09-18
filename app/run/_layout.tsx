import { Stack } from 'expo-router';

export default function RunLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
