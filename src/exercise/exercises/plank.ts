/**
 * ARISE — Plank Exercise Configuration
 * 
 * Plank is DURATION-BASED, not rep-based.
 * Tracks body alignment (shoulder → hip → ankle should be ~180°).
 * 
 * The "rep counter" isn't used for plank in the traditional sense.
 * Instead, we track form quality over time.
 * 
 * We use the same ExerciseConfig structure but with special handling:
 * - upThreshold: body alignment angle for "good form" 
 * - downThreshold: angle deviation that triggers "dropped" feedback
 */

import { ExerciseConfig } from '../repCounter';

// MoveNet keypoint indices (LEFT side)
// 5: left_shoulder, 11: left_hip, 15: left_ankle

export const plankConfig: ExerciseConfig = {
  type: 'PLANK',
  displayName: 'Plank',
  description: 'Hold a plank position. Camera will track your form.',
  icon: 'human-handsup',
  
  // Primary: shoulder → hip → ankle (body alignment)
  primaryJoints: [5, 11, 15],
  
  // For plank, these represent alignment thresholds, not rep states
  // Body alignment angle should be close to 180° (straight line)
  upThreshold: 160,      // Good alignment (>160° = relatively straight)
  downThreshold: 140,    // Poor alignment (<140° = hips sagging or raised)
  
  // Confidence
  minConfidence: 0.3,
  
  // Timing (not used for rep counting, but keep for structure)
  debounceMs: 0,
  minHoldMs: 0,
  
  // Targets (in SECONDS for plank)
  defaultTarget: 30,     // 30 seconds
  maxTarget: 300,        // 5 minutes max
  minTarget: 10,         // 10 seconds min
  
  // Rewards (per second of good form)
  coinsPerRep: 1,        // 1 coin per good-form second (30s = 30 coins)
  xpPerRep: 2,           // 2 XP per second
  
  // Stat
  statType: 'discipline',
  
  // Form feedback
  formAlignmentThreshold: 20, // Max deviation from straight line
};

/**
 * Special plank state tracking.
 * Plank doesn't use the standard rep counter.
 */
export interface PlankState {
  phase: 'IDLE' | 'READY' | 'HOLDING' | 'DROPPED';
  goodFormSeconds: number;
  totalSeconds: number;
  lastFormCheck: number;
  formQuality: 'GOOD' | 'OK' | 'POOR';
}

export function createPlankState(): PlankState {
  return {
    phase: 'IDLE',
    goodFormSeconds: 0,
    totalSeconds: 0,
    lastFormCheck: 0,
    formQuality: 'GOOD',
  };
}

/**
 * Process a plank frame. Called every second while plank is active.
 */
export function processPlankFrame(
  state: PlankState,
  alignmentAngle: number,
  isBodyDetected: boolean,
  now: number = Date.now()
): PlankState {
  if (!isBodyDetected) {
    return {
      ...state,
      phase: state.phase === 'HOLDING' ? 'DROPPED' : state.phase,
      formQuality: 'POOR',
    };
  }

  const newState = { ...state };

  switch (state.phase) {
    case 'IDLE':
      if (isBodyDetected) {
        newState.phase = 'READY';
      }
      break;

    case 'READY':
      if (alignmentAngle >= 155) {
        newState.phase = 'HOLDING';
        newState.lastFormCheck = now;
      }
      break;

    case 'HOLDING': {
      const elapsed = now - state.lastFormCheck;
      if (elapsed >= 1000) {
        newState.totalSeconds = state.totalSeconds + 1;
        newState.lastFormCheck = now;

        if (alignmentAngle >= 160) {
          newState.goodFormSeconds = state.goodFormSeconds + 1;
          newState.formQuality = 'GOOD';
        } else if (alignmentAngle >= 140) {
          newState.goodFormSeconds = state.goodFormSeconds + 0.5;
          newState.formQuality = 'OK';
        } else {
          newState.formQuality = 'POOR';
          newState.phase = 'DROPPED';
        }
      }
      break;
    }

    case 'DROPPED':
      // Can recover if alignment improves
      if (alignmentAngle >= 155) {
        newState.phase = 'HOLDING';
        newState.lastFormCheck = now;
      }
      break;
  }

  return newState;
}
