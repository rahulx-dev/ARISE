/**
 * ARISE — Sit-up Exercise Configuration (MediaPipe 33 Landmark Standard)
 * 
 * Tracks sit-ups using front or rear camera.
 * Primary angle: torso-thigh angle (shoulder → hip → knee)
 * 
 * UP state: sitting up (angle <= 70°)
 * DOWN state: lying flat (angle >= 140°)
 */

import { ExerciseConfig } from '../repCounter';
import { LandmarkIndex } from '../../../modules/pose-detector';

export const situpConfig: ExerciseConfig = {
  type: 'SITUP',
  displayName: 'Sit-ups',
  description: 'Perform sit-ups. Camera will track your torso and hip angle.',
  icon: 'human',
  
  // Left side primary: shoulder(11) → hip(23) → knee(25)
  primaryJoints: [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE],
  secondaryJoints: [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE],
  
  // Angle thresholds
  upThreshold: 140,      // Lying down flat
  downThreshold: 70,     // Sitting up towards knees
  
  // Confidence
  minConfidence: 0.50,
  
  // Timing
  debounceMs: 500,
  minHoldMs: 120,
  
  // Targets
  defaultTarget: 10,
  maxTarget: 100,
  minTarget: 1,
  
  // Rewards
  coinsPerRep: 1,
  xpPerRep: 5,
  
  // Stat
  statType: 'strength',
  
  // Form feedback
  formAngleMin: 95,
  formAlignmentThreshold: 30,
};
