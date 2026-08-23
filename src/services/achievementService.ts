import { achievementRepository } from '../database/repositories/achievementRepository';

export interface AchievementCheckStats {
  totalQuestsCompleted: number;
  totalExerciseSessions: number;
  totalPushups: number;
  totalSquats: number;
  currentStreak: number;
  level: number;
  totalFocusSessions: number;
  totalCoinsEarned: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'FITNESS' | 'FOCUS' | 'STREAK' | 'LEVEL' | 'COINS' | 'GENERAL';
  condition: (stats: AchievementCheckStats) => boolean;
}

export const ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'first_quest',
    title: 'First Step',
    description: 'Complete your first quest in ARISE',
    icon: 'sword',
    category: 'GENERAL',
    condition: (s) => s.totalQuestsCompleted >= 1,
  },
  {
    id: 'first_exercise',
    title: 'First Exercise',
    description: 'Complete your first physical training session',
    icon: 'arm-flex',
    category: 'FITNESS',
    condition: (s) => s.totalExerciseSessions >= 1,
  },
  {
    id: 'pushups_10',
    title: 'Push-up Initiate',
    description: 'Complete 10 total push-ups',
    icon: 'numeric-10-circle',
    category: 'FITNESS',
    condition: (s) => s.totalPushups >= 10,
  },
  {
    id: 'pushups_100',
    title: 'Push-up Centurion',
    description: 'Complete 100 total push-ups',
    icon: 'shield-crown',
    category: 'FITNESS',
    condition: (s) => s.totalPushups >= 100,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day uninterrupted streak',
    icon: 'fire',
    category: 'STREAK',
    condition: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day uninterrupted streak',
    icon: 'crown',
    category: 'STREAK',
    condition: (s) => s.currentStreak >= 30,
  },
  {
    id: 'level_10',
    title: 'Rising Legend',
    description: 'Reach Player Level 10',
    icon: 'star-circle',
    category: 'LEVEL',
    condition: (s) => s.level >= 10,
  },
  {
    id: 'focus_10',
    title: 'Deep Mind',
    description: 'Complete 10 deep focus sessions',
    icon: 'brain',
    category: 'FOCUS',
    condition: (s) => s.totalFocusSessions >= 10,
  },
  {
    id: 'coins_1000',
    title: 'Coin Hoarder',
    description: 'Earn 1,000 total lifetime coins',
    icon: 'cash-multiple',
    category: 'COINS',
    condition: (s) => s.totalCoinsEarned >= 1000,
  },
];

export const achievementService = {
  checkAchievements: async (stats: AchievementCheckStats): Promise<AchievementItem[]> => {
    const newlyUnlocked: AchievementItem[] = [];

    for (const ach of ACHIEVEMENTS) {
      const isAlreadyUnlocked = await achievementRepository.isUnlocked(ach.id);
      if (!isAlreadyUnlocked && ach.condition(stats)) {
        await achievementRepository.unlockAchievement(
          ach.id,
          ach.title,
          ach.description,
          ach.icon,
          ach.category
        );
        newlyUnlocked.push(ach);
      }
    }

    return newlyUnlocked;
  },

  getAllAchievementsWithProgress: async (stats: AchievementCheckStats) => {
    const unlocked = await achievementRepository.getUnlockedAchievements();
    const unlockedSet = new Set(unlocked.map((u) => u.achievementId));

    return ACHIEVEMENTS.map((ach) => ({
      ...ach,
      isUnlocked: unlockedSet.has(ach.id),
      unlockedAt: unlocked.find((u) => u.achievementId === ach.id)?.unlockedAt,
    }));
  },
};
