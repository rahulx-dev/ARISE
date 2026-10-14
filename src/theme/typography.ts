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
    ios: 'PlusJakartaSans-Regular',
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    default: 'PlusJakartaSans-Regular',
  }),
  medium: Platform.select({
    ios: 'PlusJakartaSans-Medium',
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    default: 'PlusJakartaSans-Medium',
  }),
  semiBold: Platform.select({
    ios: 'PlusJakartaSans-SemiBold',
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    default: 'PlusJakartaSans-SemiBold',
  }),
  bold: Platform.select({
    ios: 'PlusJakartaSans-Bold',
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    default: 'PlusJakartaSans-Bold',
  }),
  extraBold: Platform.select({
    ios: 'PlusJakartaSans-ExtraBold',
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    default: 'PlusJakartaSans-ExtraBold',
  }),
};

export const fontSizes = {
  xs: scale(11),
  sm: scale(13),
  md: scale(15),
  lg: scale(17),
  xl: scale(20),
  xxl: scale(24),
  h3: scale(28),
  h2: scale(32),
  h1: scale(38),
  hero: scale(52),
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
} as const;

export const typography = {
  // Large Hero / Display Title
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  } as TextStyle,

  displayLarge: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 40,
    lineHeight: 46,
    color: colors.textPrimary,
    letterSpacing: -0.8,
  } as TextStyle,

  // Section & Screen Headings
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  } as TextStyle,

  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  } as TextStyle,

  h3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: -0.1,
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
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  } as TextStyle,

  // Lock Screen Eyebrow / Overlines
  eyebrow: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,

  caption: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  // Buttons & Interactive Labels
  button: {
    fontFamily: fontFamilies.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  } as TextStyle,

  buttonSmall: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    lineHeight: 16,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  } as TextStyle,

  // Numeric & Chronometer Displays
  numericDisplay: {
    fontFamily: fontFamilies.bold,
    fontSize: 44,
    lineHeight: 50,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  } as TextStyle,

  // XP, Level & Coin Counters
  xpLevelDisplay: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  } as TextStyle,
} as const;

export type TypographyTokens = typeof typography;
