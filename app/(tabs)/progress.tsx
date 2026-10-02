import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Barbell,
  Play,
  SlidersHorizontal,
  CheckCircle,
  CaretRight,
  Camera,
  X,
  Trophy,
  Lightning,
  Sword,
  Skull,
  Coins,
  Flame,
  Check,
} from 'phosphor-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useGymStore } from '../../src/stores/useGymStore';
import { historyService } from '../../src/services/historyService';
import { bossService, BossRaidInfo } from '../../src/services/bossService';
import { SwipeableTabScreen } from '../../src/components/navigation/SwipeableTabScreen';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const EXERCISES_LIST = [
  { id: '1', name: 'Push-ups', type: 'PUSHUP', sets: '4 Sets', reps: '20 Reps', category: 'Chest & Triceps' },
  { id: '2', name: 'Bodyweight Squats', type: 'SQUAT', sets: '4 Sets', reps: '25 Reps', category: 'Quads & Glutes' },
  { id: '3', name: 'Sit-ups (Abs)', type: 'SITUP', sets: '3 Sets', reps: '20 Reps', category: 'Core & Abdominals' },
  { id: '4', name: 'Pull-ups', type: 'PULLUP', sets: '3 Sets', reps: '10 Reps', category: 'Back & Lats' },
  { id: '5', name: 'Plank Hold', type: 'PLANK', sets: '3 Sets', reps: '60 Sec', category: 'Core & Stability' },
  { id: '6', name: 'Burpees', type: 'BURPEE', sets: '3 Sets', reps: '12 Reps', category: 'Full Body & Conditioning' },
  { id: '7', name: 'Jumping Jacks', type: 'JUMPING_JACK', sets: '3 Sets', reps: '30 Reps', category: 'Cardio & Stamina' },
  { id: '8', name: 'High Knees', type: 'HIGH_KNEES', sets: '3 Sets', reps: '30 Reps', category: 'Cardio & Agility' },
  { id: '9', name: 'Mountain Climbers', type: 'MOUNTAIN_CLIMBER', sets: '3 Sets', reps: '25 Reps', category: 'Core & Cardio' },
  { id: '10', name: 'Lunges', type: 'LUNGE', sets: '3 Sets', reps: '20 Reps', category: 'Legs & Balance' },
];

export default function GymWorkoutScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [activeWeekDays, setActiveWeekDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [bossRaid, setBossRaid] = useState<BossRaidInfo | null>(null);

  const preferences = useGymStore((s) => s.preferences);
  const savePreferences = useGymStore((s) => s.savePreferences);
  const [prefDays, setPrefDays] = useState<number>(4);
  const [prefDifficulty, setPrefDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [prefGoal, setPrefGoal] = useState<'strength' | 'muscle_gain' | 'fat_loss'>('strength');

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const loadGymData = useGymStore((s) => s.loadGymData);

  useEffect(() => {
    if (preferences) {
      setPrefDays(preferences.daysPerWeek || 4);
      setPrefDifficulty(preferences.experience || 'intermediate');
      setPrefGoal((preferences.goal as any) || 'strength');
    }
  }, [preferences]);

  const todayDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  const loadAll = async () => {
    try {
      await loadProfile();
      await loadGymData();
      const stats = await historyService.getTodayRealStats();
      setCompletedCount(Math.min(EXERCISES_LIST.length, stats.workoutCount));

      // Load real 7-day activity
      const allDays = await historyService.get12WeekHeatmapData();
      const last7 = allDays.slice(-7);
      if (last7.length > 0) {
        const bools = last7.map((d) => d.workoutCount > 0 || d.intensity > 0);
        setActiveWeekDays(bools);
      }

      // Load weekly Dungeon Boss Raid
      const boss = await bossService.getCurrentBoss();
      setBossRaid(boss);
    } catch (e) {
      console.warn('Error loading gym tab data:', e);
    }
  };

  const lastFocusLoadRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusLoadRef.current > 15000) {
        lastFocusLoadRef.current = now;
        loadAll();
      }
    }, [])
  );

  useEffect(() => {
    loadAll();
  }, []);

  const handleStartExercise = (exerciseType: string, targetReps: number, setsCount: number = 3) => {
    haptics.heavy();
    router.push({
      pathname: '/exercise/[type]',
      params: {
        type: exerciseType,
        target: targetReps,
        sets: setsCount,
      },
    } as any);
  };

  const totalExercises = EXERCISES_LIST.length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalExercises) * 100));

  return (
    <SwipeableTabScreen prevTab="/(tabs)/quests" nextTab="/(tabs)/profile" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top App Bar */}
        <View style={[styles.topHeader, { borderBottomColor: isDark ? '#232532' : '#E5E7EB' }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Gym</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              Physical power & AI pose tracking
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              setIsPrefModalOpen(true);
            }}
          >
            <SlidersHorizontal size={18} color={colors.primary} weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Workout Card */}
          <GlassCard variant="elevated" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={[styles.heroLabel, { color: colors.primary }]}>TODAY'S WORKOUT</Text>
              <Barbell size={20} color={colors.primary} weight="duotone" />
            </View>

            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Upper Body</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              45 min • {totalExercises} exercises
            </Text>

            {/* Progress Indicator */}
            <View style={styles.heroProgressWrap}>
              <View style={styles.heroProgressLabels}>
                <Text style={[styles.heroProgressCount, { color: colors.textSecondary }]}>
                  {completedCount} / {totalExercises} Completed
                </Text>
                <Text style={[styles.heroProgressPercent, { color: colors.primary }]}>{progressPercent}%</Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#1C1E27' : '#E5E7EB' }]}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>

            {/* Start Button in Solid Titanium Azure */}
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: '#0A84FF' }]}
              onPress={() => handleStartExercise('PUSHUP', 20)}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Start Workout</Text>
              <Play size={16} color="#FFFFFF" weight="fill" />
            </TouchableOpacity>
          </GlassCard>

          {/* Weekly Tracker ("This Week") with Real Activity */}
          <GlassCard variant="default" style={styles.weeklyTrackerCard}>
            <Text style={[styles.weeklyTitle, { color: colors.textMuted }]}>This Week</Text>
            <View style={styles.weekDaysRow}>
              {DAYS_OF_WEEK.map((day, idx) => {
                const isToday = idx === todayDayIndex;
                const isCompleted = activeWeekDays[idx] || (idx === todayDayIndex && completedCount > 0);

                return (
                  <View key={idx} style={styles.dayCol}>
                    <Text
                      style={[
                        styles.dayText,
                        { color: isToday ? colors.primary : colors.textMuted },
                        isToday && { fontWeight: '600' },
                      ]}
                    >
                      {day}
                    </Text>
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: isToday
                            ? colors.primary
                            : isCompleted
                            ? colors.success
                            : isDark
                            ? '#1C1E27'
                            : '#F3F4F6',
                          borderColor: isToday ? colors.primary : isCompleted ? colors.success : colors.border,
                        },
                      ]}
                    >
                      {isCompleted && !isToday && <CheckCircle size={14} color="#FFFFFF" weight="fill" />}
                      {isToday && <Text style={styles.todayDayNum}>{new Date().getDate()}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          {/* Solo Leveling Dungeon Boss Raid Card */}
          {bossRaid && (
            <GlassCard
              variant="elevated"
              style={[
                styles.bossRaidCard,
                {
                  backgroundColor: isDark ? '#121014' : colors.surface,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
                },
              ]}
            >
              <View style={styles.bossHeaderRow}>
                <View style={styles.bossTagWrap}>
                  <Skull size={14} color="#EF4444" weight="fill" />
                  <Text style={styles.bossTagText}>{bossRaid.gateRank}</Text>
                </View>
                <View
                  style={[
                    styles.bossRewardPill,
                    {
                      backgroundColor: isDark ? '#1A1710' : '#FEF3C7',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.4)',
                    },
                  ]}
                >
                  <Coins size={13} color="#F59E0B" weight="fill" />
                  <Text style={styles.bossRewardText}>+{bossRaid.rewardCoins} COINS</Text>
                </View>
              </View>

              <Text style={[styles.bossNameText, { color: colors.textPrimary }]}>
                {bossRaid.name}
              </Text>
              <Text style={[styles.bossSubText, { color: colors.textMuted }]}>
                Inflict damage through tracked exercise reps. 1 Rep = 2 DMG.
              </Text>

              {/* Boss HP Bar */}
              <View style={styles.bossHpWrap}>
                <View style={styles.bossHpMetaRow}>
                  <Text style={[styles.bossHpLabel, { color: colors.textMuted }]}>
                    BOSS HP: {bossRaid.currentHp} / {bossRaid.maxHp}
                  </Text>
                  <Text style={[styles.bossHpPercent, { color: bossRaid.isDefeated ? '#10B981' : '#EF4444' }]}>
                    {bossRaid.isDefeated ? (bossRaid.isClaimed ? 'CLAIMED' : 'DEFEATED') : `${Math.round((bossRaid.currentHp / bossRaid.maxHp) * 100)}%`}
                  </Text>
                </View>
                <View style={[styles.bossHpTrack, { backgroundColor: isDark ? '#1F1A20' : '#E5E7EB' }]}>
                  <View
                    style={[
                      styles.bossHpFill,
                      {
                        width: `${Math.max(0, Math.min(100, (bossRaid.currentHp / bossRaid.maxHp) * 100))}%`,
                        backgroundColor: bossRaid.isDefeated ? '#10B981' : '#EF4444',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Attack / Claim Button */}
              <TouchableOpacity
                disabled={bossRaid.isDefeated && bossRaid.isClaimed}
                style={[
                  styles.bossAttackBtn,
                  {
                    backgroundColor: bossRaid.isDefeated
                      ? (bossRaid.isClaimed ? (isDark ? '#232733' : '#E2E8F0') : '#10B981')
                      : '#0A84FF',
                  },
                ]}
                onPress={() => {
                  haptics.heavy();
                  if (bossRaid.isDefeated) {
                    if (!bossRaid.isClaimed) {
                      bossService.claimBossVictoryReward().then(() => loadAll());
                    }
                  } else {
                    handleStartExercise('PUSHUP', 25);
                  }
                }}
                activeOpacity={0.85}
              >
                {bossRaid.isDefeated ? (
                  bossRaid.isClaimed ? (
                    <>
                      <CheckCircle size={16} color={isDark ? '#8E8E93' : '#64748B'} weight="fill" />
                      <Text style={[styles.bossAttackBtnText, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                        REWARD CLAIMED • RESETS MONDAY
                      </Text>
                    </>
                  ) : (
                    <>
                      <Trophy size={16} color="#FFFFFF" weight="fill" />
                      <Text style={styles.bossAttackBtnText}>GATE CONQUERED • CLAIM REWARD (+20 COINS)</Text>
                    </>
                  )
                ) : (
                  <>
                    <Sword size={16} color="#FFFFFF" weight="fill" />
                    <Text style={styles.bossAttackBtnText}>ATTACK BOSS // EXECUTE REPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Non-intrusive Sponsor Banner */}
          <AriseBannerAd style={{ marginVertical: 10 }} />

          {/* Exercises Routine List with Direct AI Camera Buttons */}
          <View style={styles.exerciseSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Workout Exercises
            </Text>

            {EXERCISES_LIST.map((ex) => (
              <GlassCard key={ex.id} variant="default" style={styles.exerciseCard}>
                <View style={styles.exerciseInfoCol}>
                  <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{ex.name}</Text>
                  <Text style={[styles.exerciseCategory, { color: colors.textMuted }]}>
                    {ex.category} • {ex.sets} × {ex.reps}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.aiCamBtn, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : '#EFF6FF', borderColor: '#0A84FF' }]}
                  onPress={() => handleStartExercise(ex.type, parseInt(ex.reps, 10) || 20, parseInt(ex.sets, 10) || 3)}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color="#0A84FF" weight="bold" />
                  <Text style={[styles.aiCamBtnText, { color: '#0A84FF' }]}>AI TRACK</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Preferences Modal */}
        <Modal visible={isPrefModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Training Settings</Text>
                <TouchableOpacity onPress={() => setIsPrefModalOpen(false)} style={styles.circleBtn}>
                  <X size={18} color={colors.textSecondary} weight="bold" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {/* 1. Weekly Schedule Days */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.prefSectionLabel, { color: colors.textPrimary }]}>Weekly Workout Days</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[3, 4, 5, 6].map((days) => (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.prefOptionPill,
                          {
                            backgroundColor: prefDays === days ? '#0A84FF' : isDark ? '#121622' : '#F1F5F9',
                            borderColor: prefDays === days ? '#0A84FF' : isDark ? '#1E293B' : '#CBD5E1',
                          },
                        ]}
                        onPress={() => {
                          haptics.light();
                          setPrefDays(days);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.prefOptionText,
                            { color: prefDays === days ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {days} Days
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 2. AI Target Difficulty */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.prefSectionLabel, { color: colors.textPrimary }]}>AI Target Difficulty</Text>
                  <View style={{ gap: 8 }}>
                    {[
                      { id: 'beginner', title: 'Novice (E-Rank)', desc: '10-15 reps • Foundation training' },
                      { id: 'intermediate', title: 'Hunter (C-Rank)', desc: '20-25 reps • Progressive overload' },
                      { id: 'advanced', title: 'Monarch (S-Rank)', desc: '35+ reps • Maximum stamina & hypertrophy' },
                    ].map((diff) => (
                      <TouchableOpacity
                        key={diff.id}
                        style={[
                          styles.diffOptionCard,
                          {
                            backgroundColor: prefDifficulty === diff.id ? 'rgba(10, 132, 255, 0.15)' : isDark ? '#121622' : '#F8FAFC',
                            borderColor: prefDifficulty === diff.id ? '#0A84FF' : isDark ? '#1E293B' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => {
                          haptics.light();
                          setPrefDifficulty(diff.id as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.diffOptionTitle, { color: prefDifficulty === diff.id ? '#0A84FF' : colors.textPrimary }]}>
                            {diff.title}
                          </Text>
                          <Text style={[styles.diffOptionDesc, { color: colors.textSecondary }]}>
                            {diff.desc}
                          </Text>
                        </View>
                        {prefDifficulty === diff.id && (
                          <Check size={16} color="#0A84FF" weight="bold" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 3. Primary Focus Goal */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.prefSectionLabel, { color: colors.textPrimary }]}>Primary Training Goal</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { id: 'strength', label: 'Strength' },
                      { id: 'muscle_gain', label: 'Hypertrophy' },
                      { id: 'fat_loss', label: 'Stamina' },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.prefOptionPill,
                          {
                            flex: 1,
                            backgroundColor: prefGoal === g.id ? '#F59E0B' : isDark ? '#121622' : '#F1F5F9',
                            borderColor: prefGoal === g.id ? '#F59E0B' : isDark ? '#1E293B' : '#CBD5E1',
                          },
                        ]}
                        onPress={() => {
                          haptics.light();
                          setPrefGoal(g.id as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.prefOptionText,
                            { color: prefGoal === g.id ? '#000000' : colors.textPrimary },
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.savePrefBtn, { backgroundColor: '#FF5500', marginTop: 6 }]}
                  onPress={async () => {
                    haptics.heavy();
                    try {
                      await savePreferences({
                        daysPerWeek: prefDays,
                        experience: prefDifficulty,
                        goal: prefGoal,
                        equipment: 'full_gym',
                        workoutDurationMinutes: 45,
                      });
                    } catch {}
                    setIsPrefModalOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.savePrefBtnText}>Save Preferences</Text>
                </TouchableOpacity>
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  heroCard: {
    padding: 22,
    borderRadius: 24,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroProgressWrap: {
    gap: 8,
    marginTop: 4,
  },
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroProgressCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroProgressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  weeklyTrackerCard: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  weeklyTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDayNum: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  exerciseInfoCol: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseCategory: {
    fontSize: 11,
    fontWeight: '500',
  },
  aiCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  aiCamBtnText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  savePrefBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePrefBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prefSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  prefOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  diffOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  diffOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  diffOptionDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
  bossRaidCard: {
    padding: 20,
    borderRadius: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: '#121014',
  },
  bossHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bossTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  bossTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  bossRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: '#1A1710',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  bossRewardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  bossNameText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  bossSubText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  bossHpWrap: {
    gap: 6,
    marginVertical: 4,
  },
  bossHpMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bossHpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  bossHpPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  bossHpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F1A20',
    overflow: 'hidden',
  },
  bossHpFill: {
    height: '100%',
    borderRadius: 4,
  },
  bossAttackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  bossAttackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
