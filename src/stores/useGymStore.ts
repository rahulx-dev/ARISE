import { create } from 'zustand';
import {
  WorkoutPreferences,
  WorkoutPlan,
  WorkoutDayPlan,
  ActiveWorkoutSession,
  WorkoutSetLog,
  PersonalRecord,
} from '../types/gym';
import { gymService } from '../services/gymService';

interface GymState {
  preferences: WorkoutPreferences | null;
  activePlan: WorkoutPlan | null;
  todayWorkout: WorkoutDayPlan | null;
  activeSession: ActiveWorkoutSession | null;
  personalRecords: PersonalRecord[];
  workoutHistory: ActiveWorkoutSession[];
  lastCompletedRewards: { coinsEarned: number; xpEarned: number } | null;
  isLoading: boolean;

  loadGymData: () => Promise<void>;
  savePreferences: (prefs: Omit<WorkoutPreferences, 'createdAt' | 'updatedAt'>) => Promise<void>;
  startWorkout: (planId: number, dayId: number, title: string) => Promise<ActiveWorkoutSession>;
  logSet: (
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    targetReps: number,
    completedReps: number,
    weightKg: number
  ) => Promise<{ setLog: WorkoutSetLog; isNewPR: boolean }>;
  completeWorkout: (durationSeconds: number) => Promise<{ coinsEarned: number; xpEarned: number }>;
}

export const useGymStore = create<GymState>((set, get) => ({
  preferences: null,
  activePlan: null,
  todayWorkout: null,
  activeSession: null,
  personalRecords: [],
  workoutHistory: [],
  lastCompletedRewards: null,
  isLoading: false,

  loadGymData: async () => {
    set({ isLoading: true });
    try {
      const [prefs, plan, today, prs, history] = await Promise.all([
        gymService.getPreferences(),
        gymService.getActivePlan(),
        gymService.getTodayWorkout(),
        gymService.getPersonalRecords(),
        gymService.getWorkoutHistory(),
      ]);

      set({
        preferences: prefs,
        activePlan: plan,
        todayWorkout: today,
        personalRecords: prs,
        workoutHistory: history,
        isLoading: false,
      });
    } catch (e) {
      console.warn('Error loading gym data:', e);
      set({ isLoading: false });
    }
  },

  savePreferences: async (prefs) => {
    set({ isLoading: true });
    try {
      const newPlan = await gymService.savePreferences(prefs);
      const fullPrefs = await gymService.getPreferences();
      const today = await gymService.getTodayWorkout();
      set({
        preferences: fullPrefs,
        activePlan: newPlan,
        todayWorkout: today,
        isLoading: false,
      });
    } catch (e) {
      console.warn('Error saving gym preferences:', e);
      set({ isLoading: false });
    }
  },

  startWorkout: async (planId, dayId, title) => {
    const session = await gymService.startOrResumeSession(planId, dayId, title);
    set({ activeSession: session });
    return session;
  },

  logSet: async (exerciseId, exerciseName, setNumber, targetReps, completedReps, weightKg) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No active workout session');

    const result = await gymService.logSet(
      activeSession.id,
      exerciseId,
      exerciseName,
      setNumber,
      targetReps,
      completedReps,
      weightKg
    );

    // Update activeSession in Zustand
    const updatedSets = [...activeSession.sets, result.setLog];
    set({
      activeSession: {
        ...activeSession,
        sets: updatedSets,
      },
    });

    if (result.isNewPR) {
      const prs = await gymService.getPersonalRecords();
      set({ personalRecords: prs });
    }

    return result;
  },

  completeWorkout: async (durationSeconds) => {
    const { activeSession } = get();
    if (!activeSession) return { coinsEarned: 0, xpEarned: 0 };

    const rewards = await gymService.completeWorkoutSession(activeSession.id, durationSeconds);
    const history = await gymService.getWorkoutHistory();

    set({
      activeSession: null,
      workoutHistory: history,
      lastCompletedRewards: {
        coinsEarned: rewards.coinsEarned,
        xpEarned: rewards.xpEarned,
      },
    });

    return rewards;
  },
}));
