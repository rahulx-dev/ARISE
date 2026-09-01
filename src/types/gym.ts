export type MuscleCategory =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'LEGS'
  | 'GLUTES'
  | 'CORE'
  | 'FULL_BODY'
  | 'CARDIO'
  | 'MOBILITY';

export type EquipmentType =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'cables'
  | 'machine'
  | 'kettlebell'
  | 'bands'
  | 'full_gym';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type TrackingMode = 'ai' | 'timer' | 'manual';

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: MuscleCategory;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: EquipmentType;
  difficulty: DifficultyLevel;
  instructions: string[];
  safetyNote?: string;
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
  aiTrackable: boolean;
  trackingMode: TrackingMode;
  coinsPerSet?: number;
  xpPerSet?: number;
}

export type WorkoutGoal = 'muscle_gain' | 'fat_loss' | 'strength' | 'general_fitness';

export interface WorkoutPreferences {
  id?: number;
  goal: WorkoutGoal;
  experience: DifficultyLevel;
  equipment: 'full_gym' | 'dumbbells' | 'home' | 'bodyweight';
  daysPerWeek: number;
  workoutDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExerciseItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: MuscleCategory;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  orderIndex: number;
}

export interface WorkoutDayPlan {
  id: number;
  planId: number;
  dayOfWeek: number; // 0..6
  dayName: string;
  targetMuscleGroups: string[];
  isRestDay: boolean;
  exercises: WorkoutExerciseItem[];
}

export interface WorkoutPlan {
  id: number;
  title: string;
  description: string;
  splitType: 'ppl' | 'upper_lower' | 'full_body' | 'custom';
  isActive: boolean;
  days: WorkoutDayPlan[];
  createdAt: string;
}

export interface WorkoutSetLog {
  id?: number;
  sessionId?: number;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  completedReps: number;
  weightKg: number;
  completed: boolean;
  timestamp: string;
}

export interface ActiveWorkoutSession {
  id: number;
  planId?: number;
  dayId?: number;
  title: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  totalVolumeKg: number;
  totalReps: number;
  totalSets: number;
  rewardCoins: number;
  rewardXP: number;
  sets: WorkoutSetLog[];
}

export interface PersonalRecord {
  id?: number;
  exerciseId: string;
  exerciseName: string;
  recordType: 'MAX_WEIGHT' | 'MAX_REPS' | 'MAX_VOLUME';
  value: number;
  weightKg: number;
  reps: number;
  achievedAt: string;
}
