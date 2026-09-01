import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Flame, Calendar, X, Dumbbell, Clock, CheckSquare, Coins, Sparkles } from 'lucide-react-native';
import { historyService, DayActivitySummary } from '../../services/historyService';
import { GlassCard } from '../ios/GlassCard';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';

export const StreakHeatmap = React.memo(function StreakHeatmap() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const [heatmapData, setHeatmapData] = useState<DayActivitySummary[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayActivitySummary | null>(null);

  useEffect(() => {
    loadHeatmap();
  }, []);

  const loadHeatmap = async () => {
    const data = await historyService.get12WeekHeatmapData();
    setHeatmapData(data);
  };

  // Group 84 days into 12 columns of 7 days
  const weeks: DayActivitySummary[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  const getCellColor = (intensity: number): string => {
    switch (intensity) {
      case 4:
        return colors.primary;
      case 3:
        return isDark ? 'rgba(209, 255, 0, 0.75)' : 'rgba(16, 185, 129, 0.75)';
      case 2:
        return isDark ? 'rgba(209, 255, 0, 0.45)' : 'rgba(16, 185, 129, 0.45)';
      case 1:
        return isDark ? 'rgba(209, 255, 0, 0.20)' : 'rgba(16, 185, 129, 0.20)';
      case 0:
      default:
        return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    }
  };

  const activeDaysCount = heatmapData.filter((d) => d.intensity > 0).length;

  return (
    <GlassCard variant="default" style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Flame size={16} color={colors.primary} />
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>ACTIVITY MATRIX</Text>
        </View>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          {activeDaysCount} Active Days // 12 Wks
        </Text>
      </View>

      {/* 12-Week Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
        <View style={styles.daysLabelsCol}>
          {['M', 'W', 'F', 'S'].map((label, idx) => (
            <Text key={idx} style={[styles.dayLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.weeksRow}>
          {weeks.map((week, wIdx) => (
            <View key={wIdx} style={styles.weekColumn}>
              {week.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: getCellColor(day.intensity),
                      borderColor: day.intensity > 0 ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    haptics.light();
                    setSelectedDay(day);
                  }}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Intensity Legend */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>LESS</Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[styles.legendCell, { backgroundColor: getCellColor(level) }]}
          />
        ))}
        <Text style={[styles.legendText, { color: colors.textMuted }]}>MORE</Text>
      </View>

      {/* Day Activity Details Modal */}
      <Modal visible={!!selectedDay} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard variant="elevated" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Calendar size={18} color={colors.primary} />
                <Text style={[styles.modalDateText, { color: colors.textPrimary }]}>
                  {selectedDay?.date}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <CheckSquare size={16} color={colors.primary} />
                <Text style={[styles.statVal, { color: colors.textPrimary }]}>{selectedDay?.questsCount || 0}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Quests Done</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Clock size={16} color={colors.secondary} />
                <Text style={[styles.statVal, { color: colors.textPrimary }]}>{selectedDay?.focusMinutes || 0}m</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Focus Time</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Dumbbell size={16} color={colors.danger} />
                <Text style={[styles.statVal, { color: colors.textPrimary }]}>{selectedDay?.workoutCount || 0}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Workouts</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                <Coins size={16} color={colors.accentGold} />
                <Text style={[styles.statVal, { color: colors.textPrimary }]}>+{selectedDay?.coinsEarned || 0}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Coins</Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  daysLabelsCol: {
    justifyContent: 'space-between',
    height: 84,
    paddingVertical: 2,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '800',
  },
  weeksRow: {
    flexDirection: 'row',
    gap: 4,
  },
  weekColumn: {
    gap: 4,
  },
  dayCell: {
    width: 11,
    height: 11,
    borderRadius: 2.5,
    borderWidth: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  legendText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  legendCell: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDateText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '47%',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '700',
  },
});
