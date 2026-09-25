import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export interface LiquidGlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  gradientColors?: readonly [string, string, ...string[]];
  sheen?: boolean;
}

const DEFAULT_GRADIENT = [
  'rgba(255, 255, 255, 0.26)',
  'rgba(255, 255, 255, 0.14)',
  'rgba(255, 255, 255, 0.08)',
] as const;

export function LiquidGlassView({
  children,
  style,
  borderRadius = 24,
  intensity = 45,
  tint = 'default',
  gradientColors = DEFAULT_GRADIENT,
  sheen = true,
}: LiquidGlassViewProps) {
  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
        },
        isWeb && ({
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        } as any),
        style,
      ]}
    >
      {/* 1. Underlying Optical Blur Layer */}
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFillObject, { borderRadius, overflow: 'hidden' }]}
      />

      {/* 2. Liquid Specular Gradient Fill */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius }]}
      />

      {/* 3. Diagonal Liquid Glass Sheen */}
      {sheen && (
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.32)',
            'rgba(255, 255, 255, 0.06)',
            'transparent',
          ]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 0.7 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius, opacity: 0.85 }]}
          pointerEvents="none"
        />
      )}

      {/* 4. Top Rim Liquid Edge Highlight */}
      <View
        style={[
          styles.topRimHighlight,
          {
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          },
        ]}
        pointerEvents="none"
      />

      {/* Child Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.65)',
    borderLeftColor: 'rgba(255, 255, 255, 0.35)',
    borderRightColor: 'rgba(255, 255, 255, 0.30)',
    borderBottomColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  topRimHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
});
