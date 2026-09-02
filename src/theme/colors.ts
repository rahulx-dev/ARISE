export const colors = {
  // Master ARISE v2 "Kinetic Glass" Stitch Specification Palette
  primary: '#CCFF00',          // Primary Electric Lime (Stitch SSOT: #C3F400 / #CCFF00)
  primaryLime: '#C3F400',
  primaryLight: '#D6FF33',
  primaryGlow: 'rgba(204, 255, 0, 0.45)',
  primaryDark: '#283500',
  tertiary: '#FFDDB8',         // Amber Reward (Stitch SSOT)
  tertiaryDim: '#FFB95F',

  primaryPurple: '#6F00BE',    // Secondary Deep Focus Purple (Stitch SSOT)
  secondary: '#DDB7FF',        // Focus Light Purple
  purpleGlow: 'rgba(111, 0, 190, 0.45)',

  background: '#051424',       // Obsidian Void (Stitch SSOT: #051424 / #0A0A0A)
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

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#D4E4FA',
  textMuted: '#C4C9AC',

  // Status & Accents
  accent: '#CCFF00',
  accentGold: '#FFB95F',
  accentGlow: 'rgba(255, 185, 95, 0.35)',
  danger: '#FFB4AB',
  dangerGlow: 'rgba(255, 180, 171, 0.4)',
  warning: '#FFDDB8',
  success: '#CCFF00',
  neonGreen: '#CCFF00',

  // RPG Attributes
  stats: {
    strength: '#FF453A',
    discipline: '#CCFF00',
    focus: '#DDB7FF',
    health: '#FF3B30',
    knowledge: '#FFB95F',
  },

  // Frosted & Overlay
  overlay: 'rgba(5, 20, 36, 0.92)',
  glassCard: 'rgba(39, 54, 71, 0.4)',
} as const;

export type Colors = typeof colors;
