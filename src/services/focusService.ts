import { db } from '../database/client';
import { focusSession } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { FocusSession } from '../types';

/**
 * Single source of truth for focus rewards (C11). Used by
 * completeFocusSession AND the completion screen, so the same schedule
 * applies everywhere. Below 80% of target: no rewards.
 */
export function calculateFocusRewards(
  targetMinutes: number,
  completedMinutes: number,
): { coins: number; xp: number } {
  const target = Math.floor(targetMinutes);
  const completed = Math.floor(completedMinutes);
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(completed) || completed <= 0) {
    return { coins: 0, xp: 0 };
  }
  if (completed < Math.ceil(target * 0.8)) {
    return { coins: 0, xp: 0 };
  }
  const ratio = Math.min(1, completed / target);
  const baseCoins = Math.max(1, Math.floor(target / 10));
  const baseXP = target * 4;
  return {
    coins: Math.min(50, Math.round(baseCoins * ratio)),
    xp: Math.min(250, Math.round(baseXP * ratio)),
  };
}

export const focusService = {
  startFocusSession: async (targetMinutes: number): Promise<number> => {
    const target = Math.max(1, Math.min(1440, Math.floor(targetMinutes) || 25));
    const rewards = {
      rewardCoins: Math.max(1, Math.floor(target / 10)),
      rewardXP: target * 4,
    };

    const inserted = await db.insert(focusSession).values({
      targetMinutes: target,
      completedMinutes: 0,
      startTime: new Date().toISOString(),
      status: 'ACTIVE',
      rewardCoins: rewards.rewardCoins,
      rewardXP: rewards.rewardXP,
    }).returning();

    return inserted[0]?.id || Date.now();
  },

  completeFocusSession: async (sessionId: number): Promise<{ coins: number; xp: number }> => {
    const record = await db
      .select()
      .from(focusSession)
      .where(and(eq(focusSession.id, sessionId), eq(focusSession.status, 'ACTIVE')))
      .limit(1);

    if (record.length === 0) {
      return { coins: 0, xp: 0 };
    }

    const session = record[0];
    const now = new Date();
    const startMs = new Date(session.startTime).getTime();
    // Corrupt startTime (NaN) previously PASSED the gate (NaN comparisons
    // are false) and paid full rewards. Quarantine the row instead.
    if (!Number.isFinite(startMs)) {
      await db.update(focusSession)
        .set({ status: 'ABANDONED', endTime: now.toISOString() })
        .where(and(eq(focusSession.id, sessionId), eq(focusSession.status, 'ACTIVE')));
      return { coins: 0, xp: 0 };
    }
    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - startMs) / 60000));

    // 80% gate (C11): the old code's comment said 80% but the check was a
    // flat 1-minute gate paying FULL rewards. Below 80%, leave the session
    // ACTIVE (user may still finish) and pay nothing.
    if (elapsedMinutes < Math.ceil(session.targetMinutes * 0.8)) {
      return { coins: 0, xp: 0 };
    }

    const completedMinutes = Math.min(session.targetMinutes, elapsedMinutes);
    const { coins, xp } = calculateFocusRewards(session.targetMinutes, completedMinutes);

    // ONE conditional UPDATE: only an ACTIVE row transitions. A concurrent
    // second completion finds no ACTIVE row and gets nothing.
    await db.update(focusSession)
      .set({
        status: 'COMPLETED',
        completedMinutes,
        endTime: now.toISOString(),
      })
      .where(and(eq(focusSession.id, sessionId), eq(focusSession.status, 'ACTIVE')));

    return { coins, xp };
  },

  abandonFocusSession: async (sessionId: number): Promise<void> => {
    // Only ACTIVE rows transition: completing a session must never be
    // overwritten back to ABANDONED by a late unmount/reset.
    await db.update(focusSession)
      .set({
        status: 'ABANDONED',
        endTime: new Date().toISOString(),
      })
      .where(and(eq(focusSession.id, sessionId), eq(focusSession.status, 'ACTIVE')));
  },

  getActiveFocusSession: async (): Promise<FocusSession | null> => {
    const record = await db.select().from(focusSession).where(eq(focusSession.status, 'ACTIVE')).limit(1);
    if (record.length === 0) return null;
    const s = record[0];
    return {
      id: s.id,
      targetMinutes: s.targetMinutes,
      completedMinutes: s.completedMinutes,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status as any,
      rewardCoins: s.rewardCoins,
      rewardXP: s.rewardXP,
    };
  },
};
