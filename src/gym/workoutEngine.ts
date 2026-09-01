import {
  WorkoutPreferences,
  WorkoutPlan,
  WorkoutDayPlan,
  WorkoutExerciseItem,
  MuscleCategory,
  ExerciseDefinition,
} from '../types/gym';
import { EXERCISE_DATABASE, getExercisesByEquipment } from './exerciseDatabase';

export class WorkoutEngine {
  /**
   * Deterministically generates a weekly workout plan based on user preferences.
   */
  static generateWeeklyPlan(preferences: WorkoutPreferences): WorkoutPlan {
    const availableExercises = getExercisesByEquipment(preferences.equipment);

    let splitType: 'ppl' | 'upper_lower' | 'full_body' | 'custom' = 'full_body';
    if (preferences.daysPerWeek === 3) splitType = 'full_body';
    else if (preferences.daysPerWeek === 4) splitType = 'upper_lower';
    else if (preferences.daysPerWeek >= 5) splitType = 'ppl';

    const exerciseCount = this.getExerciseCountForDuration(preferences.workoutDurationMinutes);
    const setsAndReps = this.getSetsAndRepsForGoal(preferences.goal, preferences.experience);

    const days: WorkoutDayPlan[] = [];

    // Days 0..6 (0 = Sunday, 1 = Monday ... 6 = Saturday)
    // We map Monday (1) to Sunday (0)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const daySchedule = this.getDaySchedule(splitType, preferences.daysPerWeek, dayIndex);

      if (daySchedule.isRestDay) {
        days.push({
          id: dayIndex + 1,
          planId: 1,
          dayOfWeek: dayIndex,
          dayName: daySchedule.dayName,
          targetMuscleGroups: [],
          isRestDay: true,
          exercises: [],
        });
      } else {
        const exercises = this.selectExercisesForMuscles(
          availableExercises,
          daySchedule.targetMuscles,
          exerciseCount,
          setsAndReps
        );

        days.push({
          id: dayIndex + 1,
          planId: 1,
          dayOfWeek: dayIndex,
          dayName: daySchedule.dayName,
          targetMuscleGroups: daySchedule.targetMuscles,
          isRestDay: false,
          exercises,
        });
      }
    }

    return {
      id: 1,
      title: `${preferences.goal.toUpperCase()} PROTOCOL (${preferences.daysPerWeek}D ${splitType.toUpperCase()})`,
      description: `Custom ${preferences.daysPerWeek}-day protocol calibrated for ${preferences.experience} lifters with ${preferences.equipment.replace('_', ' ')}.`,
      splitType,
      isActive: true,
      days,
      createdAt: new Date().toISOString(),
    };
  }

  private static getExerciseCountForDuration(durationMinutes: number): number {
    if (durationMinutes <= 25) return 4;
    if (durationMinutes <= 35) return 5;
    if (durationMinutes <= 50) return 6;
    return 7;
  }

  private static getSetsAndRepsForGoal(
    goal: string,
    experience: string
  ): { targetSets: number; targetReps: string; restSeconds: number } {
    const baseSets = experience === 'advanced' ? 4 : 3;
    switch (goal) {
      case 'strength':
        return { targetSets: baseSets, targetReps: '5-8', restSeconds: 120 };
      case 'muscle_gain':
        return { targetSets: baseSets, targetReps: '8-12', restSeconds: 75 };
      case 'fat_loss':
        return { targetSets: 3, targetReps: '12-15', restSeconds: 45 };
      case 'general_fitness':
      default:
        return { targetSets: 3, targetReps: '10-12', restSeconds: 60 };
    }
  }

  private static getDaySchedule(
    splitType: string,
    daysPerWeek: number,
    dayOfWeek: number
  ): { dayName: string; isRestDay: boolean; targetMuscles: MuscleCategory[] } {
    // dayOfWeek: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

    if (splitType === 'full_body') {
      // 3-Day split on Mon, Wed, Fri
      if (dayOfWeek === 1) {
        return { dayName: 'Full Body (Power)', isRestDay: false, targetMuscles: ['CHEST', 'BACK', 'LEGS', 'CORE'] };
      } else if (dayOfWeek === 3) {
        return { dayName: 'Full Body (Hypertrophy)', isRestDay: false, targetMuscles: ['SHOULDERS', 'LEGS', 'BICEPS', 'TRICEPS'] };
      } else if (dayOfWeek === 5) {
        return { dayName: 'Full Body (Endurance)', isRestDay: false, targetMuscles: ['CHEST', 'BACK', 'GLUTES', 'CORE'] };
      }
      return { dayName: 'Active Recovery & Rest', isRestDay: true, targetMuscles: [] };
    }

    if (splitType === 'upper_lower') {
      // 4-Day split: Mon: Upper A, Tue: Lower A, Thu: Upper B, Fri: Lower B
      if (dayOfWeek === 1) {
        return { dayName: 'Upper Body A', isRestDay: false, targetMuscles: ['CHEST', 'BACK', 'SHOULDERS', 'TRICEPS'] };
      } else if (dayOfWeek === 2) {
        return { dayName: 'Lower Body A', isRestDay: false, targetMuscles: ['LEGS', 'GLUTES', 'CORE'] };
      } else if (dayOfWeek === 4) {
        return { dayName: 'Upper Body B', isRestDay: false, targetMuscles: ['BACK', 'CHEST', 'SHOULDERS', 'BICEPS'] };
      } else if (dayOfWeek === 5) {
        return { dayName: 'Lower Body B', isRestDay: false, targetMuscles: ['LEGS', 'GLUTES', 'CORE'] };
      }
      return { dayName: 'Rest & Recovery', isRestDay: true, targetMuscles: [] };
    }

    // 5 or 6 Day PPL
    if (daysPerWeek === 5) {
      if (dayOfWeek === 1) return { dayName: 'Push (Chest & Shoulders)', isRestDay: false, targetMuscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] };
      if (dayOfWeek === 2) return { dayName: 'Pull (Back & Biceps)', isRestDay: false, targetMuscles: ['BACK', 'BICEPS', 'CORE'] };
      if (dayOfWeek === 3) return { dayName: 'Legs & Core', isRestDay: false, targetMuscles: ['LEGS', 'GLUTES', 'CORE'] };
      if (dayOfWeek === 4) return { dayName: 'Upper Body Focus', isRestDay: false, targetMuscles: ['CHEST', 'BACK', 'SHOULDERS'] };
      if (dayOfWeek === 5) return { dayName: 'Lower Body & Arms', isRestDay: false, targetMuscles: ['LEGS', 'BICEPS', 'TRICEPS'] };
      return { dayName: 'Rest & Restoration', isRestDay: true, targetMuscles: [] };
    }

    // 6-Day PPL
    if (dayOfWeek === 1) return { dayName: 'Push A', isRestDay: false, targetMuscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] };
    if (dayOfWeek === 2) return { dayName: 'Pull A', isRestDay: false, targetMuscles: ['BACK', 'BICEPS', 'CORE'] };
    if (dayOfWeek === 3) return { dayName: 'Legs A', isRestDay: false, targetMuscles: ['LEGS', 'GLUTES'] };
    if (dayOfWeek === 4) return { dayName: 'Push B', isRestDay: false, targetMuscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] };
    if (dayOfWeek === 5) return { dayName: 'Pull B', isRestDay: false, targetMuscles: ['BACK', 'BICEPS', 'CORE'] };
    if (dayOfWeek === 6) return { dayName: 'Legs B', isRestDay: false, targetMuscles: ['LEGS', 'GLUTES', 'CORE'] };

    return { dayName: 'Complete Rest', isRestDay: true, targetMuscles: [] };
  }

  private static selectExercisesForMuscles(
    available: ExerciseDefinition[],
    targetMuscles: MuscleCategory[],
    count: number,
    params: { targetSets: number; targetReps: string; restSeconds: number }
  ): WorkoutExerciseItem[] {
    const selected: WorkoutExerciseItem[] = [];
    const usedIds = new Set<string>();

    // Pick 1-2 exercises per target muscle group
    for (const muscle of targetMuscles) {
      if (selected.length >= count) break;
      const candidates = available.filter((e) => e.category === muscle && !usedIds.has(e.id));
      if (candidates.length > 0) {
        const chosen = candidates[0];
        usedIds.add(chosen.id);
        selected.push({
          id: `ex_${chosen.id}`,
          exerciseId: chosen.id,
          exerciseName: chosen.name,
          category: chosen.category,
          trackingMode: chosen.trackingMode,
          targetSets: params.targetSets,
          targetReps: params.targetReps,
          restSeconds: chosen.defaultRestSeconds || params.restSeconds,
          orderIndex: selected.length,
        });
      }
    }

    // If still under count, fill with complementary movements
    for (const muscle of targetMuscles) {
      if (selected.length >= count) break;
      const secondaryCandidates = available.filter((e) => e.category === muscle && !usedIds.has(e.id));
      if (secondaryCandidates.length > 0) {
        const chosen = secondaryCandidates[0];
        usedIds.add(chosen.id);
        selected.push({
          id: `ex_${chosen.id}`,
          exerciseId: chosen.id,
          exerciseName: chosen.name,
          category: chosen.category,
          trackingMode: chosen.trackingMode,
          targetSets: params.targetSets,
          targetReps: params.targetReps,
          restSeconds: chosen.defaultRestSeconds || params.restSeconds,
          orderIndex: selected.length,
        });
      }
    }

    return selected;
  }
}
