import { db } from '../client';
import { screenTimeSession } from '../schema';
import { eq, desc } from 'drizzle-orm';

type ScreenTimeSessionInsert = typeof screenTimeSession.$inferInsert;

export const sessionRepository = {
  async createSession(session: Omit<ScreenTimeSessionInsert, 'id'>) {
    const results = await db.insert(screenTimeSession).values(session).returning();
    return results[0];
  },

  async getActiveSession() {
    const results = await db.select()
      .from(screenTimeSession)
      .where(eq(screenTimeSession.status, 'ACTIVE'))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  },

  async completeSession(sessionId: number) {
    await db.update(screenTimeSession)
      .set({ 
        status: 'COMPLETED',
        endTime: new Date().toISOString()
      })
      .where(eq(screenTimeSession.id, sessionId));
  },

  async expireSession(sessionId: number) {
    await db.update(screenTimeSession)
      .set({ 
        status: 'EXPIRED',
        endTime: new Date().toISOString()
      })
      .where(eq(screenTimeSession.id, sessionId));
  },

  async getSessionHistory(limit: number = 20) {
    return await db.select()
      .from(screenTimeSession)
      .orderBy(desc(screenTimeSession.startTime))
      .limit(limit);
  }
};
