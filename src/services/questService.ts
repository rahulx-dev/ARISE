import { db } from '../database/client';
import { quest } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { coinService } from './coinService';
import { progressionService } from './progressionService';
import { notificationService } from './notificationService';
import { achievementService } from './achievementService';

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

export const DEFAULT_DAILY_QUEST_TEMPLATES = [
  {
    title: 'Push-ups Protocol',
    description: 'Complete 20 tracked push-up repetitions',
    category: 'FITNESS',
    exerciseType: 'PUSHUP',
    target: 20,
    rewardCoins: 200,
    rewardXP: 100,
    difficulty: 'EASY',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Squat Mastery',
    description: 'Execute 25 tracked bodyweight squats',
    category: 'FITNESS',
    exerciseType: 'SQUAT',
    target: 25,
    rewardCoins: 150,
    rewardXP: 80,
    difficulty: 'EASY',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Deep Focus Session',
    description: 'Complete a 25-minute undistracted focus session',
    category: 'FOCUS',
    target: 25,
    rewardCoins: 100,
    rewardXP: 80,
    difficulty: 'MEDIUM',
    questType: 'TIMER',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Mindful Cleanse',
    description: 'Review your task list and clear your inbox',
    category: 'PRODUCTIVITY',
    target: 1,
    rewardCoins: 50,
    rewardXP: 30,
    difficulty: 'EASY',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
];

export const DEFAULT_WEEKLY_QUEST_TEMPLATES = [
  {
    title: 'Centurion Workout',
    description: 'Accumulate 150 total physical exercise repetitions this week',
    category: 'FITNESS',
    target: 150,
    rewardCoins: 500,
    rewardXP: 500,
    difficulty: 'HARD',
    questType: 'TRACKED',
    frequency: 'WEEKLY' as const,
  },
  {
    title: 'Master of Focus',
    description: 'Complete 5 full deep focus sessions this week',
    category: 'FOCUS',
    target: 5,
    rewardCoins: 400,
    rewardXP: 450,
    difficulty: 'MEDIUM',
    questType: 'TIMER',
    frequency: 'WEEKLY' as const,
  },
  {
    title: 'Unbroken Discipline',
    description: 'Maintain an unbroken daily streak throughout the week',
    category: 'PRODUCTIVITY',
    target: 7,
    rewardCoins: 600,
    rewardXP: 700,
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

  /**
   * Ensure quests exist for current day and week without resetting on simple app restart
   */
  async ensureQuestsPopulated(): Promise<void> {
    const today = this.getTodayDateString();
    const currentWeek = this.getCurrentWeekString();

    try {
      // 1. Check daily quests for today
      const dailyRows = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));

      if (dailyRows.length === 0) {
        // Seed today's daily quests fresh with completed = 0
        const now = new Date().toISOString();
        for (const t of DEFAULT_DAILY_QUEST_TEMPLATES) {
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

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        exerciseType: r.exerciseType,
        target: r.target,
        rewardCoins: r.rewardCoins,
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

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        exerciseType: r.exerciseType,
        target: r.target,
        rewardCoins: r.rewardCoins,
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
   * Complete a quest idempotently (Prevents duplicate reward granting)
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

      // Mark completed in SQLite
      await db.update(quest).set({ completed: 1 }).where(eq(quest.id, questId));

      // Award coins atomically
      if (q.rewardCoins > 0) {
        await coinService.addCoins(q.rewardCoins, `Quest: ${q.title}`, 'quest');
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
        `You completed "${q.title}". +${q.rewardCoins} Coins, +${q.rewardXP} XP`,
        String(questId)
      );

      // Evaluate newly unlocked achievements
      await achievementService.evaluateAchievements();

      return {
        success: true,
        earnedCoins: q.rewardCoins,
        earnedXP: q.rewardXP,
      };
    } catch (e) {
      console.warn('Error completing quest:', e);
      return { success: false, earnedCoins: 0, earnedXP: 0 };
    }
  }
}

export const questService = new QuestService();
