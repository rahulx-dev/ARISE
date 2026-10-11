/**
 * ARISE — Squat Exercise Configuration (MediaPipe 33 Landmark Standard)
 * 
 * Tracks squats using front or rear camera.
 * Primary angle: knee (hip → knee → ankle)
 * Secondary: hip hinge (shoulder → hip → knee)
 * 
 * UP state: legs extended straight (knee angle >= 155°)
 * DOWN state: deep squat (knee angle <= 100°)
 * Deadband hysteresis: 55° gap prevents premature or double rep registration.
 */

import { ExerciseConfig } from '../repCounter';
import { LandmarkIndex } from '../../../modules/pose-detector';

export const squatConfig: ExerciseConfig = {
  type: 'SQUAT',
  displayName: 'Squats',
  description: 'Perform squats with proper depth. Camera will track your leg movement.',
  icon: 'human-handsdown',
  
  // Left side primary: hip(23) → knee(25) → ankle(27)
  primaryJoints: [LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE],
  
  // Secondary: shoulder(11) → hip(23) → knee(25)
  secondaryJoints: [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE],
  
  // Angle thresholds
  upThreshold: 155,      // Legs fully extended back up
  downThreshold: 100,     // Full squat depth (quads parallel or lower)
  
  // Confidence requirement
  minConfidence: 0.50,
  
  // Timing guards: 0.5s lockout
  debounceMs: 500,
  minHoldMs: 80,
  
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
  formAngleMin: 125,     // Prompt "Go lower!" if between 125° and 150°
  formAlignmentThreshold: 30,
};
