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

  // 1. REJECT FACE-ONLY CLOSE-UPS
  // In a real full/half body frame, head-to-torso and hips are physically separated.
  const hasConfidentFace = conf(nose) > 0.45;
  const hasConfidentTorso = conf(bestShoulder) > 0.45 && conf(bestHip) > 0.38;
  const torsoSpan = hasConfidentTorso && bestShoulder && bestHip ? distance(bestShoulder, bestHip) : 0;

  // If camera is close to the face (or only sees neck up), hips are missing or squashed into the head:
  if (hasConfidentFace && (!hasConfidentTorso || torsoSpan < 0.10)) {
    return {
      valid: false,
      message: 'Step back! Show your full body in frame',
      isFaceOnly: true,
    };
  }

  // 2. EXERCISE-SPECIFIC JOINT & SCALE REQUIREMENTS
  const normType = exerciseType.toUpperCase();

  if (normType === 'SQUAT') {
    // For squats, we MUST clearly see at least one full leg with realistic length:
    const leftLegValid =
      conf(lHip) >= 0.40 &&
      conf(lKnee) >= 0.42 &&
      conf(lAnkle) >= 0.35 &&
      distance(lHip, lKnee) >= 0.08 &&
      distance(lKnee, lAnkle) >= 0.08;

    const rightLegValid =
      conf(rHip) >= 0.40 &&
      conf(rKnee) >= 0.42 &&
      conf(rAnkle) >= 0.35 &&
      distance(rHip, rKnee) >= 0.08 &&
      distance(rKnee, rAnkle) >= 0.08;

    if (!leftLegValid && !rightLegValid) {
      return {
        valid: false,
        message: 'Step back until hips & knees are visible',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Ready to squat! Go down', isFaceOnly: false };
  }

  if (normType === 'PUSHUP') {
    // For pushups, we MUST clearly see at least one arm with realistic length:
    const leftArmValid =
      conf(lShoulder) >= 0.40 &&
      conf(lElbow) >= 0.42 &&
      conf(lWrist) >= 0.35 &&
      distance(lShoulder, lElbow) >= 0.06 &&
      distance(lElbow, lWrist) >= 0.06;

    const rightArmValid =
      conf(rShoulder) >= 0.40 &&
      conf(rElbow) >= 0.42 &&
      conf(rWrist) >= 0.35 &&
      distance(rShoulder, rElbow) >= 0.06 &&
      distance(rElbow, rWrist) >= 0.06;

    if (!leftArmValid && !rightArmValid) {
      return {
        valid: false,
        message: 'Position camera to see your arms & chest',
        isFaceOnly: false,
      };
    }

    if (torsoSpan < 0.09 && conf(bestHip) < 0.30) {
      return {
        valid: false,
        message: 'Step back so full upper body is visible',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Pushup position locked! Go!', isFaceOnly: false };
  }

  if (normType === 'JUMPING_JACK') {
    const hasArms = (conf(lWrist) > 0.35 || conf(rWrist) > 0.35) && conf(bestShoulder) > 0.40;
    const hasLegs = (conf(lAnkle) > 0.35 || conf(rAnkle) > 0.35) && conf(bestHip) > 0.35;
    const fullHeight = bestAnkle && bestShoulder ? Math.abs(bestAnkle.y - bestShoulder.y) : 0;

    if (!hasArms || !hasLegs || fullHeight < 0.28) {
      return {
        valid: false,
        message: 'Step back so full body is visible head-to-toe',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Full body detected! Start jumping', isFaceOnly: false };
  }

  if (normType === 'PLANK' || normType === 'SITUP') {
    const hasTorso = conf(bestShoulder) >= 0.42 && conf(bestHip) >= 0.40 && torsoSpan >= 0.10;
    const hasLeg = conf(bestKnee) >= 0.35 || conf(bestAnkle) >= 0.35;

    if (!hasTorso || !hasLeg) {
      return {
        valid: false,
        message: 'Position phone to see your full side profile',
        isFaceOnly: false,
      };
    }

    return { valid: true, message: 'Position locked! Hold form', isFaceOnly: false };
  }

  // Generic fallback: Must have visible shoulders and hips with realistic distance
  if (!hasConfidentTorso || torsoSpan < 0.10) {
    return {
      valid: false,
      message: 'Step back into camera view',
      isFaceOnly: false,
    };
  }

  return { valid: true, message: 'Body detected! Begin exercise', isFaceOnly: false };
}
