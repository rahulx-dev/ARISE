import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const responsive = <T,>(small: T, normal: T, large: T): T => {
  if (SCREEN_WIDTH < 360) return small;
  if (SCREEN_WIDTH < 410) return normal;
  return large;
};
