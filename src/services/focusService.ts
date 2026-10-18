import { db } from '../database/client';
import { focusSession } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { FocusSession } from '../types';

export const focusService = {
  startFocusSession: async (targetMinutes: number): Promise<number> => {
    const rewards = {
      rewardCoins: Math.max(1, Math.floor(targetMinutes / 10)),
      rewardXP: targetMinutes * 4,
    };

    const inserted = await db.insert(focusSession).values({
      targetMinutes,
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
    const startTime = new Date(session.startTime).getTime();
    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - startTime) / 60000));

    // Require that at least 80% of target time elapsed or at least 1 minute
    if (elapsedMinutes < Math.min(session.targetMinutes, 1)) {
      return { coins: 0, xp: 0 };
    }

    const completedMinutes = Math.min(session.targetMinutes, elapsedMinutes);
    const coins = Math.min(50, session.rewardCoins);
    const xp = Math.min(250, session.rewardXP);

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
    await db.update(focusSession)
      .set({
        status: 'ABANDONED',
        endTime: new Date().toISOString(),
      })
      .where(eq(focusSession.id, sessionId));
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
