import { create } from 'zustand';
import { db } from '../database/client';
import { settings, userProfile } from '../database/schema';
import { eq } from 'drizzle-orm';
import { ThemeMode } from '../theme/themeEngine';
import { voiceCoach, VoiceLanguage } from '../services/voiceCoach';

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
  voiceAccent: 'en-IN' | 'en-US';
  voiceLanguage: VoiceLanguage;
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
  setVoiceAccent: (accent: 'en-IN' | 'en-US') => Promise<void>;
  setVoiceLanguage: (lang: VoiceLanguage) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sfxEnabled: true,
  sfxVolume: 0.7,
  hapticsEnabled: true,
  notificationsEnabled: false,
  onboardingCompleted: false,
  dailyBudgetMinutes: 30,
  theme: 'system',
  bgMusicEnabled: false,
  bgMusicVolume: 0.5,
  focusMusicTrack: 'deep_focus',
  focusMusicVolume: 0.6,
  voiceAccent: 'en-IN',
  voiceLanguage: 'hi-IN',
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const records = await db.select().from(settings).limit(1);
      if (records.length > 0) {
        const s = records[0];
        const savedAccent = (s as any).voiceAccent === 'en-US' ? 'en-US' : 'en-IN';
        const savedLang: VoiceLanguage = (s as any).voiceLanguage || 'hi-IN';
        const validThemes: ThemeMode[] = [
          'light',
          'dark',
          'system',
          'cyber_gold',
          'neon_purple',
          'crimson_berserk',
          'emerald_hunter',
        ];
        const savedTheme: ThemeMode = validThemes.includes(s.theme as ThemeMode)
          ? (s.theme as ThemeMode)
          : 'system';

        set({
          sfxEnabled: s.sfxEnabled === 1,
          sfxVolume: s.sfxVolume,
          hapticsEnabled: s.hapticsEnabled === 1,
          notificationsEnabled: s.notificationsEnabled === 1,
          onboardingCompleted: s.onboardingCompleted === 1,
          dailyBudgetMinutes: s.dailyBudgetMinutes,
          theme: savedTheme,
          bgMusicEnabled: (s as any).bgMusicEnabled === 1,
          bgMusicVolume: (s as any).bgMusicVolume ?? 0.5,
          focusMusicTrack: (s as any).focusMusicTrack || 'deep_focus',
          focusMusicVolume: (s as any).focusMusicVolume ?? 0.6,
          voiceAccent: savedAccent,
          voiceLanguage: savedLang,
          isLoading: false,
        });

        try {
          const { setAppBudget } = require('../../modules/app-blocker');
          setAppBudget(null, s.dailyBudgetMinutes);
        } catch {}

        voiceCoach.setLanguage(savedLang);
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

      if (key === 'dailyBudgetMinutes') {
        const numVal = typeof value === 'number' ? value : parseInt(value, 10);
        const validVal = isNaN(numVal) ? 30 : Math.max(0, numVal);
        try {
          const { setAppBudget } = require('../../modules/app-blocker');
          setAppBudget(null, validVal);
        } catch {}
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
    set({ theme });
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

  setVoiceAccent: async (accent: 'en-IN' | 'en-US') => {
    set({ voiceAccent: accent });
    await get().updateSetting('voiceAccent', accent);
  },

  setVoiceLanguage: async (lang: VoiceLanguage) => {
    set({ voiceLanguage: lang });
    await voiceCoach.setLanguage(lang);
    await get().updateSetting('voiceLanguage', lang);
  },
}));
