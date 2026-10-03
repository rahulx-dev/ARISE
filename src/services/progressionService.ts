import { db } from '../database/client';
import { userProfile } from '../database/schema';
import { eq } from 'drizzle-orm';
import { notificationService } from './notificationService';
import { achievementService } from './achievementService';
import { getRequiredXP } from './xpService';

export type PlayerStatName = 'strength' | 'discipline' | 'focus' | 'health' | 'knowledge';

export interface LevelProgress {
  level: number;
  currentXP: number;
  requiredXP: number;
  totalXP: number;
  progressPercent: number;
}

class ProgressionService {
  /**
   * Required XP for a given level: Canonical Solo Leveling curve
   */
  calculateRequiredXP(level: number): number {
    return getRequiredXP(level);
  }

  /**
   * Add XP atomically, evaluate leveling, and persist to SQLite
   */
  async addXP(amount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
    if (amount <= 0) {
      const p = await this.getProgress();
      return { newXP: p.currentXP, newLevel: p.level, leveledUp: false };
    }

    let newXP = 0;
    let newLevel = 1;
    let leveledUp = false;
    let newTotalXP = 0;

    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      newTotalXP = (profile.totalXP || 0) + amount;
      newXP = (profile.currentXP || 0) + amount;
      newLevel = profile.level || 1;

      let reqXP = this.calculateRequiredXP(newLevel);
      while (newXP >= reqXP) {
        newXP -= reqXP;
        newLevel += 1;
        leveledUp = true;
        reqXP = this.calculateRequiredXP(newLevel);
      }

      await tx
        .update(userProfile)
        .set({
          currentXP: newXP,
          totalXP: newTotalXP,
          level: newLevel,
        })
        .where(eq(userProfile.id, profile.id));
    });

    if (leveledUp) {
      await notificationService.createNotification(
        'SYSTEM',
        'Level Up!',
        `Congratulations! You reached Level ${newLevel}!`,
        `lvl_${newLevel}`
      );
    }

    // Evaluate newly unlocked milestones
    await achievementService.evaluateAchievements();

    return { newXP, newLevel, leveledUp };
  }

  /**
   * Update an attribute stat (Strength, Discipline, Focus, Health, Knowledge)
   */
  async updateStat(stat: PlayerStatName, amount: number): Promise<void> {
    if (amount <= 0) return;

    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      const currentVal = profile[stat] || 0;

      await tx
        .update(userProfile)
        .set({
          [stat]: currentVal + amount,
        })
        .where(eq(userProfile.id, profile.id));
    });
  }

  /**
   * Get current level and XP progression
   */
  async getProgress(): Promise<LevelProgress> {
    const results = await db.select().from(userProfile).limit(1);
    if (results.length === 0) {
      return {
        level: 1,
        currentXP: 0,
        requiredXP: 500,
        totalXP: 0,
        progressPercent: 0,
      };
    }

    const profile = results[0];
    const level = profile.level || 1;
    const currentXP = profile.currentXP || 0;
    const requiredXP = this.calculateRequiredXP(level);
    const progressPercent = Math.min(100, Math.round((currentXP / requiredXP) * 100));

    return {
      level,
      currentXP,
      requiredXP,
      totalXP: profile.totalXP || 0,
      progressPercent,
    };
  }
}

export const progressionService = new ProgressionService();
