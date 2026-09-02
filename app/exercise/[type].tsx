import React, { useState, useEffect, useRef } from 'react';
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
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg';
import {
  ArrowLeft,
  Camera as CameraIcon,
  SwitchCamera,
  Volume2,
  VolumeX,
  Zap,
  Flashlight,
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
} from '../../modules/pose-detector';
import { ExerciseErrorBoundary } from '../../src/components/exercise/ExerciseErrorBoundary';
import { useKeepAwake } from 'expo-keep-awake';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { voiceCoach } from '../../src/services/voiceCoach';

const { width, height } = Dimensions.get('window');

function ExerciseTrackerInner() {
  useKeepAwake();
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
  const [torch, setTorch] = useState<boolean>(false);

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

  // Controlled UI states
  const [isBodyDetected, setIsBodyDetected] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<string>('Good Form');

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
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      voiceCoach.stop();
      releasePoseDetector();
    };
  }, []);

  // Frame Processing Loop
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
        const now = Date.now();
        const nextState = processFrame(repStateRef.current, [], config, now);
        repStateRef.current = nextState;

        if (nextState.isBodyDetected !== lastBodyDetectedRef.current) {
          lastBodyDetectedRef.current = nextState.isBodyDetected;
          setIsBodyDetected(nextState.isBodyDetected);
        }

        if (nextState.feedback.message && nextState.feedback.message !== formFeedback) {
          setFormFeedback(nextState.feedback.message);
        }

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

  const toggleTorch = () => {
    haptics.light();
    setTorch((prev) => !prev);
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
  const circleCircumference = 2 * Math.PI * 46;
  const strokeDashoffset = circleCircumference * (1 - progressPercent / 100);

  return (
    <View style={styles.container}>
      {/* Fullscreen Camera Background */}
      <View style={StyleSheet.absoluteFill}>
        {cameraPermission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            animateShutter={false}
          />
        ) : (
          <View style={styles.noCameraFallback}>
            <CameraIcon size={48} color="#555" />
            <Text style={styles.noCameraText}>Camera Permission Required</Text>
          </View>
        )}

        {/* Dark Vignette Gradients */}
        <View style={styles.topVignette} />
        <View style={styles.bottomVignette} />

        {/* Stitch v2 Simulated AI Skeletal Tracking Overlay */}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
          <Polyline
            points="30,45 50,40 70,45"
            fill="none"
            stroke="#CCFF00"
            strokeWidth="0.6"
            strokeOpacity="0.8"
          />
          <Polyline
            points="50,40 50,70"
            fill="none"
            stroke="#CCFF00"
            strokeWidth="0.6"
            strokeOpacity="0.8"
          />
          <Polyline
            points="50,70 35,90"
            fill="none"
            stroke="#CCFF00"
            strokeWidth="0.6"
            strokeOpacity="0.8"
          />
          <Polyline
            points="50,70 65,90"
            fill="none"
            stroke="#CCFF00"
            strokeWidth="0.6"
            strokeOpacity="0.8"
          />

          <SvgCircle cx="30" cy="45" r="1.5" fill="#CCFF00" />
          <SvgCircle cx="50" cy="40" r="1.5" fill="#CCFF00" />
          <SvgCircle cx="70" cy="45" r="1.5" fill="#CCFF00" />
          <SvgCircle cx="50" cy="70" r="1.5" fill="#CCFF00" />
          <SvgCircle cx="35" cy="90" r="1.5" fill="#CCFF00" />
          <SvgCircle cx="65" cy="90" r="1.5" fill="#CCFF00" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Stitch v2 Top Navigation Overlay */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>{config.displayName}</Text>

          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={toggleVoice}
            activeOpacity={0.8}
          >
            {/* Volume */}
            {voiceMuted ? (
              <VolumeX size={18} color="#8E8E93" />
            ) : (
              <Volume2 size={18} color="#FF5500" />
            )}
          </TouchableOpacity>
        </View>

        {/* Metrics Header */}
        <View style={styles.metricsHeader}>
          <View style={styles.repsCol}>
            <Text style={styles.repsLabel}>{isPlank ? 'SECONDS' : 'REPS'}</Text>
            <View style={styles.repsCountRow}>
              <Text style={styles.currentRepsText}>
                {String(currentReps).padStart(2, '0')}
              </Text>
              <Text style={styles.targetRepsText}>/ {target}</Text>
            </View>
          </View>

          <View style={styles.statusCol}>
            {/* Good Form Pill */}
            <View style={[styles.goodFormPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
              <View style={[styles.goodFormDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.goodFormText, { color: '#10B981' }]}>{formFeedback}</Text>
            </View>

            {/* Body Detected Chip */}
            <View style={[styles.bodyDetectedChip, { backgroundColor: isBodyDetected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)', borderColor: isBodyDetected ? '#8B5CF6' : 'rgba(255, 255, 255, 0.15)' }]}>
              <Text style={[styles.bodyDetectedText, { color: isBodyDetected ? '#A78BFA' : '#94A3B8' }]}>
                {isBodyDetected ? 'BODY LOCKED' : 'SEARCHING BODY...'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom Floating Controls */}
        <View style={styles.bottomControlsRow}>
          {/* Flash Toggle */}
          <TouchableOpacity
            style={[styles.smallControlBtn, torch && styles.smallControlBtnActive]}
            onPress={toggleTorch}
            activeOpacity={0.8}
          >
            <Flashlight size={20} color={torch ? '#0A84FF' : '#FFFFFF'} />
          </TouchableOpacity>

          {/* End Set / Action Button with Circular Progress Arc */}
          <TouchableOpacity
            style={styles.endSetBtn}
            onPress={() => handleFinishWorkout(currentReps)}
            activeOpacity={0.85}
          >
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
              {/* Background Track */}
              <SvgCircle
                cx="50"
                cy="50"
                r="46"
                stroke="rgba(10, 132, 255, 0.2)"
                strokeWidth="3.5"
                fill="none"
              />
              {/* Active Progress Arc */}
              <SvgCircle
                cx="50"
                cy="50"
                r="46"
                stroke="#0A84FF"
                strokeWidth="3.5"
                strokeDasharray={`${circleCircumference} ${circleCircumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 50 50)"
              />
            </Svg>

            <Text style={styles.endSetTitle}>End</Text>
            <Text style={styles.endSetSub}>SET</Text>
          </TouchableOpacity>

          {/* Camera Switch */}
          <TouchableOpacity
            style={styles.smallControlBtn}
            onPress={toggleCameraFacing}
            activeOpacity={0.8}
          >
            <SwitchCamera size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  noCameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#051424',
    gap: 12,
  },
  noCameraText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28, 43, 60, 0.65)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  repsCol: {
    gap: 2,
  },
  repsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4C9AC',
    letterSpacing: 1.2,
  },
  repsCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentRepsText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  targetRepsText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#C4C9AC',
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  goodFormPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(204, 255, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
  },
  goodFormDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CCFF00',
  },
  goodFormText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CCFF00',
    letterSpacing: 0.5,
  },
  bodyDetectedChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(28, 43, 60, 0.65)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  bodyDetectedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D4E4FA',
    letterSpacing: 0.5,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  smallControlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallControlBtnActive: {
    borderColor: '#CCFF00',
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
  },
  endSetBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(18, 33, 49, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  endSetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  endSetSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C4C9AC',
    letterSpacing: 1.2,
  },
});
