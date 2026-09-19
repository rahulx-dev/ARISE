export type ThemeMode =
  | 'dark'
  | 'light'
  | 'system'
  | 'cyber_gold'
  | 'neon_purple'
  | 'crimson_berserk'
  | 'emerald_hunter';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  tertiary: string;

  primaryPurple: string;
  purpleGlow: string;

  background: string;
  backgroundElevated: string;
  backgroundGradientTop: string;
  backgroundGradientBottom: string;

  card: string;
  surface: string;
  surfaceLight: string;
  surfaceElevated: string;
  surfaceBorder: string;
  border: string;
  borderGlow: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentGold: string;
  accentGlow: string;
  secondary: string;
  danger: string;
  dangerGlow: string;
  warning: string;
  success: string;
  neonGreen: string;

  stats: {
    strength: string;
    discipline: string;
    focus: string;
    health: string;
    knowledge: string;
  };

  overlay: string;
  glassCard: string;
  isDark: boolean;
}

/**
 * Pure Stealth OLED Dark Theme
 * Pure. Minimal. Timeless.
 */
/**
 * Pure Stealth OLED Dark Theme
 */
export const darkThemeColors: ThemeColors = {
  primary: '#E53935',
  primaryLight: '#FF5252',
  primaryDark: '#C62828',
  primaryGlow: 'rgba(229, 57, 53, 0.25)',
  tertiary: '#F59E0B',

  primaryPurple: '#8B5CF6',
  purpleGlow: 'rgba(139, 92, 246, 0.2)',

  background: '#000000',
  backgroundElevated: '#0A0B0E',
  backgroundGradientTop: '#12131A',
  backgroundGradientBottom: '#000000',

  card: '#12131A',
  surface: '#000000',
  surfaceLight: '#161822',
  surfaceElevated: '#1A1C28',
  surfaceBorder: '#1F222E',
  border: '#1F222E',
  borderGlow: 'rgba(229, 57, 53, 0.3)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555866',

  accent: '#E53935',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.25)',
  secondary: '#FF5252',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.25)',
  warning: '#F59E0B',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#E53935',
    discipline: '#10B981',
    focus: '#0A84FF',
    health: '#F59E0B',
    knowledge: '#8B5CF6',
  },

  overlay: 'rgba(0, 0, 0, 0.85)',
  glassCard: '#12131A',
  isDark: true,
};

/**
 * Crisp Clean Light Theme (Primary Default)
 */
export const lightThemeColors: ThemeColors = {
  primary: '#E53935',
  primaryLight: '#FF5252',
  primaryDark: '#C62828',
  primaryGlow: 'rgba(229, 57, 53, 0.15)',
  tertiary: '#F59E0B',

  primaryPurple: '#8B5CF6',
  purpleGlow: 'rgba(139, 92, 246, 0.15)',

  background: '#F8F9FA',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#F0F2F5',

  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F3F4F6',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E5E7EB',
  border: '#E5E7EB',
  borderGlow: 'rgba(229, 57, 53, 0.15)',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  accent: '#E53935',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.2)',
  secondary: '#FF5252',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#E53935',
    discipline: '#10B981',
    focus: '#0A84FF',
    health: '#F59E0B',
    knowledge: '#8B5CF6',
  },

  overlay: 'rgba(0, 0, 0, 0.5)',
  glassCard: '#FFFFFF',
  isDark: false,
};

/** Solar Monarch Gold Theme (Shop Item) */
export const goldThemeColors: ThemeColors = {
  ...darkThemeColors,
  primary: '#F59E0B',
  primaryLight: '#FBBF24',
  primaryDark: '#D97706',
  primaryGlow: 'rgba(245, 158, 11, 0.25)',
  primaryPurple: '#F59E0B',
  purpleGlow: 'rgba(245, 158, 11, 0.18)',
  accent: '#F59E0B',
  borderGlow: 'rgba(245, 158, 11, 0.3)',
};

/** Shadow Sovereign Violet Theme (Shop Item) */
export const purpleThemeColors: ThemeColors = {
  ...darkThemeColors,
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#6D28D9',
  primaryGlow: 'rgba(139, 92, 246, 0.25)',
  primaryPurple: '#8B5CF6',
  purpleGlow: 'rgba(139, 92, 246, 0.2)',
  accent: '#8B5CF6',
  borderGlow: 'rgba(139, 92, 246, 0.3)',
};

/** Blood Monarch Crimson Theme (Shop Item) */
export const crimsonThemeColors: ThemeColors = {
  ...darkThemeColors,
  primary: '#FF2E54',
  primaryLight: '#FF5E7E',
  primaryDark: '#D90429',
  primaryGlow: 'rgba(255, 46, 84, 0.25)',
  primaryPurple: '#FF2E54',
  purpleGlow: 'rgba(255, 46, 84, 0.2)',
  accent: '#FF2E54',
  borderGlow: 'rgba(255, 46, 84, 0.3)',
};

/** S-Rank Hunter Emerald Theme (Shop Item) */
export const emeraldThemeColors: ThemeColors = {
  ...darkThemeColors,
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  primaryGlow: 'rgba(16, 185, 129, 0.25)',
  primaryPurple: '#10B981',
  purpleGlow: 'rgba(16, 185, 129, 0.2)',
  accent: '#10B981',
  borderGlow: 'rgba(16, 185, 129, 0.3)',
};

export function getThemeColors(mode: string = 'light', systemIsDark: boolean = false): ThemeColors {
  if (mode === 'dark') {
    return darkThemeColors;
  }
  if (mode === 'light') {
    return lightThemeColors;
  }
  if (mode === 'system') {
    return systemIsDark ? darkThemeColors : lightThemeColors;
  }
  if (mode === 'cyber_gold') {
    return goldThemeColors;
  }
  if (mode === 'neon_purple') {
    return purpleThemeColors;
  }
  if (mode === 'crimson_berserk' || mode === 'crimson_shadow') {
    return crimsonThemeColors;
  }
  if (mode === 'emerald_hunter') {
    return emeraldThemeColors;
  }
  return lightThemeColors;
}
