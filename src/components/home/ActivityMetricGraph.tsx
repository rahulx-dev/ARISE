import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { historyService, DayActivitySummary } from '../../services/historyService';
import { GlassCard } from '../ios/GlassCard';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';

type MetricType = 'XP' | 'Focus' | 'Workout' | 'Quests';

export const ActivityMetricGraph = React.memo(function ActivityMetricGraph() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('XP');
  const [recentDays, setRecentDays] = useState<DayActivitySummary[]>([]);

  useEffect(() => {
    loadRecentData();
  }, []);

  const loadRecentData = async () => {
    const data = await historyService.get12WeekHeatmapData();
    // Get last 7 days
    setRecentDays(data.slice(data.length - 7));
  };

  const getDayValue = (day: DayActivitySummary, metric: MetricType): number => {
    switch (metric) {
      case 'XP':
        return day.xpEarned;
      case 'Focus':
        return day.focusMinutes;
      case 'Workout':
        return day.workoutCount;
      case 'Quests':
        return day.questsCount;
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate max value for scaling
  const values = recentDays.map((d) => getDayValue(d, selectedMetric));
  const maxVal = Math.max(...values, 1);
  const totalVal = values.reduce((a, b) => a + b, 0);

  return (
    <GlassCard variant="default" style={styles.container}>
      {/* Header & Metric Switcher Tabs */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.graphTitle, { color: colors.textPrimary }]}>7-DAY TELEMETRY</Text>
          <Text style={[styles.graphSubtitle, { color: colors.textSecondary }]}>
            Total: {totalVal} {selectedMetric === 'Focus' ? 'mins' : selectedMetric}
          </Text>
        </View>

        <View style={[styles.tabsWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0,0,0,0.05)' }]}>
          {(['XP', 'Focus', 'Workout', 'Quests'] as MetricType[]).map((m) => {
            const isSelected = selectedMetric === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  haptics.light();
                  setSelectedMetric(m);
                }}
                style={[
                  styles.tabPill,
                  isSelected && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isSelected ? '#000000' : colors.textMuted },
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bar Chart Columns */}
      {totalVal === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Complete your first quest or workout today to start charting your telemetry.
          </Text>
        </View>
      ) : (
        <View style={styles.chartBarsRow}>
          {recentDays.map((day, idx) => {
            const val = getDayValue(day, selectedMetric);
            const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;

            return (
              <View key={day.date} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(val > 0 ? 15 : 0, Math.min(100, heightPercent))}%`,
                        backgroundColor: val > 0 ? colors.primary : 'transparent',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barDayLabel, { color: colors.textSecondary }]}>
                  {dayNames[day.dayOfWeek]}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  graphSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tabsWrap: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
  },
  tabPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabPillText: {
    fontSize: 9,
    fontWeight: '900',
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingTop: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barTrack: {
    width: 14,
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDayLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
});
