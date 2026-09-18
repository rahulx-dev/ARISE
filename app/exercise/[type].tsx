import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle as SvgCircle, Line as SvgLine } from 'react-native-svg';
import {
  ArrowLeft,
  Camera as CameraIcon,
  SwitchCamera,
  Volume2,
  VolumeX,
  Flashlight,
  Eye,
  EyeOff,
  Clock,
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
  const { type, questId, target: paramTarget, isRedGate, sets: paramSets, source } = useLocalSearchParams<{
    type: string;
    questId?: string;
    target?: string;
    isRedGate?: string;
    sets?: string;
    source?: string;
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
  const parsedSets = paramSets ? parseInt(paramSets, 10) : NaN;
  const totalSets = !isNaN(parsedSets) && parsedSets > 0 ? parsedSets : (questId || isRedGate ? 1 : 3);

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
  const [detectedKeypoints, setDetectedKeypoints] = useState<MoveNetKeypoint[] | null>(null);
  const [formFeedback, setFormFeedback] = useState<string>('Good Form');

  // 16:9 Camera Preview exact dimensions
  const [cameraDims, setCameraDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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
        `${config.displayName} tracking active. Target: ${target} ${isPlank ? 'seconds' : 'reps'} across ${totalSets} sets. Get into position!`
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

            const alpha = movementDist > 0.020
              ? 0.95
              : (movementDist < 0.005 ? 0.65 : 0.65 + ((movementDist - 0.005) / 0.015) * 0.30);

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

          const nextState = processFrame(repStateRef.current, smoothed, config, now);
          repStateRef.current = nextState;

          if (nextState.feedback.message && nextState.feedback.message !== formFeedback) {
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
        voiceCoach.speak(`Set ${currentSetRef.current} complete! Rest for 45 seconds.`);
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
      voiceCoach.speak(`Set ${nextSet} of ${totalSetsRef.current}. Get into position!`);
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
      totalCompletedReps = Math.max(1, (currentSetRef.current - 1) * target + earlyReps);
    } else {
      totalCompletedReps = target * totalSetsRef.current;
    }

    const duration = elapsedSeconds || 1;
    const rewards = calculateRewards(validExerciseType, totalCompletedReps, target * totalSetsRef.current);

    if (!voiceMuted) {
      voiceCoach.speakComplete(config.displayName, rewards.coins);
    }

    router.replace({
      pathname: '/exercise/complete',
      params: {
        exerciseType: validExerciseType,
        completedReps: totalCompletedReps.toString(),
        target: (target * totalSetsRef.current).toString(),
        earnedCoins: rewards.coins.toString(),
        earnedXP: rewards.xp.toString(),
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

  // Skeleton helper: maps normalized [0, 1] landmark coordinates to exact 16:9 camera container px
  const getPointPx = (idx: number) => {
    if (!detectedKeypoints || cameraDims.width === 0 || cameraDims.height === 0) return null;
    const pt = detectedKeypoints[idx];
    if (!pt || (pt.confidence ?? 0) < 0.28) return null;

    const normX = facing === 'front' ? (1 - pt.x) : pt.x;
    const normY = pt.y;

    const px = normX * cameraDims.width;
    const py = normY * cameraDims.height;

    if (px < -20 || px > cameraDims.width + 20 || py < -20 || py > cameraDims.height + 20) return null;
    return { x: px, y: py, conf: pt.confidence };
  };

  const renderBone = (idxA: number, idxB: number, color: string = '#00D2EE', strokeWidth: number = 2.8) => {
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
    <SafeAreaView style={styles.screenContainer} edges={['top', 'bottom', 'left', 'right']}>
      {/* 1. TOP HEADER BAR */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerExerciseTitle}>{config.displayName.toUpperCase()}</Text>
            {totalSets > 1 && (
              <View style={styles.setHeaderBadge}>
                <Text style={styles.setHeaderBadgeText}>SET {currentSet}/{totalSets}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerTimerText}>
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')} ELAPSED
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleVoice} activeOpacity={0.8}>
            {voiceMuted ? <VolumeX size={18} color="#8E8E93" /> : <Volume2 size={18} color="#FFFFFF" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              haptics.light();
              setShowSkeleton((prev) => !prev);
            }}
            activeOpacity={0.8}
          >
            {showSkeleton ? <Eye size={18} color="#E11D48" /> : <EyeOff size={18} color="#8E8E93" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. TRACKER ACTION & CONTROL STRIP (PLACED DIRECTLY ABOVE 16:9 CAMERA AREA) */}
      <View style={styles.actionControlStrip}>
        {/* Left: Rep counter & Live Form Feedback */}
        <View style={styles.repStatusBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={styles.repsNumBig}>{String(currentReps).padStart(2, '0')}</Text>
            <Text style={styles.targetNumSmall}>/ {target} {isPlank ? 'SEC' : 'REPS'}</Text>
            {totalSets > 1 && (
              <Text style={styles.setCounterMini}>• SET {currentSet} OF {totalSets}</Text>
            )}
          </View>

          <View style={[styles.formStatusChip, isBodyDetected ? styles.formStatusGood : styles.formStatusSearching]}>
            <View style={[styles.statusDot, isBodyDetected ? { backgroundColor: '#10B981' } : { backgroundColor: '#F59E0B' }]} />
            <Text
              style={[styles.formStatusText, isBodyDetected ? { color: '#10B981' } : { color: '#F59E0B' }]}
              numberOfLines={1}
            >
              {isBodyDetected ? formFeedback : (detectedKeypoints ? 'ALIGN POSITION' : 'SEARCHING BODY')}
            </Text>
          </View>
        </View>

        {/* Right: Camera Controls & Finish Set Button */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.cameraActionBtn, torch && styles.cameraActionBtnActive]}
            onPress={toggleTorch}
            activeOpacity={0.8}
          >
            <Flashlight size={18} color={torch ? '#E11D48' : '#FFFFFF'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cameraActionBtn}
            onPress={toggleCameraFacing}
            activeOpacity={0.8}
          >
            <SwitchCamera size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endSetActionButton}
            onPress={() => handleFinishWorkout(currentReps)}
            activeOpacity={0.85}
          >
            <Text style={styles.endSetActionButtonText}>END SET</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. DEDICATED 16:9 CAMERA PREVIEW CONTAINER */}
      <View
        style={styles.cameraContainerOuter}
        onLayout={(e: LayoutChangeEvent) => {
          const { width: availW, height: availH } = e.nativeEvent.layout;
          if (availW <= 0 || availH <= 0) return;

          // Dedicated 9:16 portrait ratio
          let targetW = availW;
          let targetH = availW * (16 / 9);

          if (targetH > availH) {
            targetH = availH;
            targetW = availH * (9 / 16);
          }

          setCameraDims({ width: Math.round(targetW), height: Math.round(targetH) });
        }}
      >
        {cameraDims.width > 0 && cameraDims.height > 0 && (
          <View
            style={[
              styles.camera16by9Inner,
              {
                width: cameraDims.width,
                height: cameraDims.height,
                borderColor: isBodyDetected ? 'rgba(16, 185, 129, 0.6)' : '#1C1E2A',
              },
            ]}
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

            {/* Real Live AI Skeletal Tracking Overlay sharing identical 16:9 bounds */}
            {showSkeleton && detectedKeypoints && isBodyDetected && (
              <Svg
                style={StyleSheet.absoluteFill}
                width={cameraDims.width}
                height={cameraDims.height}
              >
                {/* Head / Neck */}
                {renderBone(0, 5, '#00D2EE', 2.5)}
                {renderBone(0, 6, '#00D2EE', 2.5)}

                {/* Shoulders */}
                {renderBone(5, 6, '#E11D48', 3.2)}

                {/* Left Arm (Shoulder -> Elbow -> Wrist) */}
                {renderBone(5, 7, '#00D2EE', 2.8)}
                {renderBone(7, 9, '#00D2EE', 2.8)}

                {/* Right Arm (Shoulder -> Elbow -> Wrist) */}
                {renderBone(6, 8, '#00D2EE', 2.8)}
                {renderBone(8, 10, '#00D2EE', 2.8)}

                {/* Torso Box (Shoulder -> Hip) */}
                {renderBone(5, 11, '#E11D48', 2.6)}
                {renderBone(6, 12, '#E11D48', 2.6)}
                {renderBone(11, 12, '#E11D48', 3.0)}

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
                  const ringColor = isLeg ? '#10B981' : isHead ? '#00D2EE' : '#E11D48';

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
                      <SvgCircle
                        cx={p.x}
                        cy={p.y}
                        r={3}
                        fill="#FFFFFF"
                      />
                    </React.Fragment>
                  );
                })}
              </Svg>
            )}

            {/* Alignment Guide Brackets */}
            <View style={styles.alignmentGuideBox} pointerEvents="none">
              <View style={[styles.cornerBracket, styles.bracketTL, isBodyDetected && { borderColor: '#10B981' }]} />
              <View style={[styles.cornerBracket, styles.bracketTR, isBodyDetected && { borderColor: '#10B981' }]} />
              <View style={[styles.cornerBracket, styles.bracketBL, isBodyDetected && { borderColor: '#10B981' }]} />
              <View style={[styles.cornerBracket, styles.bracketBR, isBodyDetected && { borderColor: '#10B981' }]} />
            </View>

            {/* Multi-Set Rest Interval Overlay */}
            {isResting && (
              <View style={styles.restOverlay}>
                <View style={styles.restCard}>
                  <View style={styles.restTagRow}>
                    <Clock size={16} color="#00D2EE" />
                    <Text style={styles.restTagText}>REST INTERVAL // RECOVERY</Text>
                  </View>

                  <Text style={styles.restTimerBig}>{restCountdown}s</Text>

                  <Text style={styles.restSetInfo}>
                    SET {currentSet} OF {totalSets} COMPLETE!
                  </Text>
                  <Text style={styles.restNextInfo}>
                    NEXT: SET {currentSet + 1} ({target} {isPlank ? 'SEC' : 'REPS'})
                  </Text>

                  <TouchableOpacity
                    style={styles.skipRestBtn}
                    onPress={handleSkipRest}
                    activeOpacity={0.8}
                  >
                    <FastForward size={16} color="#000000" />
                    <Text style={styles.skipRestBtnText}>SKIP REST // START SET {currentSet + 1}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
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

  // 1. Top Header Bar
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1E2A',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerExerciseTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerTimerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // 2. Tracker Action & Control Strip (Directly ABOVE Camera)
  actionControlStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0B0D14',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1E2A',
  },
  repStatusBox: {
    gap: 4,
    flex: 1,
  },
  repsNumBig: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  targetNumSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  formStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  formStatusGood: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  formStatusSearching: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  formStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraActionBtnActive: {
    borderColor: '#E11D48',
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
  },
  endSetActionButton: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSetActionButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // 3. Dedicated 16:9 Camera Preview Container
  cameraContainerOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  camera16by9Inner: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#070A10',
    borderWidth: 1.5,
    position: 'relative',
  },
  noCameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070A10',
    gap: 8,
  },
  noCameraText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },

  // Alignment Guide Brackets
  alignmentGuideBox: {
    ...StyleSheet.absoluteFillObject,
    margin: 20,
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(225, 29, 72, 0.6)',
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  setHeaderBadge: {
    backgroundColor: '#082f49',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D2EE',
  },
  setHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.5,
  },
  setCounterMini: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00D2EE',
    marginLeft: 4,
  },
  restOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  restCard: {
    width: '100%',
    backgroundColor: '#0B0D14',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#00D2EE',
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
    color: '#00D2EE',
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
    backgroundColor: '#00D2EE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  skipRestBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00D2EE' === '#00D2EE' ? '#000000' : '#FFFFFF',
    letterSpacing: 0.5,
  },
});
