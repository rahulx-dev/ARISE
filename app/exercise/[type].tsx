import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle as SvgCircle, Line as SvgLine } from 'react-native-svg';
import {
  ChevronLeft,
  Camera as CameraIcon,
  SwitchCamera,
  Volume2,
  VolumeX,
  Flashlight,
  Eye,
  EyeOff,
  Clock,
  Square,
  Activity,
  FastForward,
} from 'lucide-react-native';
import {
  EXERCISE_REGISTRY,
  ExerciseType,
  getExerciseConfig,
  isDurationBased,
  calculateRewards,
  createInitialState,
  processFrame,
  validateExercisePose,
  RepCounterState,
} from '../../src/exercise';
import {
  initialize as initPoseDetector,
  release as releasePoseDetector,
  convertToMoveNetKeypoints,
  PoseLandmark,
  MoveNetKeypoint,
  PoseCameraView,
} from '../../modules/pose-detector';
import { ExerciseErrorBoundary } from '../../src/components/exercise/ExerciseErrorBoundary';
import { useKeepAwake } from 'expo-keep-awake';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { voiceCoach } from '../../src/services/voiceCoach';

function ExerciseTrackerInner() {
  useKeepAwake();
  const {
    type,
    questId,
    target: paramTarget,
    isRedGate,
    sets: paramSets,
    source,
    rewardCoins: paramRewardCoins,
    rewardXP: paramRewardXP,
  } = useLocalSearchParams<{
    type: string;
    questId?: string;
    target?: string;
    isRedGate?: string;
    sets?: string;
    source?: string;
    rewardCoins?: string;
    rewardXP?: string;
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

  const target = paramTarget
    ? parseInt(paramTarget, 10)
    : config.defaultTarget || 20;
  const parsedSets = paramSets ? parseInt(paramSets, 10) : NaN;
  const totalSets =
    !isNaN(parsedSets) && parsedSets > 0
      ? parsedSets
      : questId || isRedGate
      ? 1
      : 3;

  const [currentSet, setCurrentSet] = useState<number>(1);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restCountdown, setRestCountdown] = useState<number>(45);
  const [plankSetElapsed, setPlankSetElapsed] = useState<number>(0);

  const [currentReps, setCurrentReps] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

  // Controlled UI states
  const [isBodyDetected, setIsBodyDetected] = useState<boolean>(false);
  const [detectedKeypoints, setDetectedKeypoints] = useState<
    MoveNetKeypoint[] | null
  >(null);
  const [formFeedback, setFormFeedback] = useState<string>('Good Form');

  // Exact Camera Dimensions for SVG scaling
  const [cameraDims, setCameraDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const timerRef = useRef<any>(null);
  const repsRef = useRef<number>(0);
  const currentSetRef = useRef<number>(1);
  const totalSetsRef = useRef<number>(totalSets);
  const isRestingRef = useRef<boolean>(false);
  totalSetsRef.current = totalSets;

  const repStateRef = useRef<RepCounterState>(createInitialState());
  const isMountedRef = useRef<boolean>(true);
  const lastBodyDetectedRef = useRef<boolean>(false);
  const missedFramesRef = useRef<number>(0);
  const smoothedKeypointsRef = useRef<MoveNetKeypoint[] | null>(null);
  const hasAwardedRef = useRef<boolean>(false);

  // Lifecycle Initialization & Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    hasAwardedRef.current = false;
    currentSetRef.current = 1;
    isRestingRef.current = false;

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
        `${config.displayName} tracking active. Target: ${target} ${
          isPlank ? 'seconds' : 'reps'
        } across ${totalSets} sets. Get into position!`
      );
    }

    // 1-Second Timer loop
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setElapsedSeconds((prev) => prev + 1);

      if (isRestingRef.current) {
        setRestCountdown((prev) => {
          if (prev <= 1) {
            handleSkipRest();
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      if (isPlank) {
        setPlankSetElapsed((prev) => {
          const nextTime = prev + 1;
          repsRef.current = nextTime;
          setCurrentReps(nextTime);
          if (nextTime >= target) {
            handleCompleteSet(nextTime);
          }
          return nextTime;
        });
      }
    }, 1000);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      voiceCoach.stop();
      releasePoseDetector();
    };
  }, []);

  // Real-time pose event handler — called at 25-30 FPS by native CameraX PoseCameraView
  const handlePoseDetected = (event: any) => {
    if (!isMountedRef.current || !isActive || isRestingRef.current) return;

    try {
      const rawLandmarks: PoseLandmark[] = event?.nativeEvent?.landmarks || [];
      if (rawLandmarks.length < 5) {
        missedFramesRef.current += 1;
        if (missedFramesRef.current >= 8) {
          setDetectedKeypoints(null);
          if (lastBodyDetectedRef.current) {
            lastBodyDetectedRef.current = false;
            setIsBodyDetected(false);
          }
        }
        return;
      }

      const keypoints = convertToMoveNetKeypoints(rawLandmarks);
      const now = Date.now();

      if (keypoints.length === 17) {
        const validation = validateExercisePose(keypoints, config.type);

        if (validation.isFaceOnly || !validation.valid) {
          missedFramesRef.current += 1;
          if (missedFramesRef.current >= 6) {
            setDetectedKeypoints(null);
            if (lastBodyDetectedRef.current) {
              lastBodyDetectedRef.current = false;
              setIsBodyDetected(false);
            }
          }
          if (validation.message && validation.message !== formFeedback) {
            setFormFeedback(validation.message);
          }
        } else {
          missedFramesRef.current = 0;

          // Adaptive Velocity-Sensitive Smoothing:
          const prev = smoothedKeypointsRef.current;
          const smoothed: MoveNetKeypoint[] = keypoints.map((pt, idx) => {
            if (!prev || !prev[idx] || (pt.confidence ?? 0) < 0.25) return pt;
            const dx = pt.x - prev[idx].x;
            const dy = pt.y - prev[idx].y;
            const movementDist = Math.hypot(dx, dy);

            const alpha =
              movementDist > 0.02
                ? 0.95
                : movementDist < 0.005
                ? 0.65
                : 0.65 + ((movementDist - 0.005) / 0.015) * 0.3;

            return {
              x: prev[idx].x * (1 - alpha) + pt.x * alpha,
              y: prev[idx].y * (1 - alpha) + pt.y * alpha,
              confidence: pt.confidence,
            };
          });
          smoothedKeypointsRef.current = smoothed;
          setDetectedKeypoints(smoothed);

          if (!lastBodyDetectedRef.current) {
            lastBodyDetectedRef.current = true;
            setIsBodyDetected(true);
          }

          const nextState = processFrame(
            repStateRef.current,
            smoothed,
            config,
            now
          );
          repStateRef.current = nextState;

          if (
            nextState.feedback.message &&
            nextState.feedback.message !== formFeedback
          ) {
            setFormFeedback(nextState.feedback.message);
          }

          if (nextState.count > repsRef.current) {
            handleCountRep(nextState.count);
          }
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[ARISE TRACKER] Pose event note:', err);
    }
  };

  // AI rep counting
  const handleCountRep = (newCount: number) => {
    if (isRestingRef.current) return;
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
      handleCompleteSet(newCount);
    }
  };

  // Handles set transition or final completion
  const handleCompleteSet = (finalRepsInSet: number) => {
    if (isRestingRef.current) return;

    if (currentSetRef.current < totalSetsRef.current) {
      // Advance to rest interval
      isRestingRef.current = true;
      setIsResting(true);
      setRestCountdown(45);
      haptics.success();
      sound.play('quest_complete');

      if (!voiceMuted) {
        voiceCoach.speak(
          `Set ${currentSetRef.current} complete! Rest for 45 seconds.`
        );
      }
    } else {
      // All sets finished!
      handleFinishWorkout();
    }
  };

  // Skips the rest timer to begin next set immediately
  const handleSkipRest = () => {
    if (!isRestingRef.current) return;
    isRestingRef.current = false;
    setIsResting(false);
    haptics.medium();

    const nextSet = currentSetRef.current + 1;
    currentSetRef.current = nextSet;
    setCurrentSet(nextSet);

    // Reset rep tracker for the new set
    repStateRef.current = createInitialState();
    repsRef.current = 0;
    setCurrentReps(0);
    setPlankSetElapsed(0);

    if (!voiceMuted) {
      voiceCoach.speak(
        `Set ${nextSet} of ${totalSetsRef.current}. Get into position!`
      );
    }
  };

  // Single award finish workout handler
  const handleFinishWorkout = (earlyReps?: number) => {
    if (hasAwardedRef.current) return;
    hasAwardedRef.current = true;

    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    haptics.success();
    sound.play('quest_complete');

    // Calculate total completed reps across all sets
    let totalCompletedReps: number;
    if (earlyReps !== undefined) {
      totalCompletedReps = Math.max(
        1,
        (currentSetRef.current - 1) * target + earlyReps
      );
    } else {
      totalCompletedReps = target * totalSetsRef.current;
    }

    const duration = elapsedSeconds || 1;
    const rewards = calculateRewards(
      validExerciseType,
      totalCompletedReps,
      target * totalSetsRef.current
    );
    const questCoins = paramRewardCoins ? parseInt(paramRewardCoins, 10) : 0;
    const questXP = paramRewardXP ? parseInt(paramRewardXP, 10) : 0;
    const finalCoins = Math.max(rewards.coins, questCoins);
    const finalXP = Math.max(rewards.xp, questXP);

    if (!voiceMuted) {
      voiceCoach.speakComplete(config.displayName, finalCoins);
    }

    router.replace({
      pathname: '/exercise/complete',
      params: {
        exerciseType: validExerciseType,
        completedReps: totalCompletedReps.toString(),
        target: (target * totalSetsRef.current).toString(),
        earnedCoins: finalCoins.toString(),
        earnedXP: finalXP.toString(),
        durationSeconds: duration.toString(),
        questId: questId || '',
        isRedGate: isRedGate || '',
        source: source || '',
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

  // Skeleton helper: maps normalized [0, 1] landmark coordinates to exact camera container px
  const getPointPx = (idx: number) => {
    if (!detectedKeypoints || cameraDims.width === 0 || cameraDims.height === 0)
      return null;
    const pt = detectedKeypoints[idx];
    if (!pt || (pt.confidence ?? 0) < 0.28) return null;

    const normX = facing === 'front' ? 1 - pt.x : pt.x;
    const normY = pt.y;

    const px = normX * cameraDims.width;
    const py = normY * cameraDims.height;

    if (
      px < -20 ||
      px > cameraDims.width + 20 ||
      py < -20 ||
      py > cameraDims.height + 20
    )
      return null;
    return { x: px, y: py, conf: pt.confidence };
  };

  const renderBone = (
    idxA: number,
    idxB: number,
    color: string = '#00D2EE',
    strokeWidth: number = 2.8
  ) => {
    const pA = getPointPx(idxA);
    const pB = getPointPx(idxB);
    if (!pA || !pB) return null;

    const boneDist = Math.hypot(pA.x - pB.x, pA.y - pB.y);
    if (boneDist < 6 || boneDist > cameraDims.width * 0.95) return null;

    return (
      <SvgLine
        key={`bone-${idxA}-${idxB}`}
        x1={pA.x}
        y1={pA.y}
        x2={pB.x}
        y2={pB.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. FULL-SCREEN CAMERA BACKGROUND */}
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e: LayoutChangeEvent) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCameraDims({ width, height });
          }
        }}
      >
        {cameraPermission?.granted && PoseCameraView ? (
          <PoseCameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            onPoseDetected={handlePoseDetected}
          />
        ) : cameraPermission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            animateShutter={false}
          />
        ) : (
          <View style={styles.noCameraFallback}>
            <CameraIcon size={38} color="#8E8E93" />
            <Text style={styles.noCameraText}>Camera Access Required</Text>
          </View>
        )}

        {/* Real Live AI Skeletal Tracking Overlay */}
        {showSkeleton && detectedKeypoints && isBodyDetected && cameraDims.width > 0 && (
          <Svg
            style={StyleSheet.absoluteFill}
            width={cameraDims.width}
            height={cameraDims.height}
          >
            {/* Head / Neck */}
            {renderBone(0, 5, '#00D2EE', 2.5)}
            {renderBone(0, 6, '#00D2EE', 2.5)}

            {/* Shoulders */}
            {renderBone(5, 6, '#EF4444', 3.2)}

            {/* Left Arm (Shoulder -> Elbow -> Wrist) */}
            {renderBone(5, 7, '#00D2EE', 2.8)}
            {renderBone(7, 9, '#00D2EE', 2.8)}

            {/* Right Arm (Shoulder -> Elbow -> Wrist) */}
            {renderBone(6, 8, '#00D2EE', 2.8)}
            {renderBone(8, 10, '#00D2EE', 2.8)}

            {/* Torso Box (Shoulder -> Hip) */}
            {renderBone(5, 11, '#EF4444', 2.6)}
            {renderBone(6, 12, '#EF4444', 2.6)}
            {renderBone(11, 12, '#EF4444', 3.0)}

            {/* Left Leg (Hip -> Knee -> Ankle) */}
            {renderBone(11, 13, '#10B981', 2.8)}
            {renderBone(13, 15, '#10B981', 2.8)}

            {/* Right Leg (Hip -> Knee -> Ankle) */}
            {renderBone(12, 14, '#10B981', 2.8)}
            {renderBone(14, 16, '#10B981', 2.8)}

            {/* Precise Joint Marker Dots */}
            {[0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((idx) => {
              const p = getPointPx(idx);
              if (!p) return null;

              const isLeg = idx >= 13;
              const isHead = idx === 0;
              const ringColor = isLeg
                ? '#10B981'
                : isHead
                ? '#00D2EE'
                : '#EF4444';

              return (
                <React.Fragment key={`joint-marker-${idx}`}>
                  {/* Outer Ring */}
                  <SvgCircle
                    cx={p.x}
                    cy={p.y}
                    r={isHead ? 7 : 8}
                    fill="rgba(0, 0, 0, 0.4)"
                    stroke={ringColor}
                    strokeWidth={1.8}
                  />
                  {/* Core Solid Dot */}
                  <SvgCircle cx={p.x} cy={p.y} r={3} fill="#FFFFFF" />
                </React.Fragment>
              );
            })}
          </Svg>
        )}

        {/* Viewfinder Alignment Corner Brackets (1:1 with reference) */}
        <View style={styles.alignmentGuideBox} pointerEvents="none">
          <View style={[styles.cornerBracket, styles.bracketTL]} />
          <View style={[styles.cornerBracket, styles.bracketTR]} />
          <View style={[styles.cornerBracket, styles.bracketBL]} />
          <View style={[styles.cornerBracket, styles.bracketBR]} />
        </View>
      </View>

      {/* 2. TRANSLUCENT HUD OVERLAY (1:1 with reference mockup) */}
      <SafeAreaView
        style={styles.hudContainer}
        edges={['top', 'left', 'right', 'bottom']}
      >
        {/* TOP ROW: Back button, Exercise title & Set progress, Right circular toggles */}
        <View style={styles.topHeaderRow}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.circularGlassBtn}
            onPress={() => {
              haptics.light();
              router.back();
            }}
            activeOpacity={0.75}
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Center Info: Exercise Name, Set Subtitle, and Dash Progress */}
          <View style={styles.headerCenterCol}>
            <Text style={styles.exerciseTitleText}>{config.displayName}</Text>
            <Text style={styles.setSubtitleText}>
              Set {currentSet} of {totalSets}
            </Text>

            {/* Set Indicator Dash Pills */}
            <View style={styles.setDashesRow}>
              {Array.from({ length: totalSets }).map((_, idx) => {
                const isCurrent = idx === currentSet - 1;
                const isCompleted = idx < currentSet - 1;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.setDashPill,
                      isCurrent && styles.setDashPillCurrent,
                      isCompleted && styles.setDashPillCompleted,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Right Action Icons: Volume & Eye/Skeleton */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.circularGlassBtn}
              onPress={toggleVoice}
              activeOpacity={0.75}
            >
              {voiceMuted ? (
                <VolumeX size={20} color="#8E8E93" />
              ) : (
                <Volume2 size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circularGlassBtn}
              onPress={() => {
                haptics.light();
                setShowSkeleton((prev) => !prev);
              }}
              activeOpacity={0.75}
            >
              {showSkeleton ? (
                <Eye size={20} color="#FFFFFF" />
              ) : (
                <EyeOff size={20} color="#8E8E93" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* METRICS & QUICK CONTROLS BAR */}
        <View style={styles.metricsControlsRow}>
          {/* Reps Count Metric */}
          <View style={styles.metricCol}>
            <View style={styles.repsRow}>
              <Text style={styles.repsNumBig}>{currentReps}</Text>
              <Text style={styles.repsTargetText}>/ {target}</Text>
            </View>
            <Text style={styles.metricSubText}>
              {isPlank ? 'Seconds' : 'Reps'}
            </Text>
          </View>

          {/* Vertical Divider */}
          <View style={styles.metricDivider} />

          {/* Elapsed Timer Metric */}
          <View style={styles.metricCol}>
            <View style={styles.timerRow}>
              <Clock size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.elapsedTimerText}>
                {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
                {String(elapsedSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
            <Text style={styles.metricSubText}>Elapsed</Text>
          </View>

          {/* Right Action Controls: Torch, Flip Camera, End Set */}
          <View style={styles.controlsGroup}>
            <TouchableOpacity
              style={[
                styles.squareGlassBtn,
                torch && styles.squareGlassBtnActive,
              ]}
              onPress={toggleTorch}
              activeOpacity={0.8}
            >
              <Flashlight size={20} color={torch ? '#EF4444' : '#FFFFFF'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.squareGlassBtn}
              onPress={toggleCameraFacing}
              activeOpacity={0.8}
            >
              <SwitchCamera size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endSetButton}
              onPress={() => handleFinishWorkout(currentReps)}
              activeOpacity={0.85}
            >
              <Square size={13} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.endSetButtonText}>End Set</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FLOATING LIVE STATUS BADGES ROW */}
        <View style={styles.statusBadgesRow}>
          {/* Left: Body Status Badge */}
          <View style={styles.statusBadgePill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isBodyDetected ? '#10B981' : '#10B981' },
              ]}
            />
            <Text style={styles.statusBadgeText}>
              {isBodyDetected
                ? formFeedback
                : detectedKeypoints
                ? 'Align position'
                : 'Searching body...'}
            </Text>
          </View>

          {/* Right: AI Tracking On Badge */}
          <View style={styles.statusBadgePill}>
            <Activity size={14} color="#FFFFFF" />
            <Text style={styles.statusBadgeText}>AI Tracking On</Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* REST INTERVAL OVERLAY */}
        {isResting && (
          <View style={styles.restOverlay}>
            <View style={styles.restCard}>
              <View style={styles.restTagRow}>
                <Clock size={16} color="#0A84FF" />
                <Text style={styles.restTagText}>REST INTERVAL // RECOVERY</Text>
              </View>

              <Text style={styles.restTimerBig}>{restCountdown}s</Text>

              <Text style={styles.restSetInfo}>
                SET {currentSet} OF {totalSets} COMPLETE!
              </Text>
              <Text style={styles.restNextInfo}>
                NEXT: SET {currentSet + 1} ({target}{' '}
                {isPlank ? 'SEC' : 'REPS'})
              </Text>

              <TouchableOpacity
                style={styles.skipRestBtn}
                onPress={handleSkipRest}
                activeOpacity={0.8}
              >
                <FastForward size={16} color="#FFFFFF" />
                <Text style={styles.skipRestBtnText}>
                  SKIP REST // START SET {currentSet + 1}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hudContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  noCameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070A10',
    gap: 8,
  },
  noCameraText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },

  // 1. Top Header Row
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  circularGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 25, 30, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterCol: {
    alignItems: 'center',
    gap: 2,
  },
  exerciseTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  setSubtitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  setDashesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  setDashPill: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  setDashPillCurrent: {
    backgroundColor: '#EF4444',
  },
  setDashPillCompleted: {
    backgroundColor: '#EF4444',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // 2. Metrics & Controls Strip (1:1 with reference)
  metricsControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
  },
  metricCol: {
    alignItems: 'flex-start',
  },
  repsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  repsNumBig: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  repsTargetText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  metricSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: -2,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginHorizontal: 10,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  elapsedTimerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  squareGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(25, 25, 30, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareGlassBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  endSetButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  endSetButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // 3. Floating Status Badges
  statusBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(25, 25, 30, 0.65)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // 4. Viewfinder Alignment Corner Brackets (1:1 with reference)
  alignmentGuideBox: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: 22,
    marginVertical: 180,
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },

  // 5. Rest Interval Modal
  restOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100,
  },
  restCard: {
    width: '100%',
    backgroundColor: '#111218',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 24,
    alignItems: 'center',
  },
  restTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  restTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A84FF',
    letterSpacing: 1.2,
  },
  restTimerBig: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  restSetInfo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  restNextInfo: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 20,
  },
  skipRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
  },
  skipRestBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
