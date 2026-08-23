import { create } from 'zustand';
import { Quest, QuestCategory } from '../types';
import { questRepository } from '../database/repositories/questRepository';

interface QuestState {
  quests: Quest[];
  isLoading: boolean;
  filter: QuestCategory | 'ALL';
  loadQuests: (date?: string) => Promise<void>;
  completeQuest: (questId: number) => Promise<{ coins: number; xp: number }>;
  createCustomQuest: (input: any) => Promise<void>;
  deleteQuest: (questId: number) => Promise<void>;
  setFilter: (filter: QuestCategory | 'ALL') => void;
  getFilteredQuests: () => Quest[];
}

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  isLoading: false,
  filter: 'ALL',

  loadQuests: async (date?: string) => {
    set({ isLoading: true });
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const records = await questRepository.getQuestsByDate(targetDate);
      const mapped: Quest[] = records.map((r) => ({
        id: r.id.toString(),
        title: r.title,
        description: r.description,
        category: r.category as QuestCategory,
        exerciseType: r.exerciseType as any,
        target: r.target || 1,
        rewardCoins: r.rewardCoins,
        rewardXP: r.rewardXP,
        difficulty: r.difficulty as any,
        completed: r.completed === 1,
        date: r.date,
        isCustom: r.isCustom === 1,
        repeatSchedule: r.repeatSchedule ? JSON.parse(r.repeatSchedule) : undefined,
        createdAt: r.createdAt,
      }));
      set({ quests: mapped, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to load quests', error);
    }
  },

  completeQuest: async (questId: number) => {
    try {
      await questRepository.completeQuest(questId);
      const current = get().quests.find((q) => q.id === questId.toString());
      await get().loadQuests();
      return {
        coins: current?.rewardCoins || 0,
        xp: current?.rewardXP || 0,
      };
    } catch (error) {
      console.error('Failed to complete quest', error);
      return { coins: 0, xp: 0 };
    }
  },

  createCustomQuest: async (input: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await questRepository.createCustomQuest({
        title: input.title,
        description: input.description || '',
        category: input.category,
        exerciseType: input.exerciseType,
        target: input.target || 1,
        rewardCoins: Math.min(input.rewardCoins || 20, 200),
        rewardXP: Math.min(input.rewardXP || 50, 500),
        difficulty: input.difficulty || 'MEDIUM',
        completed: 0,
        date: input.date || today,
        repeatSchedule: input.repeatSchedule ? JSON.stringify(input.repeatSchedule) : null,
      });
      await get().loadQuests();
    } catch (error) {
      console.error('Failed to create custom quest', error);
    }
  },

  deleteQuest: async (questId: number) => {
    try {
      await questRepository.deleteQuest(questId);
      await get().loadQuests();
    } catch (error) {
      console.error('Failed to delete quest', error);
    }
  },

  setFilter: (filter: QuestCategory | 'ALL') => {
    set({ filter });
  },

  getFilteredQuests: () => {
    const { quests, filter } = get();
    if (filter === 'ALL') return quests;
    return quests.filter((q) => q.category === filter);
  },
}));
