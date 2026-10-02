import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useScalePress } from '../../hooks/useMotion';
import { useHaptics } from '../../hooks/useHaptics';
import { motion } from '../../theme/motion';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTarget?: number;
  scaleTo?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  children: React.ReactNode;
}

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

/**
 * Apple-grade Tactile Pressable with Reanimated UI-thread scale and haptics.
 * Default scale: 0.96 (snappy spring return).
 */
export const AnimatedPressable = React.memo(function AnimatedPressable({
  style,
  scaleTarget,
  scaleTo,
  hapticFeedback = 'light',
  onPress,
  children,
  disabled,
  ...props
}: AnimatedPressableProps) {
  const target = scaleTo ?? scaleTarget ?? motion.scale.pressedButton;
  const { handlePressIn, handlePressOut, animatedStyle } = useScalePress(target);
  const haptics = useHaptics();

  const handlePress = (e: any) => {
    if (disabled) return;
    if (hapticFeedback === 'light') haptics.light();
    else if (hapticFeedback === 'medium') haptics.medium();
    else if (hapticFeedback === 'heavy') haptics.heavy();
    onPress?.(e);
  };

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
});
