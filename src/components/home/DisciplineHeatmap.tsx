import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Fire, Brain, Barbell, Sparkle, Coins, Lightning, Calendar } from 'phosphor-react-native';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../ios/GlassCard';
import { ARISEBottomSheet } from '../ui/ARISEModal';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { historyService, DayActivitySummary } from '../../services/historyService';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * Stitch v2 14-Day Discipline Heatmap with Real SQLite Activity Data & BottomSheet Details
 */
export const DisciplineHeatmap = React.memo(function DisciplineHeatmap() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const profile = usePlayerStore((s) => s.profile);
  const streak = profile?.currentStreak || 0;

  const [heatmapDays, setHeatmapDays] = useState<DayActivitySummary[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayActivitySummary | null>(null);

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => {
    loadRealActivity();
  }, [profile]);

  const loadRealActivity = async () => {
    try {
      const allDays = await historyService.get12WeekHeatmapData();
      // Take the last 14 days for the 2-week view
      const last14 = allDays.slice(-14);
      setHeatmapDays(last14);
    } catch (e) {
      console.warn('Failed to load heatmap data:', e);
    }
  };

  const todayDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  const getBlockColor = (intensity: number) => {
    if (intensity === 0) {
      return isDark ? '#1C1E27' : '#F3F4F6';
    }
    if (intensity === 1) {
      return isDark ? '#064E3B' : '#A7F3D0';
    }
    if (intensity === 2) {
      return isDark ? '#047857' : '#6EE7B7';
    }
    if (intensity === 3) {
      return isDark ? '#059669' : '#34D399';
    }
    return '#10B981';
  };

  const getTextColor = (intensity: number) => {
    if (intensity >= 2) return '#FFFFFF';
    return isDark ? colors.textPrimary : colors.textPrimary;
  };

  const week1 = heatmapDays.slice(0, 7);
  const week2 = heatmapDays.slice(7, 14);

  const handleDayPress = (day: DayActivitySummary) => {
    haptics.light();
    setSelectedDay(day);
  };

  return (
    <GlassCard variant="default" style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{streak} Day Streak</Text>
        <Fire size={20} color={colors.primary} weight="fill" />
      </View>

      <View style={styles.gridContainer}>
        {/* Days of week header */}
        <View style={styles.daysRow}>
          {daysOfWeek.map((day, idx) => (
            <Text key={idx} style={[styles.dayLabel, { color: colors.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Week 1 (Past) */}
        <View style={styles.blocksRow}>
          {week1.map((item, idx) => {
            const count = item.questsCount + item.workoutCount + (item.focusMinutes > 0 ? 1 : 0);
            return (
              <TouchableOpacity
                key={`w1-${idx}`}
                onPress={() => handleDayPress(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.block,
                    { backgroundColor: getBlockColor(item.intensity) },
                    item.intensity === 4 && styles.blockGlow,
                  ]}
                >
                  {count > 0 && (
                    <Text style={[styles.blockNum, { color: getTextColor(item.intensity) }]}>
                      {count}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Week 2 (Current) */}
        <View style={styles.blocksRow}>
          {week2.map((item, idx) => {
            const count = item.questsCount + item.workoutCount + (item.focusMinutes > 0 ? 1 : 0);
            const isToday = idx === todayDayIndex;

            return (
              <TouchableOpacity
                key={`w2-${idx}`}
                onPress={() => handleDayPress(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.block,
                    { backgroundColor: getBlockColor(item.intensity) },
                    item.intensity === 4 && styles.blockGlow,
                    isToday && {
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  {count > 0 && (
                    <Text style={[styles.blockNum, { color: getTextColor(item.intensity) }]}>
                      {count}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Day Details Bottom Sheet */}
      {selectedDay && (
        <ARISEBottomSheet
          visible={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          title="Daily Protocol Breakdown"
          subtitle={new Date(selectedDay.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          icon={<Calendar size={20} color={colors.primary} />}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetGrid}>
              {/* Focus Minutes */}
              <GlassCard variant="default" style={styles.sheetStatItem}>
                <Brain size={18} color={colors.secondary} weight="duotone" />
                <Text style={[styles.sheetStatVal, { color: colors.textPrimary }]}>
                  {selectedDay.focusMinutes}m
                </Text>
                <Text style={[styles.sheetStatLabel, { color: colors.textMuted }]}>
                  FOCUS TIME
                </Text>
              </GlassCard>

              {/* Workouts */}
              <GlassCard variant="default" style={styles.sheetStatItem}>
                <Barbell size={18} color={colors.primary} weight="duotone" />
                <Text style={[styles.sheetStatVal, { color: colors.primary }]}>
                  {selectedDay.workoutCount}
                </Text>
                <Text style={[styles.sheetStatLabel, { color: colors.textMuted }]}>
                  WORKOUTS
                </Text>
              </GlassCard>

              {/* Quests */}
              <GlassCard variant="default" style={styles.sheetStatItem}>
                <Sparkle size={18} color={colors.accentGold} weight="fill" />
                <Text style={[styles.sheetStatVal, { color: colors.textPrimary }]}>
                  {selectedDay.questsCount}
                </Text>
                <Text style={[styles.sheetStatLabel, { color: colors.textMuted }]}>
                  QUESTS
                </Text>
              </GlassCard>

              {/* XP & Coins */}
              <GlassCard variant="default" style={styles.sheetStatItem}>
                <Coins size={18} color={colors.secondary} weight="fill" />
                <Text style={[styles.sheetStatVal, { color: colors.secondary }]}>
                  +{selectedDay.coinsEarned}
                </Text>
                <Text style={[styles.sheetStatLabel, { color: colors.textMuted }]}>
                  COINS EARNED
                </Text>
              </GlassCard>
            </View>

            <View style={[styles.totalXpBanner, { backgroundColor: isDark ? 'rgba(204, 255, 0, 0.08)' : 'rgba(16, 185, 129, 0.08)', borderColor: colors.primary }]}>
              <Lightning size={18} color={colors.primary} weight="fill" />
              <Text style={[styles.totalXpText, { color: colors.textPrimary }]}>
                Total XP Earned: <Text style={{ color: colors.primary, fontWeight: '900' }}>+{selectedDay.xpEarned} XP</Text>
              </Text>
            </View>
          </View>
        </ARISEBottomSheet>
      )}
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  gridContainer: {
    gap: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    width: 34,
    textAlign: 'center',
  },
  blocksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  block: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockGlow: {
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  blockNum: {
    fontSize: 11,
    fontWeight: '800',
  },
  sheetContent: {
    paddingVertical: 8,
    gap: 14,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetStatItem: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  sheetStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  totalXpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  totalXpText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
