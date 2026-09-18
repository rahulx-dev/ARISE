import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { Sparkle } from 'phosphor-react-native';
import { useTheme } from '../../hooks/useTheme';

interface HoloLoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'small' | 'medium' | 'large';
}

export function HoloLoader({
  message = 'SYSTEM CALIBRATING',
  subMessage = 'ESTABLISHING PROTOCOL LINK...',
  size = 'medium',
}: HoloLoaderProps) {
  const { colors, isDark } = useTheme();

  const outerRotation = useSharedValue(0);
  const innerRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    // 1. Smooth infinite clockwise rotation for outer cyber ring
    outerRotation.value = withRepeat(
      withTiming(360, { duration: 3200, easing: Easing.linear }),
      -1,
      false
    );

    // 2. Faster counter-clockwise rotation for inner glyph ring
    innerRotation.value = withRepeat(
      withTiming(-360, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );

    // 3. Rhythmic breathing aura scale
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 4. Glowing luminance pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedOuterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerRotation.value}deg` }],
  }));

  const animatedInnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerRotation.value}deg` }],
  }));

  const animatedCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

  const dimension = size === 'small' ? 70 : size === 'large' ? 140 : 100;
  const strokeW = size === 'small' ? 1.5 : 2;

  const cyanAccent = '#00F2FE';
  const sapphireAccent = '#0A84FF';

  return (
    <View style={styles.wrapper}>
      {/* Anime Holographic Rings Container */}
      <View style={{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer Glow Halo */}
        <Animated.View
          style={[
            styles.glowHalo,
            {
              width: dimension * 0.9,
              height: dimension * 0.9,
              borderRadius: dimension,
              backgroundColor: isDark ? 'rgba(0, 242, 254, 0.15)' : 'rgba(10, 132, 255, 0.12)',
            },
            animatedCoreStyle,
          ]}
        />

        {/* Outer Cyber Glyph Ring (Clockwise) */}
        <Animated.View style={[{ position: 'absolute', width: dimension, height: dimension }, animatedOuterStyle]}>
          <Svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
            <Circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={(dimension / 2) - 4}
              stroke={cyanAccent}
              strokeWidth={strokeW}
              strokeDasharray="24 8 8 8 36 12"
              fill="none"
              opacity={0.85}
            />
            <Circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={(dimension / 2) - 8}
              stroke={sapphireAccent}
              strokeWidth={1}
              strokeDasharray="6 14"
              fill="none"
              opacity={0.5}
            />
          </Svg>
        </Animated.View>

        {/* Inner Counter-Rotating Hex Ring */}
        <Animated.View
          style={[
            { position: 'absolute', width: dimension * 0.68, height: dimension * 0.68 },
            animatedInnerStyle,
          ]}
        >
          <Svg width={dimension * 0.68} height={dimension * 0.68} viewBox="0 0 68 68">
            <Circle
              cx={34}
              cy={34}
              r={28}
              stroke={sapphireAccent}
              strokeWidth={strokeW}
              strokeDasharray="16 6 8 6"
              fill="none"
              opacity={0.9}
            />
            <Line x1={34} y1={2} x2={34} y2={8} stroke={cyanAccent} strokeWidth={2} />
            <Line x1={34} y1={60} x2={34} y2={66} stroke={cyanAccent} strokeWidth={2} />
            <Line x1={2} y1={34} x2={8} y2={34} stroke={cyanAccent} strokeWidth={2} />
            <Line x1={60} y1={34} x2={66} y2={34} stroke={cyanAccent} strokeWidth={2} />
          </Svg>
        </Animated.View>

        {/* Central Luminous Sovereign Core */}
        <Animated.View style={[styles.centerCore, animatedCoreStyle]}>
          <Sparkle size={size === 'small' ? 14 : size === 'large' ? 26 : 18} color="#00F2FE" weight="fill" />
        </Animated.View>
      </View>

      {/* Cybernetic Hologram Labels */}
      {message ? (
        <View style={styles.textBlock}>
          <View style={styles.badgeRow}>
            <Text style={styles.bracket}>[ </Text>
            <Text style={[styles.statusText, { color: isDark ? '#FFFFFF' : '#0A84FF' }]}>
              {message.toUpperCase()}
            </Text>
            <Text style={styles.bracket}> ]</Text>
          </View>
          {subMessage ? (
            <Text style={[styles.subText, { color: colors.textMuted }]}>{subMessage}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  glowHalo: {
    position: 'absolute',
  },
  centerCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bracket: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00F2FE',
    letterSpacing: 2,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 2.2,
    fontFamily: 'monospace',
  },
  subText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
});
