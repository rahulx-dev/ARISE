import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Play,
  Pause,
  Plus,
  Minus,
  SkipForward,
  Trophy,
  Camera,
  Timer,
  Edit3,
  Dumbbell,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { useGymStore } from '../../src/stores/useGymStore';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { WorkoutExerciseItem, WorkoutSetLog } from '../../src/types/gym';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function ActiveGymSessionScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const { colors } = useTheme();

  const activePlan = useGymStore((s) => s.activePlan);
  const todayWorkout = useGymStore((s) => s.todayWorkout);
  const activeSession = useGymStore((s) => s.activeSession);
  const startWorkout = useGymStore((s) => s.startWorkout);
  const logSet = useGymStore((s) => s.logSet);
  const completeWorkout = useGymStore((s) => s.completeWorkout);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [exercises, setExercises] = useState<WorkoutExerciseItem[]>([]);
  const [sessionSets, setSessionSets] = useState<Record<string, WorkoutSetLog[]>>({});
  const [inputWeights, setInputWeights] = useState<Record<string, string>>({});
  const [inputReps, setInputReps] = useState<Record<string, string>>({});

  // Rest Timer State
  const [isRestTimerActive, setIsRestTimerActive] = useState<boolean>(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(90);
  const [initialRestSeconds, setInitialRestSeconds] = useState<number>(90);
  const [isRestPaused, setIsRestPaused] = useState<boolean>(false);

  // PR Celebration Modal
  const [newPRModalData, setNewPRModalData] = useState<{ name: string; weight: number } | null>(null);

  const sessionTimerRef = useRef<any>(null);
  const restTimerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const finishingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    initSession();

    sessionTimerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      mountedRef.current = false;
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  const initSession = async () => {
    if (!todayWorkout) return;
    if (!mountedRef.current) return;
    setExercises(todayWorkout.exercises);

    const session = await startWorkout(
      activePlan?.id || 1,
      todayWorkout.id,
      todayWorkout.dayName
    );

    // Populate existing sets from database session
    const map: Record<string, WorkoutSetLog[]> = {};
    for (const setItem of session.sets) {
      if (!map[setItem.exerciseId]) map[setItem.exerciseId] = [];
      map[setItem.exerciseId].push(setItem);
    }
    if (mountedRef.current) setSessionSets(map);
  };

  // Rest timer countdown effect
  useEffect(() => {
    if (isRestTimerActive && !isRestPaused) {
      restTimerRef.current = setInterval(() => {
        setRestSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            setIsRestTimerActive(false);
            sound.play('quest_complete');
            haptics.success();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isRestTimerActive, isRestPaused]);

  const handleCompleteSet = async (ex: WorkoutExerciseItem, setNum: number) => {
    const key = `${ex.exerciseId}_${setNum}`;
    const weight = parseFloat(inputWeights[key] || '0') || 0;
    const reps = parseInt(inputReps[key] || '10', 10) || 10;

    haptics.heavy();
    sound.play('coin_earn');

    try {
      const result = await logSet(
        ex.exerciseId,
        ex.exerciseName,
        setNum,
        reps,
        reps,
        weight
      );

      // Trigger Rest Timer
      const restTime = ex.restSeconds || 90;
      setInitialRestSeconds(restTime);
      setRestSecondsLeft(restTime);
      setIsRestPaused(false);
      setIsRestTimerActive(true);

      if (result.isNewPR) {
        sound.play('level_up');
        setNewPRModalData({ name: ex.exerciseName, weight });
      }
    } catch (e) {
      console.warn('Error logging set:', e);
    }
  };

  const handleFinishWorkout = async () => {
    if (finishingRef.current) return;
    showIOSAlert(
      'Finish Workout?',
      'Are you ready to submit your workout session and claim your rewards?',
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Finish & Claim',
          style: 'primary',
          onPress: async () => {
            if (finishingRef.current) return;
            finishingRef.current = true;
            haptics.success();
            sound.play('quest_complete');
            try {
              const result = await completeWorkout(elapsedSeconds);
              if (!mountedRef.current) return;
              router.replace({
                pathname: '/exercise/complete',
                params: {
                  exerciseType: 'GYM_WORKOUT',
                  completedReps: '1',
                  target: '1',
                  earnedCoins: result.coinsEarned.toString(),
                  earnedXP: result.xpEarned.toString(),
                  durationSeconds: elapsedSeconds.toString(),
                },
              });
            } finally {
              finishingRef.current = false;
            }
          },
        },
      ]
    );
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerDayTitle, { color: colors.textPrimary }]}>
              {todayWorkout?.dayName.toUpperCase() || 'GYM PROTOCOL'}
            </Text>
            <View style={styles.timerBadge}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.timerText, { color: colors.primary }]}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleFinishWorkout}
            style={[styles.finishBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.finishBtnText}>FINISH</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Exercises Set Logger List */}
          {exercises.map((ex, index) => {
            const completedSetList = sessionSets[ex.exerciseId] || [];

            return (
              <GlassCard key={ex.id} variant="default" style={styles.exerciseCard}>
                {/* Exercise Header */}
                <View style={styles.exHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exOrderLabel, { color: colors.textMuted }]}>
                      EXERCISE 0{index + 1} // {ex.category}
                    </Text>
                    <Text style={[styles.exTitle, { color: colors.textPrimary }]}>
                      {ex.exerciseName}
                    </Text>
                    <Text style={[styles.exTargetText, { color: colors.secondary }]}>
                      Target: {ex.targetSets} Sets × {ex.targetReps} • {ex.restSeconds}s Rest
                    </Text>
                  </View>

                  {/* Mode Badge / Camera Shortcut */}
                  {ex.trackingMode === 'ai' ? (
                    <TouchableOpacity
                      onPress={() => router.push(`/exercise/${ex.exerciseId.includes('sq') ? 'SQUAT' : 'PUSHUP'}`)}
                      style={[styles.modeBadge, { backgroundColor: 'rgba(209, 255, 0, 0.15)', borderColor: colors.primary }]}
                    >
                      <Camera size={14} color={colors.primary} />
                      <Text style={[styles.modeBadgeText, { color: colors.primary }]}>AI TRACK</Text>
                    </TouchableOpacity>
                  ) : ex.trackingMode === 'timer' ? (
                    <View style={[styles.modeBadge, { backgroundColor: 'rgba(0, 240, 255, 0.15)', borderColor: colors.secondary }]}>
                      <Timer size={14} color={colors.secondary} />
                      <Text style={[styles.modeBadgeText, { color: colors.secondary }]}>TIMER</Text>
                    </View>
                  ) : (
                    <View style={[styles.modeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: colors.border }]}>
                      <Dumbbell size={14} color={colors.textSecondary} />
                      <Text style={[styles.modeBadgeText, { color: colors.textSecondary }]}>MANUAL</Text>
                    </View>
                  )}
                </View>

                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.colHeader, { width: 44, color: colors.textMuted }]}>SET</Text>
                  <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>KG WEIGHT</Text>
                  <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>REPS</Text>
                  <Text style={[styles.colHeader, { width: 50, textAlign: 'center', color: colors.textMuted }]}>LOG</Text>
                </View>

                {/* Sets Rows */}
                {Array.from({ length: ex.targetSets }).map((_, setIdx) => {
                  const setNum = setIdx + 1;
                  const key = `${ex.exerciseId}_${setNum}`;
                  const completedRecord = completedSetList.find((s) => s.setNumber === setNum);
                  const isDone = !!completedRecord;

                  return (
                    <View
                      key={setNum}
                      style={[
                        styles.setRow,
                        { backgroundColor: isDone ? 'rgba(209, 255, 0, 0.06)' : colors.surfaceLight },
                      ]}
                    >
                      <View style={[styles.setNumBadge, { backgroundColor: isDone ? colors.primary : colors.surfaceElevated }]}>
                        <Text style={[styles.setNumText, { color: isDone ? '#000' : colors.textSecondary }]}>
                          {setNum}
                        </Text>
                      </View>

                      <View style={styles.inputCell}>
                        <TextInput
                          style={[styles.tableInput, { color: colors.textPrimary }]}
                          placeholder={completedRecord?.weightKg?.toString() || '0'}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={inputWeights[key] || (completedRecord ? String(completedRecord.weightKg) : '')}
                          onChangeText={(val) => setInputWeights({ ...inputWeights, [key]: val })}
                          editable={!isDone}
                        />
                        <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
                      </View>

                      <View style={styles.inputCell}>
                        <TextInput
                          style={[styles.tableInput, { color: colors.textPrimary }]}
                          placeholder={completedRecord?.completedReps?.toString() || '10'}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={inputReps[key] || (completedRecord ? String(completedRecord.completedReps) : '')}
                          onChangeText={(val) => setInputReps({ ...inputReps, [key]: val })}
                          editable={!isDone}
                        />
                        <Text style={[styles.inputUnit, { color: colors.textMuted }]}>reps</Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => !isDone && handleCompleteSet(ex, setNum)}
                        style={[
                          styles.checkBtn,
                          isDone
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        ]}
                        disabled={isDone}
                      >
                        <Check
                          size={16}
                          color={isDone ? '#000' : colors.textMuted}
                          strokeWidth={isDone ? 3 : 2}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </GlassCard>
            );
          })}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Rest Timer Modal / Bar */}
        {isRestTimerActive && (
          <View style={[styles.restBarContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={styles.restBarInfo}>
              <Text style={[styles.restBarLabel, { color: colors.textMuted }]}>REST INTERVAL</Text>
              <Text style={[styles.restBarCountdown, { color: colors.primary }]}>
                {Math.floor(restSecondsLeft / 60)}:
                {String(restSecondsLeft % 60).padStart(2, '0')}
              </Text>
            </View>

            <View style={styles.restBarControls}>
              <TouchableOpacity
                onPress={() => setRestSecondsLeft((s) => Math.max(0, s - 15))}
                style={[styles.restCtrlBtn, { backgroundColor: colors.surfaceLight }]}
              >
                <Minus size={16} color={colors.textPrimary} />
                <Text style={[styles.restCtrlText, { color: colors.textPrimary }]}>15s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRestSecondsLeft((s) => s + 15)}
                style={[styles.restCtrlBtn, { backgroundColor: colors.surfaceLight }]}
              >
                <Plus size={16} color={colors.textPrimary} />
                <Text style={[styles.restCtrlText, { color: colors.textPrimary }]}>15s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsRestPaused(!isRestPaused)}
                style={[styles.restCtrlBtn, { backgroundColor: colors.surfaceLight }]}
              >
                {isRestPaused ? (
                  <Play size={16} color={colors.primary} />
                ) : (
                  <Pause size={16} color={colors.textPrimary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsRestTimerActive(false)}
                style={[styles.restSkipBtn, { backgroundColor: colors.primary }]}
              >
                <SkipForward size={16} color="#000" />
                <Text style={styles.restSkipText}>SKIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PR Celebration Modal */}
        <Modal visible={!!newPRModalData} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.prCard, { backgroundColor: colors.surface, borderColor: colors.accentGold }]}>
              <View style={[styles.prTrophyCircle, { backgroundColor: 'rgba(255, 184, 0, 0.2)' }]}>
                <Trophy size={48} color={colors.accentGold} />
              </View>

              <Text style={[styles.prHeading, { color: colors.accentGold }]}>NEW PERSONAL RECORD!</Text>
              <Text style={[styles.prExerciseName, { color: colors.textPrimary }]}>
                {newPRModalData?.name}
              </Text>
              <Text style={[styles.prWeightText, { color: colors.primary }]}>
                {newPRModalData?.weight} KG LOGGED
              </Text>
              <Text style={[styles.prSub, { color: colors.textSecondary }]}>
                You surpassed your previous highest load. Iron discipline in action.
              </Text>

              <GlassButton
                title="CLAIM RECORD"
                onPress={() => setNewPRModalData(null)}
                variant="primary"
                size="md"
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerDayTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  finishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  finishBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  exHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  exOrderLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
  },
  exTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  exTargetText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  colHeader: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    gap: 8,
  },
  setNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#242424',
  },
  tableInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  inputUnit: {
    fontSize: 10,
    fontWeight: '700',
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  restBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  restBarInfo: {
    gap: 2,
  },
  restBarLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
  },
  restBarCountdown: {
    fontSize: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  restBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restCtrlBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  restCtrlText: {
    fontSize: 10,
    fontWeight: '600',
  },
  restSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restSkipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  prCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    gap: 10,
  },
  prTrophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  prHeading: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  prExerciseName: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  prWeightText: {
    fontSize: 18,
    fontWeight: '600',
  },
  prSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
