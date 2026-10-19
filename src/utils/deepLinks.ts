/**
 * ARISE — Deep Link Parser & Router Validator
 * Type definitions and re-export.
 */

export interface ParsedWorkoutDeepLink {
  exerciseType?: string;
  target?: number;
  source?: string;
  action?: string;
}

// @ts-ignore
export { parseWorkoutDeepLink } from './deepLinks.js';
