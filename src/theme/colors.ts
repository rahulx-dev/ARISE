export const colors = {
  // Master ARISE "Arise High-Performance RPG" Stitch Specification Palette
  primary: '#D1FF00',          // Primary Cyber Lime / Electric Volt (Stitch SSOT)
  primaryLime: '#D1FF00',
  primaryLight: '#D1FF00',
  primaryGlow: 'rgba(209, 255, 0, 0.45)',
  primaryDark: '#1F2900',
  tertiary: '#1F2900',         // Dark Olive Glow Backing

  primaryPurple: '#8A2BE2',    // Accent Neon Purple
  purpleGlow: 'rgba(138, 43, 226, 0.4)',

  background: '#050505',       // Deep Void Black (Stitch SSOT)
  backgroundElevated: '#121212',
  backgroundGradientTop: '#161616',
  backgroundGradientBottom: '#050505',

  card: '#161616',             // Carbon Card Background (Stitch SSOT)
  surface: '#161616',
  surfaceLight: '#1E1E1E',
  surfaceElevated: '#242424',
  surfaceBorder: '#262626',
  border: '#242424',
  borderGlow: 'rgba(209, 255, 0, 0.35)',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555555',

  // Status & Accents
  accent: '#D1FF00',
  accentGold: '#FFB800',
  accentGlow: 'rgba(209, 255, 0, 0.35)',
  secondary: '#00F0FF',
  danger: '#EF4444',
  dangerGlow: 'rgba(239, 68, 68, 0.4)',
  warning: '#F59E0B',
  success: '#D1FF00',
  neonGreen: '#D1FF00',

  // RPG Attributes
  stats: {
    strength: '#EF4444',
    discipline: '#D1FF00',
    focus: '#00F0FF',
    health: '#FF3B30',
    knowledge: '#FFB800',
  },

  // Frosted & Overlay
  overlay: 'rgba(5, 5, 5, 0.92)',
  glassCard: 'rgba(22, 22, 22, 0.90)',
} as const;

export type Colors = typeof colors;
