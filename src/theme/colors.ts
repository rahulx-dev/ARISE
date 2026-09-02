export const colors = {
  // ARISE v2 Ultra-Premium "Titanium Azure" Palette (Apple iOS 18 + Linear Executive Tier)

  // Signature Primary Accent: Royal Sapphire / Titanium Azure
  primary: '#0A84FF',
  primaryAzure: '#0A84FF',
  primaryLight: '#389BFF',
  primaryDark: '#0066CC',
  primaryGlow: 'rgba(10, 132, 255, 0.2)',

  // Secondary Accent: Deep Iris / Slate Violet
  secondary: '#6366F1',
  primaryPurple: '#4F46E5',
  purpleLight: '#818CF8',
  purpleDark: '#3730A3',
  purpleGlow: 'rgba(99, 102, 241, 0.2)',

  // Supporting Functional Accent: Discipline Emerald Green (For success, streaks, completed quests)
  success: '#10B981',
  successLight: '#34D399',
  successDark: '#059669',
  green: '#10B981',
  neonGreen: '#10B981',

  // Amber Gold (For coins & store rewards)
  tertiary: '#F59E0B',
  tertiaryDim: '#D97706',
  accentGold: '#F59E0B',

  // Pure True OLED Black Backgrounds
  background: '#000000',
  backgroundElevated: '#0A0A0D',
  backgroundGradientTop: '#0C0C10',
  backgroundGradientBottom: '#000000',

  // Solid Velvety Charcoal Zinc Cards & Surfaces (Zero blur, zero transparency)
  card: '#121216',
  surface: '#000000',
  surfaceLight: '#121216',
  surfaceElevated: '#17171D',
  surfaceBorder: '#1F1F27',
  border: '#1F1F27',
  borderGlow: 'rgba(10, 132, 255, 0.25)',

  // Crisp High-Contrast Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#636366',

  // Status Colors
  accent: '#0A84FF',
  danger: '#FF453A',
  dangerGlow: 'rgba(255, 69, 58, 0.2)',
  warning: '#FF9F0A',

  // RPG Attributes
  stats: {
    strength: '#FF453A',
    discipline: '#0A84FF',
    focus: '#6366F1',
    health: '#10B981',
    knowledge: '#38BDF8',
  },

  // Modal Backdrop
  overlay: 'rgba(0, 0, 0, 0.8)',
  glassCard: '#121216',
} as const;

export type Colors = typeof colors;
