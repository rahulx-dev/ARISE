import { create } from 'zustand';
import { PlayerProfile, StatName } from '../types';
import { userRepository } from '../database/repositories/userRepository';
import { getRankForLevel } from '../constants/ranks';
import { streakService } from '../services/streakService';

export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  rankTitle: string;
  transformationName: string;
  auraColor: string;
  rewardCoins: number;
}

interface PlayerState {
  profile: PlayerProfile | null;
  isLoading: boolean;
  error: string | null;
  levelUpData: LevelUpData | null;
  dismissLevelUp: () => void;
  triggerLevelUpModal: (data: LevelUpData) => void;
  triggerTestLevelUp: () => void;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<PlayerProfile>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  addCoins: (amount: number, description: string, source: string) => Promise<void>;
  spendCoins: (amount: number, description: string) => Promise<boolean>;
  updateStat: (stat: StatName, amount: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  resetProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,
  levelUpData: null,

  dismissLevelUp: () => set({ levelUpData: null }),

  triggerLevelUpModal: (data: LevelUpData) => set({ levelUpData: data }),

  triggerTestLevelUp: () => {
    const profile = get().profile;
    const currentLvl = profile?.level || 1;
    const newLvl = currentLvl + 1;
    const rank = getRankForLevel(newLvl);
    set({
      levelUpData: {
        oldLevel: currentLvl,
        newLevel: newLvl,
        rankTitle: rank.title,
        transformationName: rank.transformationName,
        auraColor: rank.auraColor,
        rewardCoins: 250,
      },
    });
  },

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      await streakService.checkAndUpdateStreak();
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<PlayerProfile>) => {
    try {
      await userRepository.updateProfile(updates as any);
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addXP: async (amount: number) => {
    try {
      const oldProfile = get().profile;
      const oldLevel = oldProfile?.level || 1;

      await userRepository.addXP(amount);
      const newProfile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: newProfile || null });

      if (newProfile && newProfile.level > oldLevel) {
        const newRank = getRankForLevel(newProfile.level);
        const bonusCoins = (newProfile.level - oldLevel) * 100;

        try {
          await userRepository.addCoins(
            bonusCoins,
            `Level ${newProfile.level} Rank Ascension Bonus`,
            'level_up'
          );
        } catch {}

        const refreshed = (await userRepository.getProfile()) as PlayerProfile | undefined;
        set({
          profile: refreshed || newProfile,
          levelUpData: {
            oldLevel,
            newLevel: newProfile.level,
            rankTitle: newRank.title,
            transformationName: newRank.transformationName,
            auraColor: newRank.auraColor,
            rewardCoins: bonusCoins,
          },
        });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addCoins: async (amount: number, description: string, source: string) => {
    try {
      await userRepository.addCoins(amount, description, source);
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  spendCoins: async (amount: number, description: string) => {
    try {
      const success = await userRepository.spendCoins(amount, description);
      if (success) {
        const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
        set({ profile: profile || null });
      }
      return success;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  updateStat: async (stat: StatName, amount: number) => {
    try {
      await userRepository.updateStat(stat, amount);
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateStreak: async () => {
    try {
      await userRepository.updateStreak();
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  resetProfile: async () => {
    try {
      await userRepository.resetProfile();
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  refreshProfile: async () => {
    await get().loadProfile();
  },
}));
