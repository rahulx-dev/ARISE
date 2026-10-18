import { expoDb } from '../database/client';

const DOUBLE_XP_KEY = 'boost:double_xp:expires_at';
const FREEZE_KEY = 'boost:streak_freeze:count';

/**
 * Shop boosts (H2). Previously the shop charged coins for boosts that
 * were never recorded or enforced — coins deducted, zero effect.
 * Activation is persisted in the arise_kv table; the relevant flows
 * enforce it (double_xp in both addXP implementations, streak_freeze
 * in checkDailyStreakLapse).
 */
function ensureKvTable(): void {
  try {
    (expoDb as any).runSync(
      'CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)',
    );
  } catch {}
}

function getKv(key: string): string | null {
  try {
    ensureKvTable();
    const row = (expoDb as any).getFirstSync(
      'SELECT val FROM arise_kv WHERE key = ?',
      [key],
    ) as { val: string } | null;
    return row?.val ?? null;
  } catch {
    return null;
  }
}

function setKv(key: string, val: string): void {
  try {
    ensureKvTable();
    (expoDb as any).runSync(
      'INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)',
      [key, val],
    );
  } catch {}
}

export const boostService = {
  /** Record a purchased boost. double_xp lasts 1 hour; freezes stack. */
  activateBoost(id: string): void {
    if (id === 'double_xp') {
      setKv(DOUBLE_XP_KEY, String(Date.now() + 60 * 60 * 1000));
    } else if (id === 'streak_freeze') {
      setKv(FREEZE_KEY, String(this.getStreakFreezeCount() + 1));
    }
  },

  isDoubleXpActive(): boolean {
    const v = Number(getKv(DOUBLE_XP_KEY) || '0');
    return Number.isFinite(v) && v > Date.now();
  },

  getStreakFreezeCount(): number {
    return Math.max(0, Number(getKv(FREEZE_KEY) || '0') || 0);
  },

  /** Consume one freeze if available. Returns true when consumed. */
  consumeStreakFreeze(): boolean {
    const count = this.getStreakFreezeCount();
    if (count <= 0) return false;
    setKv(FREEZE_KEY, String(count - 1));
    return true;
  },
};
