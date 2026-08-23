import { create } from 'zustand';
import { db } from '../database/client';
import { settings } from '../database/schema';

interface SettingsState {
  sfxEnabled: boolean;
  sfxVolume: number;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  dailyBudgetMinutes: number;
  theme: string;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
  toggleSfx: () => Promise<void>;
  toggleHaptics: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
  setOnboardingCompleted: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sfxEnabled: true,
  sfxVolume: 0.7,
  hapticsEnabled: true,
  notificationsEnabled: false,
  onboardingCompleted: false,
  dailyBudgetMinutes: 120,
  theme: 'dark',
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const records = await db.select().from(settings).limit(1);
      if (records.length > 0) {
        const s = records[0];
        set({
          sfxEnabled: s.sfxEnabled === 1,
          sfxVolume: s.sfxVolume,
          hapticsEnabled: s.hapticsEnabled === 1,
          notificationsEnabled: s.notificationsEnabled === 1,
          onboardingCompleted: s.onboardingCompleted === 1,
          dailyBudgetMinutes: s.dailyBudgetMinutes,
          theme: s.theme,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings', error);
      set({ isLoading: false });
    }
  },

  updateSetting: async (key: string, value: any) => {
    try {
      const current = await db.select().from(settings).limit(1);
      if (current.length > 0) {
        const payload: any = {};
        if (typeof value === 'boolean') {
          payload[key] = value ? 1 : 0;
        } else {
          payload[key] = value;
        }
        await db.update(settings).set(payload);
      }
      set({ [key]: value } as any);
    } catch (error) {
      console.error(`Failed to update setting ${key}`, error);
    }
  },

  toggleSfx: async () => {
    const { sfxEnabled, updateSetting } = get();
    await updateSetting('sfxEnabled', !sfxEnabled);
  },

  toggleHaptics: async () => {
    const { hapticsEnabled, updateSetting } = get();
    await updateSetting('hapticsEnabled', !hapticsEnabled);
  },

  toggleNotifications: async () => {
    const { notificationsEnabled, updateSetting } = get();
    await updateSetting('notificationsEnabled', !notificationsEnabled);
  },

  setOnboardingCompleted: async () => {
    await get().updateSetting('onboardingCompleted', true);
  },
}));
