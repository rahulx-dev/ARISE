/**
 * ARISE — Player Stats Bar Component
 * 
 * Displays the 5 player stats as horizontal bars with labels and values.
 * Strength (red), Discipline (purple), Focus (blue), Health (green), Knowledge (amber)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const STAT_COLORS: Record<string, string> = {
  strength: '#EF4444',
  discipline: '#8B5CF6',
  focus: '#3B82F6',
  health: '#10B981',
  knowledge: '#F59E0B',
};

const STAT_LABELS: Record<string, string> = {
  strength: 'STR',
  discipline: 'DSC',
  focus: 'FOC',
  health: 'HLT',
  knowledge: 'KNW',
};

const STAT_ICONS: Record<string, string> = {
  strength: '⚔️',
  discipline: '🛡️',
  focus: '🎯',
  health: '❤️',
  knowledge: '📚',
};

interface StatBarProps {
  name: string;
  value: number;
  maxValue?: number;
  compact?: boolean;
}

function StatBar({ name, value, maxValue = 100, compact = false }: StatBarProps) {
  const progress = useSharedValue(0);
  const color = STAT_COLORS[name] || '#00F0FF';
  const label = STAT_LABELS[name] || name.toUpperCase();
  const icon = STAT_ICONS[name] || '📊';

  useEffect(() => {
    progress.value = withTiming(Math.min(value / maxValue, 1), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, maxValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  return (
    <View style={[styles.statRow, compact && styles.statRowCompact]}>
      <View style={styles.statLabelRow}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statLabel, { color }]}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: color },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

interface PlayerStatsProps {
  strength: number;
  discipline: number;
  focus: number;
  health: number;
  knowledge: number;
  compact?: boolean;
}

export function PlayerStats({
  strength,
  discipline,
  focus,
  health,
  knowledge,
  compact = false,
}: PlayerStatsProps) {
  const stats = [
    { name: 'strength', value: strength },
    { name: 'discipline', value: discipline },
    { name: 'focus', value: focus },
    { name: 'health', value: health },
    { name: 'knowledge', value: knowledge },
  ];

  // Find max value for scaling
  const maxVal = Math.max(
    ...stats.map((s) => s.value),
    10 // minimum scale
  );

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <StatBar
          key={stat.name}
          name={stat.name}
          value={stat.value}
          maxValue={maxVal}
          compact={compact}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  statRow: {
    gap: 4,
  },
  statRowCompact: {
    gap: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    flex: 1,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F9FAFB',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
});
