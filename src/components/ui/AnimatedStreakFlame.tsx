import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { Fire } from 'phosphor-react-native';
import { APP_ANIMATIONS } from '../../constants/assets';

export interface AnimatedStreakFlameProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  loop?: boolean;
  autoPlay?: boolean;
}

export function AnimatedStreakFlame({
  size = 22,
  color = '#FF5500',
  style,
  loop = true,
  autoPlay = true,
}: AnimatedStreakFlameProps) {
  const [hasError, setHasError] = useState(false);

  // If Lottie fails to load or runs on an unsupported target, fallback smoothly to Phosphor Fire icon
  if (hasError) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size },
          style,
        ]}
      >
        <Fire size={size} color={color} weight="fill" />
      </View>
    );
  }

  // The Lottie fire asset (assets/Animations/strick.json) has a natural bounding frame.
  // Rendering with 1.35x width/height inside a centered container of exact (size x size)
  // makes the flame fill badges and headers vibrantly without expanding container dimensions.
  const lottieDimension = Math.round(size * 1.35);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <LottieView
        source={APP_ANIMATIONS.streak}
        autoPlay={autoPlay}
        loop={loop}
        resizeMode="contain"
        onAnimationFailure={() => setHasError(true)}
        style={{
          width: lottieDimension,
          height: lottieDimension,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});

export default AnimatedStreakFlame;
