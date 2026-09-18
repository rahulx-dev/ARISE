/**
 * ARISE — Anatomical Pose Validator
 * 
 * Prevents false skeleton rendering and phantom rep counts when only a face
 * or partial body is visible in the camera frame.
 * 
 * Validates:
 * 1. Face-only closeup rejection (blocks drawing skeleton cramped on face).
 * 2. Real physical limb length & torso span (guarantees real human proportion).
 * 3. Exercise-specific joint requirements (Squats require visible legs, Pushups require visible arms).
 */

import { Point, distance } from './angleUtils';

export interface PoseValidationResult {
  valid: boolean;
  message: string;
  isFaceOnly: boolean;
}

export function validateExercisePose(
  keypoints: Point[],
  exerciseType: string
): PoseValidationResult {
  if (!keypoints || keypoints.length < 17) {
    return {
      valid: false,
      message: 'Step back into camera frame',
      isFaceOnly: false,
    };
  }

  const nose = keypoints[0];
  const lShoulder = keypoints[5];
  const rShoulder = keypoints[6];
  const lElbow = keypoints[7];
  const rElbow = keypoints[8];
  const lWrist = keypoints[9];
  const rWrist = keypoints[10];
  const lHip = keypoints[11];
  const rHip = keypoints[12];
  const lKnee = keypoints[13];
  const rKnee = keypoints[14];
  const lAnkle = keypoints[15];
  const rAnkle = keypoints[16];

  const conf = (p?: Point) => p?.confidence ?? 0;

  // Best shoulder, hip, knee, ankle
  const bestShoulder = conf(lShoulder) > conf(rShoulder) ? lShoulder : rShoulder;
  const bestHip = conf(lHip) > conf(rHip) ? lHip : rHip;
  const bestKnee = conf(lKnee) > conf(rKnee) ? lKnee : rKnee;
  const bestAnkle = conf(lAnkle) > conf(rAnkle) ? lAnkle : rAnkle;

  // 1. REJECT FACE-ONLY CLOSE-UPS & SITTING FACE POSES
  // Reject if only face is close to screen, or shoulders/hips are absent/weak
  const hasConfidentFace = conf(nose) > 0.50;
  const hasConfidentShoulder = conf(bestShoulder) >= 0.22;
  const hasConfidentHip = conf(bestHip) >= 0.20;
  const hasConfidentTorso = hasConfidentShoulder && hasConfidentHip;
  const torsoSpan = hasConfidentTorso && bestShoulder && bestHip ? distance(bestShoulder, bestHip) : 0;

  // Reject face close-ups where shoulders are barely visible
  if (hasConfidentFace && conf(bestShoulder) < 0.22 && conf(bestHip) < 0.20) {
    return {
      valid: false,
      message: 'Step back! Position your body in frame',
      isFaceOnly: true,
    };
  }

  // 2. EXERCISE-SPECIFIC JOINT & SCALE REQUIREMENTS
  const normType = exerciseType.toUpperCase();

  if (normType === 'SQUAT') {
    // For squats: Need visible hips & knees
    const hasLeg = (conf(lHip) >= 0.22 && conf(lKnee) >= 0.22) || (conf(rHip) >= 0.22 && conf(rKnee) >= 0.22);
    const hasLowerTorso = conf(bestHip) >= 0.25 && (conf(bestKnee) >= 0.20 || conf(bestAnkle) >= 0.20);

    if (!hasLeg && !hasLowerTorso) {
      return {
        valid: false,
        message: 'Step back until hips & knees are visible',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Ready to squat! Go down', isFaceOnly: false };
  }

  if (normType === 'PUSHUP') {
    // Pushups strictly require visible arms (elbows & shoulders)
    const hasVisibleArm =
      (conf(lShoulder) >= 0.22 && conf(lElbow) >= 0.22) ||
      (conf(rShoulder) >= 0.22 && conf(rElbow) >= 0.22);

    if (!hasVisibleArm) {
      return {
        valid: false,
        message: 'Position camera to see your arms & shoulders',
        isFaceOnly: false,
      };
    }

    // Reject sitting upright close to screen: if nose is far above shoulders and arms are just hanging down
    if (nose && bestShoulder && conf(nose) > 0.65 && conf(bestHip) < 0.15 && (bestShoulder.y - nose.y) > 0.18) {
      return {
        valid: false,
        message: 'Get into horizontal pushup position',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Pushup position locked! Go!', isFaceOnly: false };
  }

  if (normType === 'JUMPING_JACK') {
    const hasArms = (conf(lWrist) >= 0.20 || conf(rWrist) >= 0.20) && conf(bestShoulder) >= 0.20;
    const hasLegs = (conf(lKnee) >= 0.20 || conf(rKnee) >= 0.20 || conf(bestHip) >= 0.20);

    if (!hasArms && !hasLegs) {
      return {
        valid: false,
        message: 'Step back so your body is visible',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Full body detected! Start jumping', isFaceOnly: false };
  }

  if (normType === 'PLANK' || normType === 'SITUP') {
    const hasTorso = conf(bestShoulder) >= 0.20 && (conf(bestHip) >= 0.20 || torsoSpan >= 0.05);

    if (!hasTorso) {
      return {
        valid: false,
        message: 'Position phone to see your body profile',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Position locked! Hold form', isFaceOnly: false };
  }

  // Generic fallback: Must have visible shoulders
  if (!hasConfidentShoulder) {
    return {
      valid: false,
      message: 'Step back into camera view',
      isFaceOnly: false,
    };
  }

  return { valid: true, message: 'Body detected! Begin exercise', isFaceOnly: false };
}
