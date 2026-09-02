import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface ActivityRingsProps {
  workoutProgress: number; // 0 to 100
  focusProgress: number;   // 0 to 100
  questProgress: number;   // 0 to 100
  size?: number;
}

/**
 * Ultra-Clean Modern 3-Concentric Activity Rings
 * - Outer Ring (Titanium Azure #0A84FF): Physical Power / Workout
 * - Middle Ring (Iris #6366F1): Deep Focus & Mental Clarity
 * - Inner Ring (Emerald #10B981): Quests & Daily Discipline
 */
export function IOSActivityRings({
  workoutProgress = 65,
  focusProgress = 80,
  questProgress = 50,
  size = 136,
}: ActivityRingsProps) {
  const { colors, isDark } = useTheme();
  const strokeWidth = 11;
  const gap = 3;

  const center = size / 2;

  // Outer Ring (Azure - Workout)
  const r1 = center - strokeWidth / 2 - 2;
  const c1 = 2 * Math.PI * r1;
  const pct1 = Math.min(100, Math.max(0, workoutProgress)) / 100;
  const offset1 = c1 * (1 - pct1);

  // Middle Ring (Iris - Focus)
  const r2 = r1 - strokeWidth - gap;
  const c2 = 2 * Math.PI * r2;
  const pct2 = Math.min(100, Math.max(0, focusProgress)) / 100;
  const offset2 = c2 * (1 - pct2);

  // Inner Ring (Emerald - Quests)
  const r3 = r2 - strokeWidth - gap;
  const c3 = 2 * Math.PI * r3;
  const pct3 = Math.min(100, Math.max(0, questProgress)) / 100;
  const offset3 = c3 * (1 - pct3);

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
              stroke="rgba(99, 102, 241, 0.15)"
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

            {/* Active Rings */}
            <Circle
              cx={center}
              cy={center}
              r={r1}
              stroke="#0A84FF"
              strokeWidth={strokeWidth}
              strokeDasharray={`${c1} ${c1}`}
              strokeDashoffset={offset1}
              strokeLinecap="round"
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r2}
              stroke="#6366F1"
              strokeWidth={strokeWidth}
              strokeDasharray={`${c2} ${c2}`}
              strokeDashoffset={offset2}
              strokeLinecap="round"
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r3}
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${c3} ${c3}`}
              strokeDashoffset={offset3}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>
      </View>

      {/* Ring Metric Details (Apple Fitness Legend) */}
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
          <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>FOCUS</Text>
            <Text style={[styles.legendVal, { color: '#6366F1' }]}>
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
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  legendVal: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
