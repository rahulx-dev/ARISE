import { TextStyle, Platform, Dimensions, PixelRatio } from 'react-native';
import { colors } from './colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;

export const scale = (size: number): number => {
  const scaleRatio = Math.min(Math.max(SCREEN_WIDTH / BASE_WIDTH, 0.85), 1.25);
  return Math.round(PixelRatio.roundToNearestPixel(size * scaleRatio));
};

export const fontFamilies = {
  regular: Platform.select({
    web: 'SpaceGrotesk_400Regular, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'SpaceGrotesk_400Regular',
  }),
  medium: Platform.select({
    web: 'SpaceGrotesk_500Medium, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'SpaceGrotesk_500Medium',
  }),
  semiBold: Platform.select({
    web: 'SpaceGrotesk_600SemiBold, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'SpaceGrotesk_600SemiBold',
  }),
  bold: Platform.select({
    web: 'SpaceGrotesk_700Bold, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'SpaceGrotesk_700Bold',
  }),
};

export const fontSizes = {
  xs: scale(10),
  sm: scale(12),
  md: scale(14),
  lg: scale(16),
  xl: scale(18),
  xxl: scale(22),
  h3: scale(26),
  h2: scale(32),
  h1: scale(40),
  hero: scale(56),
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

export const typography = {
  // Large Hero / Display Title
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  } as TextStyle,

  displayLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: 40,
    lineHeight: 46,
    color: colors.textPrimary,
    letterSpacing: 2,
  } as TextStyle,

  // Section & Screen Headings
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  } as TextStyle,

  h2: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  } as TextStyle,

  h3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  } as TextStyle,

  // Body Texts
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  } as TextStyle,

  bodySmall: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  } as TextStyle,

  // Captions & Overlines
  caption: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Buttons & Interactive Labels
  button: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.background,
    letterSpacing: 0.6,
  } as TextStyle,

  buttonSmall: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.background,
    letterSpacing: 0.4,
  } as TextStyle,

  // Numeric & Chronometer Displays
  numericDisplay: {
    fontFamily: fontFamilies.bold,
    fontSize: 48,
    lineHeight: 54,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  } as TextStyle,

  // XP, Level & Coin Counters
  xpLevelDisplay: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.accentGold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

export type TypographyTokens = typeof typography;
