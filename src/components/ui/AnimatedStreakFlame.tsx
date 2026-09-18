import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Fire } from 'phosphor-react-native';

interface AnimatedStreakFlameProps {
  size?: number;
  color?: string;
}

export function AnimatedStreakFlame({
  size = 22,
  color = '#FF5500',
}: AnimatedStreakFlameProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.9);
  const rotation = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    // Breathing & flickering pulse
    scale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 380, easing: Easing.out(Easing.ease) }),
        withTiming(0.96, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.15, { duration: 320, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Organic flame wiggle
    rotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 340, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 380, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-2, { duration: 320, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Outer glow pulse
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 450, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 450, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 250 }),
        withTiming(0.75, { duration: 280 }),
        withTiming(0.95, { duration: 220 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.35 * opacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Outer Golden/Red Aura Halo */}
      <Animated.View
        style={[
          styles.glowHalo,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: (size * 1.6) / 2,
            backgroundColor: color,
          },
          glowStyle,
        ]}
      />

      {/* Main Animated Fire Icon */}
      <Animated.View style={animatedStyle}>
        <Fire size={size} color={color} weight="fill" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowHalo: {
    position: 'absolute',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
});
