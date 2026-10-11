/**
 * ARISE — Plank Exercise Configuration (MediaPipe 33 Landmark Standard)
 * 
 * Plank is duration-based. Tracks full body alignment from shoulder to ankle.
 */

import { ExerciseConfig } from '../repCounter';
import { LandmarkIndex } from '../../../modules/pose-detector';

export const plankConfig: ExerciseConfig = {
  type: 'PLANK',
  displayName: 'Plank',
  description: 'Hold a plank position with flat back. Camera tracks your alignment.',
  icon: 'human-handsup',
  
  // Left side primary: shoulder(11) → hip(23) → ankle(27)
  primaryJoints: [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_ANKLE],
  secondaryJoints: [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_ANKLE],
  
  // Alignment thresholds
  upThreshold: 160,      // Good alignment (>160° = relatively straight line)
  downThreshold: 140,    // Poor alignment (<140° = hips sagging or piked)
  
  minConfidence: 0.45,
  
  debounceMs: 0,
  minHoldMs: 0,
  
  // Targets in seconds
  defaultTarget: 30,
  maxTarget: 300,
  minTarget: 10,
  
  coinsPerRep: 1,
  xpPerRep: 2,
  
  statType: 'discipline',
  formAlignmentThreshold: 20,
};

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
      if (alignmentAngle >= 155) {
        newState.phase = 'HOLDING';
        newState.lastFormCheck = now;
      }
      break;
  }

  return newState;
}
