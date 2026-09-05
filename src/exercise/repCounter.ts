/**
 * ARISE — Rep Counter State Machine
 * 
 * Generic state machine for counting exercise repetitions.
 * Uses joint angles and movement states to detect reps.
 * 
 * State flow: IDLE → READY → UP ↔ DOWN (increment on UP→DOWN→UP cycle)
 */

import { Point, calculateAngle, areAllConfident, smoothAngle } from './angleUtils';
import { validateExercisePose } from './poseValidator';

export type RepState = 'IDLE' | 'READY' | 'UP' | 'DOWN';

export interface ExerciseConfig {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  // Keypoint indices used for primary angle calculation
  primaryJoints: [number, number, number]; // [pointA, vertex, pointC]
  // Optional secondary joints for form checking
  secondaryJoints?: [number, number, number];
  // Angle thresholds
  upThreshold: number;       // Angle above this = UP position
  downThreshold: number;     // Angle below this = DOWN position
  // Confidence requirements
  minConfidence: number;     // Minimum keypoint confidence (0-1)
  // Timing
  debounceMs: number;        // Minimum time between reps
  minHoldMs: number;         // Minimum time in DOWN position to count
  // Targets
  defaultTarget: number;
  maxTarget: number;
  minTarget: number;
  // Rewards per rep
  coinsPerRep: number;
  xpPerRep: number;
  // What stat does this exercise improve
  statType: 'strength' | 'discipline' | 'focus' | 'health' | 'knowledge';
  // Form feedback thresholds
  formAngleMin?: number;     // Minimum angle for "go lower" feedback
  formAlignmentThreshold?: number; // Max deviation for body alignment
}

export interface RepCounterState {
  repState: RepState;
  count: number;
  lastRepTime: number;
  lastAngle: number;
  downStartTime: number;
  feedback: FormFeedback;
  isBodyDetected: boolean;
}

export interface FormFeedback {
  message: string;
  type: 'good' | 'warning' | 'error' | 'info';
}

const DEFAULT_FEEDBACK: FormFeedback = {
  message: 'Move into position',
  type: 'info',
};

/**
 * MoveNet keypoint indices:
 * 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear,
 * 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow,
 * 9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip,
 * 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle
 */

export function createInitialState(): RepCounterState {
  return {
    repState: 'IDLE',
    count: 0,
    lastRepTime: 0,
    lastAngle: 0,
    downStartTime: 0,
    feedback: DEFAULT_FEEDBACK,
    isBodyDetected: false,
  };
}

/**
 * Process a single frame of keypoints and update the rep counter state.
 * This is the core state machine.
 */
export function processFrame(
  state: RepCounterState,
  keypoints: Point[],
  config: ExerciseConfig,
  now: number = Date.now()
): RepCounterState {
  // Check if we have enough keypoints
  if (keypoints.length < 17) {
    return {
      ...state,
      isBodyDetected: false,
      feedback: { message: 'Move into camera view', type: 'info' },
    };
  }

  // 0. Anatomical Validation: Reject face-only closeups and verify limb presence
  const validation = validateExercisePose(keypoints, config.type);
  if (!validation.valid) {
    return {
      ...state,
      isBodyDetected: false,
      feedback: { message: validation.message, type: validation.isFaceOnly ? 'warning' : 'info' },
    };
  }

  // 1. Bilateral Joint Selection:
  // Instead of only checking left side joints, evaluate both sides and choose whichever has higher confidence!
  let pointA = keypoints[config.primaryJoints[0]];
  let pointB = keypoints[config.primaryJoints[1]];
  let pointC = keypoints[config.primaryJoints[2]];

  if (config.type === 'PUSHUP') {
    // Left arm: 5 (shoulder), 7 (elbow), 9 (wrist)
    // Right arm: 6 (shoulder), 8 (elbow), 10 (wrist)
    const leftConf = ((keypoints[5]?.confidence || 0) + (keypoints[7]?.confidence || 0) + (keypoints[9]?.confidence || 0)) / 3;
    const rightConf = ((keypoints[6]?.confidence || 0) + (keypoints[8]?.confidence || 0) + (keypoints[10]?.confidence || 0)) / 3;
    if (rightConf > leftConf) {
      pointA = keypoints[6];
      pointB = keypoints[8];
      pointC = keypoints[10];
    } else {
      pointA = keypoints[5];
      pointB = keypoints[7];
      pointC = keypoints[9];
    }
  } else if (config.type === 'SQUAT') {
    // Left leg: 11 (hip), 13 (knee), 15 (ankle)
    // Right leg: 12 (hip), 14 (knee), 16 (ankle)
    const leftConf = ((keypoints[11]?.confidence || 0) + (keypoints[13]?.confidence || 0) + (keypoints[15]?.confidence || 0)) / 3;
    const rightConf = ((keypoints[12]?.confidence || 0) + (keypoints[14]?.confidence || 0) + (keypoints[16]?.confidence || 0)) / 3;
    if (rightConf > leftConf) {
      pointA = keypoints[12];
      pointB = keypoints[14];
      pointC = keypoints[16];
    } else {
      pointA = keypoints[11];
      pointB = keypoints[13];
      pointC = keypoints[15];
    }
  }

  // Check confidence with 0.38 threshold (prevents out-of-frame noise)
  const effectiveMinConf = config.minConfidence || 0.38;
  if (!pointA || !pointB || !pointC || !areAllConfident([pointA, pointB, pointC], effectiveMinConf)) {
    return {
      ...state,
      isBodyDetected: false,
      feedback: { message: 'Position your body in frame', type: 'info' },
    };
  }

  // Calculate primary angle
  const rawAngle = calculateAngle(pointA, pointB, pointC);
  const angle = smoothAngle(rawAngle, state.lastAngle, 0.6);

  const newState: RepCounterState = {
    ...state,
    lastAngle: angle,
    isBodyDetected: true,
  };

  // State machine transitions
  switch (state.repState) {
    case 'IDLE':
      // Transition to READY when body is detected with sufficient confidence
      newState.repState = 'READY';
      newState.feedback = { message: 'Get ready!', type: 'info' };
      break;

    case 'READY':
      // Transition to UP when in the starting position
      if (angle >= config.upThreshold) {
        newState.repState = 'UP';
        newState.feedback = { message: 'Go!', type: 'good' };
      } else if (angle <= config.downThreshold) {
        newState.repState = 'DOWN';
        newState.downStartTime = now;
        newState.feedback = { message: 'Come back up!', type: 'warning' };
      }
      break;

    case 'UP':
      // Check form alignment if secondary joints are configured
      if (config.secondaryJoints) {
        const [sA, sB, sC] = config.secondaryJoints;
        if (areAllConfident([keypoints[sA], keypoints[sB], keypoints[sC]], effectiveMinConf)) {
          const alignAngle = calculateAngle(keypoints[sA], keypoints[sB], keypoints[sC]);
          if (config.formAlignmentThreshold && Math.abs(180 - alignAngle) > config.formAlignmentThreshold) {
            newState.feedback = { message: 'Keep your back straight', type: 'warning' };
          }
        }
      }

      // Transition to DOWN
      if (angle <= config.downThreshold) {
        newState.repState = 'DOWN';
        newState.downStartTime = now;
        newState.feedback = { message: 'Good! Now come back up', type: 'good' };
      } else if (config.formAngleMin && angle < config.upThreshold && angle > config.formAngleMin) {
        newState.feedback = { message: 'Go lower', type: 'warning' };
      } else {
        newState.feedback = { message: 'Good form!', type: 'good' };
      }
      break;

    case 'DOWN':
      // Transition to UP = complete one rep
      if (angle >= config.upThreshold) {
        const timeSinceLastRep = now - state.lastRepTime;

        // Debounce check
        if (timeSinceLastRep >= (config.debounceMs || 300)) {
          newState.repState = 'UP';
          newState.count = state.count + 1;
          newState.lastRepTime = now;
          newState.feedback = { message: `${newState.count}! Keep going!`, type: 'good' };
        } else {
          newState.repState = 'UP';
          newState.feedback = { message: 'Control your movement', type: 'warning' };
        }
      } else {
        // Still in down position
        newState.feedback = { message: 'Good! Now push up', type: 'good' };
      }
      break;
  }

  return newState;
}

/**
 * Reset the rep counter, keeping the count.
 */
export function resetState(): RepCounterState {
  return createInitialState();
}
