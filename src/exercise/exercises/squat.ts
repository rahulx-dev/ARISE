/**
 * ARISE — Squat Exercise Configuration
 * 
 * Tracks squats using front camera.
 * Primary angle: knee (hip → knee → ankle)
 * Secondary (form): hip alignment
 * 
 * UP state: legs straight (knee angle > 160°)
 * DOWN state: knees bent (knee angle < 100°)
 */

import { ExerciseConfig } from '../repCounter';

// MoveNet keypoint indices (LEFT side)
// 11: left_hip, 13: left_knee, 15: left_ankle

export const squatConfig: ExerciseConfig = {
  type: 'SQUAT',
  displayName: 'Squats',
  description: 'Perform squats with proper depth. Camera will track your movement.',
  icon: 'human-handsdown',
  
  // Primary: hip → knee → ankle (knee angle)
  primaryJoints: [11, 13, 15],
  
  // Secondary: shoulder → hip → knee (hip hinge)
  secondaryJoints: [5, 11, 13],
  
  // Angle thresholds
  upThreshold: 148,      // Legs extended
  downThreshold: 115,    // Good squat depth
  
  // Confidence
  minConfidence: 0.22,
  
  // Timing
  debounceMs: 350,       // Fast responsive rep debounce
  minHoldMs: 0,          // Instant trigger on up movement
  
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
  formAngleMin: 130,     // "Go lower" if between 130-155
  formAlignmentThreshold: 30,
};
