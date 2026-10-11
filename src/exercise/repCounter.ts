/**
 * ARISE — Bulletproof Rep Counter State Machine
 * 
 * MediaPipe 33-Landmark Pose Engine with:
 * 1. Full Range-of-Motion (ROM) validation (partial reps are rejected).
 * 2. Duration guards (0.8s - 6.0s, rejects flicker and stall).
 * 3. 0.5s debounce lockout after rep completion.
 * 4. Bilateral joint angle evaluation (handles side-profile and camera placement).
 * 5. One Euro adaptive filter smoothing.
 * 6. Human presence validation gate (K=10 valid frames to activate, M=15 to pause).
 */

import { Point, calculateAngle3D, areAllConfident, PoseLandmarkFilter } from './angleUtils';
import { validateExercisePose, HumanPresenceTracker, PoseValidationResult } from './poseValidator';
import { LandmarkIndex } from '../../modules/pose-detector';

export type RepState = 'IDLE' | 'DETECTING' | 'READY' | 'DOWN_PHASE' | 'UP_PHASE';

export interface ExerciseConfig {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  primaryJoints: [number, number, number];
  secondaryJoints?: [number, number, number];
  upThreshold: number;       // Angle for extended / UP position
  downThreshold: number;     // Angle for flexed / DOWN position
  minConfidence: number;     // Minimum landmark visibility (0-1)
  debounceMs: number;        // Minimum lockout time between reps (ms)
  minHoldMs: number;         // Minimum bottom dwell time (ms)
  defaultTarget: number;
  maxTarget: number;
  minTarget: number;
  coinsPerRep: number;
  xpPerRep: number;
  statType: 'strength' | 'discipline' | 'focus' | 'health' | 'knowledge';
  formAngleMin?: number;
  formAlignmentThreshold?: number;
}

export interface FormFeedback {
  message: string;
  type: 'good' | 'warning' | 'error' | 'info';
}

export interface RepCounterState {
  repState: RepState;
  count: number;
  lastRepTime: number;
  lastAngle: number;
  repStartTime: number;
  minAngleReached: number;
  maxAngleReached: number;
  feedback: FormFeedback;
  isBodyDetected: boolean;
  presenceStatus: 'SEARCHING' | 'CONFIRMING' | 'READY' | 'PAUSED';
  filterInstance?: PoseLandmarkFilter;
  presenceTracker?: HumanPresenceTracker;
}

const DEFAULT_FEEDBACK: FormFeedback = {
  message: 'Position camera to view your full body',
  type: 'info',
};

export function createInitialState(): RepCounterState {
  return {
    repState: 'IDLE',
    count: 0,
    lastRepTime: 0,
    lastAngle: 0,
    repStartTime: 0,
    minAngleReached: 180,
    maxAngleReached: 0,
    feedback: DEFAULT_FEEDBACK,
    isBodyDetected: false,
    presenceStatus: 'SEARCHING',
    filterInstance: new PoseLandmarkFilter(),
    presenceTracker: new HumanPresenceTracker(),
  };
}

/**
 * Extracts bilateral angles for the exercise (handles side view, left or right).
 */
export function computeBilateralAngle(
  landmarks: Point[],
  config: ExerciseConfig
): { angle: number; activeSide: 'left' | 'right' | 'primary' } {
  const normType = config.type.toUpperCase();

  if (normType === 'PUSHUP') {
    const lSh = landmarks[LandmarkIndex.LEFT_SHOULDER];
    const lEl = landmarks[LandmarkIndex.LEFT_ELBOW];
    const lWr = landmarks[LandmarkIndex.LEFT_WRIST];

    const rSh = landmarks[LandmarkIndex.RIGHT_SHOULDER];
    const rEl = landmarks[LandmarkIndex.RIGHT_ELBOW];
    const rWr = landmarks[LandmarkIndex.RIGHT_WRIST];

    const leftArmValid = lSh && lEl && lWr && areAllConfident([lSh, lEl, lWr], 0.40);
    const rightArmValid = rSh && rEl && rWr && areAllConfident([rSh, rEl, rWr], 0.40);

    const leftAngle = leftArmValid ? calculateAngle3D(lSh, lEl, lWr) : 0;
    const rightAngle = rightArmValid ? calculateAngle3D(rSh, rEl, rWr) : 0;

    if (leftAngle > 0 && rightAngle > 0) {
      // Both arms visible: use deeper flexion (smaller angle)
      return { angle: Math.min(leftAngle, rightAngle), activeSide: leftAngle < rightAngle ? 'left' : 'right' };
    } else if (leftAngle > 0) {
      return { angle: leftAngle, activeSide: 'left' };
    } else if (rightAngle > 0) {
      return { angle: rightAngle, activeSide: 'right' };
    }
  } else if (normType === 'SQUAT') {
    const lHip = landmarks[LandmarkIndex.LEFT_HIP];
    const lKn = landmarks[LandmarkIndex.LEFT_KNEE];
    const lAnk = landmarks[LandmarkIndex.LEFT_ANKLE];

    const rHip = landmarks[LandmarkIndex.RIGHT_HIP];
    const rKn = landmarks[LandmarkIndex.RIGHT_KNEE];
    const rAnk = landmarks[LandmarkIndex.RIGHT_ANKLE];

    const leftLegValid = lHip && lKn && lAnk && areAllConfident([lHip, lKn, lAnk], 0.40);
    const rightLegValid = rHip && rKn && rAnk && areAllConfident([rHip, rKn, rAnk], 0.40);

    const leftAngle = leftLegValid ? calculateAngle3D(lHip, lKn, lAnk) : 0;
    const rightAngle = rightLegValid ? calculateAngle3D(rHip, rKn, rAnk) : 0;

    if (leftAngle > 0 && rightAngle > 0) {
      return { angle: Math.min(leftAngle, rightAngle), activeSide: leftAngle < rightAngle ? 'left' : 'right' };
    } else if (leftAngle > 0) {
      return { angle: leftAngle, activeSide: 'left' };
    } else if (rightAngle > 0) {
      return { angle: rightAngle, activeSide: 'right' };
    }
  }

  // Fallback to configured primary joints
  const pA = landmarks[config.primaryJoints[0]];
  const pB = landmarks[config.primaryJoints[1]];
  const pC = landmarks[config.primaryJoints[2]];

  if (pA && pB && pC && areAllConfident([pA, pB, pC], config.minConfidence || 0.40)) {
    return { angle: calculateAngle3D(pA, pB, pC), activeSide: 'primary' };
  }

  return { angle: 0, activeSide: 'primary' };
}

/**
 * Backward compatibility helper for extracting body vertical position.
 */
export function extractBodyY(landmarks: Point[]): { y: number; confidence: number } | null {
  const lSh = landmarks[LandmarkIndex.LEFT_SHOULDER];
  const rSh = landmarks[LandmarkIndex.RIGHT_SHOULDER];
  if (lSh && rSh && (lSh.visibility ?? 0) >= 0.4 && (rSh.visibility ?? 0) >= 0.4) {
    return { y: (lSh.y + rSh.y) / 2, confidence: ((lSh.visibility ?? 0) + (rSh.visibility ?? 0)) / 2 };
  }
  if (lSh && (lSh.visibility ?? 0) >= 0.4) return { y: lSh.y, confidence: lSh.visibility ?? 0 };
  if (rSh && (rSh.visibility ?? 0) >= 0.4) return { y: rSh.y, confidence: rSh.visibility ?? 0 };
  return null;
}

/**
 * Processes a single frame of pose landmarks and updates the rep counter state.
 */
export function processFrame(
  state: RepCounterState,
  rawLandmarks: Point[],
  config: ExerciseConfig,
  now: number = Date.now()
): RepCounterState {
  if (!rawLandmarks || rawLandmarks.length < 33) {
    return {
      ...state,
      isBodyDetected: false,
      feedback: { message: 'Position full body in camera frame', type: 'info' },
    };
  }

  // 1. One Euro Adaptive Smoothing
  const filter = state.filterInstance || new PoseLandmarkFilter();
  const smoothedLandmarks = filter.filterLandmarks(rawLandmarks, now);

  // 2. Detection Gate & Anatomical Validation
  const validation = validateExercisePose(smoothedLandmarks, config.type);
  const presence = state.presenceTracker || new HumanPresenceTracker();
  const presenceResult = presence.process(validation);

  if (!presenceResult.isReady) {
    return {
      ...state,
      filterInstance: filter,
      presenceTracker: presence,
      isBodyDetected: false,
      presenceStatus: presenceResult.status,
      repState: presenceResult.status === 'CONFIRMING' ? 'DETECTING' : 'IDLE',
      feedback: {
        message: presenceResult.guidance,
        type: presenceResult.status === 'PAUSED' ? 'warning' : 'info',
      },
    };
  }

  // 3. Compute joint angle
  const { angle } = computeBilateralAngle(smoothedLandmarks, config);
  if (angle <= 0) {
    return {
      ...state,
      filterInstance: filter,
      presenceTracker: presence,
      isBodyDetected: true,
      presenceStatus: 'READY',
      feedback: { message: 'Adjust camera so active joints are visible', type: 'warning' },
    };
  }

  const newState: RepCounterState = {
    ...state,
    filterInstance: filter,
    presenceTracker: presence,
    isBodyDetected: true,
    presenceStatus: 'READY',
    lastAngle: angle,
  };

  const normType = config.type.toUpperCase();
  const isSitup = normType === 'SITUP';

  // 4. Bulletproof State Machine
  switch (state.repState) {
    case 'IDLE':
    case 'DETECTING': {
      // Initialize to READY once human is confirmed in starting position
      newState.repState = 'READY';
      newState.minAngleReached = angle;
      newState.maxAngleReached = angle;
      newState.feedback = { message: 'Position locked! Begin when ready', type: 'good' };
      break;
    }

    case 'READY': {
      // In pushup/squat: starting position is extended arms/legs (>= upThreshold)
      const inStartPos = isSitup ? angle >= config.upThreshold : angle >= (config.upThreshold - 8);

      if (inStartPos) {
        newState.repState = 'READY';
        newState.feedback = { message: 'Ready! Start first rep', type: 'good' };
      }

      // Check transition to DOWN_PHASE (user starts bending joints)
      const startedMovement = isSitup
        ? angle < (config.upThreshold - 15)
        : angle < (config.upThreshold - 12);

      if (startedMovement) {
        // Enforce 0.5s debounce lockout after previous rep
        const timeSinceLastRep = now - state.lastRepTime;
        if (state.lastRepTime > 0 && timeSinceLastRep < Math.max(500, config.debounceMs || 500)) {
          // Locked out — wait for debounce period
          break;
        }

        newState.repState = 'DOWN_PHASE';
        newState.repStartTime = now;
        newState.minAngleReached = angle;
        newState.maxAngleReached = angle;
        newState.feedback = { message: 'Lowering down...', type: 'good' };
      }
      break;
    }

    case 'DOWN_PHASE': {
      // Track deepest flexion (minimum angle reached)
      newState.minAngleReached = Math.min(state.minAngleReached, angle);
      newState.maxAngleReached = Math.max(state.maxAngleReached, angle);

      const targetDown = config.downThreshold;
      const hitBottom = isSitup ? angle <= targetDown : angle <= targetDown;

      if (hitBottom) {
        // Full bottom reached! Transition to UP_PHASE
        newState.repState = 'UP_PHASE';
        newState.feedback = { message: 'Bottom reached! Push back up', type: 'good' };
      } else {
        // Still in descent
        const repDuration = now - state.repStartTime;
        if (repDuration > 6000) {
          // Stalled out or resting > 6 seconds — reset to READY
          newState.repState = 'READY';
          newState.feedback = { message: 'Pace reset. Begin next rep', type: 'info' };
        } else {
          // Encouragement if near bottom
          if (Math.abs(angle - targetDown) < 20) {
            newState.feedback = { message: 'Almost there! Push all the way down', type: 'good' };
          }
        }
      }
      break;
    }

    case 'UP_PHASE': {
      newState.minAngleReached = Math.min(state.minAngleReached, angle);
      newState.maxAngleReached = Math.max(state.maxAngleReached, angle);

      const targetUp = config.upThreshold;
      const hitTop = isSitup ? angle >= targetUp : angle >= targetUp;

      if (hitTop) {
        // Completed ascension! Now strictly validate all 3 rep rules:
        const repDuration = now - state.repStartTime;

        // Rule 1: Range of Motion (ROM) Validation
        // For pushup: minAngleReached MUST have reached <= downThreshold (e.g. 95)
        const fullRomSatisfied = isSitup
          ? newState.minAngleReached <= config.downThreshold
          : newState.minAngleReached <= config.downThreshold;

        // Rule 2: Duration Guard (0.8s <= duration <= 6.0s)
        const validDuration = repDuration >= 800 && repDuration <= 6000;

        // Rule 3: Debounce Lockout
        const debouncePassed = (now - state.lastRepTime) >= Math.max(500, config.debounceMs || 500);

        if (!fullRomSatisfied) {
          // Partial rep rejected!
          newState.repState = 'READY';
          newState.feedback = {
            message: 'Half rep rejected! Go lower for full depth',
            type: 'warning',
          };
        } else if (!validDuration) {
          if (repDuration < 800) {
            // Flicker / too fast rejected!
            newState.repState = 'READY';
            newState.feedback = {
              message: 'Too fast! Control your pace',
              type: 'warning',
            };
          } else {
            // Took > 6 seconds
            newState.repState = 'READY';
            newState.feedback = {
              message: 'Rep took too long. Keep a steady tempo',
              type: 'info',
            };
          }
        } else if (debouncePassed) {
          // REP COUNTED!
          newState.repState = 'READY';
          newState.count = state.count + 1;
          newState.lastRepTime = now;
          newState.repStartTime = 0;
          newState.minAngleReached = 180;
          newState.maxAngleReached = 0;
          newState.feedback = {
            message: `${newState.count}! Perfect form!`,
            type: 'good',
          };
        }
      } else {
        const repDuration = now - state.repStartTime;
        if (repDuration > 6000) {
          newState.repState = 'READY';
          newState.feedback = { message: 'Resetting. Push up fully to count', type: 'info' };
        } else {
          newState.feedback = { message: 'Push all the way up!', type: 'good' };
        }
      }
      break;
    }
  }

  return newState;
}

export function resetState(): RepCounterState {
  return createInitialState();
}
