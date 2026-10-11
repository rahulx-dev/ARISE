/**
 * ARISE — Jumping Jack Exercise Configuration (MediaPipe 33 Landmark Standard)
 * 
 * Tracks jumping jacks using front or rear camera.
 * Primary angle: arm elevation (wrist → shoulder → hip)
 * 
 * UP state: arms raised high overhead (angle >= 140°)
 * DOWN state: arms returned to sides (angle <= 60°)
 */

import { ExerciseConfig } from '../repCounter';
import { LandmarkIndex } from '../../../modules/pose-detector';

export const jumpingJackConfig: ExerciseConfig = {
  type: 'JUMPING_JACK',
  displayName: 'Jumping Jacks',
  description: 'Perform jumping jacks with arms fully extended overhead. Camera tracks full body movement.',
  icon: 'star-three-points',
  
  // Left side primary: wrist(15) → shoulder(11) → hip(23)
  primaryJoints: [LandmarkIndex.LEFT_WRIST, LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP],
  secondaryJoints: [LandmarkIndex.RIGHT_WRIST, LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP],
  
  // Angle thresholds
  upThreshold: 140,      // Arms raised high overhead
  downThreshold: 60,     // Arms returned to sides
  
  // Confidence
  minConfidence: 0.45,
  
  // Timing
  debounceMs: 400,
  minHoldMs: 60,
  
  // Targets
  defaultTarget: 20,
  maxTarget: 200,
  minTarget: 5,
  
  // Rewards
  coinsPerRep: 1,
  xpPerRep: 3,
  
  // Stat
  statType: 'health',
  
  // Form feedback
  formAngleMin: 110,
};
