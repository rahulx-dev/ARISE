import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
import { userRepository } from '../../src/database/repositories/userRepository';
import { coinService } from '../../src/services/coinService';
import { questService } from '../../src/services/questService';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const DISTANCE_PRESETS = [0.5, 1.0, 2.0, 3.0, 5.0, 10.0];

export default function RunningScreen() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();

  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const loadQuests = useQuestStore((s) => s.loadQuests);

  // Setup / Tracking States
  const [targetDistanceKm, setTargetDistanceKm] = useState<number>(1.0);
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

  useEffect(() => {
    if (isRunning && !isPaused) {
      Animated.loop(
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
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning, isPaused]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      runningTrackerService.stopTracking();
    };
  }, []);

  // Rewards formula:
  // XP: targetKm * 200
  // Coins: targetKm * 50
  const calculatedXP = Math.round(targetDistanceKm * 200);
  const calculatedCoins = Math.round(targetDistanceKm * 50);

  // Handle Start
  const handleStartRun = async () => {
    haptics.heavy();
    sound.play('quest_complete');

    const result = await runningTrackerService.startTracking(
      targetDistanceKm,
      (newStats) => {
        setStats(newStats);
      },
      () => {
        handleRunCompleted();
      }
    );

    if (!result.success) {
      Alert.alert('Permission Needed', result.error || 'Please grant location permission to track your run.');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
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
    haptics.success();
    sound.play('level_up');

    // Grant rewards (Hunter XP & in-game Coins only)
    await userRepository.addXP(calculatedXP);
    await coinService.addCoins(calculatedCoins, `Shadow Sprint: ${targetDistanceKm} KM`, 'quest');

    // Auto complete running daily quest if exists
    try {
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
        await questService.completeQuest(runningQuest.id);
      }
    } catch {}

    await loadProfile();
    await loadQuests();

    setEarnedRewards({
      xp: calculatedXP,
      coins: calculatedCoins,
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
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
          <CaretLeft size={22} color={colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>SHADOW SPRINT TRIAL</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isRunning ? (
          /* ======================= 1. SETUP / GOAL SELECTOR ======================= */
          <View style={{ gap: 20 }}>
            {/* Solo Leveling Objective Card */}
            <GlassCard variant="glow" style={styles.goalCard}>
              <View style={styles.systemTagBadge}>
                <Text style={styles.systemTagText}>[ DAILY HUNTER TRIAL : RUNNING ]</Text>
              </View>
              <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>
                CALIBRATE TARGET DISTANCE
              </Text>
              <Text style={[styles.goalSub, { color: colors.textSecondary }]}>
                Sprint or jog outdoors/indoors. Real-time GPS and step sensors will track your distance. Higher distance awards massive XP & Mana Crystals!
              </Text>

              {/* Big Distance Display */}
              <View style={styles.bigDistanceDisplay}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: isDark ? '#161926' : '#E2E8F0' }]}
                  onPress={() => {
                    haptics.light();
                    setTargetDistanceKm((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10));
                  }}
                >
                  <Minus size={20} color={colors.textPrimary} weight="bold" />
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.bigDistanceNumber, { color: colors.primary }]}>
                    {targetDistanceKm.toFixed(1)}
                  </Text>
                  <Text style={[styles.bigDistanceUnit, { color: colors.textSecondary }]}>KILOMETERS</Text>
                </View>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: isDark ? '#161926' : '#E2E8F0' }]}
                  onPress={() => {
                    haptics.light();
                    setTargetDistanceKm((prev) => Math.min(20, Math.round((prev + 0.5) * 10) / 10));
                  }}
                >
                  <Plus size={20} color={colors.textPrimary} weight="bold" />
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
                          backgroundColor: isSelected ? colors.primary : isDark ? '#111420' : '#F1F5F9',
                          borderColor: isSelected ? colors.primary : colors.border,
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
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {preset}k
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>

            {/* Projected Rewards Bounty Box */}
            <GlassCard style={styles.rewardPreviewCard}>
              <Text style={[styles.rewardPreviewLabel, { color: colors.textMuted }]}>
                PROJECTED QUEST CLEAR REWARDS:
              </Text>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <Sparkle size={18} color="#00D2EE" weight="fill" />
                  <Text style={[styles.rewardVal, { color: '#00D2EE' }]}>+{calculatedXP} XP</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Coins size={18} color="#F59E0B" weight="duotone" />
                  <Text style={[styles.rewardVal, { color: '#F59E0B' }]}>+{calculatedCoins} Coins</Text>
                </View>
              </View>
            </GlassCard>

            {/* Start Button */}
            <GlassButton
              title="INITIATE SPRINT TRIAL"
              variant="primary"
              size="lg"
              onPress={handleStartRun}
              style={{ marginTop: 10 }}
            />
          </View>
        ) : (
          /* ======================= 2. LIVE RUNNING HUD ======================= */
          <View style={{ gap: 18 }}>
            {/* Vehicle Anti-Cheat Warning Banner */}
            {stats.isVehicleSpeed && (
              <View style={styles.vehicleWarningBanner}>
                <WarningCircle size={20} color="#FF1E44" weight="fill" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleWarningTitle}>VEHICLE SPEED DETECTED!</Text>
                  <Text style={styles.vehicleWarningSub}>
                    Speed exceeding 25 km/h. Running tracking paused to prevent fraudulent distance.
                  </Text>
                </View>
              </View>
            )}

            {/* Big Circular Holographic Telemetry HUD */}
            <View style={styles.circleProgressContainer}>
              <Animated.View
                style={[
                  styles.circlePulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: isPaused ? '#F59E0B' : '#00D2EE',
                  },
                ]}
              />
              <View style={[styles.circleInnerCard, { backgroundColor: isDark ? '#080B14' : '#F8FAFC' }]}>
                <Text style={[styles.liveDistanceNumber, { color: colors.textPrimary }]}>
                  {stats.distanceKm.toFixed(2)}
                </Text>
                <Text style={[styles.liveDistanceSub, { color: colors.textSecondary }]}>
                  / {targetDistanceKm.toFixed(1)} KM
                </Text>

                <View style={[styles.progressCapsule, { backgroundColor: isDark ? '#151824' : '#E2E8F0' }]}>
                  <Text style={[styles.progressPercentText, { color: colors.primary }]}>
                    {progressPercent}% COMPLETED
                  </Text>
                </View>
              </View>
            </View>

            {/* 3 Primary Telemetry Cards (Speed, Pace, Steps) */}
            <View style={styles.telemetryGrid}>
              {/* Speed */}
              <GlassCard style={styles.telemetryCard}>
                <Lightning size={18} color="#00D2EE" weight="duotone" />
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {stats.speedKmh.toFixed(1)}
                </Text>
                <Text style={[styles.telemetryUnit, { color: colors.textMuted }]}>KM/H SPEED</Text>
              </GlassCard>

              {/* Pace */}
              <GlassCard style={styles.telemetryCard}>
                <Clock size={18} color="#0A84FF" weight="duotone" />
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {stats.paceMinKm}
                </Text>
                <Text style={[styles.telemetryUnit, { color: colors.textMuted }]}>PACE /KM</Text>
              </GlassCard>

              {/* Steps */}
              <GlassCard style={styles.telemetryCard}>
                <Footprints size={18} color="#10B981" weight="duotone" />
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {stats.steps.toLocaleString()}
                </Text>
                <Text style={[styles.telemetryUnit, { color: colors.textMuted }]}>TOTAL STEPS</Text>
              </GlassCard>
            </View>

            {/* Secondary Stats Row (Time & Calories) */}
            <View style={styles.secondaryRow}>
              <View style={[styles.secondaryPill, { backgroundColor: isDark ? '#0A0D15' : '#F1F5F9' }]}>
                <Clock size={15} color="#8E8E93" />
                <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>TIME:</Text>
                <Text style={[styles.secondaryVal, { color: colors.textPrimary }]}>
                  {formatTime(stats.elapsedSeconds)}
                </Text>
              </View>

              <View style={[styles.secondaryPill, { backgroundColor: isDark ? '#0A0D15' : '#F1F5F9' }]}>
                <Fire size={15} color="#F59E0B" weight="fill" />
                <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>BURN:</Text>
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
                  { backgroundColor: isPaused ? '#0A84FF' : '#F59E0B' },
                ]}
                onPress={handleTogglePause}
                activeOpacity={0.8}
              >
                {isPaused ? <Play size={20} color="#FFFFFF" weight="fill" /> : <Pause size={20} color="#FFFFFF" weight="fill" />}
                <Text style={styles.actionBtnText}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FF1E44' }]}
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
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#060911' : '#0B1120', borderColor: '#00D2EE' }]}>
              {/* Header Badge */}
              <View style={styles.modalTagBadge}>
                <Text style={styles.modalTagText}>[ SYSTEM TRIAL COMPLETED ]</Text>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <Trophy size={56} color="#F59E0B" weight="duotone" />
                <Text style={styles.modalSuccessTitle}>SHADOW SPRINT CLEARED!</Text>
                <Text style={styles.modalSuccessSub}>
                  You have conquered the {targetDistanceKm} KM distance trial. Your physical vessel grows stronger!
                </Text>
              </View>

              {/* Claimed Rewards Box */}
              <View style={styles.modalRewardBox}>
                <Text style={styles.modalRewardLabel}>REWARDS CREDITED TO YOUR VAULT:</Text>
                <View style={styles.modalRewardRow}>
                  <View style={styles.modalRewardBadge}>
                    <Sparkle size={16} color="#00D2EE" weight="fill" />
                    <Text style={styles.modalRewardValue}>+{earnedRewards.xp} XP</Text>
                  </View>
                  <View style={styles.modalRewardBadge}>
                    <Coins size={16} color="#F59E0B" weight="duotone" />
                    <Text style={[styles.modalRewardValue, { color: '#F59E0B' }]}>
                      +{earnedRewards.coins} Coins
                    </Text>
                  </View>
                </View>
              </View>

              <GlassButton
                title="COLLECT REWARDS & RETURN"
                variant="primary"
                size="lg"
                onPress={() => {
                  haptics.heavy();
                  setShowCompletionModal(false);
                  router.back();
                }}
              />
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
    fontWeight: '900',
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
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.8,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '900',
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
    fontWeight: '900',
    letterSpacing: -1,
  },
  bigDistanceUnit: {
    fontSize: 10.5,
    fontWeight: '800',
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
    fontWeight: '800',
  },
  rewardPreviewCard: {
    padding: 16,
    gap: 10,
  },
  rewardPreviewLabel: {
    fontSize: 10,
    fontWeight: '800',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
  },
  telemetryUnit: {
    fontSize: 8.5,
    fontWeight: '800',
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
    fontWeight: '800',
  },
  secondaryVal: {
    fontSize: 12,
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.6,
  },
  modalSuccessTitle: {
    fontSize: 18,
    fontWeight: '900',
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
    fontWeight: '800',
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
    fontWeight: '900',
    color: '#00D2EE',
  },
});
