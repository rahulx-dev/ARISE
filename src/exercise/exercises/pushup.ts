/**
 * ARISE — Push-up Exercise Configuration (MediaPipe 33 Landmark Standard)
 * 
 * Tracks push-ups using front or rear camera.
 * Primary angle: elbow (shoulder → elbow → wrist)
 * Secondary (form): body alignment (shoulder → hip → ankle)
 * 
 * UP state: arms fully extended (elbow angle >= 152°)
 * DOWN state: arms bent at bottom (elbow angle <= 95°)
 * Deadband hysteresis: 57° gap prevents threshold chatter.
 */

import { ExerciseConfig } from '../repCounter';
import { LandmarkIndex } from '../../../modules/pose-detector';

export const pushupConfig: ExerciseConfig = {
  type: 'PUSHUP',
  displayName: 'Push-ups',
  description: 'Complete push-ups with proper form. Camera will track your arm and torso movement.',
  icon: 'dumbbell',
  
  // Left side primary: shoulder(11) → elbow(13) → wrist(15)
  primaryJoints: [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST],
  
  // Secondary (body alignment): shoulder(11) → hip(23) → ankle(27)
  secondaryJoints: [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_ANKLE],
  
  // Angle thresholds with strict ROM requirements
  upThreshold: 152,      // Arms extended back up
  downThreshold: 95,      // Full chest depth (~90-95°)
  
  // Confidence requirement for landmark visibility
  minConfidence: 0.50,
  
  // Timing guards: 0.5s debounce lockout prevents double counts
  debounceMs: 500,
  minHoldMs: 60,
  
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
  formAngleMin: 115,     // Prompt "Go lower!" if between 115° and 145°
  formAlignmentThreshold: 25, // Max body alignment deviation
};
