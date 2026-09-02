export const colors = {
  // ARISE — Unified Royal Sapphire Pro Design System (Apple Pro / Linear Executive Tier)

  // Signature Primary Accent: Royal Sapphire Blue
  primary: '#0A84FF',
  primaryAzure: '#0A84FF',
  primaryLight: '#389BFF',
  primaryDark: '#0066CC',
  primaryGlow: 'rgba(10, 132, 255, 0.2)',

  // Supporting Subtle / Secondary
  secondary: '#389BFF',
  primaryPurple: '#0A84FF',
  purpleLight: '#389BFF',
  purpleDark: '#0066CC',
  purpleGlow: 'rgba(10, 132, 255, 0.15)',

  // Clean Functional Accents
  success: '#10B981', // Discipline Emerald for completed checkmarks & positive streaks
  successLight: '#34D399',
  successDark: '#059669',
  green: '#10B981',
  neonGreen: '#10B981',

  tertiary: '#F59E0B', // Soft Gold for coins
  tertiaryDim: '#D97706',
  accentGold: '#F59E0B',

  // Pure True OLED Black Background
  background: '#000000',
  backgroundElevated: '#08090C',
  backgroundGradientTop: '#0B0C10',
  backgroundGradientBottom: '#000000',

  // Velvety Solid Dark Slate Charcoal Cards (Zero blur, zero transparency)
  card: '#111218',
  surface: '#000000',
  surfaceLight: '#111218',
  surfaceElevated: '#161822',
  surfaceBorder: '#1C1E2A',
  border: '#1C1E2A',
  borderGlow: 'rgba(10, 132, 255, 0.25)',

  // Crisp High-Contrast Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555866',

  // Status Colors
  accent: '#0A84FF',
  danger: '#FF453A',
  dangerGlow: 'rgba(255, 69, 58, 0.2)',
  warning: '#FF9F0A',

  // RPG Attributes
  stats: {
    strength: '#0A84FF',
    discipline: '#0A84FF',
    focus: '#389BFF',
    health: '#10B981',
    knowledge: '#389BFF',
  },

  // Modal Backdrop
  overlay: 'rgba(0, 0, 0, 0.85)',
  glassCard: '#111218',
} as const;

export type Colors = typeof colors;
