import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export type LiquidGlassVariant = 'card' | 'pill' | 'button' | 'accent-blue' | 'accent-red' | 'flat';

export interface LiquidGlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  variant?: LiquidGlassVariant;
  gradientColors?: readonly [string, string, ...string[]];
  interactive?: boolean;
}

const VARIANT_GRADIENTS: Record<LiquidGlassVariant, readonly [string, string, ...string[]]> = {
  card: [
    'rgba(22, 30, 48, 0.65)',
    'rgba(16, 24, 40, 0.58)',
    'rgba(10, 16, 30, 0.70)',
  ],
  pill: [
    'rgba(255, 255, 255, 0.18)',
    'rgba(20, 28, 45, 0.45)',
    'rgba(15, 23, 42, 0.55)',
  ],
  button: [
    'rgba(255, 255, 255, 0.22)',
    'rgba(255, 255, 255, 0.10)',
    'rgba(255, 255, 255, 0.04)',
  ],
  'accent-blue': [
    'rgba(14, 165, 233, 0.25)',
    'rgba(16, 26, 46, 0.65)',
    'rgba(10, 16, 32, 0.75)',
  ],
  'accent-red': [
    'rgba(239, 68, 68, 0.28)',
    'rgba(24, 18, 28, 0.70)',
    'rgba(15, 12, 22, 0.80)',
  ],
  flat: [
    'rgba(20, 28, 45, 0.50)',
    'rgba(15, 23, 42, 0.40)',
    'transparent',
  ],
};

export function LiquidGlassView({
  children,
  style,
  borderRadius = 24,
  intensity = 40,
  tint = 'dark',
  variant = 'card',
  gradientColors,
}: LiquidGlassViewProps) {
  const isWeb = Platform.OS === 'web';
  const activeGradient = gradientColors || VARIANT_GRADIENTS[variant];

  // Dynamic web glass styling for optical physics
  const webGlassStyle = isWeb
    ? {
        backdropFilter: 'blur(34px) saturate(185%) contrast(103%) brightness(105%)',
        WebkitBackdropFilter: 'blur(34px) saturate(185%) contrast(103%) brightness(105%)',
        boxShadow:
          variant === 'pill' || variant === 'button'
            ? '0 6px 20px -4px rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.10)'
            : '0 24px 50px -12px rgba(0, 0, 0, 0.45), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.40), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.10), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
      }
    : null;

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
        },
        webGlassStyle as any,
        style,
      ]}
    >
      {/* 1. Underlying Optical Backdrop Blur */}
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFillObject, { borderRadius, overflow: 'hidden' }]}
      />

      {/* 2. Fluid Specular Liquid Gradient (Translucent optical body) */}
      <LinearGradient
        colors={activeGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius }]}
      />

      {/* 3. Upper Curved Liquid Lensing Reflection (Simulates surface tension curvature) */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.18)',
          'rgba(255, 255, 255, 0.04)',
          'transparent',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.40 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        pointerEvents="none"
      />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 6,
  },
});
