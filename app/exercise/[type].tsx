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
import {
  X,
  Camera as CameraIcon,
  SwitchCamera,
  Play,
  Pause,
  StopCircle,
  AlertCircle,
  Activity,
  Volume2,
  VolumeX,
  Eye,
  Zap,
} from 'lucide-react-native';
import {
  EXERCISE_REGISTRY,
  ExerciseType,
  getExerciseConfig,
  isDurationBased,
  calculateRewards,
  createInitialState,
  processFrame,
  RepCounterState,
} from '../../src/exercise';
import {
  initialize as initPoseDetector,
  processBase64Frame,
  release as releasePoseDetector,
  convertToMoveNetKeypoints,
} from '../../modules/pose-detector';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { voiceCoach } from '../../src/services/voiceCoach';
import { colors } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

export default function ExerciseScreen() {
  const { type, questId, target: paramTarget } = useLocalSearchParams<{
    type: string;
    questId?: string;
    target?: string;
  }>();
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');

  const validExerciseType: ExerciseType = (
    type && type.toUpperCase() in EXERCISE_REGISTRY
      ? type.toUpperCase()
      : 'PUSHUP'
  ) as ExerciseType;

  const config = getExerciseConfig(validExerciseType);
  const isPlank = isDurationBased(validExerciseType);

  const target = paramTarget ? parseInt(paramTarget, 10) : (config.defaultTarget || 20);
  const [currentReps, setCurrentReps] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);

  // Form geometry & tracking state machine
  const [currentJointAngle, setCurrentJointAngle] = useState<number>(170);
  const [formFeedback, setFormFeedback] = useState<string>('Ready! Position body in camera view');
  const [isBodyDetected, setIsBodyDetected] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const repsRef = useRef<number>(0);
  const repStateRef = useRef<RepCounterState>(createInitialState());
  const isMountedRef = useRef<boolean>(true);
  const isProcessingFrameRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;

    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }

    // Initialize on-device ML Kit Pose Detector
    initPoseDetector()
      .then((success) => {
        if (__DEV__) {
          console.log('[ARISE AI] ML Kit PoseDetector initialized:', success);
        }
      })
      .catch((err) => {
        console.warn('[ARISE AI] PoseDetector init warning:', err);
      });

    if (!voiceMuted) {
      voiceCoach.speak(
        `${config.displayName} tracking active. Target: ${target} ${isPlank ? 'seconds' : 'reps'}. Get into position!`
      );
    }

    // Elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const nextTime = prev + 1;
        if (isPlank) {
          setCurrentReps(nextTime);
          repsRef.current = nextTime;
          if (nextTime >= target) {
            handleFinishWorkout(nextTime);
          }
        }
        return nextTime;
      });
    }, 1000);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      voiceCoach.stop();
      releasePoseDetector();
    };
  }, []);

  // Real on-device ML Kit Pose Detection Loop
  useEffect(() => {
    if (!isActive || isPlank) return;

    let frameLoopTimer: any = null;

    const runPoseInference = async () => {
      if (!isMountedRef.current || !isActive || isProcessingFrameRef.current) return;

      if (!cameraRef.current || !cameraPermission?.granted) {
        frameLoopTimer = setTimeout(runPoseInference, 500);
        return;
      }

      isProcessingFrameRef.current = true;
      setIsAiProcessing(true);

      try {
        // Capture lightweight snapshot frame
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3,
          skipProcessing: true,
          shutterSound: false,
        });

        if (photo?.base64 && isMountedRef.current) {
          // Process on-device with ML Kit
          const landmarks = await processBase64Frame(photo.base64);

          if (isMountedRef.current && landmarks.length > 0) {
            // Convert ML Kit 33 landmarks to MoveNet 17 keypoints
            const keypoints = convertToMoveNetKeypoints(landmarks);

            // Execute state machine
            const now = Date.now();
            const nextState = processFrame(repStateRef.current, keypoints, config, now);
            repStateRef.current = nextState;

            setIsBodyDetected(nextState.isBodyDetected);
            setCurrentJointAngle(Math.round(nextState.lastAngle || 0));
            setFormFeedback(nextState.feedback.message);

            // Check if a new rep was completed
            if (nextState.count > repsRef.current) {
              const newCount = nextState.count;
              handleCountRep(newCount);
            }
          } else if (isMountedRef.current) {
            setIsBodyDetected(false);
            setFormFeedback('Move into frame');
          }
        }
      } catch (err) {
        // Frame capture skipped or camera busy
      } finally {
        isProcessingFrameRef.current = false;
        if (isMountedRef.current) {
          setIsAiProcessing(false);
          // Throttle next inference (~120ms interval for smooth performance)
          frameLoopTimer = setTimeout(runPoseInference, 120);
        }
      }
    };

    // Start inference loop
    frameLoopTimer = setTimeout(runPoseInference, 600);

    return () => {
      if (frameLoopTimer) clearTimeout(frameLoopTimer);
    };
  }, [isActive, isPlank, cameraPermission?.granted]);

  const handleCountRep = (newCount: number) => {
    repsRef.current = newCount;
    setCurrentReps(newCount);

    haptics.heavy();
    sound.play('rep_count');

    try {
      if (!voiceMuted) {
        if (newCount === Math.floor(target / 2)) {
          voiceCoach.speakHalfway(target - newCount);
        } else {
          voiceCoach.speakRep(newCount);
        }
      }
    } catch {}

    if (newCount >= target) {
      handleFinishWorkout(newCount);
    }
  };

  const handleFinishWorkout = (finalReps: number) => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.exerciseTitle}>{config.displayName.toUpperCase()}</Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setVoiceMuted(!voiceMuted)}
              activeOpacity={0.8}
            >
              {voiceMuted ? (
                <VolumeX size={18} color={colors.danger} />
              ) : (
                <Volume2 size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              activeOpacity={0.8}
            >
              <SwitchCamera size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Visual Display (Camera View or HUD) */}
          <View style={styles.cameraBoxContainer}>
            {cameraPermission?.granted ? (
              <View style={styles.cameraWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing={facing}
                  mute={true}
                />

                {/* Camera HUD Overlay */}
                <View style={styles.cameraHUDOverlay}>
                  {/* Top Status */}
                  <View style={styles.hudTopRow}>
                    <View
                      style={[
                        styles.hudBadge,
                        isBodyDetected ? styles.hudBadgeDetected : styles.hudBadgeSearching,
                      ]}
                    >
                      <View
                        style={[
                          styles.liveGreenDot,
                          !isBodyDetected && { backgroundColor: colors.warning },
                        ]}
                      />
                      <Text style={styles.hudBadgeText}>
                        {isBodyDetected ? 'BODY LOCKED' : 'SEARCHING BODY...'}
                      </Text>
                    </View>

                    {currentJointAngle > 0 && (
                      <View style={styles.hudAngleBadge}>
                        <Text style={styles.hudAngleText}>{currentJointAngle}°</Text>
                      </View>
                    )}
                  </View>

                  {/* Corner Markers Reticle */}
                  <View style={styles.reticleBox}>
                    <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
                    <View style={[styles.cornerBracket, styles.bracketTopRight]} />
                    <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
                    <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

                    {/* Central Indicator */}
                    <View
                      style={[
                        styles.centerDashedCircle,
                        isBodyDetected && styles.centerDashedCircleActive,
                      ]}
                    />
                  </View>

                  {/* Live Feedback Floating Pill */}
                  <View style={styles.feedbackPillWrap}>
                    <View
                      style={[
                        styles.feedbackPill,
                        isBodyDetected
                          ? styles.feedbackPillDetected
                          : styles.feedbackPillWarning,
                      ]}
                    >
                      <View
                        style={[
                          styles.feedbackDot,
                          !isBodyDetected && { backgroundColor: colors.warning },
                        ]}
                      />
                      <Text style={styles.feedbackText}>{formFeedback}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noCameraPermissionBox}>
                <AlertCircle size={40} color={colors.warning} />
                <Text style={styles.noCameraTitle}>Camera Access Required</Text>
                <Text style={styles.noCameraDesc}>
                  ARISE requires camera access to automatically count reps.
                </Text>
                <TouchableOpacity
                  style={styles.grantPermBtn}
                  onPress={requestCameraPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.grantPermBtnText}>GRANT CAMERA PERMISSION</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Large Progress Counter: 12 / 20 TARGET */}
          <View style={styles.counterSection}>
            <View style={styles.counterRow}>
              <Text style={styles.counterBig}>{currentReps}</Text>
              <Text style={styles.counterTarget}>/ {target}</Text>
            </View>
            <Text style={styles.targetLabel}>
              {isPlank ? 'SECONDS COMPLETED' : 'REPETITIONS COMPLETED'}
            </Text>
          </View>

          {/* Action Control Buttons (Pause / Resume & End) */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionCircleBtn}
              onPress={() => {
                haptics.light();
                setIsActive(!isActive);
              }}
              activeOpacity={0.8}
            >
              {isActive ? (
                <Pause size={22} color={colors.textPrimary} />
              ) : (
                <Play size={22} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCircleBtn, styles.stopCircleBtn]}
              onPress={() => handleFinishWorkout(currentReps)}
              activeOpacity={0.8}
            >
              <StopCircle size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>

          {/* Metrics summary card */}
          <GlowCard variant="default" style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ELAPSED</Text>
              <Text style={styles.metricVal}>
                {Math.floor(elapsedSeconds / 60)}:
                {String(elapsedSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>PACE</Text>
              <Text style={styles.metricVal}>
                {elapsedSeconds > 0
                  ? `${Math.round((currentReps / (elapsedSeconds / 60)) * 10) / 10} /m`
                  : '0 /m'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>EST. COINS</Text>
              <Text style={[styles.metricVal, { color: colors.accentGold }]}>
                +{currentReps * config.coinsPerRep}
              </Text>
            </View>
          </GlowCard>

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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cameraBoxContainer: {
    width: '100%',
    height: width * 0.95,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  cameraHUDOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(5, 5, 5, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  hudBadgeDetected: {
    borderColor: 'rgba(209, 255, 0, 0.4)',
  },
  hudBadgeSearching: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
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
    letterSpacing: 1,
  },
  hudAngleBadge: {
    backgroundColor: 'rgba(5, 5, 5, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.3)',
  },
  hudAngleText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  reticleBox: {
    width: '80%',
    height: '60%',
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  centerDashedCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  centerDashedCircleActive: {
    borderColor: 'rgba(209, 255, 0, 0.5)',
  },
  feedbackPillWrap: {
    alignItems: 'center',
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  feedbackPillDetected: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.4)',
  },
  feedbackPillWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  feedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  noCameraPermissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  noCameraTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  noCameraDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  grantPermBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  grantPermBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  counterSection: {
    alignItems: 'center',
    gap: 4,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  counterBig: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  counterTarget: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMuted,
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  actionCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#303030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopCircleBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 18,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#282828',
  },
});
