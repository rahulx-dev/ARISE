import { NativeModules, Platform } from 'react-native';
import { IScreenTimerDriver } from '../types';

const NativeScreenTimer = NativeModules.ScreenTimer;

export class NativeScreenTimerDriver implements IScreenTimerDriver {
  startSessionTimer(durationMs: number, label: string): void {
    if (Platform.OS === 'android' && NativeScreenTimer) {
      NativeScreenTimer.startSessionTimer(durationMs, label);
    }
  }

  cancelSessionTimer(): void {
    if (Platform.OS === 'android' && NativeScreenTimer) {
      NativeScreenTimer.cancelSessionTimer();
    }
  }

  async getRemainingMillis(): Promise<number> {
    if (Platform.OS !== 'android' || !NativeScreenTimer) return 0;
    try {
      return await NativeScreenTimer.getRemainingMillis();
    } catch {
      return 0;
    }
  }
}
