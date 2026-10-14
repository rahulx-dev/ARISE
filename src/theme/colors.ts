export const colors = {
  // ARISE — Unified 1:1 Neumorphic Design System (Light Warm Off-White)

  // Signature Primary Accent: Lock Screen Red
  primary: '#E53935',
  primaryAzure: '#E53935',
  primaryLight: '#FF5252',
  primaryDark: '#C62828',
  primaryGlow: 'rgba(229, 57, 53, 0.15)',

  // Supporting Subtle / Secondary
  secondary: '#FF5252',
  primaryPurple: '#7C4DFF',
  purpleLight: '#9E77FF',
  purpleDark: '#5E35B1',
  purpleGlow: 'rgba(124, 77, 255, 0.15)',

  // Clean Functional Accents
  success: '#43A047',
  successLight: '#66BB6A',
  successDark: '#2E7D32',
  green: '#43A047',
  neonGreen: '#43A047',

  tertiary: '#F59E0B', // Amber / Gold
  tertiaryDim: '#D97706',
  accentGold: '#F59E0B',

  // Canvas & Background (Light Warm Off-White)
  background: '#F6F4EF',
  backgroundElevated: '#FFFFFF',
  backgroundGradientTop: '#FFFFFF',
  backgroundGradientBottom: '#EFECE4',

  // Pure White Cards & Neumorphic Surfaces
  card: '#FFFFFF',
  surface: '#F6F4EF',
  surfaceLight: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E8E4DC',
  border: '#E8E4DC',
  borderGlow: 'rgba(229, 57, 53, 0.15)',

  // Crisp High-Contrast Typography
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Status Colors
  accent: '#E53935',
  danger: '#E53935',
  dangerGlow: 'rgba(229, 57, 53, 0.18)',
  warning: '#F59E0B',

  // RPG Attributes
  stats: {
    strength: '#E53935',
    discipline: '#43A047',
    focus: '#7C4DFF',
    health: '#F59E0B',
    knowledge: '#2563EB',
  },

  // Modal Backdrop & Overlays
  overlay: 'rgba(26, 26, 26, 0.45)',
  glassCard: '#FFFFFF',
} as const;

export type Colors = typeof colors;
