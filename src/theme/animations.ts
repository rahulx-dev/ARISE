import { FadeIn, FadeOut, SlideInUp, SlideOutDown, ZoomIn, ZoomOut, BounceIn, withSpring, SlideInDown, SlideOutUp } from 'react-native-reanimated';

export const timing = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

export const springConfig = {
  damping: 15,
  stiffness: 150,
} as const;

export const animations = {
  fadeIn: FadeIn.duration(timing.normal),
  fadeOut: FadeOut.duration(timing.normal),
  slideUp: SlideInDown.duration(timing.normal),
  slideDown: SlideOutDown.duration(timing.normal),
  scaleIn: ZoomIn.duration(timing.normal),
  bounceIn: BounceIn.duration(timing.normal),
} as const;

export const withPremiumSpring = (toValue: number | string) => {
  'worklet';
  return withSpring(toValue as number, springConfig);
};
