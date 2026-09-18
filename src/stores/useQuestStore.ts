import { create } from 'zustand';
import { questService, QuestData } from '../services/questService';
import { usePlayerStore } from './usePlayerStore';

interface QuestState {
  dailyQuests: QuestData[];
  weeklyQuests: QuestData[];
  isLoading: boolean;
  loadQuests: () => Promise<void>;
  completeQuest: (questId: number) => Promise<{ coins: number; xp: number }>;
  resetTodayQuests: () => Promise<void>;
  rerollDailyQuests: () => Promise<void>;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  dailyQuests: [],
  weeklyQuests: [],
  isLoading: false,

  loadQuests: async () => {
    set({ isLoading: true });
    try {
      const [daily, weekly] = await Promise.all([
        questService.getDailyQuests(),
        questService.getWeeklyQuests(),
      ]);
      set({ dailyQuests: daily, weeklyQuests: weekly, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to load quests', error);
    }
  },

  completeQuest: async (questId: number) => {
    try {
      const res = await questService.completeQuest(questId);
      await get().loadQuests();
      // Sync player profile with newly granted coins and XP
      await usePlayerStore.getState().loadProfile();
      return {
        coins: res.earnedCoins,
        xp: res.earnedXP,
      };
    } catch (error) {
      console.error('Failed to complete quest', error);
      return { coins: 0, xp: 0 };
    }
  },

  resetTodayQuests: async () => {
    await questService.resetTodayQuests();
    await get().loadQuests();
  },

  rerollDailyQuests: async () => {
    await questService.rerollDailyQuests();
    await get().loadQuests();
  },
}));
