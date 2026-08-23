/**
 * ARISE — Sit-up Exercise Configuration
 * 
 * Tracks sit-ups using front camera.
 * Primary angle: torso-thigh angle (shoulder → hip → knee)
 * 
 * UP state: torso close to thighs (angle < 70°)
 * DOWN state: torso flat/back (angle > 140°)
 */

import { ExerciseConfig } from '../repCounter';

// MoveNet keypoint indices (LEFT side)
// 5: left_shoulder, 11: left_hip, 13: left_knee

export const situpConfig: ExerciseConfig = {
  type: 'SITUP',
  displayName: 'Sit-ups',
  description: 'Perform sit-ups. Camera will track your torso movement.',
  icon: 'human',
  
  // Primary: shoulder → hip → knee (torso-thigh angle)
  // NOTE: For sit-ups, UP means sitting UP (small angle), DOWN means lying DOWN (large angle)
  // We swap the thresholds: upThreshold is the LARGE angle (lying flat), downThreshold is the SMALL angle (sitting up)
  primaryJoints: [5, 11, 13],
  
  // Angle thresholds (reversed from push-up: high angle = lying down, low angle = sitting up)
  upThreshold: 140,      // Lying flat
  downThreshold: 70,     // Torso raised to thighs
  
  // Confidence
  minConfidence: 0.3,
  
  // Timing
  debounceMs: 500,
  minHoldMs: 150,
  
  // Targets
  defaultTarget: 10,
  maxTarget: 100,
  minTarget: 1,
  
  // Rewards
  coinsPerRep: 2,
  xpPerRep: 5,
  
  // Stat
  statType: 'strength',
  
  // Form feedback
  formAngleMin: 100,
  formAlignmentThreshold: 30,
};
