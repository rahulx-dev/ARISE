export function startSessionTimer(durationMs: number, label: string): void {}
export function cancelSessionTimer(): void {}
export async function getRemainingMillis(): Promise<number> {
  return 0;
}

export default {
  startSessionTimer,
  cancelSessionTimer,
  getRemainingMillis,
};
