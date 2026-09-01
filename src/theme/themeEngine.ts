export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  primary: string;
  primaryLime: string;
  primaryLight: string;
  primaryGlow: string;
  primaryDark: string;
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
  primary: '#D1FF00',
  primaryLime: '#D1FF00',
  primaryLight: '#D1FF00',
  primaryGlow: 'rgba(209, 255, 0, 0.45)',
  primaryDark: '#1F2900',
  tertiary: '#1F2900',

  primaryPurple: '#8A2BE2',
  purpleGlow: 'rgba(138, 43, 226, 0.4)',

  background: '#050505',
  backgroundElevated: '#121212',
  backgroundGradientTop: '#161616',
  backgroundGradientBottom: '#050505',

  card: '#161616',
  surface: '#161616',
  surfaceLight: '#1E1E1E',
  surfaceElevated: '#242424',
  surfaceBorder: '#262626',
  border: '#242424',
  borderGlow: 'rgba(209, 255, 0, 0.35)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555555',

  accent: '#D1FF00',
  accentGold: '#FFB800',
  accentGlow: 'rgba(209, 255, 0, 0.35)',
  secondary: '#00F0FF',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.4)',
  warning: '#F59E0B',
  success: '#D1FF00',
  neonGreen: '#D1FF00',

  stats: {
    strength: '#EF4444',
    discipline: '#D1FF00',
    focus: '#00F0FF',
    health: '#FF3B30',
    knowledge: '#FFB800',
  },

  overlay: 'rgba(5, 5, 5, 0.92)',
  glassCard: 'rgba(22, 22, 22, 0.90)',
  isDark: true,
};

export const lightThemeColors: ThemeColors = {
  primary: '#10B981', // Clean Emerald Volt with high light contrast
  primaryLime: '#84CC16',
  primaryLight: '#10B981',
  primaryGlow: 'rgba(16, 185, 129, 0.2)',
  primaryDark: '#064E3B',
  tertiary: '#ECFDF5',

  primaryPurple: '#7C3AED',
  purpleGlow: 'rgba(124, 58, 237, 0.15)',

  background: '#F2F2F7', // Apple iOS System Background
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#E5E5EA',

  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F2F2F7',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(0, 0, 0, 0.08)',
  border: 'rgba(0, 0, 0, 0.08)',
  borderGlow: 'rgba(16, 185, 129, 0.2)',

  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',

  accent: '#10B981',
  accentGold: '#D97706',
  accentGlow: 'rgba(217, 119, 6, 0.2)',
  secondary: '#0284C7',
  danger: '#DC2626',
  dangerGlow: 'rgba(220, 38, 38, 0.2)',
  warning: '#D97706',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#DC2626',
    discipline: '#10B981',
    focus: '#0284C7',
    health: '#E11D48',
    knowledge: '#D97706',
  },

  overlay: 'rgba(0, 0, 0, 0.45)',
  glassCard: 'rgba(255, 255, 255, 0.90)',
  isDark: false,
};

export function getThemeColors(mode: ThemeMode, systemIsDark: boolean = true): ThemeColors {
  if (mode === 'light') return lightThemeColors;
  if (mode === 'dark') return darkThemeColors;
  return systemIsDark ? darkThemeColors : lightThemeColors;
}
