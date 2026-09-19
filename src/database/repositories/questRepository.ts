import { db } from "../client";
import { quest } from "../schema";
import { eq, and, desc, sql } from "drizzle-orm";

type QuestInsert = typeof quest.$inferInsert;
type QuestSelect = typeof quest.$inferSelect;

export const questRepository = {
  async getQuestsByDate(date: string): Promise<QuestSelect[]> {
    return await db
      .select()
      .from(quest)
      .where(eq(quest.date, date))
      .orderBy(desc(quest.createdAt));
  },

  async getActiveQuests(): Promise<QuestSelect[]> {
    const today = new Date().toISOString().split("T")[0];
    return await db
      .select()
      .from(quest)
      .where(and(eq(quest.date, today), eq(quest.completed, 0)))
      .orderBy(desc(quest.createdAt));
  },

  async getCompletedQuests(date: string): Promise<QuestSelect[]> {
    return await db
      .select()
      .from(quest)
      .where(and(eq(quest.date, date), eq(quest.completed, 1)))
      .orderBy(desc(quest.createdAt));
  },

  async createQuest(
    questData: Omit<QuestInsert, "id" | "createdAt">,
  ): Promise<QuestSelect> {
    const results = await db
      .insert(quest)
      .values({
        ...questData,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return results[0];
  },

  async createCustomQuest(
    questData: Omit<QuestInsert, "id" | "createdAt" | "isCustom">,
  ): Promise<QuestSelect> {
    return await this.createQuest({
      ...questData,
      isCustom: 1,
    });
  },

  async completeQuest(questId: number): Promise<boolean> {
    return await db.transaction(async (tx: any) => {
      const results = await tx
        .select()
        .from(quest)
        .where(eq(quest.id, questId))
        .limit(1);
      if (results.length === 0 || results[0].completed === 1) {
        return false;
      }

      await tx.update(quest).set({ completed: 1 }).where(eq(quest.id, questId));

      return true;
    });
  },

  async deleteQuest(questId: number): Promise<void> {
    await db.delete(quest).where(eq(quest.id, questId));
  },

  async getQuestStats(): Promise<{
    totalCompleted: number;
    byCategory: Record<string, number>;
  }> {
    const allCompleted = await db
      .select()
      .from(quest)
      .where(eq(quest.completed, 1));

    const byCategory: Record<string, number> = {};
    for (const q of allCompleted) {
      byCategory[q.category] = (byCategory[q.category] || 0) + 1;
    }

    return {
      totalCompleted: allCompleted.length,
      byCategory,
    };
  },
};
