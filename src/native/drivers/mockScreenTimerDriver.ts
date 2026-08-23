import { IScreenTimerDriver } from '../types';

export class MockScreenTimerDriver implements IScreenTimerDriver {
  private targetEndEpoch: number = 0;
  private timerLabel: string = 'Screen Time';

  startSessionTimer(durationMs: number, label: string): void {
    this.targetEndEpoch = Date.now() + durationMs;
    this.timerLabel = label;
    console.log(
      `⚡ [PREVIEW MODE] Screen timer started for ${Math.round(
        durationMs / 60000
      )} mins (${label})`
    );
  }

  cancelSessionTimer(): void {
    this.targetEndEpoch = 0;
    console.log('⚡ [PREVIEW MODE] Screen timer cancelled');
  }

  async getRemainingMillis(): Promise<number> {
    const diff = this.targetEndEpoch - Date.now();
    return diff > 0 ? diff : 0;
  }
}
