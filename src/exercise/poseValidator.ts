/**
 * ARISE — Anatomical Pose Validator & Detection Gate (MediaPipe 33 Landmark Engine)
 * 
 * Fixes Symptom 2 (hallucinating skeletons on chairs/shadows) and
 * Symptom 3 (failing to track pushups properly in horizontal orientation).
 * 
 * Gate criteria:
 * 1. Key landmarks for current exercise must have visibility > 0.5.
 * 2. Anatomical plausibility check: bone lengths & human proportions.
 * 3. Human Present State Machine:
 *    - Rep counting requires K=10 consecutive valid frames to activate.
 *    - If invalid for M=15 consecutive frames (~1s at 15 FPS), pauses with specific guidance.
 */

import { Point, distance, distance3D, getConfidence } from './angleUtils';
import { LandmarkIndex } from '../../modules/pose-detector';

export type ValidationFailureReason =
  | 'OK'
  | 'NOT_ENOUGH_POINTS'
  | 'FACE_ONLY'
  | 'MISSING_KEY_JOINTS'
  | 'IMPLAUSIBLE_PROPORTIONS'
  | 'LOW_CONFIDENCE'
  | 'OFF_CAMERA';

export interface PoseValidationResult {
  valid: boolean;
  message: string;
  isFaceOnly: boolean;
  reason: ValidationFailureReason;
  visibleJointCount: number;
}

/**
 * Validates anatomical proportions and exercise-specific joint requirements
 * using the full 33 MediaPipe pose landmark dataset.
 */
export function validateExercisePose(
  landmarks: Point[],
  exerciseType: string
): PoseValidationResult {
  if (!landmarks || landmarks.length < 33) {
    return {
      valid: false,
      message: 'Position full body in camera frame',
      isFaceOnly: false,
      reason: 'NOT_ENOUGH_POINTS',
      visibleJointCount: 0,
    };
  }

  const getLm = (idx: LandmarkIndex | number): Point => landmarks[idx] || { x: 0, y: 0, visibility: 0 };
  const vis = (idx: LandmarkIndex | number): number => getConfidence(getLm(idx));

  // Count joints with visibility > 0.5
  let confidentCount = 0;
  for (let i = 0; i < 33; i++) {
    if (vis(i) >= 0.5) confidentCount++;
  }

  // MediaPipe Landmark references
  const nose = getLm(LandmarkIndex.NOSE);
  const lShoulder = getLm(LandmarkIndex.LEFT_SHOULDER);
  const rShoulder = getLm(LandmarkIndex.RIGHT_SHOULDER);
  const lElbow = getLm(LandmarkIndex.LEFT_ELBOW);
  const rElbow = getLm(LandmarkIndex.RIGHT_ELBOW);
  const lWrist = getLm(LandmarkIndex.LEFT_WRIST);
  const rWrist = getLm(LandmarkIndex.RIGHT_WRIST);
  const lHip = getLm(LandmarkIndex.LEFT_HIP);
  const rHip = getLm(LandmarkIndex.RIGHT_HIP);
  const lKnee = getLm(LandmarkIndex.LEFT_KNEE);
  const rKnee = getLm(LandmarkIndex.RIGHT_KNEE);
  const lAnkle = getLm(LandmarkIndex.LEFT_ANKLE);
  const rAnkle = getLm(LandmarkIndex.RIGHT_ANKLE);

  const lShoulderVis = vis(LandmarkIndex.LEFT_SHOULDER);
  const rShoulderVis = vis(LandmarkIndex.RIGHT_SHOULDER);
  const lHipVis = vis(LandmarkIndex.LEFT_HIP);
  const rHipVis = vis(LandmarkIndex.RIGHT_HIP);

  const bestShoulderVis = Math.max(lShoulderVis, rShoulderVis);
  const bestHipVis = Math.max(lHipVis, rHipVis);

  // 1. REJECT FACE-ONLY CLOSE-UPS & POSTERS/CHAIRS
  // If face is dominant but torso/hips are absent, reject immediately
  const noseVis = vis(LandmarkIndex.NOSE);
  if (noseVis > 0.65 && bestShoulderVis < 0.35 && bestHipVis < 0.25) {
    return {
      valid: false,
      message: 'Step back! Place phone 2m away so body is visible',
      isFaceOnly: true,
      reason: 'FACE_ONLY',
      visibleJointCount: confidentCount,
    };
  }

  // 2. PLAUSIBILITY CHECK — HUMAN PROPORTIONS
  // Check shoulder width and torso span to reject inanimate objects
  const bothShouldersVisible = lShoulderVis >= 0.5 && rShoulderVis >= 0.5;
  if (bothShouldersVisible) {
    // 3D world distance if available, otherwise 2D screen distance
    const shoulderDist3D = distance3D(lShoulder, rShoulder, true);
    const shoulderDist2D = distance(lShoulder, rShoulder);

    // If metric world coords: human shoulders are between 0.20m and 0.65m
    if (typeof lShoulder.worldX === 'number' && typeof rShoulder.worldX === 'number') {
      if (shoulderDist3D < 0.18 || shoulderDist3D > 0.75) {
        return {
          valid: false,
          message: 'Move into frame — human pose not verified',
          isFaceOnly: false,
          reason: 'IMPLAUSIBLE_PROPORTIONS',
          visibleJointCount: confidentCount,
        };
      }
    } else {
      // 2D fallback: shoulders cannot be less than 4% of frame width
      if (shoulderDist2D < 0.04) {
        return {
          valid: false,
          message: 'Step closer or adjust camera angle',
          isFaceOnly: false,
          reason: 'IMPLAUSIBLE_PROPORTIONS',
          visibleJointCount: confidentCount,
        };
      }
    }
  }

  // Torso plausibility: shoulder to hip distance
  const leftTorsoSpan = lShoulderVis >= 0.45 && lHipVis >= 0.45 ? distance(lShoulder, lHip) : 0;
  const rightTorsoSpan = rShoulderVis >= 0.45 && rHipVis >= 0.45 ? distance(rShoulder, rHip) : 0;
  const maxTorsoSpan = Math.max(leftTorsoSpan, rightTorsoSpan);

  // If both shoulders and hips are checked, torso cannot be tiny
  if (bestShoulderVis >= 0.5 && bestHipVis >= 0.5 && maxTorsoSpan > 0 && maxTorsoSpan < 0.06) {
    return {
      valid: false,
      message: 'Adjust camera distance to fit full body',
      isFaceOnly: false,
      reason: 'IMPLAUSIBLE_PROPORTIONS',
      visibleJointCount: confidentCount,
    };
  }

  // 3. EXERCISE-SPECIFIC KEY JOINT REQUIREMENTS (visibility > 0.5)
  const normType = exerciseType.toUpperCase();

  if (normType === 'PUSHUP') {
    // Pushups: User is horizontal on floor. Side view or 45-deg angle.
    // Need at least ONE valid arm (shoulder, elbow, wrist) and hip with visibility > 0.5
    const leftArmComplete =
      vis(LandmarkIndex.LEFT_SHOULDER) >= 0.5 &&
      vis(LandmarkIndex.LEFT_ELBOW) >= 0.5 &&
      vis(LandmarkIndex.LEFT_WRIST) >= 0.5;

    const rightArmComplete =
      vis(LandmarkIndex.RIGHT_SHOULDER) >= 0.5 &&
      vis(LandmarkIndex.RIGHT_ELBOW) >= 0.5 &&
      vis(LandmarkIndex.RIGHT_WRIST) >= 0.5;

    const hasHip = lHipVis >= 0.40 || rHipVis >= 0.40;

    if (!leftArmComplete && !rightArmComplete) {
      return {
        valid: false,
        message: 'Position camera to see your arms (shoulder, elbow, wrist)',
        isFaceOnly: false,
        reason: 'MISSING_KEY_JOINTS',
        visibleJointCount: confidentCount,
      };
    }

    if (!hasHip && confidentCount < 8) {
      return {
        valid: false,
        message: 'Show full torso and hips in camera frame',
        isFaceOnly: false,
        reason: 'MISSING_KEY_JOINTS',
        visibleJointCount: confidentCount,
      };
    }

    return {
      valid: true,
      message: 'Pushup form locked! Begin repetitions',
      isFaceOnly: false,
      reason: 'OK',
      visibleJointCount: confidentCount,
    };
  }

  if (normType === 'SQUAT') {
    // Squats: Require hips, knees, and at least one ankle with visibility > 0.5
    const leftLegComplete =
      vis(LandmarkIndex.LEFT_HIP) >= 0.5 &&
      vis(LandmarkIndex.LEFT_KNEE) >= 0.5 &&
      vis(LandmarkIndex.LEFT_ANKLE) >= 0.35;

    const rightLegComplete =
      vis(LandmarkIndex.RIGHT_HIP) >= 0.5 &&
      vis(LandmarkIndex.RIGHT_KNEE) >= 0.5 &&
      vis(LandmarkIndex.RIGHT_ANKLE) >= 0.35;

    if (!leftLegComplete && !rightLegComplete) {
      return {
        valid: false,
        message: 'Step back until hips and knees are visible',
        isFaceOnly: false,
        reason: 'MISSING_KEY_JOINTS',
        visibleJointCount: confidentCount,
      };
    }

    return {
      valid: true,
      message: 'Ready to squat! Lower down with control',
      isFaceOnly: false,
      reason: 'OK',
      visibleJointCount: confidentCount,
    };
  }

  if (normType === 'JUMPING_JACK') {
    // Jumping jacks: Needs arms and legs visible
    const hasArms =
      (vis(LandmarkIndex.LEFT_WRIST) >= 0.40 || vis(LandmarkIndex.RIGHT_WRIST) >= 0.40) &&
      bestShoulderVis >= 0.45;
    const hasLegs =
      vis(LandmarkIndex.LEFT_KNEE) >= 0.40 ||
      vis(LandmarkIndex.RIGHT_KNEE) >= 0.40 ||
      bestHipVis >= 0.45;

    if (!hasArms || !hasLegs) {
      return {
        valid: false,
        message: 'Step back — entire body must be visible',
        isFaceOnly: false,
        reason: 'MISSING_KEY_JOINTS',
        visibleJointCount: confidentCount,
      };
    }

    return {
      valid: true,
      message: 'Full body detected! Start jumping',
      isFaceOnly: false,
      reason: 'OK',
      visibleJointCount: confidentCount,
    };
  }

  if (normType === 'PLANK' || normType === 'SITUP') {
    const hasCore = bestShoulderVis >= 0.45 && bestHipVis >= 0.45;
    if (!hasCore) {
      return {
        valid: false,
        message: 'Position camera to see your profile from the side',
        isFaceOnly: false,
        reason: 'MISSING_KEY_JOINTS',
        visibleJointCount: confidentCount,
      };
    }

    return {
      valid: true,
      message: 'Position locked! Hold form steady',
      isFaceOnly: false,
      reason: 'OK',
      visibleJointCount: confidentCount,
    };
  }

  // Default: at least shoulders and hips visible
  if (bestShoulderVis < 0.45 || bestHipVis < 0.40) {
    return {
      valid: false,
      message: 'Step into camera view',
      isFaceOnly: false,
      reason: 'MISSING_KEY_JOINTS',
      visibleJointCount: confidentCount,
    };
  }

  return {
    valid: true,
    message: 'Body detected! Begin exercise',
    isFaceOnly: false,
    reason: 'OK',
    visibleJointCount: confidentCount,
  };
}

/**
 * Human Presence Gate State Machine
 * Requires K=10 consecutive valid frames before activating tracking.
 * Pauses after M=15 invalid frames with targeted guidance.
 */
export class HumanPresenceTracker {
  private consecutiveValid = 0;
  private consecutiveInvalid = 0;
  private isConfirmed = false;
  private readonly K_FRAMES = 10;
  private readonly M_FRAMES = 15;

  process(validation: PoseValidationResult): {
    isReady: boolean;
    isPaused: boolean;
    status: 'SEARCHING' | 'CONFIRMING' | 'READY' | 'PAUSED';
    guidance: string;
  } {
    if (validation.valid) {
      this.consecutiveValid++;
      this.consecutiveInvalid = 0;

      if (!this.isConfirmed) {
        if (this.consecutiveValid >= this.K_FRAMES) {
          this.isConfirmed = true;
          return {
            isReady: true,
            isPaused: false,
            status: 'READY',
            guidance: validation.message,
          };
        } else {
          return {
            isReady: false,
            isPaused: false,
            status: 'CONFIRMING',
            guidance: `Hold still... locking position (${this.consecutiveValid}/${this.K_FRAMES})`,
          };
        }
      }

      return {
        isReady: true,
        isPaused: false,
        status: 'READY',
        guidance: validation.message,
      };
    } else {
      this.consecutiveInvalid++;
      this.consecutiveValid = 0;

      if (this.consecutiveInvalid >= this.M_FRAMES) {
        this.isConfirmed = false;
        return {
          isReady: false,
          isPaused: true,
          status: 'PAUSED',
          guidance: validation.message,
        };
      }

      return {
        isReady: this.isConfirmed,
        isPaused: false,
        status: this.isConfirmed ? 'READY' : 'SEARCHING',
        guidance: this.isConfirmed ? 'Keep in frame...' : validation.message,
      };
    }
  }

  reset(): void {
    this.consecutiveValid = 0;
    this.consecutiveInvalid = 0;
    this.isConfirmed = false;
  }
}
