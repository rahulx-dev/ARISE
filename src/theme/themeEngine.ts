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
  // Signature Primary: Royal Sapphire Azure
  primary: '#0A84FF',
  primaryLight: '#389BFF',
  primaryDark: '#0066CC',
  primaryGlow: 'rgba(10, 132, 255, 0.2)',
  tertiary: '#F59E0B',

  // Secondary Accent: Deep Iris / Slate Violet
  primaryPurple: '#6366F1',
  purpleGlow: 'rgba(99, 102, 241, 0.2)',

  // Pure True OLED Black Backgrounds
  background: '#000000',
  backgroundElevated: '#0A0A0D',
  backgroundGradientTop: '#0C0C10',
  backgroundGradientBottom: '#000000',

  // Solid Velvety Charcoal Zinc Cards
  card: '#121216',
  surface: '#000000',
  surfaceLight: '#121216',
  surfaceElevated: '#17171D',
  surfaceBorder: '#1F1F27',
  border: '#1F1F27',
  borderGlow: 'rgba(10, 132, 255, 0.25)',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#636366',

  // Supporting Functional Accents
  accent: '#0A84FF',
  accentGold: '#F59E0B',
  accentGlow: 'rgba(245, 158, 11, 0.2)',
  secondary: '#6366F1',
  danger: '#FF453A',
  dangerGlow: 'rgba(255, 69, 58, 0.2)',
  warning: '#FF9F0A',
  success: '#10B981', // Functional Emerald Green
  neonGreen: '#10B981',

  stats: {
    strength: '#FF453A',
    discipline: '#0A84FF',
    focus: '#6366F1',
    health: '#10B981',
    knowledge: '#38BDF8',
  },

  overlay: 'rgba(0, 0, 0, 0.8)',
  glassCard: '#121216',
  isDark: true,
};

export const lightThemeColors: ThemeColors = {
  // Signature Primary: Royal Sapphire Azure
  primary: '#007AFF',
  primaryLight: '#389BFF',
  primaryDark: '#0055B3',
  primaryGlow: 'rgba(0, 122, 255, 0.15)',
  tertiary: '#F59E0B',

  // Secondary: Iris
  primaryPurple: '#6366F1',
  purpleGlow: 'rgba(99, 102, 241, 0.15)',

  // Apple Light Gray
  background: '#F2F2F7',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#E5E5EA',

  // Solid White Cards
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F2F2F7',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E5E5EA',
  border: '#E5E5EA',
  borderGlow: 'rgba(0, 122, 255, 0.2)',

  // Typography
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',

  accent: '#007AFF',
  accentGold: '#D97706',
  accentGlow: 'rgba(217, 119, 6, 0.2)',
  secondary: '#6366F1',
  danger: '#DC2626',
  dangerGlow: 'rgba(220, 38, 38, 0.2)',
  warning: '#D97706',
  success: '#10B981',
  neonGreen: '#10B981',

  stats: {
    strength: '#DC2626',
    discipline: '#007AFF',
    focus: '#6366F1',
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
