import { db } from '../client';
import { exerciseSession } from '../schema';
import { eq, desc, like } from 'drizzle-orm';

type ExerciseSessionInsert = typeof exerciseSession.$inferInsert;

export const exerciseRepository = {
  async createSession(session: Omit<ExerciseSessionInsert, 'id'>) {
    const results = await db.insert(exerciseSession).values(session).returning();
    return results[0];
  },

  async getSessionsByType(type: string) {
    return await db.select()
      .from(exerciseSession)
      .where(eq(exerciseSession.exerciseType, type))
      .orderBy(desc(exerciseSession.timestamp));
  },

  async getTotalReps(type: string): Promise<number> {
    const sessions = await this.getSessionsByType(type);
    return sessions.reduce((acc, curr) => acc + curr.completedReps, 0);
  },

  async getRecentSessions(limit: number = 10) {
    return await db.select()
      .from(exerciseSession)
      .orderBy(desc(exerciseSession.timestamp))
      .limit(limit);
  },

  async getSessionsByDate(date: string) {
    return await db.select()
      .from(exerciseSession)
      .where(like(exerciseSession.timestamp, `${date}%`))
      .orderBy(desc(exerciseSession.timestamp));
  },

  async getWeeklyTotalReps(): Promise<number> {
    try {
      const all = await db.select().from(exerciseSession);
      return all.reduce((acc, curr) => acc + (curr.completedReps || 0), 0);
    } catch {
      return 0;
    }
  }
};
