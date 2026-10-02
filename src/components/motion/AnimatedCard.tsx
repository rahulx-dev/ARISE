import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useScalePress } from '../../hooks/useMotion';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { motion } from '../../theme/motion';

interface AnimatedCardProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'glow' | 'accent';
  glowColor?: string;
  children: React.ReactNode;
}

const AnimatedCardBase = Animated.createAnimatedComponent(Pressable);

/**
 * Tactical & responsive interactive Card surface with iOS 18 spring physics.
 * Scale: 0.985 with snappy return to 1.
 */
export const AnimatedCard = React.memo(function AnimatedCard({
  style,
  variant = 'default',
  glowColor,
  onPress,
  children,
  disabled,
  ...props
}: AnimatedCardProps) {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const isPressable = typeof onPress === 'function' && !disabled;

  const { handlePressIn, handlePressOut, animatedStyle } = useScalePress(
    motion.scale.pressedCard
  );

  const handlePress = (e: any) => {
    if (!isPressable) return;
    haptics.light();
    onPress?.(e);
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: isDark ? '#161822' : '#FFFFFF',
          borderColor: isDark ? '#232636' : '#E5E5EA',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 8,
          elevation: 4,
        };

      case 'glow':
        return {
          backgroundColor: isDark ? '#111218' : '#FFFFFF',
          borderColor: glowColor || (isDark ? '#0A84FF' : '#007AFF'),
          shadowColor: glowColor || colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        };

      case 'accent':
        return {
          backgroundColor: isDark ? '#0D111A' : '#F0F7FF',
          borderColor: isDark ? '#1B2338' : '#D0E3FF',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 2,
        };

      default:
        return {
          backgroundColor: isDark ? '#141620' : '#FFFFFF',
          borderColor: isDark ? '#1E2130' : '#E5E7EB',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.04,
          shadowRadius: 4,
          elevation: 2,
        };
    }
  };

  return (
    <AnimatedCardBase
      {...props}
      disabled={!isPressable}
      onPressIn={isPressable ? handlePressIn : undefined}
      onPressOut={isPressable ? handlePressOut : undefined}
      onPress={isPressable ? handlePress : undefined}
      style={[
        styles.cardBase,
        getVariantStyles(),
        style,
        isPressable && animatedStyle,
      ]}
    >
      {children}
    </AnimatedCardBase>
  );
});

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
