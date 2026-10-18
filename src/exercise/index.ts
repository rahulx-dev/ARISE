/**
 * ARISE — Exercise Registry
 * 
 * Central registry of all exercise configurations.
 * Add new exercises here to make them available in the app.
 */

import { ExerciseConfig } from './repCounter';
import { pushupConfig } from './exercises/pushup';
import { squatConfig } from './exercises/squat';
import { situpConfig } from './exercises/situp';
import { jumpingJackConfig } from './exercises/jumpingJack';
import { plankConfig } from './exercises/plank';

export type ExerciseType = 'PUSHUP' | 'SQUAT' | 'SITUP' | 'JUMPING_JACK' | 'PLANK';

/**
 * Registry of all available exercises.
 */
export const EXERCISE_REGISTRY: Record<ExerciseType, ExerciseConfig> = {
  PUSHUP: pushupConfig,
  SQUAT: squatConfig,
  SITUP: situpConfig,
  JUMPING_JACK: jumpingJackConfig,
  PLANK: plankConfig,
};

/**
 * Get exercise config by type.
 */
export function getExerciseConfig(type: ExerciseType): ExerciseConfig {
  const config = EXERCISE_REGISTRY[type];
  if (!config) {
    throw new Error(`Unknown exercise type: ${type}`);
  }
  return config;
}

/**
 * Get all available exercises.
 */
export function getAllExercises(): ExerciseConfig[] {
  return Object.values(EXERCISE_REGISTRY);
}

/**
 * Check if an exercise type is duration-based (like plank).
 */
export function isDurationBased(type: ExerciseType): boolean {
  return type === 'PLANK';
}

import { calculateRewards as calcRewardsPure } from './rewardCalculator.js';

/**
 * Calculate rewards for completing an exercise.
 * Strict zero-effort gate: 0 reps = 0 coins, 0 XP.
 */
export function calculateRewards(
  type: ExerciseType,
  completedReps: number,
  target: number
): { coins: number; xp: number } {
  const config = getExerciseConfig(type);
  return calcRewardsPure(type, completedReps, target, config.xpPerRep);
}

// Re-export everything
export { pushupConfig } from './exercises/pushup';
export { squatConfig } from './exercises/squat';
export { situpConfig } from './exercises/situp';
export { jumpingJackConfig } from './exercises/jumpingJack';
export { plankConfig, type PlankState, createPlankState, processPlankFrame } from './exercises/plank';
export { createInitialState, processFrame, resetState, extractBodyY, type RepCounterState, type FormFeedback } from './repCounter';
export { calculateAngle, distance, isConfident, areAllConfident, normalizeKeypoints, type Point } from './angleUtils';
export { validateExercisePose, type PoseValidationResult } from './poseValidator';
