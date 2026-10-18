import { db } from '../database/client';
import { userProfile, coinTransaction } from '../database/schema';
import { eq } from 'drizzle-orm';
import { notificationService } from './notificationService';
import { achievementService } from './achievementService';
import { getRequiredXP } from './xpService';
import { boostService } from './boostService';

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
    // H54: reject non-finite amounts. Infinity previously hung the
    // level-up while loop forever; NaN corrupted the stored XP.
    if (!Number.isFinite(amount) || amount <= 0) {
      const p = await this.getProgress();
      return { newXP: p.currentXP, newLevel: p.level, leveledUp: false };
    }
    // Cap the per-call amount so a huge-but-finite grant cannot spin the
    // level-up loop for an unbounded number of iterations.
    const safeAmount = Math.min(amount, 1000000);
    // H2: XP 2X Booster doubles all XP gains while active (1 hour).
    const effectiveAmount = boostService.isDoubleXpActive() ? safeAmount * 2 : safeAmount;

    let newXP = 0;
    let newLevel = 1;
    let leveledUp = false;
    let newTotalXP = 0;

    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      const oldLevel = profile.level || 1;
      newTotalXP = (profile.totalXP || 0) + effectiveAmount;
      newXP = (profile.currentXP || 0) + effectiveAmount;
      newLevel = profile.level || 1;

      let reqXP = this.calculateRequiredXP(newLevel);
      // Guarded loop: even a capped amount cannot spin unboundedly.
      let guard = 0;
      while (newXP >= reqXP && guard++ < 10000) {
        newXP -= reqXP;
        newLevel += 1;
        leveledUp = true;
        reqXP = this.calculateRequiredXP(newLevel);
      }

      // H56: same idempotent level-up bonus as userRepository.addXP.
      // The per-level requestId pre-check keeps the bonus single-paid
      // even if both addXP implementations ever run for one level-up.
      let bonusCoins = 0;
      const bonusGrants: { level: number; requestId: string }[] = [];
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const requestId = `level_up:${lvl}`;
        const existing = await tx
          .select()
          .from(coinTransaction)
          .where(eq(coinTransaction.requestId, requestId))
          .limit(1);
        if (existing.length === 0) {
          bonusCoins += 100;
          bonusGrants.push({ level: lvl, requestId });
        }
      }

      await tx
        .update(userProfile)
        .set({
          currentXP: newXP,
          totalXP: newTotalXP,
          level: newLevel,
          coins: (profile.coins || 0) + bonusCoins,
          totalCoinsEarned: (profile.totalCoinsEarned || 0) + bonusCoins,
        })
        .where(eq(userProfile.id, profile.id));

      const now = new Date().toISOString();
      for (const g of bonusGrants) {
        await tx.insert(coinTransaction).values({
          amount: 100,
          type: "earn",
          description: `Level ${g.level} Rank Ascension Bonus`,
          source: "level_up",
          timestamp: now,
          requestId: g.requestId,
        });
      }
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
    // H54: NaN <= 0 is false, so NaN previously slipped through and
    // corrupted the stored stat.
    if (!Number.isFinite(amount) || amount <= 0) return;

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
