import { expoDb } from '../database/client.native';

/**
 * Ultra-fast synchronous SQLite helper for startup state routing.
 */
export function getIsOnboardingCompleted(): boolean {
  try {
    const row = expoDb.getFirstSync<{ onboarding_completed: number }>(
      'SELECT onboarding_completed FROM settings LIMIT 1;'
    );
    return row?.onboarding_completed === 1;
  } catch {
    return false;
  }
}

export function setIsOnboardingCompletedSync(completed: boolean): void {
  try {
    const val = completed ? 1 : 0;
    expoDb.execSync(`UPDATE settings SET onboarding_completed = ${val};`);
  } catch (e) {
    console.error('Failed to set onboarding completed sync:', e);
  }
}
