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
export const darkThemeColors: ThemeColors = {
  primary: '#0A84FF',
  primaryLight: '#389BFF',
  primaryDark: '#0066CC',
  primaryGlow: 'rgba(10, 132, 255, 0.2)',
  tertiary: '#F59E0B',

  primaryPurple: '#0A84FF',
  purpleGlow: 'rgba(10, 132, 255, 0.15)',

  background: '#000000',
  backgroundElevated: '#08090C',
  backgroundGradientTop: '#0B0C10',
  backgroundGradientBottom: '#000000',

  card: '#111218',
  surface: '#000000',
  surfaceLight: '#111218',
  surfaceElevated: '#161822',
  surfaceBorder: '#1C1E2A',
  border: '#1C1E2A',
  borderGlow: 'rgba(10, 132, 255, 0.25)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555866',

  accent: '#0A84FF',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.2)',
  secondary: '#389BFF',
  danger: '#FF453A',
  dangerGlow: 'rgba(255, 69, 58, 0.2)',
  warning: '#FF9F0A',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#0A84FF',
    discipline: '#0A84FF',
    focus: '#389BFF',
    health: '#10B981',
    knowledge: '#389BFF',
  },

  overlay: 'rgba(0, 0, 0, 0.85)',
  glassCard: '#111218',
  isDark: true,
};

/**
 * Crisp Apple Light Theme
 * Light. Clear. Fresh.
 */
export const lightThemeColors: ThemeColors = {
  primary: '#0A84FF',
  primaryLight: '#389BFF',
  primaryDark: '#0066CC',
  primaryGlow: 'rgba(10, 132, 255, 0.15)',
  tertiary: '#F59E0B',

  primaryPurple: '#0A84FF',
  purpleGlow: 'rgba(10, 132, 255, 0.15)',

  background: '#F2F2F7',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#E5E5EA',

  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F8F9FA',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E5E5EA',
  border: '#E5E5EA',
  borderGlow: 'rgba(10, 132, 255, 0.2)',

  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',

  accent: '#0A84FF',
  accentGold: '#D97706',
  accentGlow: 'rgba(217, 119, 6, 0.2)',
  secondary: '#389BFF',
  danger: '#DC2626',
  dangerGlow: 'rgba(220, 38, 38, 0.2)',
  warning: '#D97706',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#0A84FF',
    discipline: '#0A84FF',
    focus: '#389BFF',
    health: '#10B981',
    knowledge: '#0284C7',
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

export function getThemeColors(mode: string = 'dark', systemIsDark: boolean = true): ThemeColors {
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
  return darkThemeColors;
}
