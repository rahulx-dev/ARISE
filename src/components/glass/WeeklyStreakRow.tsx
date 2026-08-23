import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface DayNode {
  dayLabel: string;
  score: number | null;
  isToday: boolean;
}

interface WeeklyStreakRowProps {
  days?: DayNode[];
}

const DEFAULT_DAYS: DayNode[] = [
  { dayLabel: 'M', score: 82, isToday: false },
  { dayLabel: 'T', score: 78, isToday: false },
  { dayLabel: 'W', score: 54, isToday: false },
  { dayLabel: 'T', score: 84, isToday: false },
  { dayLabel: 'F', score: 78, isToday: false },
  { dayLabel: 'S', score: 98, isToday: true },
  { dayLabel: 'S', score: null, isToday: false },
];

export function WeeklyStreakRow({ days = DEFAULT_DAYS }: WeeklyStreakRowProps) {
  return (
    <View style={styles.container}>
      {days.map((item, idx) => {
        const hasScore = item.score !== null;
        const isToday = item.isToday;

        return (
          <View key={idx} style={styles.nodeColumn}>
            {/* Circular Glass Node */}
            <View
              style={[
                styles.nodeCircle,
                hasScore && styles.nodeCircleFilled,
                isToday && styles.nodeCircleToday,
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  isToday && styles.scoreTextToday,
                  !hasScore && styles.scoreTextEmpty,
                ]}
              >
                {hasScore ? `${item.score}%` : '—'}
              </Text>
            </View>

            {/* Day Label (M, T, W, T, F, S, S) */}
            <Text style={[styles.dayLabelText, isToday && styles.dayLabelTextToday]}>
              {item.dayLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginVertical: 10,
  },
  nodeColumn: {
    alignItems: 'center',
    gap: 8,
  },
  nodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCircleFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  nodeCircleToday: {
    backgroundColor: '#E8E3FF',
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  scoreTextToday: {
    color: '#0B0E17',
    fontWeight: '900',
  },
  scoreTextEmpty: {
    color: colors.textMuted,
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayLabelTextToday: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
});
