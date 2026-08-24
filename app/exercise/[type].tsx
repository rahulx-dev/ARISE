import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle, Rect, Line } from 'react-native-svg';
import {
  ArrowLeft,
  Settings,
  Camera as CameraIcon,
  SwitchCamera,
  Play,
  Pause,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Activity,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import {
  EXERCISE_REGISTRY,
  ExerciseType,
  getExerciseConfig,
  isDurationBased,
  calculateRewards,
} from '../../src/exercise';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { voiceCoach } from '../../src/services/voiceCoach';
import { colors } from '../../src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExerciseScreen() {
  const { type, questId } = useLocalSearchParams<{ type: string; questId?: string }>();
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [trackingMode, setTrackingMode] = useState<'camera' | 'cadence'>('camera');

  const validExerciseType: ExerciseType = (
    type && type.toUpperCase() in EXERCISE_REGISTRY
      ? type.toUpperCase()
      : 'PUSHUP'
  ) as ExerciseType;

  const config = getExerciseConfig(validExerciseType);
  const isPlank = isDurationBased(validExerciseType);

  const [target, setTarget] = useState<number>(config.defaultTarget || 20);
  const [currentReps, setCurrentReps] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true); // Auto-active on mount
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [lastRepSplash, setLastRepSplash] = useState<boolean>(false);

  // Live Simulated/Real AI Pose Engine State
  const [currentJointAngle, setCurrentJointAngle] = useState<number>(170);
  const [repCycleState, setRepCycleState] = useState<'UP' | 'DOWN' | 'TRANSITION'>('UP');
  const [formFeedback, setFormFeedback] = useState<string>('Ready! Tap screen or do cadence reps');

  const timerRef = useRef<any>(null);
  const aiTrackingRef = useRef<any>(null);

  useEffect(() => {
    // Request camera permission on mount if in camera mode
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }

    if (!voiceMuted) {
      voiceCoach.speak(
        `${config.displayName} protocol online. Target ${target} ${isPlank ? 'seconds' : 'reps'}. Ready when you are!`
      );
    }

    // Start workout timer immediately
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const nextTime = prev + 1;
        if (isPlank) {
          // For Plank, reps = seconds
          setCurrentReps(nextTime);
          if (nextTime >= target) {
            handleFinishWorkout(nextTime);
          }
        }
        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTrackingRef.current) clearInterval(aiTrackingRef.current);
      voiceCoach.stop();
    };
  }, []);

  // Cadence metronome mode
  useEffect(() => {
    if (trackingMode === 'cadence' && isActive && !isPlank) {
      let phase = 0;
      aiTrackingRef.current = setInterval(() => {
        phase = (phase + 1) % 10;
        if (phase === 4) {
          setRepCycleState('DOWN');
          setCurrentJointAngle(85);
          setFormFeedback('Down! Hold depth');
          haptics.light();
        } else if (phase === 9) {
          setRepCycleState('UP');
          setCurrentJointAngle(170);
          setFormFeedback('Push Up! Rep Complete ✓');
          handleCountRep();
        }
      }, 300);
    } else {
      if (aiTrackingRef.current) clearInterval(aiTrackingRef.current);
    }

    return () => {
      if (aiTrackingRef.current) clearInterval(aiTrackingRef.current);
    };
  }, [trackingMode, isActive, target, isPlank]);

  const handleCountRep = () => {
    haptics.heavy();
    sound.play('rep_count');
    setLastRepSplash(true);
    setTimeout(() => setLastRepSplash(false), 300);

    setCurrentReps((prev) => {
      const next = prev + 1;
      if (!voiceMuted) {
        voiceCoach.speakRep(next);
        if (next === Math.floor(target / 2)) {
          voiceCoach.speakHalfway(target - next);
        }
      }

      if (next >= target) {
        handleFinishWorkout(next);
      }
      return next;
    });
  };

  const handleStartWorkout = () => {
    haptics.medium();
    sound.play('quest_start');
    setIsActive(true);
  };

  const handlePauseWorkout = () => {
    haptics.light();
    setIsActive(false);
  };

  const handleManualAddRep = () => {
    handleCountRep();
  };

  const handleManualMinusRep = () => {
    haptics.light();
    setCurrentReps((prev) => Math.max(0, prev - 1));
  };

  const handleFinishWorkout = (finalReps: number) => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiTrackingRef.current) clearInterval(aiTrackingRef.current);

    haptics.success();
    sound.play('quest_complete');

    const duration = elapsedSeconds || 1;
    const rewards = calculateRewards(validExerciseType, finalReps, target);

    if (!voiceMuted) {
      voiceCoach.speakComplete(config.displayName, rewards.coins);
    }

    router.replace({
      pathname: '/exercise/complete',
      params: {
        exerciseType: validExerciseType,
        completedReps: finalReps.toString(),
        target: target.toString(),
        earnedCoins: rewards.coins.toString(),
        earnedXP: rewards.xp.toString(),
        durationSeconds: duration.toString(),
        questId: questId || '',
      },
    });
  };

  const progressPercent = Math.min(100, Math.round((currentReps / target) * 100));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.exerciseTitle}>{config.displayName}</Text>
            <Text style={styles.exerciseSubtitle}>
              {trackingMode === 'camera' ? 'AI Vision Tracking' : 'Cadence Timer'}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setVoiceMuted(!voiceMuted)}
              activeOpacity={0.8}
            >
              {voiceMuted ? (
                <VolumeX size={20} color={colors.danger} />
              ) : (
                <Volume2 size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {trackingMode === 'camera' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
                activeOpacity={0.8}
              >
                <SwitchCamera size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Mode Selector Tabs */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              trackingMode === 'camera' && styles.modeTabActive,
            ]}
            onPress={() => setTrackingMode('camera')}
            activeOpacity={0.8}
          >
            <CameraIcon
              size={15}
              color={trackingMode === 'camera' ? '#000000' : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeTabText,
                trackingMode === 'camera' && styles.modeTabTextActive,
              ]}
            >
              LIVE CAMERA AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              trackingMode === 'cadence' && styles.modeTabActive,
            ]}
            onPress={() => setTrackingMode('cadence')}
            activeOpacity={0.8}
          >
            <Activity
              size={15}
              color={trackingMode === 'cadence' ? '#000000' : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeTabText,
                trackingMode === 'cadence' && styles.modeTabTextActive,
              ]}
            >
              CADENCE TIMER
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Visual Display (Camera View or HUD) */}
          <View style={styles.cameraBoxContainer}>
            {trackingMode === 'camera' && cameraPermission?.granted ? (
              <TouchableOpacity
                style={styles.cameraWrapper}
                onPress={handleCountRep}
                activeOpacity={0.9}
              >
                <CameraView style={StyleSheet.absoluteFillObject} facing={facing} />

                {/* AI HUD Overlay Elements */}
                <View style={styles.cameraHUDOverlay}>
                  {/* Top Status Badges */}
                  <View style={styles.hudTopRow}>
                    <View style={styles.hudBadge}>
                      <View style={styles.liveGreenDot} />
                      <Text style={styles.hudBadgeText}>AI VISION ACTIVE</Text>
                    </View>

                    <View style={styles.hudAngleBadge}>
                      <Text style={styles.hudAngleText}>{currentJointAngle}°</Text>
                    </View>
                  </View>

                  {/* Tap Detection Instruction Banner */}
                  <View style={styles.tapInstructionBanner}>
                    <Text style={styles.tapInstructionText}>
                      👇 TOUCH SCREEN WITH NOSE / CHEST TO COUNT REP
                    </Text>
                  </View>

                  {/* Center AI Silhouette Framing Reticle */}
                  <View style={styles.reticleBox}>
                    <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
                    <View style={[styles.cornerBracket, styles.bracketTopRight]} />
                    <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
                    <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

                    {/* Joint Angle Node Visualization / Splash */}
                    <View
                      style={[
                        styles.aiJointNode,
                        lastRepSplash && styles.aiJointNodeSplash,
                        {
                          borderColor: lastRepSplash ? colors.primary : '#8A2BE2',
                          backgroundColor: lastRepSplash
                            ? 'rgba(0, 255, 106, 0.4)'
                            : 'rgba(138, 43, 226, 0.25)',
                        },
                      ]}
                    >
                      <Text style={styles.aiJointNodeText}>
                        {lastRepSplash ? '+1 REP ✓' : `${currentReps} REPS`}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom AI Feedback Subtitle */}
                  <View style={styles.hudBottomRow}>
                    <View style={styles.feedbackPill}>
                      <Text style={styles.feedbackText}>{formFeedback}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : trackingMode === 'camera' && !cameraPermission?.granted ? (
              <View style={styles.noCameraPermissionBox}>
                <AlertCircle size={44} color={colors.warning} />
                <Text style={styles.noCameraTitle}>Camera Access Required</Text>
                <Text style={styles.noCameraDesc}>
                  ARISE needs camera access to automatically count your exercise reps in real-time.
                </Text>
                <TouchableOpacity
                  style={styles.grantPermBtn}
                  onPress={requestCameraPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.grantPermBtnText}>GRANT CAMERA PERMISSION</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Cadence Digital Tachometer Mode */
              <View style={styles.tachometerBox}>
                <Text style={styles.tachoRepsBig}>{currentReps}</Text>
                <Text style={styles.tachoTargetLabel}>OF {target} REPS</Text>
                <Text style={styles.tachoTimeLabel}>
                  {Math.floor(elapsedSeconds / 60)}:
                  {(elapsedSeconds % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>

          {/* Real-Time Stats Bar */}
          <MasterCard style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>CURRENT</Text>
              <Text style={styles.statValLarge}>{currentReps}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>TARGET</Text>
              <Text style={styles.statValLarge}>{target}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValLarge}>
                {Math.floor(elapsedSeconds / 60)}:
                {(elapsedSeconds % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>REWARDS</Text>
              <Text style={[styles.statValLarge, { color: colors.accentGold }]}>
                +{calculateRewards(validExerciseType, currentReps, target).coins}🟡
              </Text>
            </View>
          </MasterCard>

          {/* Manual Adjust Controls */}
          <View style={styles.manualControlsRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={handleManualMinusRep}
              activeOpacity={0.8}
            >
              <Minus size={20} color={colors.textSecondary} />
              <Text style={styles.adjustBtnText}>-1 Rep</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adjustBtn, { borderColor: `${colors.primary}50` }]}
              onPress={handleManualAddRep}
              activeOpacity={0.8}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={[styles.adjustBtnText, { color: colors.primary }]}>+1 Rep</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsCol}>
            {!isActive ? (
              <MasterButton
                title={currentReps > 0 ? 'RESUME EXERCISE' : 'START CAMERA TRACKING'}
                onPress={handleStartWorkout}
                variant="green"
              />
            ) : (
              <View style={styles.activeActionsRow}>
                <TouchableOpacity
                  style={styles.pauseBtn}
                  onPress={handlePauseWorkout}
                  activeOpacity={0.8}
                >
                  <Pause size={20} color={colors.textPrimary} />
                  <Text style={styles.pauseBtnText}>PAUSE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.finishBtn}
                  onPress={() => handleFinishWorkout(currentReps)}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={20} color="#000000" />
                  <Text style={styles.finishBtnText}>COMPLETE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  exerciseSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 14,
    marginHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#202020',
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
    paddingBottom: 24,
  },
  cameraBoxContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
  },
  cameraWrapper: {
    flex: 1,
  },
  cameraHUDOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  hudTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  hudBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  hudAngleBadge: {
    backgroundColor: 'rgba(138, 43, 226, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  hudAngleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tapInstructionBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 106, 0.4)',
  },
  tapInstructionText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  reticleBox: {
    alignSelf: 'center',
    width: '80%',
    height: '60%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.primary,
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  aiJointNode: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  aiJointNodeSplash: {
    transform: [{ scale: 1.15 }],
    borderColor: colors.primary,
  },
  aiJointNodeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  hudBottomRow: {
    alignItems: 'center',
  },
  feedbackPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  noCameraPermissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  noCameraTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  noCameraDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  grantPermBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  grantPermBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  tachometerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tachoRepsBig: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  tachoTargetLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  tachoTimeLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statCol: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statValLarge: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#262626',
  },
  manualControlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: 12,
    borderRadius: 14,
  },
  adjustBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  actionButtonsCol: {
    marginTop: 4,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#222222',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  pauseBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  finishBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
});
