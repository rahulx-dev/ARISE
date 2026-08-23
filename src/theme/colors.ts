export const colors = {
  // Master ARISE Specification Palette
  primary: '#00FF6A',          // Primary Neon Green
  primaryGreen: '#00FF6A',
  primaryLight: '#00FF6A',
  primaryGlow: 'rgba(0, 255, 106, 0.4)',
  primaryDark: '#003314',

  primaryPurple: '#8A2BE2',    // Primary Neon Purple
  purpleGlow: 'rgba(138, 43, 226, 0.4)',

  background: '#0A0A0A',       // Base Background
  backgroundElevated: '#121212',
  backgroundGradientTop: '#121212',
  backgroundGradientBottom: '#0A0A0A',

  card: '#141414',             // Card Background
  surface: '#141414',
  surfaceLight: '#1A1A1A',
  surfaceElevated: '#1F1F1F',
  surfaceBorder: '#1F1F1F',
  border: '#1F1F1F',
  borderGlow: 'rgba(0, 255, 106, 0.3)',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Status & Accents
  accent: '#FFB800',
  accentGold: '#FFB800',
  accentGlow: 'rgba(255, 184, 0, 0.35)',
  secondary: '#00F0FF',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.4)',
  warning: '#F59E0B',
  success: '#00FF6A',
  neonGreen: '#00FF6A',

  // RPG Attributes
  stats: {
    strength: '#EF4444',
    discipline: '#8A2BE2',
    focus: '#00FF6A',
    health: '#00F0FF',
    knowledge: '#FFB800',
  },

  // Frosted & Overlay
  overlay: 'rgba(10, 10, 10, 0.88)',
  glassCard: 'rgba(20, 20, 20, 0.85)',
} as const;

export type Colors = typeof colors;
