import { db } from "../client";
import { exerciseSession } from "../schema";
import { eq, desc, like } from "drizzle-orm";

type ExerciseSessionInsert = typeof exerciseSession.$inferInsert;

export const exerciseRepository = {
  async createSession(session: Omit<ExerciseSessionInsert, "id">) {
    const results = await db
      .insert(exerciseSession)
      .values(session)
      .returning();
    return results[0];
  },

  async getSessionsByType(type: string) {
    return await db
      .select()
      .from(exerciseSession)
      .where(eq(exerciseSession.exerciseType, type))
      .orderBy(desc(exerciseSession.timestamp));
  },

  async getTotalReps(type: string): Promise<number> {
    const sessions = await this.getSessionsByType(type);
    return sessions.reduce(
      (acc: number, curr: { completedReps: number }) =>
        acc + curr.completedReps,
      0,
    );
  },

  async getRecentSessions(limit: number = 10) {
    return await db
      .select()
      .from(exerciseSession)
      .orderBy(desc(exerciseSession.timestamp))
      .limit(limit);
  },

  async getSessionsByDate(date: string) {
    return await db
      .select()
      .from(exerciseSession)
      .where(like(exerciseSession.timestamp, `${date}%`))
      .orderBy(desc(exerciseSession.timestamp));
  },

  async getWeeklyTotalReps(): Promise<number> {
    try {
      const now = new Date();
      // Calculate Monday 00:00:00 of the current week
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const weekStartIso = monday.toISOString();
      const all = await db.select().from(exerciseSession);
      return all
        .filter((s: { timestamp: string }) => s.timestamp >= weekStartIso)
        .reduce(
          (acc: number, curr: { completedReps?: number }) =>
            acc + (curr.completedReps || 0),
          0,
        );
    } catch {
      return 0;
    }
  },
};
