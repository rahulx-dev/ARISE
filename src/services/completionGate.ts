/**
 * ARISE — Cryptographic Completion Token Gate
 * Type definitions and re-export.
 */

export interface CompletionContext {
  exerciseType: string;
  questId?: string;
  reps?: number;
  duration?: number;
  target?: number;
}

export {
  issueCompletionToken,
  consumeCompletionToken,
} from './completionGate.js';
