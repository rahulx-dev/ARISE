import React, { useState, useEffect, useCallback } from 'react';
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
  Dumbbell,
  Play,
  Flame,
  Sliders,
  CheckCircle2,
  ChevronRight,
  Camera,
  X,
  Award,
  Zap,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useGymStore } from '../../src/stores/useGymStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const EXERCISES_LIST = [
  { id: '1', name: 'Push-ups', type: 'PUSHUP', sets: '4 Sets', reps: '20 Reps', category: 'Chest & Triceps' },
  { id: '2', name: 'Bodyweight Squats', type: 'SQUAT', sets: '4 Sets', reps: '25 Reps', category: 'Quads & Glutes' },
  { id: '3', name: 'Pull-ups', type: 'PULLUP', sets: '3 Sets', reps: '10 Reps', category: 'Back & Lats' },
  { id: '4', name: 'Plank Hold', type: 'PLANK', sets: '3 Sets', reps: '60 Sec', category: 'Core & Stability' },
  { id: '5', name: 'Jumping Jacks', type: 'JUMPING_JACK', sets: '3 Sets', reps: '30 Reps', category: 'Cardio & Stamina' },
];

export default function GymWorkoutScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'workout' | 'telemetry' | 'prs'>('workout');
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const loadGymData = useGymStore((s) => s.loadGymData);
  const preferences = useGymStore((s) => s.preferences);
  const savePreferences = useGymStore((s) => s.savePreferences);

  const [prefGoal, setPrefGoal] = useState<any>('strength');
  const [prefDays, setPrefDays] = useState<number>(4);
  const [prefDuration, setPrefDuration] = useState<number>(45);

  const todayDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  const loadAll = async () => {
    try {
      await loadProfile();
      await loadGymData();
    } catch (e) {
      console.warn('Error loading gym tab data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  useEffect(() => {
    loadAll();
  }, []);

  const handleStartExercise = (exerciseType: string, targetReps: number) => {
    haptics.heavy();
    router.push({
      pathname: '/exercise/[type]',
      params: {
        type: exerciseType,
        target: targetReps,
      },
    } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#051424' : '#F2F2F7' }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top App Bar */}
        <View style={[styles.topHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Gym</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              Physical power & AI pose tracking
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              setIsPrefModalOpen(true);
            }}
          >
            <Sliders size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Stitch v2 Hero Workout Card */}
          <GlassCard variant="elevated" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={[styles.heroLabel, { color: colors.primary }]}>TODAY'S WORKOUT</Text>
              <Dumbbell size={18} color={colors.primary} />
            </View>

            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Upper Body</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              45 min • 5 exercises
            </Text>

            {/* Progress Indicator */}
            <View style={styles.heroProgressWrap}>
              <View style={styles.heroProgressLabels}>
                <Text style={[styles.heroProgressCount, { color: colors.textSecondary }]}>
                  2 / 5 Completed
                </Text>
                <Text style={[styles.heroProgressPercent, { color: colors.primary }]}>40%</Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(204, 255, 0, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                <View style={[styles.progressBarFill, { width: '40%', backgroundColor: colors.primary }]} />
              </View>
            </View>

            {/* Continue Button in Solid Electric Lime */}
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleStartExercise('PUSHUP', 20)}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Play size={16} color="#000000" fill="#000000" />
            </TouchableOpacity>
          </GlassCard>

          {/* Stitch v2 Weekly Tracker ("This Week") */}
          <GlassCard variant="default" style={styles.weeklyTrackerCard}>
            <Text style={[styles.weeklyTitle, { color: colors.textMuted }]}>This Week</Text>
            <View style={styles.weekDaysRow}>
              {DAYS_OF_WEEK.map((day, idx) => {
                const isToday = idx === todayDayIndex;
                const isCompleted = idx < todayDayIndex;

                return (
                  <View key={idx} style={styles.dayCol}>
                    <Text
                      style={[
                        styles.dayText,
                        { color: isToday ? colors.primary : colors.textMuted },
                        isToday && { fontWeight: '800' },
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
                            ? isDark
                              ? 'rgba(39, 54, 71, 0.7)'
                              : 'rgba(0, 0, 0, 0.06)'
                            : 'transparent',
                          borderColor: isToday ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {isCompleted && <CheckCircle2 size={12} color={colors.primary} />}
                      {isToday && <Text style={styles.todayDayNum}>{new Date().getDate()}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </GlassCard>

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
                  style={[styles.aiCamBtn, { backgroundColor: isDark ? 'rgba(204, 255, 0, 0.12)' : 'rgba(16, 185, 129, 0.12)', borderColor: colors.primary }]}
                  onPress={() => handleStartExercise(ex.type, parseInt(ex.reps, 10) || 20)}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color={colors.primary} />
                  <Text style={[styles.aiCamBtnText, { color: colors.primary }]}>AI TRACK</Text>
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
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 14 }}>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Customize your weekly workout schedule and AI target difficulty.
                </Text>

                <TouchableOpacity
                  style={[styles.savePrefBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    haptics.heavy();
                    setIsPrefModalOpen(false);
                  }}
                >
                  <Text style={styles.savePrefBtnText}>Save Preferences</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
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
    padding: 20,
    borderRadius: 22,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroProgressWrap: {
    gap: 6,
    marginTop: 6,
  },
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroProgressCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroProgressPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  weeklyTrackerCard: {
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  weeklyTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
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
    fontWeight: '900',
    color: '#000000',
  },
  exerciseSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
  },
  exerciseInfoCol: {
    gap: 3,
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseCategory: {
    fontSize: 11,
  },
  aiCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  aiCamBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
  },
  savePrefBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePrefBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
});
