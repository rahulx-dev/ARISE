import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface ActivityRingsProps {
  workoutProgress: number; // 0 to 100
  focusProgress: number;   // 0 to 100
  questProgress: number;   // 0 to 100
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Ultra-Clean Animated 3-Concentric Activity Rings (Apple Fitness Pro Tier)
 * Smooth clockwise sweep animation on mount / progress change
 */
export function IOSActivityRings({
  workoutProgress = 0,
  focusProgress = 0,
  questProgress = 0,
  size = 136,
}: ActivityRingsProps) {
  const { colors } = useTheme();
  const strokeWidth = 11;
  const gap = 3;

  const center = size / 2;

  // Outer Ring (Sapphire - Workout)
  const r1 = center - strokeWidth / 2 - 2;
  const c1 = 2 * Math.PI * r1;

  // Middle Ring (Iris/Ice - Focus)
  const r2 = r1 - strokeWidth - gap;
  const c2 = 2 * Math.PI * r2;

  // Inner Ring (Emerald - Quests)
  const r3 = r2 - strokeWidth - gap;
  const c3 = 2 * Math.PI * r3;

  // Animated values (0 to 1)
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim1, {
        toValue: Math.min(100, Math.max(0, workoutProgress)) / 100,
        duration: 900,
        useNativeDriver: false,
      }),
      Animated.timing(anim2, {
        toValue: Math.min(100, Math.max(0, focusProgress)) / 100,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(anim3, {
        toValue: Math.min(100, Math.max(0, questProgress)) / 100,
        duration: 1100,
        useNativeDriver: false,
      }),
    ]).start();
  }, [workoutProgress, focusProgress, questProgress]);

  const offset1 = anim1.interpolate({
    inputRange: [0, 1],
    outputRange: [c1, 0],
  });

  const offset2 = anim2.interpolate({
    inputRange: [0, 1],
    outputRange: [c2, 0],
  });

  const offset3 = anim3.interpolate({
    inputRange: [0, 1],
    outputRange: [c3, 0],
  });

  return (
    <View style={styles.container}>
      {/* Svg Rings */}
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background Tracks */}
            <Circle
              cx={center}
              cy={center}
              r={r1}
              stroke="rgba(10, 132, 255, 0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r2}
              stroke="rgba(56, 155, 255, 0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r3}
              stroke="rgba(16, 185, 129, 0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Animated Active Rings */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={r1}
              stroke="#0A84FF"
              strokeWidth={strokeWidth}
              strokeDasharray={`${c1} ${c1}`}
              strokeDashoffset={offset1 as any}
              strokeLinecap="round"
              fill="none"
            />
            <AnimatedCircle
              cx={center}
              cy={center}
              r={r2}
              stroke="#389BFF"
              strokeWidth={strokeWidth}
              strokeDasharray={`${c2} ${c2}`}
              strokeDashoffset={offset2 as any}
              strokeLinecap="round"
              fill="none"
            />
            <AnimatedCircle
              cx={center}
              cy={center}
              r={r3}
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${c3} ${c3}`}
              strokeDashoffset={offset3 as any}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>
      </View>

      {/* Ring Metric Details */}
      <View style={styles.legendContainer}>
        {/* Workout */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0A84FF' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>WORKOUT</Text>
            <Text style={[styles.legendVal, { color: '#0A84FF' }]}>
              {Math.round(workoutProgress)}%
            </Text>
          </View>
        </View>

        {/* Focus */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#389BFF' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>FOCUS</Text>
            <Text style={[styles.legendVal, { color: '#389BFF' }]}>
              {Math.round(focusProgress)}%
            </Text>
          </View>
        </View>

        {/* Quests */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>QUESTS</Text>
            <Text style={[styles.legendVal, { color: '#10B981' }]}>
              {Math.round(questProgress)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 4,
  },
  legendContainer: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  legendVal: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
});
