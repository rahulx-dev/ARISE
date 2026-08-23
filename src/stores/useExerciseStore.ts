import { create } from 'zustand';
import { ExerciseType, RepState, FormFeedback } from '../types';
import { exerciseRepository } from '../database/repositories/exerciseRepository';

interface ExerciseState {
  currentExerciseType: ExerciseType | null;
  targetReps: number;
  completedReps: number;
  repState: RepState;
  isActive: boolean;
  isPaused: boolean;
  feedback: FormFeedback | null;
  elapsedSeconds: number;

  startExercise: (type: ExerciseType, target: number) => void;
  incrementRep: () => void;
  setRepState: (state: RepState) => void;
  setFeedback: (feedback: FormFeedback | null) => void;
  pauseExercise: () => void;
  resumeExercise: () => void;
  completeExercise: () => Promise<any>;
  resetExercise: () => void;
  tick: () => void;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  currentExerciseType: null,
  targetReps: 0,
  completedReps: 0,
  repState: 'IDLE',
  isActive: false,
  isPaused: false,
  feedback: null,
  elapsedSeconds: 0,

  startExercise: (type: ExerciseType, target: number) => {
    set({
      currentExerciseType: type,
      targetReps: target,
      completedReps: 0,
      repState: 'READY',
      isActive: true,
      isPaused: false,
      feedback: null,
      elapsedSeconds: 0,
    });
  },

  incrementRep: () => {
    const { completedReps, targetReps } = get();
    if (completedReps < targetReps) {
      set({ completedReps: completedReps + 1 });
    }
  },

  setRepState: (state: RepState) => {
    set({ repState: state });
  },

  setFeedback: (feedback: FormFeedback | null) => {
    set({ feedback });
  },

  pauseExercise: () => {
    set({ isPaused: true });
  },

  resumeExercise: () => {
    set({ isPaused: false });
  },

  completeExercise: async () => {
    const state = get();
    const sessionData = {
      exerciseType: state.currentExerciseType || 'PUSHUP',
      target: state.targetReps,
      completedReps: state.completedReps,
      durationSeconds: state.elapsedSeconds,
      formScore: 95,
      timestamp: new Date().toISOString(),
    };
    try {
      await exerciseRepository.createSession(sessionData);
      set({ isActive: false, repState: 'IDLE' });
      return sessionData;
    } catch (error) {
      console.error('Failed to save exercise session', error);
      return sessionData;
    }
  },

  resetExercise: () => {
    set({
      currentExerciseType: null,
      targetReps: 0,
      completedReps: 0,
      repState: 'IDLE',
      isActive: false,
      isPaused: false,
      feedback: null,
      elapsedSeconds: 0,
    });
  },

  tick: () => {
    const { isActive, isPaused, elapsedSeconds } = get();
    if (isActive && !isPaused) {
      set({ elapsedSeconds: elapsedSeconds + 1 });
    }
  },
}));
