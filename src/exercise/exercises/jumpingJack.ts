/**
 * ARISE — Jumping Jack Exercise Configuration
 * 
 * Tracks jumping jacks using front camera.
 * Primary angle: arm spread (wrist → shoulder → hip)
 * 
 * Uses a different approach: measures the angle of arm raise.
 * OPEN state (arms up): shoulder-to-wrist angle > 150° from vertical
 * CLOSED state (arms down): shoulder-to-wrist angle < 60°
 */

import { ExerciseConfig } from '../repCounter';

// MoveNet keypoint indices
// 9: left_wrist, 5: left_shoulder, 11: left_hip

export const jumpingJackConfig: ExerciseConfig = {
  type: 'JUMPING_JACK',
  displayName: 'Jumping Jacks',
  description: 'Perform jumping jacks with arms fully extended. Camera will track your movement.',
  icon: 'star-three-points',
  
  // Primary: wrist → shoulder → hip (arm raise angle)
  // Arms UP = large angle (>140), Arms DOWN = small angle (<60)
  primaryJoints: [9, 5, 11],
  
  // Angle thresholds: Arms raised high (>135°), Arms returned to sides (<65°)
  upThreshold: 135,      // Arms raised high overhead
  downThreshold: 65,     // Arms returned to sides
  
  // Confidence
  minConfidence: 0.35,
  
  // Timing
  debounceMs: 300,       // Jumping jacks are fast
  minHoldMs: 80,
  
  // Targets
  defaultTarget: 20,
  maxTarget: 200,
  minTarget: 5,
  
  // Rewards
  coinsPerRep: 1,        // Lower per rep since they're easier/faster
  xpPerRep: 3,
  
  // Stat
  statType: 'health',
  
  // Form feedback
  formAngleMin: 100,     // "Raise arms higher" if between 100-140
};
