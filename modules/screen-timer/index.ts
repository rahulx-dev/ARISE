import { NativeModules, Platform } from 'react-native';

const ScreenTimer = NativeModules.ScreenTimer || {
  startSessionTimer: (durationMs: number, label: string) => {},
  cancelSessionTimer: () => {},
  getRemainingMillis: async () => 0,
};

export function startSessionTimer(durationMs: number, label: string): void {
  if (Platform.OS === 'android') {
    ScreenTimer.startSessionTimer(durationMs, label);
  }
}

export function cancelSessionTimer(): void {
  if (Platform.OS === 'android') {
    ScreenTimer.cancelSessionTimer();
  }
}

export async function getRemainingMillis(): Promise<number> {
  if (Platform.OS !== 'android') return 0;
  try {
    return await ScreenTimer.getRemainingMillis();
  } catch {
    return 0;
  }
}

export default {
  startSessionTimer,
  cancelSessionTimer,
  getRemainingMillis,
};
