/**
 * ARISE — Push-up Exercise Configuration
 * 
 * Tracks push-ups using front camera.
 * Primary angle: elbow (shoulder → elbow → wrist)
 * Secondary (form): body alignment (shoulder → hip → ankle)
 * 
 * UP state: arms extended (elbow angle > 160°)
 * DOWN state: arms bent (elbow angle < 90°)
 */

import { ExerciseConfig } from '../repCounter';

// MoveNet keypoint indices
// Using LEFT side as primary (user's right in front camera mirror)
// 5: left_shoulder, 7: left_elbow, 9: left_wrist
// 5: left_shoulder, 11: left_hip, 15: left_ankle

export const pushupConfig: ExerciseConfig = {
  type: 'PUSHUP',
  displayName: 'Push-ups',
  description: 'Complete push-ups with proper form. Camera will track your movement.',
  icon: 'dumbbell',
  
  // Primary: shoulder → elbow → wrist (elbow angle)
  primaryJoints: [5, 7, 9],
  
  // Secondary: shoulder → hip → ankle (body alignment)
  secondaryJoints: [5, 11, 15],
  
  // Angle thresholds
  upThreshold: 145,      // Arms extended
  downThreshold: 105,    // Arms bent (~90-105°)
  
  // Confidence
  minConfidence: 0.20,
  
  // Timing
  debounceMs: 300,       // Fast responsive rep debounce
  minHoldMs: 0,          // Instant trigger on up movement
  
  // Targets
  defaultTarget: 10,
  maxTarget: 100,
  minTarget: 1,
  
  // Rewards
  coinsPerRep: 1,        // 1 rep = 1 coin
  xpPerRep: 5,
  
  // Stat
  statType: 'strength',
  
  // Form feedback
  formAngleMin: 120,     // "Go lower" if between 120-155
  formAlignmentThreshold: 25, // Max body alignment deviation
};
