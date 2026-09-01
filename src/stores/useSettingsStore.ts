import { create } from 'zustand';
import { db } from '../database/client';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';
import { ThemeMode } from '../theme/themeEngine';

interface SettingsState {
  sfxEnabled: boolean;
  sfxVolume: number;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  dailyBudgetMinutes: number;
  theme: ThemeMode;
  bgMusicEnabled: boolean;
  bgMusicVolume: number;
  focusMusicTrack: string;
  focusMusicVolume: number;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
  toggleSfx: () => Promise<void>;
  toggleHaptics: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
  setOnboardingCompleted: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setBgMusic: (enabled: boolean, volume?: number) => Promise<void>;
  setFocusMusic: (track: string, volume?: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sfxEnabled: true,
  sfxVolume: 0.7,
  hapticsEnabled: true,
  notificationsEnabled: false,
  onboardingCompleted: false,
  dailyBudgetMinutes: 120,
  theme: 'system',
  bgMusicEnabled: false,
  bgMusicVolume: 0.5,
  focusMusicTrack: 'deep_focus',
  focusMusicVolume: 0.6,
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
          theme: (s.theme as ThemeMode) || 'system',
          bgMusicEnabled: (s as any).bgMusicEnabled === 1,
          bgMusicVolume: (s as any).bgMusicVolume ?? 0.5,
          focusMusicTrack: (s as any).focusMusicTrack || 'deep_focus',
          focusMusicVolume: (s as any).focusMusicVolume ?? 0.6,
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
        await db.update(settings).set(payload).where(eq(settings.id, current[0].id));
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

  setTheme: async (theme: ThemeMode) => {
    await get().updateSetting('theme', theme);
  },

  setBgMusic: async (enabled: boolean, volume?: number) => {
    await get().updateSetting('bgMusicEnabled', enabled);
    if (volume !== undefined) {
      await get().updateSetting('bgMusicVolume', volume);
    }
  },

  setFocusMusic: async (track: string, volume?: number) => {
    await get().updateSetting('focusMusicTrack', track);
    if (volume !== undefined) {
      await get().updateSetting('focusMusicVolume', volume);
    }
  },
}));
