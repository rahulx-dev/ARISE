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
  // Main Accent: Vibrant Orange
  primary: '#FF5500',
  primaryLight: '#FF7733',
  primaryDark: '#CC4400',
  primaryGlow: 'rgba(255, 85, 0, 0.25)',
  tertiary: '#F59E0B',

  // Secondary Accent: Deep Focus Purple
  primaryPurple: '#7C3AED',
  purpleGlow: 'rgba(124, 58, 237, 0.25)',

  // Deep Solid Dark Backgrounds
  background: '#090A0F',
  backgroundElevated: '#111218',
  backgroundGradientTop: '#111218',
  backgroundGradientBottom: '#090A0F',

  // Solid Surfaces (No blur, no transparency)
  card: '#14151C',
  surface: '#090A0F',
  surfaceLight: '#14151C',
  surfaceElevated: '#1C1E27',
  surfaceBorder: '#232532',
  border: '#232532',
  borderGlow: 'rgba(255, 85, 0, 0.3)',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Supporting Colors
  accent: '#FF5500',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.25)',
  secondary: '#8B5CF6',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.25)',
  warning: '#F59E0B',
  success: '#10B981', // Supporting Green
  neonGreen: '#10B981',

  stats: {
    strength: '#EF4444',
    discipline: '#FF5500',
    focus: '#8B5CF6',
    health: '#10B981',
    knowledge: '#38BDF8',
  },

  overlay: 'rgba(0, 0, 0, 0.75)',
  glassCard: '#14151C',
  isDark: true,
};

export const lightThemeColors: ThemeColors = {
  // Main Accent: Vibrant Orange
  primary: '#FF5500',
  primaryLight: '#FF7733',
  primaryDark: '#CC4400',
  primaryGlow: 'rgba(255, 85, 0, 0.15)',
  tertiary: '#F59E0B',

  // Secondary Accent: Deep Purple
  primaryPurple: '#7C3AED',
  purpleGlow: 'rgba(124, 58, 237, 0.15)',

  // Clean Light Backgrounds
  background: '#F8F9FA',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#F1F3F5',

  // Solid White Cards & Surfaces
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F1F3F5',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E5E7EB',
  border: '#E5E7EB',
  borderGlow: 'rgba(255, 85, 0, 0.2)',

  // Typography
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',

  accent: '#FF5500',
  accentGold: '#D97706',
  accentGlow: 'rgba(217, 119, 6, 0.2)',
  secondary: '#7C3AED',
  danger: '#DC2626',
  dangerGlow: 'rgba(220, 38, 38, 0.2)',
  warning: '#D97706',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#DC2626',
    discipline: '#FF5500',
    focus: '#7C3AED',
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
