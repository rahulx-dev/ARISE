import { db } from '../database/client';
import { quest } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { coinService } from './coinService';
import { progressionService } from './progressionService';
import { notificationService } from './notificationService';
import { achievementService } from './achievementService';
import { userRepository } from '../database/repositories/userRepository';

export interface QuestData {
  id: number;
  title: string;
  description: string;
  category: string;
  exerciseType?: string | null;
  target: number;
  rewardCoins: number;
  rewardXP: number;
  difficulty: string;
  completed: boolean;
  questType: string;
  frequency: 'DAILY' | 'WEEKLY' | 'ACHIEVEMENT';
  date: string;
}

export const DAILY_QUEST_POOL = [
  {
    title: 'Push-ups Protocol',
    description: 'Complete tracked push-up repetitions',
    category: 'FITNESS',
    exerciseType: 'PUSHUP',
    target: 15,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Squat Mastery',
    description: 'Execute tracked bodyweight squats',
    category: 'FITNESS',
    exerciseType: 'SQUAT',
    target: 20,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Sit-up Core Ascension',
    description: 'Execute tracked abdominal sit-ups',
    category: 'FITNESS',
    exerciseType: 'SITUP',
    target: 15,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Jumping Jacks Burst',
    description: 'Complete rhythmic jumping jacks',
    category: 'FITNESS',
    exerciseType: 'JUMPING_JACK',
    target: 30,
    rewardCoins: 16,
    rewardXP: 45,
    difficulty: 'EASY',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Iron Core Plank',
    description: 'Hold a firm core plank position',
    category: 'FITNESS',
    exerciseType: 'PLANK',
    target: 45,
    rewardCoins: 20,
    rewardXP: 60,
    difficulty: 'HARD',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Walking Lunges Protocol',
    description: 'Execute alternating lunges for leg power',
    category: 'FITNESS',
    exerciseType: 'LUNGE',
    target: 16,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Core Crunch Matrix',
    description: 'Execute abdominal crunches with good form',
    category: 'FITNESS',
    exerciseType: 'CRUNCH',
    target: 20,
    rewardCoins: 16,
    rewardXP: 45,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'High Knees Drive',
    description: 'Execute rapid high-knees for cardio ignition',
    category: 'FITNESS',
    exerciseType: 'HIGH_KNEES',
    target: 30,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Burpee Assault',
    description: 'Perform explosive full-body burpees',
    category: 'FITNESS',
    exerciseType: 'BURPEE',
    target: 10,
    rewardCoins: 25,
    rewardXP: 75,
    difficulty: 'HARD',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Mountain Climber Rush',
    description: 'Drive knees rapidly in plank stance',
    category: 'FITNESS',
    exerciseType: 'MOUNTAIN_CLIMBER',
    target: 25,
    rewardCoins: 20,
    rewardXP: 60,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Diamond Push-ups',
    description: 'Perform tricep diamond push-ups',
    category: 'FITNESS',
    exerciseType: 'DIAMOND_PUSHUP',
    target: 12,
    rewardCoins: 22,
    rewardXP: 65,
    difficulty: 'HARD',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Deep Focus Sanctuary',
    description: 'Complete an undistracted deep focus session',
    category: 'FOCUS',
    target: 25,
    rewardCoins: 20,
    rewardXP: 70,
    difficulty: 'MEDIUM',
    questType: 'TIMER',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Cognitive Sprint',
    description: 'Maintain deep uninterrupted focus',
    category: 'FOCUS',
    target: 15,
    rewardCoins: 15,
    rewardXP: 45,
    difficulty: 'EASY',
    questType: 'TIMER',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Hydration Protocol',
    description: 'Consume at least 2.5L of clean water throughout the day',
    category: 'WELLNESS',
    target: 1,
    rewardCoins: 12,
    rewardXP: 35,
    difficulty: 'EASY',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Morning Sunlight Walk',
    description: 'Take a 15-minute walk outside in morning sunlight',
    category: 'WELLNESS',
    target: 1,
    rewardCoins: 15,
    rewardXP: 40,
    difficulty: 'EASY',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Digital Sunset',
    description: 'No distraction screens or social feeds 1 hour before bed',
    category: 'DISCIPLINE',
    target: 1,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Cold Shower Discipline',
    description: 'Finish your shower with 2 minutes of cold water',
    category: 'DISCIPLINE',
    target: 1,
    rewardCoins: 20,
    rewardXP: 60,
    difficulty: 'HARD',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Hunter Daily Reflection',
    description: 'Review today’s wins and plan tomorrow’s 3 primary objectives',
    category: 'PRODUCTIVITY',
    target: 1,
    rewardCoins: 15,
    rewardXP: 40,
    difficulty: 'EASY',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
];

/**
 * Level-based dynamic difficulty scaling helper.
 * Scales rep targets and rewards progressively as player ascends through ranks.
 * At Level 20+ (S-Rank / Monarch): 100 reps (The Sung Jin-Woo daily quest!).
 */
export function getLevelScaledQuest(template: typeof DAILY_QUEST_POOL[0], level: number) {
  const mult = level >= 20 ? 5.0 : level >= 15 ? 3.5 : level >= 10 ? 2.5 : level >= 6 ? 1.7 : level >= 3 ? 1.3 : 1.0;

  let scaledTarget = template.target;
  if (template.category === 'FITNESS') {
    if (template.exerciseType === 'PLANK') {
      scaledTarget = Math.min(180, Math.round(template.target * Math.min(2.5, mult)));
    } else {
      scaledTarget = Math.min(100, Math.round(template.target * mult));
    }
  } else if (template.category === 'FOCUS') {
    scaledTarget = Math.min(90, Math.round(template.target * Math.min(2.0, mult)));
  }

  const scaledCoins = Math.round(template.rewardCoins * (1 + (mult - 1) * 0.6));
  const scaledXP = Math.round(template.rewardXP * mult);

  let scaledDesc = template.description;
  if (template.category === 'FITNESS') {
    if (template.exerciseType === 'PLANK') {
      scaledDesc = `Hold a firm core plank for ${scaledTarget} seconds`;
    } else {
      scaledDesc = `Complete ${scaledTarget} tracked ${template.title.toLowerCase()} repetitions`;
    }
  } else if (template.category === 'FOCUS') {
    scaledDesc = `Complete a ${scaledTarget}-minute deep focus session`;
  }

  let difficulty = template.difficulty;
  if (mult >= 3.5) difficulty = 'EPIC';
  else if (mult >= 2.5) difficulty = 'HARD';

  return {
    ...template,
    target: scaledTarget,
    rewardCoins: scaledCoins,
    rewardXP: scaledXP,
    description: scaledDesc,
    difficulty,
  };
}

export const DEFAULT_DAILY_QUEST_TEMPLATES = DAILY_QUEST_POOL;

export const DEFAULT_WEEKLY_QUEST_TEMPLATES = [
  {
    title: 'Centurion Workout',
    description: 'Accumulate 150 total physical exercise repetitions this week',
    category: 'FITNESS',
    target: 150,
    rewardCoins: 30,
    rewardXP: 250,
    difficulty: 'HARD',
    questType: 'TRACKED',
    frequency: 'WEEKLY' as const,
  },
  {
    title: 'Master of Focus',
    description: 'Complete 5 full deep focus sessions this week',
    category: 'FOCUS',
    target: 5,
    rewardCoins: 25,
    rewardXP: 200,
    difficulty: 'MEDIUM',
    questType: 'TIMER',
    frequency: 'WEEKLY' as const,
  },
  {
    title: 'Unbroken Discipline',
    description: 'Maintain an unbroken daily streak throughout the week',
    category: 'PRODUCTIVITY',
    target: 7,
    rewardCoins: 35,
    rewardXP: 300,
    difficulty: 'EPIC',
    questType: 'MANUAL',
    frequency: 'WEEKLY' as const,
  },
];

class QuestService {
  private getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getCurrentWeekString(): string {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${weekNum}`;
  }

  private populatingPromise: Promise<void> | null = null;

  /**
   * Ensure quests exist for current day and week without resetting on simple app restart
   */
  async ensureQuestsPopulated(): Promise<void> {
    if (this.populatingPromise) {
      return this.populatingPromise;
    }
    this.populatingPromise = this._doEnsureQuestsPopulated();
    try {
      await this.populatingPromise;
    } finally {
      this.populatingPromise = null;
    }
  }

  private async _doEnsureQuestsPopulated(): Promise<void> {
    const today = this.getTodayDateString();
    const currentWeek = this.getCurrentWeekString();

    try {
      // 1. Check daily quests for today
      const dailyRows = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));

      if (dailyRows.length === 0) {
        // Deterministically select 5 balanced quests for today from the 14-quest pool
        // (2 Fitness, 1 Focus, 2 Wellness/Discipline)
        const d = new Date();
        const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);

        const fitnessQuests = DAILY_QUEST_POOL.filter((q) => q.category === 'FITNESS');
        const focusQuests = DAILY_QUEST_POOL.filter((q) => q.category === 'FOCUS');
        const lifeQuests = DAILY_QUEST_POOL.filter((q) => q.category !== 'FITNESS' && q.category !== 'FOCUS');

        const selected = [
          fitnessQuests[dayOfYear % fitnessQuests.length],
          fitnessQuests[(dayOfYear + 1) % fitnessQuests.length],
          focusQuests[dayOfYear % focusQuests.length],
          lifeQuests[dayOfYear % lifeQuests.length],
          lifeQuests[(dayOfYear + 1) % lifeQuests.length],
        ];

        let userLevel = 1;
        try {
          const profile = await userRepository.getProfile();
          if (profile?.level) userLevel = profile.level;
        } catch {
          userLevel = 1;
        }

        const now = new Date().toISOString();
        for (const rawTemplate of selected) {
          const t = getLevelScaledQuest(rawTemplate, userLevel);
          await db.insert(quest).values({
            title: t.title,
            description: t.description,
            category: t.category,
            exerciseType: t.exerciseType || null,
            target: t.target,
            rewardCoins: t.rewardCoins,
            rewardXP: t.rewardXP,
            difficulty: t.difficulty,
            completed: 0,
            questType: t.questType,
            frequency: 'DAILY',
            date: today,
            isCustom: 0,
            createdAt: now,
          });
        }
      }

      // 2. Check weekly quests for current week
      const weeklyRows = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'WEEKLY'), eq(quest.date, currentWeek)));

      if (weeklyRows.length === 0) {
        const now = new Date().toISOString();
        for (const t of DEFAULT_WEEKLY_QUEST_TEMPLATES) {
          await db.insert(quest).values({
            title: t.title,
            description: t.description,
            category: t.category,
            exerciseType: null,
            target: t.target,
            rewardCoins: t.rewardCoins,
            rewardXP: t.rewardXP,
            difficulty: t.difficulty,
            completed: 0,
            questType: t.questType,
            frequency: 'WEEKLY',
            date: currentWeek,
            isCustom: 0,
            createdAt: now,
          });
        }
      }
    } catch (e) {
      console.warn('Error populating quests:', e);
    }
  }

  /**
   * Get authoritative daily quests for today
   */
  async getDailyQuests(): Promise<QuestData[]> {
    await this.ensureQuestsPopulated();
    const today = this.getTodayDateString();

    try {
      const rows = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));

      const seen = new Set<string>();
      const unique = rows.filter((r: any) => {
        if (seen.has(r.title)) return false;
        seen.add(r.title);
        return true;
      });

      return unique.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        exerciseType: r.exerciseType,
        target: r.target,
        rewardCoins: r.rewardCoins || 18,
        rewardXP: r.rewardXP,
        difficulty: r.difficulty,
        completed: Boolean(r.completed),
        questType: r.questType,
        frequency: 'DAILY',
        date: r.date,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get authoritative weekly quests for current week
   */
  async getWeeklyQuests(): Promise<QuestData[]> {
    await this.ensureQuestsPopulated();
    const currentWeek = this.getCurrentWeekString();

    try {
      const rows = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'WEEKLY'), eq(quest.date, currentWeek)));

      const seen = new Set<string>();
      const unique = rows.filter((r: any) => {
        if (seen.has(r.title)) return false;
        seen.add(r.title);
        return true;
      });

      return unique.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        exerciseType: r.exerciseType,
        target: r.target,
        rewardCoins: r.rewardCoins || 35,
        rewardXP: r.rewardXP,
        difficulty: r.difficulty,
        completed: Boolean(r.completed),
        questType: r.questType,
        frequency: 'WEEKLY',
        date: r.date,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Complete a quest idempotently (Awards full quest coins and XP)
   */
  async completeQuest(questId: number): Promise<{ success: boolean; earnedCoins: number; earnedXP: number }> {
    try {
      const rows = await db.select().from(quest).where(eq(quest.id, questId)).limit(1);
      if (rows.length === 0) return { success: false, earnedCoins: 0, earnedXP: 0 };

      const q = rows[0];
      if (q.completed === 1) {
        // Already completed! Idempotent return without double rewards
        return { success: true, earnedCoins: 0, earnedXP: 0 };
      }

      // Reward the full coins configured for this quest
      const finalEarnedCoins = q.rewardCoins > 0 ? q.rewardCoins : 15;

      // Mark completed in SQLite
      await db.update(quest).set({ completed: 1, rewardCoins: finalEarnedCoins }).where(eq(quest.id, questId));

      // Award coins atomically
      if (finalEarnedCoins > 0) {
        await coinService.addCoins(finalEarnedCoins, `Quest: ${q.title}`, 'quest');
      }

      // Award XP atomically
      if (q.rewardXP > 0) {
        await progressionService.addXP(q.rewardXP);
      }

      // Update stat attribute
      if (q.category === 'FITNESS') {
        await progressionService.updateStat('strength', 1);
      } else if (q.category === 'FOCUS') {
        await progressionService.updateStat('focus', 1);
      } else {
        await progressionService.updateStat('discipline', 1);
      }

      // Trigger notification
      await notificationService.createNotification(
        'QUEST',
        'Quest Completed!',
        `You completed "${q.title}". +${finalEarnedCoins} Coins, +${q.rewardXP} XP`,
        String(questId)
      );

      // Evaluate newly unlocked achievements
      await achievementService.evaluateAchievements();

      return {
        success: true,
        earnedCoins: finalEarnedCoins,
        earnedXP: q.rewardXP,
      };
    } catch (e) {
      console.warn('Error completing quest:', e);
      return { success: false, earnedCoins: 0, earnedXP: 0 };
    }
  }

  /**
   * Test Mode helper: Reset today's daily quests to incomplete
   */
  async resetTodayQuests(): Promise<void> {
    const today = this.getTodayDateString();
    await db.update(quest).set({ completed: 0 }).where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));
  }

  /**
   * Test Mode helper: Re-seed 5 fresh random quests from the 14-quest pool
   */
  async rerollDailyQuests(): Promise<void> {
    const today = this.getTodayDateString();
    await db.delete(quest).where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));
    await this._doEnsureQuestsPopulated();
  }
}

export const questService = new QuestService();
