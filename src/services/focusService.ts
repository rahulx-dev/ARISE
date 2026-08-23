import { db } from '../database/client';
import { focusSession } from '../database/schema';
import { eq } from 'drizzle-orm';
import { FocusSession } from '../types';

export const focusService = {
  startFocusSession: async (targetMinutes: number): Promise<number> => {
    const rewards = {
      rewardCoins: targetMinutes * 2,
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
    const record = await db.select().from(focusSession).where(eq(focusSession.id, sessionId)).limit(1);
    const session = record[0];

    const targetMinutes = session ? session.targetMinutes : 25;
    const coins = session ? session.rewardCoins : targetMinutes * 2;
    const xp = session ? session.rewardXP : targetMinutes * 4;

    await db.update(focusSession)
      .set({
        status: 'COMPLETED',
        completedMinutes: targetMinutes,
        endTime: new Date().toISOString(),
      })
      .where(eq(focusSession.id, sessionId));

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
