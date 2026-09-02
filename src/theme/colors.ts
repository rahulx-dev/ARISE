export const colors = {
  // ARISE v2 Modern Solid Palette (Black + Orange + Purple + Supporting Green)
  
  // Main Accent: Vibrant Energy Orange
  primary: '#FF5500',
  primaryOrange: '#FF5500',
  primaryLight: '#FF7733',
  primaryDark: '#CC4400',
  primaryGlow: 'rgba(255, 85, 0, 0.25)',

  // Secondary Accent: Deep Focus Purple / Violet
  secondary: '#8B5CF6',
  primaryPurple: '#7C3AED',
  purpleLight: '#A78BFA',
  purpleDark: '#5B21B6',
  purpleGlow: 'rgba(124, 58, 237, 0.25)',

  // Supporting Accent: Discipline Green (For success, completed, streaks, PRs)
  success: '#10B981',
  successLight: '#34D399',
  successDark: '#059669',
  green: '#10B981',
  neonGreen: '#10B981',

  // Amber Reward
  tertiary: '#F59E0B',
  tertiaryDim: '#D97706',
  accentGold: '#F59E0B',

  // Deep Solid Dark Backgrounds
  background: '#090A0F',
  backgroundElevated: '#111218',
  backgroundGradientTop: '#111218',
  backgroundGradientBottom: '#090A0F',

  // Solid Cards & Surfaces (No blur, no translucency)
  card: '#14151C',
  surface: '#090A0F',
  surfaceLight: '#14151C',
  surfaceElevated: '#1C1E27',
  surfaceBorder: '#232532',
  border: '#232532',
  borderGlow: 'rgba(255, 85, 0, 0.3)',

  // Clean Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Status Colors
  accent: '#FF5500',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.25)',
  warning: '#F59E0B',

  // RPG Attributes
  stats: {
    strength: '#EF4444',
    discipline: '#FF5500',
    focus: '#8B5CF6',
    health: '#10B981',
    knowledge: '#38BDF8',
  },

  // Modal Backdrop
  overlay: 'rgba(0, 0, 0, 0.75)',
  glassCard: '#14151C',
} as const;

export type Colors = typeof colors;
