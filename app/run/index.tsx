import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Animated,
  Easing,
  Linking,
  AppState,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CaretLeft,
  Play,
  Pause,
  Stop,
  Lightning,
  Fire,
  Footprints,
  Clock,
  Sparkle,
  Trophy,
  WarningCircle,
  Plus,
  Minus,
  CheckCircle,
  Coins,
} from 'phosphor-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { runningTrackerService, RunningStats } from '../../src/services/runningTrackerService';
import * as NativeRunningTracker from '../../modules/running-tracker';

import { userRepository } from '../../src/database/repositories/userRepository';
import { coinService } from '../../src/services/coinService';
import { questService } from '../../src/services/questService';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { AnimatedStreakFlame } from '../../src/components/ui/AnimatedStreakFlame';
import { Icon3D } from '../../src/components/ui/Icon3D';

const DISTANCE_PRESETS = [0.5, 1.0, 2.0, 3.0, 5.0, 10.0];

export default function RunningScreen() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();

  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const params = useLocalSearchParams<{ targetKm?: string; questId?: string }>();

  // Setup / Tracking States
  const initialTargetKm = params.targetKm ? Math.max(0.1, parseFloat(params.targetKm) || 1.0) : 1.0;
  const [targetDistanceKm, setTargetDistanceKm] = useState<number>(initialTargetKm);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [stats, setStats] = useState<RunningStats>({
    distanceKm: 0,
    speedKmh: 0,
    paceMinKm: '--:--',
    steps: 0,
    elapsedSeconds: 0,
    caloriesBurned: 0,
    isVehicleSpeed: false,
    isTracking: false,
    isPaused: false,
  });

  // Completion Modal
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [earnedRewards, setEarnedRewards] = useState<{ xp: number; coins: number }>({
    xp: 0,
    coins: 0,
  });

  // Animation pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const completionHandled = useRef(false);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (isRunning && !isPaused) {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    };
  }, [isRunning, isPaused]);

  // Clean up on unmount
  useEffect(() => {
    if (isRunning) {
      activateKeepAwakeAsync('running-trial').catch(() => {});
    } else {
      deactivateKeepAwake('running-trial').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('running-trial').catch(() => {});
    };
  }, [isRunning]);

  useEffect(() => {
    try {
      const currentNative = NativeRunningTracker.getStats();
      if (currentNative && currentNative.isTracking) {
        setIsRunning(true);
        setIsPaused(currentNative.isPaused);
        setStats(currentNative);
      }
    } catch {}

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        try {
          const freshStats = NativeRunningTracker.getStats();
          if (freshStats && freshStats.isTracking && mountedRef.current) {
            setIsRunning(true);
            setIsPaused(freshStats.isPaused);
            setStats(freshStats);
          }
        } catch {}
      }
    });

    return () => {
      sub.remove();
      mountedRef.current = false;
      deactivateKeepAwake('running-trial').catch(() => {});
    };
  }, []);


  // Rewards formula:
  // XP: targetKm * 200
  // Coins: targetKm * 50
  const calculatedXP = Math.round(targetDistanceKm * 200);
  const calculatedCoins = Math.round(targetDistanceKm * 50);

  // Handle Start
  const handleStartRun = async () => {
    if (isRunning) return;
    completionHandled.current = false;
    haptics.heavy();
    sound.play('quest_complete');

    const result = await runningTrackerService.startTracking(
      targetDistanceKm,
      (newStats) => {
        if (mountedRef.current) setStats(newStats);
      },
      () => {
        handleRunCompleted();
      }
    );

    if (!result.success) {
      if (!mountedRef.current) return;
      Alert.alert(
        'Location Needed',
        result.error || 'Enable location permission and location services to track your run.',
        [
          { text: 'CANCEL', style: 'cancel' },
          { text: 'OPEN SETTINGS', onPress: () => Linking.openSettings().catch(() => {}) },
        ]
      );
      return;
    }

    if (mountedRef.current) {
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  // Handle Pause / Resume
  const handleTogglePause = () => {
    haptics.medium();
    if (isPaused) {
      runningTrackerService.resume();
      setIsPaused(false);
    } else {
      runningTrackerService.pause();
      setIsPaused(true);
    }
  };

  // Handle Abort / Stop
  const handleAbortRun = () => {
    haptics.warning();
    Alert.alert(
      'ABORT SPRINT TRIAL?',
      'Are you sure you want to stop this running session? Your progress will be saved in history.',
      [
        { text: 'RESUME RUN', style: 'cancel' },
        {
          text: 'ABORT',
          style: 'destructive',
          onPress: () => {
            runningTrackerService.stopTracking();
            setIsRunning(false);
            setIsPaused(false);
            router.back();
          },
        },
      ]
    );
  };

  // Handle Run Completed
  const handleRunCompleted = async () => {
    if (!mountedRef.current || completionHandled.current) return;
    completionHandled.current = true;
    haptics.success();
    sound.play('level_up');

    let earnedXP = calculatedXP;
    let earnedCoins = calculatedCoins;
    // Reconcile the run with one matching daily quest. Quest completion is
    // transactional and already grants its rewards, so never grant both sets.
    try {
      let questCompleted = false;
      if (params.questId) {
        try {
          const completion = await questService.completeQuest(parseInt(params.questId, 10));
          earnedXP = completion.earnedXP;
          earnedCoins = completion.earnedCoins;
          questCompleted = true;
        } catch {
          // If quest was already completed or not found, fall back to searching active quests
        }
      }

      if (!questCompleted) {
        const activeQuests = await questService.getDailyQuests();
        const runningQuest = activeQuests.find(
          (q) =>
            !q.completed &&
            ((q.title || '').toLowerCase().includes('run') ||
              (q.title || '').toLowerCase().includes('sprint') ||
              (q.title || '').toLowerCase().includes('walk') ||
              (q.description || '').toLowerCase().includes('run'))
        );
        if (runningQuest) {
          const completion = await questService.completeQuest(runningQuest.id);
          earnedXP = completion.earnedXP;
          earnedCoins = completion.earnedCoins;
        } else {
          await userRepository.addXP(calculatedXP);
          await coinService.addCoins(calculatedCoins, `Shadow Sprint: ${targetDistanceKm} KM`, 'quest');
        }
      }
    } catch {
      // Do not retry or issue a second reward after an uncertain transaction.
      earnedXP = 0;
      earnedCoins = 0;
    }

    try {
      const { streakService } = await import('../../src/services/streakService');
      await streakService.recordWorkoutStreak();
    } catch {}

    await loadProfile();
    await loadQuests();

    if (!mountedRef.current) return;
    setEarnedRewards({
      xp: earnedXP,
      coins: earnedCoins,
    });
    setShowCompletionModal(true);
    setIsRunning(false);
    setIsPaused(false);
  };

  // Format Elapsed Time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.round((stats.distanceKm / targetDistanceKm) * 100));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F6F4EF' }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: '#E8E4DC', backgroundColor: '#F6F4EF' }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (isRunning) {
              handleAbortRun();
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <CaretLeft size={22} color="#1A1A1A" weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#1A1A1A' }]}>SHADOW SPRINT TRIAL</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isRunning ? (
          /* ======================= 1. SETUP / GOAL SELECTOR ======================= */
          <View style={{ gap: 20 }}>
            {/* Solo Leveling Objective Card */}
            <View style={[styles.goalCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
              <View style={styles.systemTagBadge}>
                <Text style={styles.systemTagText}>[ DAILY HUNTER TRIAL : RUNNING ]</Text>
              </View>
              <Text style={[styles.goalTitle, { color: '#1A1A1A' }]}>
                CALIBRATE TARGET DISTANCE
              </Text>
              <Text style={[styles.goalSub, { color: '#6B7280' }]}>
                Sprint or jog outdoors. Real-time GPS and step sensors will track your distance. Higher distance awards massive XP & Coins!
              </Text>

              {/* Big Distance Display */}
              <View style={styles.bigDistanceDisplay}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: '#F6F4EF', borderColor: '#E8E4DC', borderWidth: 1 }]}
                  onPress={() => {
                    haptics.light();
                    setTargetDistanceKm((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10));
                  }}
                >
                  <Minus size={20} color="#1A1A1A" weight="bold" />
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.bigDistanceNumber, { color: '#E53935' }]}>
                    {targetDistanceKm.toFixed(1)}
                  </Text>
                  <Text style={[styles.bigDistanceUnit, { color: '#6B7280' }]}>KILOMETERS</Text>
                </View>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: '#F6F4EF', borderColor: '#E8E4DC', borderWidth: 1 }]}
                  onPress={() => {
                    haptics.light();
                    setTargetDistanceKm((prev) => Math.min(20, Math.round((prev + 0.5) * 10) / 10));
                  }}
                >
                  <Plus size={20} color="#1A1A1A" weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Quick Distance Presets */}
              <View style={styles.presetRow}>
                {DISTANCE_PRESETS.map((preset) => {
                  const isSelected = targetDistanceKm === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetPill,
                        {
                          backgroundColor: isSelected ? '#E53935' : '#F6F4EF',
                          borderColor: isSelected ? '#E53935' : '#E8E4DC',
                        },
                      ]}
                      onPress={() => {
                        haptics.light();
                        setTargetDistanceKm(preset);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          { color: isSelected ? '#FFFFFF' : '#6B7280' },
                        ]}
                      >
                        {preset}k
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Projected Rewards Bounty Box */}
            <View style={[styles.rewardPreviewCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1 }]}>
              <Text style={[styles.rewardPreviewLabel, { color: '#6B7280' }]}>
                PROJECTED QUEST CLEAR REWARDS:
              </Text>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <Icon3D name="lightning_yellow" size={18} />
                  <Text style={[styles.rewardVal, { color: '#D97706' }]}>+{calculatedXP} XP</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Icon3D name="coin_gold" size={18} />
                  <Text style={[styles.rewardVal, { color: '#D97706' }]}>+{calculatedCoins} Coins</Text>
                </View>
              </View>
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: '#E53935',
                  height: 52,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 10,
                },
              ]}
              onPress={handleStartRun}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { fontSize: 15, fontWeight: '700' }]}>
                INITIATE SPRINT TRIAL
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ======================= 2. LIVE RUNNING HUD ======================= */
          <View style={{ gap: 18 }}>
            {/* Vehicle Anti-Cheat Warning Banner */}
            {stats.isVehicleSpeed && (
              <View style={styles.vehicleWarningBanner}>
                <WarningCircle size={20} color="#E53935" weight="fill" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleWarningTitle}>VEHICLE SPEED DETECTED!</Text>
                  <Text style={styles.vehicleWarningSub}>
                    Speed exceeding 25 km/h. Running tracking paused to prevent fraudulent distance.
                  </Text>
                </View>
              </View>
            )}

            {/* Big Circular Telemetry HUD */}
            <View style={styles.circleProgressContainer}>
              <Animated.View
                style={[
                  styles.circlePulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: isPaused ? '#F59E0B' : '#E53935',
                  },
                ]}
              />
              <View style={[styles.circleInnerCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC', borderWidth: 1 }]}>
                <Text style={[styles.liveDistanceNumber, { color: '#1A1A1A' }]}>
                  {stats.distanceKm.toFixed(2)}
                </Text>
                <Text style={[styles.liveDistanceSub, { color: '#6B7280' }]}>
                  / {targetDistanceKm.toFixed(1)} KM
                </Text>

                <View style={[styles.progressCapsule, { backgroundColor: '#FFF2F2' }]}>
                  <Text style={[styles.progressPercentText, { color: '#E53935' }]}>
                    {progressPercent}% COMPLETED
                  </Text>
                </View>
              </View>
            </View>

            {/* 3 Primary Telemetry Cards (Speed, Pace, Steps) */}
            <View style={styles.telemetryGrid}>
              {/* Speed */}
              <View style={[styles.telemetryCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
                <Icon3D name="speedometer_red" size={24} />
                <Text style={[styles.telemetryVal, { color: '#1A1A1A' }]}>
                  {stats.speedKmh.toFixed(1)}
                </Text>
                <Text style={[styles.telemetryUnit, { color: '#6B7280' }]}>KM/H SPEED</Text>
              </View>

              {/* Pace */}
              <View style={[styles.telemetryCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
                <Icon3D name="stopwatch_silver" size={24} />
                <Text style={[styles.telemetryVal, { color: '#1A1A1A' }]}>
                  {stats.paceMinKm}
                </Text>
                <Text style={[styles.telemetryUnit, { color: '#6B7280' }]}>PACE /KM</Text>
              </View>

              {/* Steps */}
              <View style={[styles.telemetryCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
                <Icon3D name="footprints_orange" size={24} />
                <Text style={[styles.telemetryVal, { color: '#1A1A1A' }]}>
                  {stats.steps.toLocaleString()}
                </Text>
                <Text style={[styles.telemetryUnit, { color: '#6B7280' }]}>TOTAL STEPS</Text>
              </View>
            </View>

            {/* Secondary Stats Row (Time & Calories) */}
            <View style={styles.secondaryRow}>
              <View style={[styles.secondaryPill, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC', borderWidth: 1 }]}>
                <Icon3D name="clock_green" size={16} />
                <Text style={[styles.secondaryLabel, { color: '#6B7280' }]}>TIME:</Text>
                <Text style={[styles.secondaryVal, { color: '#1A1A1A' }]}>
                  {formatTime(stats.elapsedSeconds)}
                </Text>
              </View>

              <View style={[styles.secondaryPill, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC', borderWidth: 1 }]}>
                <Icon3D name="flame_orange" size={16} />
                <Text style={[styles.secondaryLabel, { color: '#6B7280' }]}>BURN:</Text>
                <Text style={[styles.secondaryVal, { color: '#F59E0B' }]}>
                  {stats.caloriesBurned} kcal
                </Text>
              </View>
            </View>

            {/* Active Running Controls */}
            <View style={styles.controlBtnRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: isPaused ? '#2563EB' : '#F59E0B' },
                ]}
                onPress={handleTogglePause}
                activeOpacity={0.8}
              >
                {isPaused ? <Play size={20} color="#FFFFFF" weight="fill" /> : <Pause size={20} color="#FFFFFF" weight="fill" />}
                <Text style={styles.actionBtnText}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E53935' }]}
                onPress={handleAbortRun}
                activeOpacity={0.8}
              >
                <Stop size={20} color="#FFFFFF" weight="fill" />
                <Text style={styles.actionBtnText}>FINISH / STOP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ======================= 3. QUEST COMPLETED MODAL ======================= */}
      <Modal visible={showCompletionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.modalCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
              {/* Header Badge */}
              <View style={styles.modalTagBadge}>
                <Text style={styles.modalTagText}>[ SYSTEM TRIAL COMPLETED ]</Text>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <Icon3D name="trophy_gold" size={64} />
                <Text style={[styles.modalSuccessTitle, { color: '#1A1A1A' }]}>SHADOW SPRINT CLEARED!</Text>
                <Text style={[styles.modalSuccessSub, { color: '#6B7280' }]}>
                  You have conquered the {targetDistanceKm} KM distance trial. Your physical vessel grows stronger!
                </Text>
              </View>

              {/* Claimed Rewards Box */}
              <View style={[styles.modalRewardBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1 }]}>
                <Text style={[styles.modalRewardLabel, { color: '#6B7280' }]}>REWARDS CREDITED TO YOUR VAULT:</Text>
                <View style={styles.modalRewardRow}>
                  <View style={styles.modalRewardBadge}>
                    <Icon3D name="lightning_yellow" size={16} />
                    <Text style={[styles.modalRewardValue, { color: '#D97706' }]}>+{earnedRewards.xp} XP</Text>
                  </View>
                  <View style={styles.modalRewardBadge}>
                    <Icon3D name="coin_gold" size={16} />
                    <Text style={[styles.modalRewardValue, { color: '#D97706' }]}>
                      +{earnedRewards.coins} Coins
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: '#E53935',
                    height: 52,
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 14,
                  },
                ]}
                onPress={() => {
                  haptics.heavy();
                  setShowCompletionModal(false);
                  router.back();
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionBtnText, { fontSize: 15, fontWeight: '700' }]}>
                  COLLECT REWARDS & RETURN
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Setup Styles
  goalCard: {
    padding: 20,
    gap: 12,
  },
  systemTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 210, 238, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 238, 0.3)',
  },
  systemTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#00D2EE',
    letterSpacing: 0.8,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  goalSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  bigDistanceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 14,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigDistanceNumber: {
    fontSize: 52,
    fontWeight: '600',
    letterSpacing: -1,
  },
  bigDistanceUnit: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rewardPreviewCard: {
    padding: 16,
    gap: 10,
  },
  rewardPreviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardVal: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Live Running HUD Styles
  vehicleWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 30, 68, 0.15)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF1E44',
  },
  vehicleWarningTitle: {
    color: '#FF1E44',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  vehicleWarningSub: {
    color: '#CBD5E1',
    fontSize: 10.5,
    lineHeight: 14,
  },
  circleProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    height: 230,
  },
  circlePulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    opacity: 0.4,
  },
  circleInnerCard: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 238, 0.5)',
    gap: 4,
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  liveDistanceNumber: {
    fontSize: 44,
    fontWeight: '600',
    letterSpacing: -1,
  },
  liveDistanceSub: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    marginTop: 4,
  },
  progressPercentText: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  telemetryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  telemetryVal: {
    fontSize: 17,
    fontWeight: '600',
  },
  telemetryUnit: {
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  secondaryVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
  },
  modalSafe: {
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 16,
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 210, 238, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00D2EE',
  },
  modalTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00D2EE',
    letterSpacing: 0.6,
  },
  modalSuccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  modalSuccessSub: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  modalRewardBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalRewardLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  modalRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  modalRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalRewardValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D2EE',
  },
});
