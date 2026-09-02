import { expoDb } from '../database/client.native';

/**
 * Ultra-fast synchronous SQLite helper for startup state routing.
 * Ensures that if a profile exists in SQLite, onboarding is 100% completed.
 */
export function getIsOnboardingCompleted(): boolean {
  try {
    const row = expoDb.getFirstSync<{ onboarding_completed: number }>(
      'SELECT onboarding_completed FROM settings LIMIT 1;'
    );
    if (row?.onboarding_completed === 1) {
      return true;
    }

    // Safety fallback: Check if a user_profile already exists
    const userRow = expoDb.getFirstSync<{ id: number; display_name: string }>(
      'SELECT id, display_name FROM user_profile LIMIT 1;'
    );
    if (userRow && userRow.display_name) {
      setIsOnboardingCompletedSync(true);
      return true;
    }

    return false;
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
