import { requireNativeModule } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';

let ScreenTimer: any = null;
try {
  ScreenTimer = requireNativeModule('ScreenTimer');
} catch {
  ScreenTimer = NativeModules.ScreenTimer || null;
}

if (!ScreenTimer) {
  ScreenTimer = {
    startSessionTimer: (_durationMs: number, _label: string) => {},
    cancelSessionTimer: () => {},
    getRemainingMillis: async () => 0,
  };
}

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
