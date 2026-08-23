export type QuestCategory = 'FITNESS' | 'FOCUS' | 'PRODUCTIVITY';
export type QuestDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC';
export type ExerciseType = 'PUSHUP' | 'SQUAT' | 'SITUP' | 'JUMPING_JACK' | 'PLANK';
export type QuestType = 'TRACKED' | 'TIMER' | 'MANUAL';

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  questType?: QuestType;
  exerciseType?: ExerciseType;
  target: number;
  rewardCoins: number;
  rewardXP: number;
  difficulty: QuestDifficulty;
  completed: boolean;
  date: string;
  isCustom: boolean;
  repeatSchedule?: number[];
  createdAt: string;
}

export interface QuestTemplate {
  title: string;
  description: string;
  category: QuestCategory;
  questType?: QuestType;
  exerciseType?: ExerciseType;
  target: number;
  rewardCoins: number;
  rewardXP: number;
  difficulty: QuestDifficulty;
}

export interface CreateQuestInput {
  title: string; // Max 50 chars
  description: string; // Max 200 chars
  category: QuestCategory;
  questType?: QuestType;
  exerciseType?: ExerciseType; // Required if category is FITNESS
  target: number; // > 0
  rewardCoins: number; // Max 200
  rewardXP: number; // Max 500
  difficulty: QuestDifficulty;
  isCustom: boolean;
  repeatSchedule?: number[]; // 0-6 days of week
}
