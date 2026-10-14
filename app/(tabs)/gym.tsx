import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Flame,
  Zap,
  Play,
  Dumbbell,
  Shield,
  Activity,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Award,
  Timer,
  BarChart2,
} from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { db } from '../../src/database/client';
import { exerciseSession, workoutSessions } from '../../src/database/schema';
import { fontFamilies } from '../../src/theme/typography';
import { useTranslation } from '../../src/services/i18n';
import { AnimatedStreakFlame } from '../../src/components/ui/AnimatedStreakFlame';
import { Icon3D } from '../../src/components/ui/Icon3D';

interface ExerciseCardItem {
  id: string;
  type: string;
  title: string;
  targetMuscles: string;
  defaultReps: number;
  xpReward: number;
  coinsReward: number;
  badgeColor: string;
  badgeBg: string;
  difficulty: 'E-Rank' | 'D-Rank' | 'C-Rank' | 'B-Rank' | 'A-Rank';
}

export default function GymTabScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'bodyweight' | 'core' | 'cardio'>('all');
  const [todayReps, setTodayReps] = useState<number>(0);
  const [totalWorkoutsCount, setTotalWorkoutsCount] = useState<number>(0);

  const fetchGymStats = async () => {
    try {
      const [records, wRecords] = await Promise.all([
        db.select().from(exerciseSession),
        db.select().from(workoutSessions),
      ]);
      const completedWorkouts = wRecords.filter((w: any) => w.status === 'COMPLETED');
      setTotalWorkoutsCount(records.length + completedWorkouts.length);

      const exerciseReps = records.reduce((acc: number, curr: any) => acc + (curr.completedReps || 0), 0);
      const workoutReps = completedWorkouts.reduce((acc: number, curr: any) => acc + (curr.totalReps || 0), 0);
      setTodayReps(exerciseReps + workoutReps);
    } catch (e) {
      console.warn('Failed to load gym stats:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      fetchGymStats();
    }, [loadProfile])
  );

  const exercises: ExerciseCardItem[] = [
    {
      id: 'pushup',
      type: 'PUSHUP',
      title: 'Push-ups',
      targetMuscles: 'Chest, Shoulders & Triceps',
      defaultReps: 25,
      xpReward: 100,
      coinsReward: 25,
      badgeColor: '#E53935',
      badgeBg: isDark ? '#2D1414' : '#FEE2E2',
      difficulty: 'E-Rank',
    },
    {
      id: 'squat',
      type: 'SQUAT',
      title: 'Deep Squats',
      targetMuscles: 'Quads, Glutes & Hamstrings',
      defaultReps: 30,
      xpReward: 120,
      coinsReward: 30,
      badgeColor: '#059669',
      badgeBg: isDark ? '#0F2E22' : '#D1FAE5',
      difficulty: 'D-Rank',
    },
    {
      id: 'pullup',
      type: 'PULLUP',
      title: 'Pull-ups',
      targetMuscles: 'Lats, Rhomboids & Biceps',
      defaultReps: 12,
      xpReward: 150,
      coinsReward: 40,
      badgeColor: '#A855F7',
      badgeBg: isDark ? '#26123D' : '#EDE9FE',
      difficulty: 'C-Rank',
    },
    {
      id: 'plank',
      type: 'PLANK',
      title: 'Isometric Plank',
      targetMuscles: 'Transverse Core & Lower Back',
      defaultReps: 60,
      xpReward: 110,
      coinsReward: 25,
      badgeColor: '#0284C7',
      badgeBg: isDark ? '#0C2B44' : '#E0F2FE',
      difficulty: 'E-Rank',
    },
    {
      id: 'jumping_jacks',
      type: 'JUMPING_JACKS',
      title: 'Jumping Jacks',
      targetMuscles: 'Full Body Cardio & Calves',
      defaultReps: 50,
      xpReward: 90,
      coinsReward: 20,
      badgeColor: '#D97706',
      badgeBg: isDark ? '#33210C' : '#FEF3C7',
      difficulty: 'E-Rank',
    },
    {
      id: 'running',
      type: 'RUNNING',
      title: 'Shadow Sprint',
      targetMuscles: 'Outdoor GPS Distance & Stamina',
      defaultReps: 1,
      xpReward: 200,
      coinsReward: 50,
      badgeColor: '#0A84FF',
      badgeBg: isDark ? '#0C203B' : '#E0F2FE',
      difficulty: 'B-Rank',
    },
  ];

  const handleStartExercise = (exercise: ExerciseCardItem) => {
    haptics.heavy();
    sound.play('unlock');
    if (exercise.id === 'running' || exercise.type === 'RUNNING') {
      router.push('/run' as any);
      return;
    }
    router.push({
      pathname: '/exercise/[type]',
      params: {
        type: exercise.type,
        target: exercise.defaultReps.toString(),
      },
    } as any);
  };

  const filteredExercises = exercises.filter((ex) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'bodyweight') return ex.id === 'pushup' || ex.id === 'pullup';
    if (categoryFilter === 'core') return ex.id === 'plank' || ex.id === 'squat';
    if (categoryFilter === 'cardio') return ex.id === 'jumping_jacks' || ex.id === 'running';
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F6F4EF' }]} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: '#E8E4DC', backgroundColor: '#F6F4EF' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: '#1A1A1A' }]}>{t('tabGym', 'Gym Training')}</Text>
          <Text style={[styles.headerSub, { color: '#6B7280' }]}>{t('gymSub', 'AI-Powered Vision Pose Tracker')}</Text>
        </View>

        <View style={[styles.headerStatsPill, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
          <AnimatedStreakFlame size={18} />
          <Text style={[styles.headerStatsText, { color: '#1A1A1A' }]}>{profile?.currentStreak || 1} {t('dayStreak', 'Day Streak')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hero Metric Summary */}
        <View style={[styles.heroStatsCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#1A1A1A' }]}>{todayReps.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: '#6B7280' }]}>{t('repsToday', 'TOTAL REPS')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: '#E8E4DC' }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#1A1A1A' }]}>{totalWorkoutsCount}</Text>
            <Text style={[styles.statLabel, { color: '#6B7280' }]}>SESSIONS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: '#E8E4DC' }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: '#E53935' }]}>
              +{Math.round((profile?.strength || 10) * 1.5)}
            </Text>
            <Text style={[styles.statLabel, { color: '#6B7280' }]}>STR GAINED</Text>
          </View>
        </View>

        {/* 3. Category Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: t('allExercises', 'All Protocols') },
            { id: 'bodyweight', label: 'Upper Body' },
            { id: 'core', label: 'Core & Legs' },
            { id: 'cardio', label: 'Cardio' },
          ].map((cat) => {
            const isSelected = categoryFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? '#E53935' : '#FFFFFF',
                    borderColor: isSelected ? '#E53935' : '#E8E4DC',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setCategoryFilter(cat.id as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, { color: isSelected ? '#FFFFFF' : '#6B7280' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Exercise Protocols List */}
        <View style={styles.exerciseList}>
          {filteredExercises.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.exerciseCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}
              onPress={() => handleStartExercise(item)}
              activeOpacity={0.88}
            >
              <View style={styles.exerciseCardContent}>
                <View style={styles.exerciseLeftCol}>
                  <View style={[styles.rankBadge, { backgroundColor: item.badgeBg }]}>
                    <Text style={[styles.rankBadgeText, { color: item.badgeColor }]}>
                      {item.difficulty}
                    </Text>
                  </View>

                  <Text style={[styles.exerciseTitle, { color: '#1A1A1A' }]}>{item.title}</Text>
                  <Text style={[styles.exerciseMuscles, { color: '#6B7280' }]}>{item.targetMuscles}</Text>

                  {/* Rewards Row */}
                  <View style={styles.rewardsRow}>
                    <View style={[styles.rewardTag, { backgroundColor: '#FFFBEB' }]}>
                      <Icon3D name="lightning_yellow" size={13} />
                      <Text style={[styles.rewardTagText, { color: '#D97706' }]}>+{item.xpReward} XP</Text>
                    </View>
                    <View style={[styles.rewardTag, { backgroundColor: '#FFFBEB' }]}>
                      <Icon3D name="coin_gold" size={13} />
                      <Text style={[styles.rewardTagText, { color: '#D97706' }]}>
                        +{item.coinsReward}
                      </Text>
                    </View>
                    <View style={[styles.rewardTag, { backgroundColor: '#F6F4EF' }]}>
                      <Text style={[styles.rewardTagText, { color: '#6B7280' }]}>
                        🎯 {item.type === 'RUNNING' ? '1.0 km' : `${item.defaultReps} ${item.type === 'PLANK' ? 'sec' : 'reps'}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Start Action */}
                <View style={styles.startBtnWrap}>
                  <View style={styles.playIconCircle}>
                    <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                  <Text style={styles.startLabel}>START</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  headerStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  headerStatsText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#E53935',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
    paddingBottom: 30,
  },
  heroStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  filterPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseLeftCol: {
    flex: 1,
    gap: 4,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  rankBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  exerciseTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.1,
  },
  exerciseMuscles: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '400',
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  rewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rewardTagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10.5,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  startBtnWrap: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  playIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  startLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    color: '#E53935',
    letterSpacing: 0.3,
  },
});
