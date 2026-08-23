import { create } from 'zustand';
import { PlayerProfile, StatName } from '../types';
import { userRepository } from '../database/repositories/userRepository';

interface PlayerState {
  profile: PlayerProfile | null;
  isLoading: boolean;
  error: string | null;
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

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
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
      await userRepository.addXP(amount);
      const profile = (await userRepository.getProfile()) as PlayerProfile | undefined;
      set({ profile: profile || null });
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
