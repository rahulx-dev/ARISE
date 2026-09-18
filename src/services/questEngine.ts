import { Quest, QuestCategory, QuestDifficulty, ExerciseType } from '../types';

export const questEngine = {
  generateDailyQuests: (preferences?: { fitness?: boolean; focus?: boolean; productivity?: boolean }): Partial<Quest>[] => {
    const prefs = { fitness: true, focus: true, productivity: true, ...preferences };
    const quests: Partial<Quest>[] = [];
    const today = new Date().toISOString().split('T')[0];

    const REWARDS = {
      EASY: { coins: 2, xp: 50 },
      MEDIUM: { coins: 4, xp: 100 },
      HARD: { coins: 6, xp: 150 },
      EPIC: { coins: 10, xp: 250 },
    };

    if (prefs.fitness) {
      quests.push({
        title: 'Morning Push-ups',
        description: 'Complete 20 camera-tracked push-ups to start your day.',
        category: 'FITNESS' as QuestCategory,
        difficulty: 'MEDIUM' as QuestDifficulty,
        rewardCoins: REWARDS.MEDIUM.coins,
        rewardXP: REWARDS.MEDIUM.xp,
        target: 20,
        exerciseType: 'PUSHUP' as ExerciseType,
        completed: false,
        date: today,
        isCustom: false,
        createdAt: new Date().toISOString(),
      });
      quests.push({
        title: 'Core Strength Plank',
        description: 'Hold a plank for 60 seconds with straight back alignment.',
        category: 'FITNESS' as QuestCategory,
        difficulty: 'MEDIUM' as QuestDifficulty,
        rewardCoins: REWARDS.MEDIUM.coins,
        rewardXP: REWARDS.MEDIUM.xp,
        target: 60,
        exerciseType: 'PLANK' as ExerciseType,
        completed: false,
        date: today,
        isCustom: false,
        createdAt: new Date().toISOString(),
      });
      quests.push({
        title: 'Lower Body Squats',
        description: 'Perform 25 deep squats.',
        category: 'FITNESS' as QuestCategory,
        difficulty: 'HARD' as QuestDifficulty,
        rewardCoins: REWARDS.HARD.coins,
        rewardXP: REWARDS.HARD.xp,
        target: 25,
        exerciseType: 'SQUAT' as ExerciseType,
        completed: false,
        date: today,
        isCustom: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (prefs.focus) {
      quests.push({
        title: 'Deep Work Sprint',
        description: 'Complete a 45-minute focus session without distractions.',
        category: 'FOCUS' as QuestCategory,
        difficulty: 'HARD' as QuestDifficulty,
        rewardCoins: REWARDS.HARD.coins,
        rewardXP: REWARDS.HARD.xp,
        target: 45,
        completed: false,
        date: today,
        isCustom: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (prefs.productivity) {
      quests.push({
        title: 'Daily Action Item',
        description: 'Finish your most important task for today.',
        category: 'PRODUCTIVITY' as QuestCategory,
        difficulty: 'EASY' as QuestDifficulty,
        rewardCoins: REWARDS.EASY.coins,
        rewardXP: REWARDS.EASY.xp,
        target: 1,
        completed: false,
        date: today,
        isCustom: false,
        createdAt: new Date().toISOString(),
      });
    }

    return quests.slice(0, 5);
  },

  createQuestFromTemplate: (template: any): Partial<Quest> => {
    return {
      ...template,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      completed: false,
      isCustom: false,
    };
  },
};
