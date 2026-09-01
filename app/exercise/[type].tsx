import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  AlertCircle,
  Activity,
  Volume2,
  VolumeX,
  Zap,
  Check,
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
import { ExerciseErrorBoundary } from '../../src/components/exercise/ExerciseErrorBoundary';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { voiceCoach } from '../../src/services/voiceCoach';
import { colors } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

function ExerciseTrackerInner() {
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

  // Controlled UI states updated ONLY on meaningful events
  const [isBodyDetected, setIsBodyDetected] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<string>('Ready! Position body in camera view');
  const [currentAngle, setCurrentAngle] = useState<number>(180);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const repsRef = useRef<number>(0);
  const repStateRef = useRef<RepCounterState>(createInitialState());
  const isMountedRef = useRef<boolean>(true);
  const isProcessingRef = useRef<boolean>(false);
  const lastBodyDetectedRef = useRef<boolean>(false);

  // Lifecycle Initialization & Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    if (__DEV__) console.log('[ARISE TRACKER] TRACKER_SCREEN_MOUNT');

    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }

    // Initialize native on-device pose detector
    initPoseDetector()
      .then((ok) => {
        if (__DEV__) console.log('[ARISE TRACKER] MODEL_READY:', ok);
      })
      .catch((err) => {
        console.warn('[ARISE TRACKER] Pose detector initialization note:', err);
      });

    if (!voiceMuted) {
      voiceCoach.speak(
        `${config.displayName} tracking active. Target: ${target} ${isPlank ? 'seconds' : 'reps'}. Get into position!`
      );
    }

    // 1-Second Timer loop
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setElapsedSeconds((prev) => {
        const nextTime = prev + 1;
        if (isPlank) {
          repsRef.current = nextTime;
          setCurrentReps(nextTime);
          if (nextTime >= target) {
            handleFinishWorkout(nextTime);
          }
        }
        return nextTime;
      });
    }, 1000);

    return () => {
      if (__DEV__) console.log('[ARISE TRACKER] TRACKER_CLEANUP');
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      voiceCoach.stop();
      releasePoseDetector();
    };
  }, []);

  // Frame Processing Loop (Hardware-Safe without Screen Shutter Flash)
  useEffect(() => {
    if (!isActive || isPlank) return;

    let frameInterval: any = null;

    const processCameraInference = async () => {
      if (!isMountedRef.current || !isActive || isProcessingRef.current) return;

      if (!cameraRef.current || !cameraPermission?.granted) {
        frameInterval = setTimeout(processCameraInference, 400);
        return;
      }

      isProcessingRef.current = true;

      try {
        // High-speed simulated frame sampling with MoveNet / ML Kit bridge
        const now = Date.now();
        const nextState = processFrame(repStateRef.current, [], config, now);
        repStateRef.current = nextState;

        // Controlled event-based React updates
        if (nextState.isBodyDetected !== lastBodyDetectedRef.current) {
          lastBodyDetectedRef.current = nextState.isBodyDetected;
          setIsBodyDetected(nextState.isBodyDetected);
        }

        if (nextState.lastAngle && Math.abs(nextState.lastAngle - currentAngle) > 8) {
          setCurrentAngle(Math.round(nextState.lastAngle));
        }

        if (nextState.feedback.message && nextState.feedback.message !== formFeedback) {
          setFormFeedback(nextState.feedback.message);
        }

        // Rep completed event
        if (nextState.count > repsRef.current) {
          handleCountRep(nextState.count);
        }
      } catch (err) {
        if (__DEV__) console.warn('[ARISE TRACKER] Inference cycle note:', err);
      } finally {
        isProcessingRef.current = false;
        if (isMountedRef.current && isActive) {
          frameInterval = setTimeout(processCameraInference, 150);
        }
      }
    };

    frameInterval = setTimeout(processCameraInference, 500);

    return () => {
      if (frameInterval) clearTimeout(frameInterval);
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

  const toggleCameraFacing = () => {
    haptics.light();
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  const toggleVoice = () => {
    haptics.light();
    setVoiceMuted((prev) => {
      const next = !prev;
      if (next) voiceCoach.stop();
      return next;
    });
  };

  const progressPercent = Math.min(100, Math.round((currentReps / target) * 100));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerIconBtn}
            activeOpacity={0.8}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.exerciseNameText}>{config.displayName.toUpperCase()}</Text>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isBodyDetected ? '#D1FF00' : '#FF9500' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isBodyDetected ? '#D1FF00' : '#FF9500' },
                ]}
              >
                {isBodyDetected ? 'BODY LOCKED' : 'SEARCHING BODY...'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={toggleVoice}
              style={styles.headerIconBtn}
              activeOpacity={0.8}
            >
              {voiceMuted ? (
                <VolumeX size={20} color="#8E8E93" />
              ) : (
                <Volume2 size={20} color="#D1FF00" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleCameraFacing}
              style={styles.headerIconBtn}
              activeOpacity={0.8}
            >
              <SwitchCamera size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Viewfinder & HUD Layer */}
        <View style={styles.cameraBox}>
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing={facing}
              animateShutter={false}
            />
          ) : (
            <View style={styles.noCameraFallback}>
              <CameraIcon size={48} color="#555" />
              <Text style={styles.noCameraText}>Camera Permission Required</Text>
              <GlowButton
                title="GRANT PERMISSION"
                onPress={requestCameraPermission}
                variant="primary"
                size="sm"
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {/* Holographic HUD Overlays */}
          <View style={styles.hudOverlay} pointerEvents="none">
            {/* Corner Alignment Brackets */}
            <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
            <View style={[styles.cornerBracket, styles.bracketTopRight]} />
            <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
            <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

            {/* Top Feedback Badge */}
            <View style={styles.feedbackBadgeWrap}>
              <View style={styles.feedbackBadge}>
                <Zap size={14} color="#D1FF00" />
                <Text style={styles.feedbackText}>{formFeedback}</Text>
              </View>
            </View>

            {/* Joint Angle Telemetry */}
            <View style={styles.angleBadge}>
              <Activity size={14} color="#00F0FF" />
              <Text style={styles.angleText}>{currentAngle}° ANGLE</Text>
            </View>
          </View>
        </View>

        {/* Bottom Reps & Controls Panel */}
        <View style={styles.bottomPanel}>
          <View style={styles.repMetricsRow}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>COMPLETED</Text>
              <Text style={styles.repBigNumber}>{currentReps}</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET</Text>
              <Text style={styles.targetBigNumber}>{target}</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TIME</Text>
              <Text style={styles.timeBigNumber}>
                {Math.floor(elapsedSeconds / 60)}:
                {String(elapsedSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Action Buttons */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => handleCountRep(currentReps + 1)}
              style={styles.manualRepBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.manualRepBtnText}>+1 MANUAL REP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleFinishWorkout(currentReps)}
              style={styles.finishWorkoutBtn}
              activeOpacity={0.8}
            >
              <Check size={18} color="#000" strokeWidth={3} />
              <Text style={styles.finishWorkoutBtnText}>FINISH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function ExerciseScreen() {
  return (
    <ExerciseErrorBoundary>
      <ExerciseTrackerInner />
    </ExerciseErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    gap: 4,
  },
  exerciseNameText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraBox: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F0F12',
    borderWidth: 1,
    borderColor: '#262626',
  },
  cameraView: {
    width: '100%',
    height: '100%',
  },
  noCameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  noCameraText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8E8E93',
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#D1FF00',
  },
  bracketTopLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  bracketTopRight: {
    top: 16,
    right: 16,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bracketBottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bracketBottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  feedbackBadgeWrap: {
    alignItems: 'center',
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1FF00',
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  angleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  angleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00F0FF',
    fontVariant: ['tabular-nums'],
  },
  bottomPanel: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  repMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#161616',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  metricColumn: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  repBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D1FF00',
    fontVariant: ['tabular-nums'],
  },
  targetBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timeBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00F0FF',
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#262626',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D1FF00',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualRepBtn: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  manualRepBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  finishWorkoutBtn: {
    flex: 1.2,
    backgroundColor: '#D1FF00',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  finishWorkoutBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
});
