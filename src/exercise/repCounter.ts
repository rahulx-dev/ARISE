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
  baselineY: number; // Highest/starting position
  maxDownY: number;  // Lowest point reached
  smoothedY: number; // Exponential Moving Average of body vertical position
  consecutiveDownFrames: number; // Anti-jitter confirmation counter
  consecutiveUpFrames: number;
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
    baselineY: 0,
    maxDownY: 0,
    smoothedY: 0,
    consecutiveDownFrames: 0,
    consecutiveUpFrames: 0,
  };
}

/**
 * Robust helper: extracts the body's primary vertical Y position (0 = top, 1 = bottom).
 * Prefers shoulders center, then single shoulder, then nose, then hips.
 */
export function extractBodyY(keypoints: Point[]): { y: number; confidence: number } | null {
  const lSh = keypoints[5];
  const rSh = keypoints[6];
  const nose = keypoints[0];
  const lHip = keypoints[11];
  const rHip = keypoints[12];

  const lShConf = lSh?.confidence ?? 0;
  const rShConf = rSh?.confidence ?? 0;

  if (lShConf >= 0.25 && rShConf >= 0.25) {
    return { y: (lSh.y + rSh.y) / 2, confidence: (lShConf + rShConf) / 2 };
  }
  if (lShConf >= 0.28) return { y: lSh.y, confidence: lShConf };
  if (rShConf >= 0.28) return { y: rSh.y, confidence: rShConf };
  
  // Strict: Never fall back to nose. Body coordinates must be shoulders or hips only.
  const lHipConf = lHip?.confidence ?? 0;
  const rHipConf = rHip?.confidence ?? 0;
  if (lHipConf >= 0.25 && rHipConf >= 0.25) {
    return { y: (lHip.y + rHip.y) / 2, confidence: (lHipConf + rHipConf) / 2 };
  }
  if (lHipConf >= 0.28) return { y: lHip.y, confidence: lHipConf };
  if (rHipConf >= 0.28) return { y: rHip.y, confidence: rHipConf };
  return null;
}

/**
 * Process a single frame of keypoints and update the rep counter state.
 * Employs a Dual Tracker:
 * 1. Physical Vertical Motion (Y-displacement: Body goes DOWN, then returns UP)
 * 2. Bilateral Joint Angles (if confident)
 */
export function processFrame(
  state: RepCounterState,
  keypoints: Point[],
  config: ExerciseConfig,
  now: number = Date.now()
): RepCounterState {
  if (keypoints.length < 17) {
    return {
      ...state,
      isBodyDetected: false,
      repState: 'IDLE',
      baselineY: 0,
      maxDownY: 0,
      smoothedY: 0,
      consecutiveDownFrames: 0,
      consecutiveUpFrames: 0,
      downStartTime: 0,
      feedback: { message: 'Move into camera view', type: 'info' },
    };
  }

  // 0. Anatomical Validation
  const validation = validateExercisePose(keypoints, config.type);
  if (!validation.valid) {
    return {
      ...state,
      isBodyDetected: false,
      repState: 'IDLE',
      baselineY: 0,
      maxDownY: 0,
      smoothedY: 0,
      consecutiveDownFrames: 0,
      consecutiveUpFrames: 0,
      downStartTime: 0,
      feedback: { message: validation.message, type: validation.isFaceOnly ? 'warning' : 'info' },
    };
  }

  // 1. Extract Body Vertical Position
  const bodyYObj = extractBodyY(keypoints);
  if (!bodyYObj) {
    return {
      ...state,
      isBodyDetected: false,
      repState: 'IDLE',
      baselineY: 0,
      maxDownY: 0,
      smoothedY: 0,
      consecutiveDownFrames: 0,
      consecutiveUpFrames: 0,
      downStartTime: 0,
      feedback: { message: 'Position your body in frame', type: 'info' },
    };
  }

  const bodyY = bodyYObj.y;
  let angle = 0;

  // 2. High-Accuracy Bilateral Angle Calculation
  let pointA = keypoints[config.primaryJoints[0]];
  let pointB = keypoints[config.primaryJoints[1]];
  let pointC = keypoints[config.primaryJoints[2]];

  if (config.type === 'PUSHUP') {
    const leftArmValid = keypoints[5] && keypoints[7] && keypoints[9] && areAllConfident([keypoints[5], keypoints[7], keypoints[9]], 0.18);
    const rightArmValid = keypoints[6] && keypoints[8] && keypoints[10] && areAllConfident([keypoints[6], keypoints[8], keypoints[10]], 0.18);

    const leftAngle = leftArmValid ? calculateAngle(keypoints[5], keypoints[7], keypoints[9]) : 0;
    const rightAngle = rightArmValid ? calculateAngle(keypoints[6], keypoints[8], keypoints[10]) : 0;

    if (leftAngle > 0 && rightAngle > 0) {
      // Both arms visible: use the arm with deeper flexion (smaller elbow angle)
      angle = smoothAngle(Math.min(leftAngle, rightAngle), state.lastAngle, 0.75);
    } else if (leftAngle > 0) {
      angle = smoothAngle(leftAngle, state.lastAngle, 0.75);
    } else if (rightAngle > 0) {
      angle = smoothAngle(rightAngle, state.lastAngle, 0.75);
    }
  } else if (config.type === 'SQUAT') {
    const leftLegValid = keypoints[11] && keypoints[13] && keypoints[15] && areAllConfident([keypoints[11], keypoints[13], keypoints[15]], 0.18);
    const rightLegValid = keypoints[12] && keypoints[14] && keypoints[16] && areAllConfident([keypoints[12], keypoints[14], keypoints[16]], 0.18);

    const leftAngle = leftLegValid ? calculateAngle(keypoints[11], keypoints[13], keypoints[15]) : 0;
    const rightAngle = rightLegValid ? calculateAngle(keypoints[12], keypoints[14], keypoints[16]) : 0;

    if (leftAngle > 0 && rightAngle > 0) {
      // Both legs visible: use deepest knee bend
      angle = smoothAngle(Math.min(leftAngle, rightAngle), state.lastAngle, 0.75);
    } else if (leftAngle > 0) {
      angle = smoothAngle(leftAngle, state.lastAngle, 0.75);
    } else if (rightAngle > 0) {
      angle = smoothAngle(rightAngle, state.lastAngle, 0.75);
    }
  } else {
    if (pointA && pointB && pointC && areAllConfident([pointA, pointB, pointC], config.minConfidence || 0.18)) {
      const rawAngle = calculateAngle(pointA, pointB, pointC);
      angle = smoothAngle(rawAngle, state.lastAngle, 0.75);
    }
  }

  // 3. Exponential Moving Average (EMA) for rock-solid vertical movement
  const currentSmoothedY = state.smoothedY === 0
    ? bodyY
    : (state.smoothedY * 0.60 + bodyY * 0.40);

  // Exercise-specific displacement thresholds calibrated for real camera placement
  // Exercise-specific displacement thresholds calibrated for real camera placement
  // Strict: require real physical range of motion, not micro-movements
  let downDeltaThresh = 0.10;
  if (config.type === 'SQUAT') {
    downDeltaThresh = 0.12;
  } else if (config.type === 'PUSHUP') {
    downDeltaThresh = 0.09; // Real floor pushup chest-to-ground drop
  } else if (config.type === 'JUMPING_JACK') {
    downDeltaThresh = 0.08;
  }
  const upReturnThresh = downDeltaThresh * 0.45;

  const newState: RepCounterState = {
    ...state,
    lastAngle: angle > 0 ? angle : state.lastAngle,
    isBodyDetected: true,
    smoothedY: currentSmoothedY,
  };

  // Initialize baseline if not set
  if (newState.baselineY === 0) {
    newState.baselineY = currentSmoothedY;
    newState.maxDownY = currentSmoothedY;
    newState.repState = 'READY';
    newState.feedback = { message: 'Ready! Start movement', type: 'good' };
    return newState;
  }

  // 4. Dual-Trigger State Machine Transitions
  switch (state.repState) {
    case 'IDLE':
      newState.repState = 'READY';
      newState.baselineY = currentSmoothedY;
      newState.maxDownY = currentSmoothedY;
      newState.feedback = { message: 'Get ready!', type: 'info' };
      break;

    case 'READY':
      if (currentSmoothedY < newState.baselineY) {
        newState.baselineY = currentSmoothedY;
      }
      newState.repState = 'UP';
      newState.feedback = { message: 'Go!', type: 'good' };
      break;

    case 'UP':
      // Track highest point reached (top baseline)
      if (currentSmoothedY < newState.baselineY) {
        newState.baselineY = currentSmoothedY;
      }

      // Check transition to DOWN:
      // Anti-Cheat: If joint angle is available, angle flexion is STRICTLY REQUIRED.
      // Y-movement alone is only allowed as a fallback if angle is completely unmeasurable,
      // and only with full body descent.
      let isDownTriggered = false;
      isDownTriggered = angle > 0
        ? angle <= config.downThreshold
        : currentSmoothedY >= (newState.baselineY + downDeltaThresh);

      if (isDownTriggered) {
        const nextFrames = (state.consecutiveDownFrames || 0) + 1;
        newState.consecutiveDownFrames = nextFrames;

        if (nextFrames >= 2) {
          newState.repState = 'DOWN';
          newState.downStartTime = now;
          newState.maxDownY = currentSmoothedY;
          newState.feedback = { message: 'Good! Now push back up', type: 'good' };
        } else {
          newState.feedback = { message: 'Lowering... hold form', type: 'good' };
        }
      } else {
        newState.consecutiveDownFrames = 0;
        newState.feedback = { message: 'Good form! Go down', type: 'good' };
      }
      break;

    case 'DOWN':
      // Track deepest descent
      newState.maxDownY = Math.max(newState.maxDownY, currentSmoothedY);

      // Check transition to UP:
      // Requires:
      // 1. Dwell time: User reached bottom (at least 60ms)
      // 2. Physical return near baseline AND joint angle extension
      const holdDuration = now - state.downStartTime;
      let isUpTriggered = false;
      isUpTriggered = angle > 0
        ? angle >= config.upThreshold
        : currentSmoothedY <= (newState.baselineY + upReturnThresh);

      if (isUpTriggered) {
        newState.consecutiveUpFrames = (state.consecutiveUpFrames || 0) + 1;
      } else {
        newState.consecutiveUpFrames = 0;
      }

      if (newState.consecutiveUpFrames >= 2 &&
          holdDuration >= Math.max(100, config.minHoldMs || 0)) {
        const timeSinceLastRep = now - state.lastRepTime;
        const minDebounce = Math.max(400, config.debounceMs || 400);

        if (timeSinceLastRep >= minDebounce) {
          newState.repState = 'UP';
          newState.count = state.count + 1;
          newState.lastRepTime = now;
          newState.downStartTime = 0;
          newState.consecutiveDownFrames = 0;
          newState.consecutiveUpFrames = 0;
          newState.baselineY = currentSmoothedY;
          newState.maxDownY = currentSmoothedY;
          newState.feedback = { message: `${newState.count}! Keep going!`, type: 'good' };
        } else {
          newState.repState = 'UP';
          newState.downStartTime = 0;
          newState.consecutiveDownFrames = 0;
          newState.feedback = { message: 'Control your pace', type: 'warning' };
        }
      } else {
        newState.feedback = { message: 'Push back up!', type: 'good' };
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
