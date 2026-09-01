import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Flame, Brain, CheckCircle2 } from 'lucide-react-native';

interface ActivityRingsProps {
  workoutProgress: number; // 0 to 100
  focusProgress: number;   // 0 to 100
  questProgress: number;   // 0 to 100
  size?: number;
}

/**
 * Authentic Apple Fitness Style 3-Concentric Activity Rings
 * - Red Ring (Outer): Workout & Physical Power
 * - Neon/Green Ring (Middle): Focus & Mind Discipline
 * - Cyan/Blue Ring (Inner): Quests & Daily Tasks
 */
export function IOSActivityRings({
  workoutProgress = 65,
  focusProgress = 80,
  questProgress = 50,
  size = 140,
}: ActivityRingsProps) {
  const strokeWidth = 11;
  const gap = 3;

  const center = size / 2;

  // Outer Ring (Red - Move / Workout)
  const r1 = center - strokeWidth / 2 - 2;
  const c1 = 2 * Math.PI * r1;
  const pct1 = Math.min(100, Math.max(0, workoutProgress)) / 100;
  const offset1 = c1 * (1 - pct1);

  // Middle Ring (Green / Neon - Exercise / Focus)
  const r2 = r1 - strokeWidth - gap;
  const c2 = 2 * Math.PI * r2;
  const pct2 = Math.min(100, Math.max(0, focusProgress)) / 100;
  const offset2 = c2 * (1 - pct2);

  // Inner Ring (Cyan / Blue - Quests / Tasks)
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
              stroke="rgba(255, 69, 58, 0.2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r2}
              stroke="rgba(48, 209, 88, 0.2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={r3}
              stroke="rgba(10, 132, 255, 0.2)"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Active Rings */}
            <Circle
              cx={center}
              cy={center}
              r={r1}
              stroke="#FF453A"
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
              stroke="#30D158"
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
              stroke="#0A84FF"
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
        {/* Move / Workout */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF453A' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.legendLabel}>WORKOUT</Text>
            <Text style={[styles.legendVal, { color: '#FF453A' }]}>
              {Math.round(workoutProgress)}%
            </Text>
          </View>
        </View>

        {/* Focus */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.legendLabel}>FOCUS</Text>
            <Text style={[styles.legendVal, { color: '#30D158' }]}>
              {Math.round(focusProgress)}%
            </Text>
          </View>
        </View>

        {/* Quests */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0A84FF' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.legendLabel}>QUESTS</Text>
            <Text style={[styles.legendVal, { color: '#0A84FF' }]}>
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
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  legendVal: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
