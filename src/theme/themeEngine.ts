export type ThemeMode = 'dark' | 'light' | 'system';

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

export const darkThemeColors: ThemeColors = {
  // Signature Royal Sapphire
  primary: '#0A84FF',
  primaryLight: '#389BFF',
  primaryDark: '#0066CC',
  primaryGlow: 'rgba(10, 132, 255, 0.2)',
  tertiary: '#F59E0B',

  primaryPurple: '#0A84FF',
  purpleGlow: 'rgba(10, 132, 255, 0.15)',

  // Pure OLED Black
  background: '#000000',
  backgroundElevated: '#08090C',
  backgroundGradientTop: '#0B0C10',
  backgroundGradientBottom: '#000000',

  // Solid Slate Charcoal
  card: '#111218',
  surface: '#000000',
  surfaceLight: '#111218',
  surfaceElevated: '#161822',
  surfaceBorder: '#1C1E2A',
  border: '#1C1E2A',
  borderGlow: 'rgba(10, 132, 255, 0.25)',

  // Crisp High Contrast Typography
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

export const lightThemeColors: ThemeColors = {
  primary: '#007AFF',
  primaryLight: '#389BFF',
  primaryDark: '#0055B3',
  primaryGlow: 'rgba(0, 122, 255, 0.15)',
  tertiary: '#F59E0B',

  primaryPurple: '#007AFF',
  purpleGlow: 'rgba(0, 122, 255, 0.15)',

  background: '#F2F2F7',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#E5E5EA',

  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F2F2F7',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E5E5EA',
  border: '#E5E5EA',
  borderGlow: 'rgba(0, 122, 255, 0.2)',

  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',

  accent: '#007AFF',
  accentGold: '#D97706',
  accentGlow: 'rgba(217, 119, 6, 0.2)',
  secondary: '#007AFF',
  danger: '#DC2626',
  dangerGlow: 'rgba(220, 38, 38, 0.2)',
  warning: '#D97706',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#007AFF',
    discipline: '#007AFF',
    focus: '#007AFF',
    health: '#10B981',
    knowledge: '#0284C7',
  },

  overlay: 'rgba(0, 0, 0, 0.5)',
  glassCard: '#FFFFFF',
  isDark: false,
};

export function getThemeColors(mode: ThemeMode, systemIsDark: boolean = true): ThemeColors {
  if (mode === 'light') return lightThemeColors;
  if (mode === 'dark') return darkThemeColors;
  return systemIsDark ? darkThemeColors : lightThemeColors;
}
