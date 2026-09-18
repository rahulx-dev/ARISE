import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Dumbbell,
  Brain,
  Target,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { colors } from '../../src/theme/colors';
import { historyService } from '../../src/services/historyService';

interface TodayStats {
  focusMinutes: number;
  focusSessionsCount: number;
  workoutMinutes: number;
  workoutCount: number;
  completedQuests: number;
  totalQuests: number;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TrackingScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = formatDate(new Date());

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await historyService.getTodayRealStats();
      setStats(data);
    } catch (e) {
      console.warn('Failed to load tracking stats:', e);
      setStats({
        focusMinutes: 0,
        focusSessionsCount: 0,
        workoutMinutes: 0,
        workoutCount: 0,
        completedQuests: 0,
        totalQuests: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totalActiveMinutes = (stats?.focusMinutes ?? 0) + (stats?.workoutMinutes ?? 0);
  const questCompletion = stats && stats.totalQuests > 0
    ? Math.round((stats.completedQuests / stats.totalQuests) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tracking</Text>
        </View>

        {/* Date Display */}
        <View style={styles.dateSelectorRow}>
          <Text style={styles.dateText}>{todayStr}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Card 1: Focus Time */}
            <MasterCard style={styles.statCard}>
              <View style={styles.cardRow}>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardHeaderTitle}>Focus Time</Text>
                  <Text style={styles.cardBigNum}>
                    {formatMinutes(stats?.focusMinutes ?? 0)}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {stats?.focusSessionsCount ?? 0} session{(stats?.focusSessionsCount ?? 0) !== 1 ? 's' : ''} today
                  </Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: '#1E2230' }]}>
                  <Brain size={24} color={colors.primary} strokeWidth={2.5} />
                </View>
              </View>
            </MasterCard>

            {/* Card 2: Workout Time */}
            <MasterCard style={styles.statCard}>
              <View style={styles.cardRow}>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardHeaderTitle}>Workout Time</Text>
                  <Text style={styles.cardBigNum}>
                    {formatMinutes(stats?.workoutMinutes ?? 0)}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {stats?.workoutCount ?? 0} exercise{(stats?.workoutCount ?? 0) !== 1 ? 's' : ''} completed
                  </Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: '#2A1E1E' }]}>
                  <Dumbbell size={24} color="#E11D48" strokeWidth={2.5} />
                </View>
              </View>
            </MasterCard>

            {/* Card 3: Total Active Time */}
            <MasterCard style={styles.statCard}>
              <View style={styles.cardRow}>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardHeaderTitle}>Total Active Time</Text>
                  <Text style={styles.cardBigNum}>
                    {formatMinutes(totalActiveMinutes)}
                  </Text>
                  <Text style={styles.cardSubText}>Focus + Workout combined</Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: '#1E2F22' }]}>
                  <TrendingUp size={24} color={colors.primary} strokeWidth={2.5} />
                </View>
              </View>
            </MasterCard>

            {/* Card 4: Quest Progress */}
            <MasterCard style={styles.statCard}>
              <View style={styles.cardRow}>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardHeaderTitle}>Quest Progress</Text>
                  <Text style={styles.cardBigNum}>
                    {stats?.completedQuests ?? 0}/{stats?.totalQuests ?? 0}
                  </Text>
                  <Text style={styles.cardSubText}>
                    {questCompletion}% completion rate
                  </Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: '#2A2A1E' }]}>
                  <Target size={24} color="#FBBF24" strokeWidth={2.5} />
                </View>
              </View>
            </MasterCard>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 16,
  },
  statCard: {
    padding: 20,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    gap: 4,
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cardBigNum: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  cardSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
