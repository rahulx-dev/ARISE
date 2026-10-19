import { db } from "../database/client";
import {
  achievement,
  userProfile,
  exerciseSession,
  focusSession,
  quest,
  coinTransaction,
} from "../database/schema";
import { eq } from "drizzle-orm";
import { notificationService } from "./notificationService";

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category: "ACHIEVEMENT" | "BADGE";
  target: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  rewardCoins: number;
  rewardXP: number;
  icon: string;
}

export const MILESTONE_DEFINITIONS: Omit<
  AchievementItem,
  "progress" | "unlocked" | "unlockedAt"
>[] = [
  // Achievements
  {
    id: "first_workout",
    title: "First Blood",
    description: "Complete your first physical workout",
    category: "ACHIEVEMENT",
    target: 1,
    rewardCoins: 100,
    rewardXP: 250,
    icon: "dumbbell",
  },
  {
    id: "pushup_master_50",
    title: "Push-up Titan",
    description: "Log 50 total push-up reps",
    category: "ACHIEVEMENT",
    target: 50,
    rewardCoins: 250,
    rewardXP: 500,
    icon: "dumbbell",
  },
  {
    id: "focused_mind_5",
    title: "Focused Mind",
    description: "Complete 5 deep focus sessions",
    category: "ACHIEVEMENT",
    target: 5,
    rewardCoins: 300,
    rewardXP: 600,
    icon: "brain",
  },
  {
    id: "iron_streak_3",
    title: "Iron Consistency",
    description: "Maintain a 3-day unbroken streak",
    category: "ACHIEVEMENT",
    target: 3,
    rewardCoins: 350,
    rewardXP: 700,
    icon: "flame",
  },
  {
    id: "ascension_lvl_5",
    title: "Ascension",
    description: "Reach Player Level 5 Novice rank",
    category: "ACHIEVEMENT",
    target: 5,
    rewardCoins: 500,
    rewardXP: 1000,
    icon: "trophy",
  },
  {
    id: "coin_collector_1000",
    title: "Treasure Hoarder",
    description: "Earn 1,000 total lifetime coins",
    category: "ACHIEVEMENT",
    target: 1000,
    rewardCoins: 500,
    rewardXP: 1000,
    icon: "coins",
  },

  // Badges
  {
    id: "badge_novice",
    title: "Novice Recruit",
    description: "Complete your first discipline protocol",
    category: "BADGE",
    target: 1,
    rewardCoins: 50,
    rewardXP: 100,
    icon: "sparkles",
  },
  {
    id: "badge_streak_3",
    title: "3-Day Fire",
    description: "Maintain a 3-day unbroken streak",
    category: "BADGE",
    target: 3,
    rewardCoins: 150,
    rewardXP: 300,
    icon: "flame",
  },
  {
    id: "badge_level_5",
    title: "Titan Warrior",
    description: "Reach Player Level 5",
    category: "BADGE",
    target: 5,
    rewardCoins: 250,
    rewardXP: 500,
    icon: "trophy",
  },
  {
    id: "badge_focus_master",
    title: "Zen Master",
    description: "Log 600 total focus minutes",
    category: "BADGE",
    target: 600,
    rewardCoins: 400,
    rewardXP: 800,
    icon: "brain",
  },
  {
    id: "badge_streak_7",
    title: "Iron Will",
    description: "Maintain a 7-day unbroken streak",
    category: "BADGE",
    target: 7,
    rewardCoins: 500,
    rewardXP: 1000,
    icon: "zap",
  },
  {
    id: "badge_grandmaster",
    title: "Grandmaster",
    description: "Reach Player Level 10",
    category: "BADGE",
    target: 10,
    rewardCoins: 1000,
    rewardXP: 2500,
    icon: "award",
  },
];

class AchievementService {
  /**
   * Evaluate all real metrics against milestones and unlock newly qualified achievements idempotently
   */
  async evaluateAchievements(): Promise<AchievementItem[]> {
    try {
      // 1. Fetch real stats from SQLite
      const [profiles, exercises, focuses, questsList, unlockedRows] =
        await Promise.all([
          db.select().from(userProfile).limit(1),
          db.select().from(exerciseSession),
          db.select().from(focusSession),
          db.select().from(quest),
          db.select().from(achievement),
        ]);

      const profile = profiles[0] || {
        level: 1,
        coins: 0,
        totalCoinsEarned: 0,
        currentStreak: 0,
      };

      const totalPushups = exercises
        .filter(
          (e: { exerciseType: string; completedReps?: number }) =>
            e.exerciseType === "PUSHUP",
        )
        .reduce(
          (sum: number, e: { completedReps?: number }) =>
            sum + (e.completedReps || 0),
          0,
        );

      const totalWorkouts = exercises.length;
      const totalFocusSessions = focuses.filter(
        (f: { status: string }) => f.status === "COMPLETED",
      ).length;
      const totalFocusMinutes = focuses.reduce(
        (sum: number, f: { completedMinutes?: number }) =>
          sum + (f.completedMinutes || 0),
        0,
      );
      const totalQuestsCompleted = questsList.filter(
        (q: { completed: number }) => q.completed === 1,
      ).length;

      const unlockedMap = new Map<string, string>();
      for (const u of unlockedRows) {
        unlockedMap.set(u.achievementId, u.unlockedAt);
      }

      const results: AchievementItem[] = [];
      const newlyUnlocked: AchievementItem[] = [];
      const now = new Date().toISOString();

      for (const def of MILESTONE_DEFINITIONS) {
        let currentMetric = 0;

        switch (def.id) {
          case "first_workout":
            currentMetric = totalWorkouts + totalQuestsCompleted;
            break;
          case "pushup_master_50":
            currentMetric = totalPushups;
            break;
          case "focused_mind_5":
            currentMetric = totalFocusSessions;
            break;
          case "iron_streak_3":
          case "badge_streak_3":
            currentMetric = profile.currentStreak || 0;
            break;
          case "ascension_lvl_5":
          case "badge_level_5":
            currentMetric = profile.level || 1;
            break;
          case "coin_collector_1000":
            currentMetric = profile.totalCoinsEarned || profile.coins || 0;
            break;
          case "badge_novice":
            currentMetric =
              totalWorkouts + totalFocusSessions + totalQuestsCompleted;
            break;
          case "badge_focus_master":
            currentMetric = totalFocusMinutes;
            break;
          case "badge_streak_7":
            // M59: same high-water rule as the 3-day streak achievements.
            currentMetric = Math.max(profile.currentStreak || 0, profile.longestStreak || 0);
            break;
          case "badge_grandmaster":
            currentMetric = profile.level || 1;
            break;
        }

        const isQualified = currentMetric >= def.target;
        const alreadyUnlocked = unlockedMap.has(def.id);

        if (isQualified && !alreadyUnlocked) {
          // Newly qualified milestone! Persist + grant rewards atomically.
          // H51: the notification promises "+{rewardCoins} Coins" but the
          // old code never granted anything. The grant now happens in the
          // same transaction as the unlock row, under an idempotency key
          // (achievement:<id>): a concurrent duplicate unlock rolls back
          // and pays nothing.
          try {
            await db.transaction(async (tx: any) => {
              await tx.insert(achievement).values({
                achievementId: def.id,
                title: def.title,
                description: def.description,
                icon: def.icon,
                category: def.category,
                unlockedAt: now,
              });
              const pRows = await tx.select().from(userProfile).limit(1);
              if (pRows.length > 0) {
                const p = pRows[0];
                let newXP = (p.currentXP || 0) + def.rewardXP;
                const newTotalXP = (p.totalXP || 0) + def.rewardXP;
                let currentLevel = p.level || 1;
                let requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
                while (newXP >= requiredXP) {
                  newXP -= requiredXP;
                  currentLevel += 1;
                  requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
                }
                await tx
                  .update(userProfile)
                  .set({
                    coins: (p.coins || 0) + def.rewardCoins,
                    totalCoinsEarned: (p.totalCoinsEarned || 0) + def.rewardCoins,
                    currentXP: newXP,
                    totalXP: newTotalXP,
                    level: currentLevel,
                  })
                  .where(eq(userProfile.id, p.id));
                if (def.rewardCoins !== 0) {
                  await tx.insert(coinTransaction).values({
                    amount: def.rewardCoins,
                    type: "earn",
                    description: `Achievement unlocked: ${def.title}`,
                    source: "achievement",
                    timestamp: now,
                    requestId: `achievement:${def.id}`,
                  });
                }
              }
            });
            unlockedMap.set(def.id, now);
            newlyUnlocked.push({
              ...def,
              progress: Math.min(def.target, currentMetric),
              unlocked: true,
              unlockedAt: now,
            });
          } catch {}
        }

        results.push({
          ...def,
          progress: Math.min(def.target, currentMetric),
          unlocked: alreadyUnlocked || isQualified,
          unlockedAt: unlockedMap.get(def.id),
        });
      }

      // Trigger notification for each newly unlocked milestone and sync to cloud
      for (const item of newlyUnlocked) {
        await notificationService.createNotification(
          "ACHIEVEMENT",
          `Unlocked: ${item.title}!`,
          `Congratulations! You achieved "${item.title}". +${item.rewardCoins} Coins`,
          item.id,
        );
      }

      if (newlyUnlocked.length > 0) {
        import("./cloudSyncService")
          .then(({ cloudSyncService }) => {
            cloudSyncService.triggerAutoSync().catch(() => {});
          })
          .catch(() => {});
      }

      return results;
    } catch (e) {
      console.warn("Error evaluating achievements:", e);
      return [];
    }
  }

  /**
   * Get list of achievements for UI
   */
  async getAchievements(): Promise<AchievementItem[]> {
    return await this.evaluateAchievements();
  }
}

export const achievementService = new AchievementService();
