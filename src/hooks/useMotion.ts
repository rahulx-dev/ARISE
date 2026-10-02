import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { motion } from '../theme/motion';
import { useHaptics } from './useHaptics';

/**
 * Hook providing tactile iOS-grade press scale feedback on the UI thread.
 */
export function useScalePress(pressedScale: number = motion.scale.pressedButton) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withTiming(pressedScale, { duration: motion.timing.press });
  }, [pressedScale, scale]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, motion.spring.snappy);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    scale,
    handlePressIn,
    handlePressOut,
    animatedStyle,
  };
}

/**
 * Hook providing locked state subtle horizontal shake feedback (Section 12).
 * Very short, low amplitude (~6px), settles cleanly.
 */
export function useShake(amplitude: number = motion.shake.amplitude) {
  const shakeX = useSharedValue(0);
  const haptics = useHaptics();

  const triggerShake = useCallback(() => {
    haptics.warning();
    shakeX.value = withSequence(
      withTiming(amplitude, { duration: motion.shake.duration }),
      withTiming(-amplitude, { duration: motion.shake.duration }),
      withTiming(amplitude * 0.5, { duration: motion.shake.duration }),
      withTiming(-amplitude * 0.5, { duration: motion.shake.duration }),
      withTiming(0, { duration: motion.shake.duration })
    );
  }, [amplitude, haptics, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return {
    shakeX,
    triggerShake,
    animatedStyle,
  };
}

/**
 * Hook providing smooth number count-up transitions for Coins & Mana Crystals (Section 10).
 */
export function useCountUp(
  targetValue: number,
  onStep?: (currentVal: number) => void
) {
  const animValue = useSharedValue(targetValue);

  useEffect(() => {
    cancelAnimation(animValue);
    animValue.value = withTiming(
      targetValue,
      { duration: motion.timing.countUp },
      (finished) => {
        if (finished && onStep) {
          runOnJS(onStep)(targetValue);
        }
      }
    );

    return () => {
      cancelAnimation(animValue);
    };
  }, [targetValue, animValue, onStep]);

  return animValue;
}

/**
 * Hook for natural spring-based progress bar fill (XP / goals).
 */
export function useProgressSpring(progressRatio: number) {
  const progress = useSharedValue(Math.max(0, Math.min(1, progressRatio)));

  useEffect(() => {
    progress.value = withSpring(Math.max(0, Math.min(1, progressRatio)), motion.spring.soft);
    return () => {
      cancelAnimation(progress);
    };
  }, [progressRatio, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return { progress, animatedStyle };
}
