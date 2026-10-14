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
  primary: '#FF453A',
  primaryLight: '#FF6961',
  primaryDark: '#D32F2F',
  primaryGlow: 'rgba(255, 69, 58, 0.25)',
  tertiary: '#F59E0B',

  primaryPurple: '#8B5CF6',
  purpleGlow: 'rgba(139, 92, 246, 0.2)',

  background: '#090A0C',
  backgroundElevated: '#111315',
  backgroundGradientTop: '#181A1E',
  backgroundGradientBottom: '#090A0C',

  card: '#111315',
  surface: '#090A0C',
  surfaceLight: '#181A1E',
  surfaceElevated: '#202328',
  surfaceBorder: '#292D33',
  border: '#292D33',
  borderGlow: 'rgba(255, 69, 58, 0.25)',

  textPrimary: '#F5F5F7',
  textSecondary: '#9A9DA5',
  textMuted: '#68707D',

  accent: '#FF453A',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.25)',
  secondary: '#FF6961',
  danger: '#FF453A',
  dangerGlow: 'rgba(255, 69, 58, 0.25)',
  warning: '#FF9F0A',
  success: '#30D158',
  neonGreen: '#30D158',

  stats: {
    strength: '#FF453A',
    discipline: '#30D158',
    focus: '#0A84FF',
    health: '#FF9F0A',
    knowledge: '#BF5AF2',
  },

  overlay: 'rgba(0, 0, 0, 0.85)',
  glassCard: '#111315',
  isDark: true,
};

export const lightThemeColors: ThemeColors = {
  primary: '#E53935',
  primaryLight: '#FF5252',
  primaryDark: '#C62828',
  primaryGlow: 'rgba(229, 57, 53, 0.15)',
  tertiary: '#F59E0B',

  primaryPurple: '#7C4DFF',
  purpleGlow: 'rgba(124, 77, 255, 0.15)',

  background: '#F6F4EF',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#EFECE4',

  card: '#FFFFFF',
  surface: '#F6F4EF',
  surfaceLight: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E8E4DC',
  border: '#E8E4DC',
  borderGlow: 'rgba(229, 57, 53, 0.15)',

  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  accent: '#E53935',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.2)',
  secondary: '#FF5252',
  danger: '#E53935',
  dangerGlow: 'rgba(229, 57, 53, 0.15)',
  warning: '#F59E0B',
  success: '#43A047',
  neonGreen: '#43A047',

  stats: {
    strength: '#E53935',
    discipline: '#43A047',
    focus: '#7C4DFF',
    health: '#F59E0B',
    knowledge: '#2563EB',
  },

  overlay: 'rgba(26, 26, 26, 0.45)',
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
