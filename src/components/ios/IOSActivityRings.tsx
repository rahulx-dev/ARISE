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
 * Modern 3-Concentric Activity Rings
 * - Outer Ring (Orange #FF5500): Workout & Physical Power
 * - Middle Ring (Purple #8B5CF6): Deep Focus & Mental Clarity
 * - Inner Ring (Green #10B981): Quests & Daily Discipline
 */
export function IOSActivityRings({
  workoutProgress = 65,
  focusProgress = 80,
  questProgress = 50,
  size = 140,
}: ActivityRingsProps) {
  const { colors, isDark } = useTheme();
  const strokeWidth = 11;
  const gap = 3;

  const center = size / 2;

  // Outer Ring (Orange - Workout)
  const r1 = center - strokeWidth / 2 - 2;
  const c1 = 2 * Math.PI * r1;
  const pct1 = Math.min(100, Math.max(0, workoutProgress)) / 100;
  const offset1 = c1 * (1 - pct1);

  // Middle Ring (Purple - Focus)
  const r2 = r1 - strokeWidth - gap;
  const c2 = 2 * Math.PI * r2;
  const pct2 = Math.min(100, Math.max(0, focusProgress)) / 100;
  const offset2 = c2 * (1 - pct2);

  // Inner Ring (Green - Quests)
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
              stroke="rgba(255, 85, 0, 0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r2}
              stroke="rgba(139, 92, 246, 0.15)"
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
              stroke="#FF5500"
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
              stroke="#8B5CF6"
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
          <View style={[styles.legendDot, { backgroundColor: '#FF5500' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>WORKOUT</Text>
            <Text style={[styles.legendVal, { color: '#FF5500' }]}>
              {Math.round(workoutProgress)}%
            </Text>
          </View>
        </View>

        {/* Focus */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>FOCUS</Text>
            <Text style={[styles.legendVal, { color: '#8B5CF6' }]}>
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
    paddingVertical: 6,
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
