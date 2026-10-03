import { db } from '../database/client';
import { quest } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
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
    title: 'Shadow Sprint Protocol',
    description: 'Execute outdoor running distance',
    category: 'FITNESS',
    exerciseType: 'RUN',
    target: 1000,
    rewardCoins: 25,
    rewardXP: 80,
    difficulty: 'MEDIUM',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
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
    exerciseType: null,
    target: 16,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Core Crunch Matrix',
    description: 'Execute abdominal crunches with good form (AI tracked)',
    category: 'FITNESS',
    exerciseType: 'SITUP',
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
    exerciseType: null,
    target: 30,
    rewardCoins: 18,
    rewardXP: 50,
    difficulty: 'MEDIUM',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Burpee Assault',
    description: 'Perform explosive full-body burpees',
    category: 'FITNESS',
    exerciseType: null,
    target: 10,
    rewardCoins: 25,
    rewardXP: 75,
    difficulty: 'HARD',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Mountain Climber Rush',
    description: 'Drive knees rapidly in plank stance',
    category: 'FITNESS',
    exerciseType: null,
    target: 25,
    rewardCoins: 20,
    rewardXP: 60,
    difficulty: 'MEDIUM',
    questType: 'MANUAL',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Diamond Push-ups',
    description: 'Perform tricep diamond push-ups (AI tracked)',
    category: 'FITNESS',
    exerciseType: 'PUSHUP',
    target: 12,
    rewardCoins: 22,
    rewardXP: 65,
    difficulty: 'HARD',
    questType: 'TRACKED',
    frequency: 'DAILY' as const,
  },
  {
    title: 'Sumo Squats Power',
    description: 'Perform wide-stance sumo squats (AI tracked)',
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
 * At Level 20+ (S-Rank / Monarch): 100 reps / 10 km (The Sung Jin-Woo daily quest!).
 */
export function getLevelScaledQuest(template: typeof DAILY_QUEST_POOL[0], level: number) {
  // Solo Leveling Rank-Based Scaling:
  // Level 1-2 (E-Rank): 1.0x  -> 15 Pushups, 20 Squats, 15 Situps, 1km Run, 15m Focus
  // Level 3-5 (D-Rank): 1.6x  -> 25 Pushups, 35 Squats, 25 Situps, 2km Run, 25m Focus
  // Level 6-9 (C-Rank): 2.5x  -> 40 Pushups, 50 Squats, 40 Situps, 3.5km Run, 35m Focus
  // Level 10-14 (B-Rank): 4.0x -> 60 Pushups, 75 Squats, 60 Situps, 5km Run, 45m Focus
  // Level 15-19 (A-Rank): 5.5x -> 80 Pushups, 90 Squats, 80 Situps, 7.5km Run, 60m Focus
  // Level 20+ (S-Rank / Monarch): 6.67x -> The Canonical 100 Reps & 10km Run!
  const mult = level >= 20 ? 6.67 : level >= 15 ? 5.5 : level >= 10 ? 4.0 : level >= 6 ? 2.5 : level >= 3 ? 1.6 : 1.0;

  let scaledTarget = template.target;

  if (template.category === 'FITNESS') {
    if (template.exerciseType === 'PLANK') {
      scaledTarget = Math.min(180, Math.round(template.target * Math.min(3.0, mult)));
    } else if (template.exerciseType === 'RUN') {
      const km = level >= 20 ? 10 : level >= 15 ? 7.5 : level >= 10 ? 5 : level >= 6 ? 3.5 : level >= 3 ? 2 : 1;
      scaledTarget = Math.round(km * 1000); // in meters
    } else if (template.exerciseType === 'JUMPING_JACK') {
      scaledTarget = Math.min(150, Math.round(template.target * mult));
    } else {
      // Pushups, Squats, Situps
      if (level >= 20) {
        scaledTarget = 100;
      } else {
        scaledTarget = Math.min(100, Math.round(template.target * mult));
      }
    }
  } else if (template.category === 'FOCUS') {
    scaledTarget = Math.min(90, Math.round(template.target * Math.min(2.5, mult)));
  }

  // Rewards scale up with higher level/difficulty
  const rewardMult = level >= 20 ? 4.0 : level >= 15 ? 3.0 : level >= 10 ? 2.2 : level >= 6 ? 1.7 : level >= 3 ? 1.3 : 1.0;
  const scaledCoins = Math.round(template.rewardCoins * rewardMult);
  const scaledXP = Math.round(template.rewardXP * mult);

  let scaledDesc = template.description;
  if (template.category === 'FITNESS') {
    if (template.exerciseType === 'PLANK') {
      scaledDesc = `Hold a firm core plank for ${scaledTarget} seconds`;
    } else if (template.exerciseType === 'RUN') {
      scaledDesc = `Cover ${(scaledTarget / 1000).toFixed(1)} km in outdoor running`;
    } else {
      scaledDesc = `Complete ${scaledTarget} tracked ${(template.title || 'exercise').toLowerCase()} repetitions`;
    }
  } else if (template.category === 'FOCUS') {
    scaledDesc = `Complete a ${scaledTarget}-minute deep focus session`;
  }

  let difficulty = template.difficulty;
  if (level >= 20) difficulty = 'LEGENDARY';
  else if (level >= 15) difficulty = 'EPIC';
  else if (level >= 10) difficulty = 'HARD';
  else if (level >= 6) difficulty = 'MEDIUM';
  else if (level >= 3) difficulty = 'NORMAL';
  else difficulty = 'EASY';

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
        const d = new Date();
        const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);

        const pushupQuests = DAILY_QUEST_POOL.filter((q) => q.exerciseType === 'PUSHUP');
        const squatQuests = DAILY_QUEST_POOL.filter((q) => q.exerciseType === 'SQUAT');
        const coreQuests = DAILY_QUEST_POOL.filter((q) => q.exerciseType === 'SITUP' || q.exerciseType === 'PLANK');
        const runQuests = DAILY_QUEST_POOL.filter((q) => q.exerciseType === 'RUN');
        const focusQuests = DAILY_QUEST_POOL.filter((q) => q.category === 'FOCUS');
        const lifeQuests = DAILY_QUEST_POOL.filter((q) => q.category !== 'FITNESS' && q.category !== 'FOCUS');

        const selected = [
          pushupQuests[dayOfYear % Math.max(1, pushupQuests.length)] || DAILY_QUEST_POOL[0],
          squatQuests[dayOfYear % Math.max(1, squatQuests.length)] || DAILY_QUEST_POOL[1],
          coreQuests[dayOfYear % Math.max(1, coreQuests.length)] || DAILY_QUEST_POOL[2],
          runQuests[dayOfYear % Math.max(1, runQuests.length)] || DAILY_QUEST_POOL[0],
          focusQuests[dayOfYear % Math.max(1, focusQuests.length)] || DAILY_QUEST_POOL[3],
          lifeQuests[dayOfYear % Math.max(1, lifeQuests.length)] || DAILY_QUEST_POOL[4],
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
          if (!rawTemplate) continue;
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

      const finalEarnedCoins = q.rewardCoins > 0 ? q.rewardCoins : 15;
      const statType =
        q.category === 'FITNESS'
          ? 'strength'
          : q.category === 'FOCUS'
            ? 'focus'
            : 'discipline';

      // Complete the quest and grant all rewards in one SQLite transaction. This
      // also makes concurrent taps idempotent.
      const completed = await userRepository.completeQuestAndGrantRewards(
        questId,
        finalEarnedCoins,
        q.rewardXP,
        statType
      );
      if (!completed) {
        return { success: false, earnedCoins: 0, earnedXP: 0 };
      }

      await userRepository.updateStreak();

      // Trigger notification
      try {
        await notificationService.createNotification(
          'QUEST',
          'Quest Completed!',
          `You completed "${q.title}". +${finalEarnedCoins} Coins, +${q.rewardXP} XP`,
          String(questId)
        );
      } catch (notificationError) {
        console.warn('Quest completed but notification creation failed:', notificationError);
      }

      // Evaluate newly unlocked achievements
      try {
        await achievementService.evaluateAchievements();
      } catch (achievementError) {
        console.warn('Quest completed but achievement evaluation failed:', achievementError);
      }

      return {
        success: true,
        earnedCoins: finalEarnedCoins,
        earnedXP: q.rewardXP,
      };
    } catch (error) {
      console.error('Error completing quest:', error);
      throw error;
    }
  }

  /**
   * Rescales all active, uncompleted daily quests to match a player's newly attained level
   */
  async rescaleActiveQuestsForLevel(newLevel: number): Promise<void> {
    const today = this.getTodayDateString();
    try {
      const activeDaily = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today), eq(quest.completed, 0)));

      for (const q of activeDaily) {
        const template =
          DAILY_QUEST_POOL.find((t) => t.title === q.title) ||
          DAILY_QUEST_POOL.find(
            (t) =>
              t.category === q.category &&
              (t.exerciseType || null) === (q.exerciseType || null)
          );

        if (template) {
          const scaled = getLevelScaledQuest(template, newLevel);
          await db
            .update(quest)
            .set({
              target: scaled.target,
              rewardCoins: scaled.rewardCoins,
              rewardXP: scaled.rewardXP,
              description: scaled.description,
              difficulty: scaled.difficulty,
            })
            .where(eq(quest.id, q.id));
        }
      }

      await notificationService.createNotification(
        'QUEST',
        '⚔️ [QUEST EVOLUTION // RANK ASCENSION]',
        `Active daily quests have evolved to Level ${newLevel} difficulty with enhanced coin and XP bounties!`
      );
    } catch (e) {
      console.warn('Error rescaling active quests:', e);
    }
  }

  /**
   * Automatically reconciles completed exercises (pushups, squats, situps, plank, run, focus)
   * with any active uncompleted daily quests.
   */
  async reconcileCompletedActivity(
    activityType: string,
    value: number
  ): Promise<{ completedCount: number; coins: number; xp: number }> {
    const today = this.getTodayDateString();
    let completedCount = 0;
    let earnedCoins = 0;
    let earnedXP = 0;

    try {
      const activeQuests = await db
        .select()
        .from(quest)
        .where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today), eq(quest.completed, 0)));

      const normType = activityType.toUpperCase();

      for (const q of activeQuests) {
        let isMatch = false;
        const qExType = (q.exerciseType || '').toUpperCase();
        const qTitle = (q.title || '').toUpperCase();

        if (
          normType === 'PUSHUP' &&
          (qExType === 'PUSHUP' || qTitle.includes('PUSH-UP') || qTitle.includes('PUSHUP'))
        ) {
          isMatch = true;
        } else if (
          normType === 'SQUAT' &&
          (qExType === 'SQUAT' || qTitle.includes('SQUAT'))
        ) {
          isMatch = true;
        } else if (
          (normType === 'SITUP' || normType === 'CRUNCH') &&
          (qExType === 'SITUP' || qTitle.includes('SIT-UP') || qTitle.includes('CRUNCH'))
        ) {
          isMatch = true;
        } else if (
          normType === 'PLANK' &&
          (qExType === 'PLANK' || qTitle.includes('PLANK'))
        ) {
          isMatch = true;
        } else if (
          normType === 'JUMPING_JACK' &&
          (qExType === 'JUMPING_JACK' || qTitle.includes('JUMPING JACK'))
        ) {
          isMatch = true;
        } else if (
          (normType === 'RUN' || normType === 'RUNNING' || normType === 'SPRINT') &&
          (qExType === 'RUN' || qTitle.includes('SPRINT') || qTitle.includes('RUN') || qTitle.includes('WALK'))
        ) {
          isMatch = true;
        } else if (
          (normType === 'FOCUS' || normType === 'DEEP_FOCUS') &&
          (q.category === 'FOCUS' || qTitle.includes('FOCUS'))
        ) {
          isMatch = true;
        }

        if (isMatch && value >= (q.target || 1)) {
          const res = await this.completeQuest(q.id);
          if (res.success) {
            completedCount++;
            earnedCoins += res.earnedCoins;
            earnedXP += res.earnedXP;
          }
        }
      }
    } catch (err) {
      console.warn('[QuestService] reconcileCompletedActivity error:', err);
    }

    return { completedCount, coins: earnedCoins, xp: earnedXP };
  }

  /**
   * Test Mode helper: Reset today's daily quests to incomplete
   */
  async resetTodayQuests(): Promise<void> {
    const today = this.getTodayDateString();
    await db.update(quest).set({ completed: 0 }).where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));
  }

  /**
   * Test Mode helper: Re-seed 6 fresh random quests from the pool
   */
  async rerollDailyQuests(): Promise<void> {
    const today = this.getTodayDateString();
    await db.delete(quest).where(and(eq(quest.frequency, 'DAILY'), eq(quest.date, today)));
    await this._doEnsureQuestsPopulated();
  }
}

export const questService = new QuestService();
