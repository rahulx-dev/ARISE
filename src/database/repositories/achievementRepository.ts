import { db } from '../client';
import { achievement } from '../schema';
import { eq } from 'drizzle-orm';

export const achievementRepository = {
  async getUnlockedAchievements() {
    return await db.select().from(achievement);
  },

  async isUnlocked(achievementId: string): Promise<boolean> {
    const results = await db.select().from(achievement).where(eq(achievement.achievementId, achievementId)).limit(1);
    return results.length > 0;
  },

  async unlockAchievement(achievementId: string, title: string, description: string, icon: string, category: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(achievement).where(eq(achievement.achievementId, achievementId)).limit(1);
      if (existing.length > 0) return false; // Already unlocked

      await tx.insert(achievement).values({
        achievementId,
        title,
        description,
        icon,
        category,
        unlockedAt: new Date().toISOString(),
      });
      return true;
    });
  },

  async getAchievementCount(): Promise<number> {
    const results = await db.select().from(achievement);
    return results.length;
  }
};
