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
  primary: '#CCFF00',          // Electric Lime (Stitch SSOT: #C3F400 / #CCFF00)
  primaryLime: '#C3F400',
  primaryLight: '#D6FF33',
  primaryGlow: 'rgba(204, 255, 0, 0.45)',
  primaryDark: '#283500',
  tertiary: '#FFDDB8',         // Amber Reward (Stitch SSOT)

  primaryPurple: '#6F00BE',    // Deep Focus Purple (Stitch SSOT)
  purpleGlow: 'rgba(111, 0, 190, 0.45)',

  background: '#051424',       // Obsidian Void (Stitch SSOT)
  backgroundElevated: '#0D1C2D',
  backgroundGradientTop: '#122131',
  backgroundGradientBottom: '#051424',

  card: '#122131',             // Glass Surface Container
  surface: '#051424',
  surfaceLight: '#0D1C2D',
  surfaceElevated: '#1C2B3C',
  surfaceBorder: 'rgba(255, 255, 255, 0.1)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderGlow: 'rgba(195, 244, 0, 0.35)',

  textPrimary: '#FFFFFF',
  textSecondary: '#D4E4FA',
  textMuted: '#C4C9AC',

  accent: '#CCFF00',
  accentGold: '#FFB95F',
  accentGlow: 'rgba(255, 185, 95, 0.35)',
  secondary: '#DDB7FF',        // Focus Light Purple
  danger: '#FFB4AB',
  dangerGlow: 'rgba(255, 180, 171, 0.4)',
  warning: '#FFDDB8',
  success: '#CCFF00',
  neonGreen: '#CCFF00',

  stats: {
    strength: '#FF453A',
    discipline: '#CCFF00',
    focus: '#DDB7FF',
    health: '#FF3B30',
    knowledge: '#FFB95F',
  },

  overlay: 'rgba(5, 20, 36, 0.92)',
  glassCard: 'rgba(39, 54, 71, 0.4)',
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
