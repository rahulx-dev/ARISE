import { FadeIn, FadeOut, ZoomIn, ZoomOut, withSpring, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { motion } from './motion';

export * from './motion';

export const timing = {
  fast: motion.timing.quick,
  normal: motion.timing.screen,
  slow: 450,
} as const;

export const springConfig = motion.spring.natural;

export const animations = {
  fadeIn: FadeIn.duration(motion.timing.screen),
  fadeOut: FadeOut.duration(motion.timing.quick),
  slideUp: SlideInDown.duration(motion.timing.screen),
  slideDown: SlideOutDown.duration(motion.timing.quick),
  scaleIn: ZoomIn.duration(motion.timing.quick),
} as const;

export const withPremiumSpring = (toValue: number | string) => {
  'worklet';
  return withSpring(toValue as number, motion.spring.snappy);
};
