import { CreateQuestInput, ExerciseType } from '../types/quest';
import { MAX_CUSTOM_QUEST_COINS, MAX_CUSTOM_QUEST_XP, MAX_EXERCISE_TARGET, MIN_EXERCISE_TARGET } from './constants';

export const validateQuestInput = (input: CreateQuestInput): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Title is required.');
  } else if (input.title.length > 50) {
    errors.push('Title cannot exceed 50 characters.');
  }

  if (input.description && input.description.length > 200) {
    errors.push('Description cannot exceed 200 characters.');
  }

  if (input.category === 'FITNESS' && !input.exerciseType) {
    errors.push('Exercise type is required for fitness quests.');
  }

  if (input.target < MIN_EXERCISE_TARGET || input.target > MAX_EXERCISE_TARGET) {
    errors.push(`Target must be between ${MIN_EXERCISE_TARGET} and ${MAX_EXERCISE_TARGET}.`);
  }

  if (input.rewardCoins < 0 || input.rewardCoins > MAX_CUSTOM_QUEST_COINS) {
    errors.push(`Coins must be between 0 and ${MAX_CUSTOM_QUEST_COINS}.`);
  }

  if (input.rewardXP < 0 || input.rewardXP > MAX_CUSTOM_QUEST_XP) {
    errors.push(`XP must be between 0 and ${MAX_CUSTOM_QUEST_XP}.`);
  }

  return { valid: errors.length === 0, errors };
};

export const validateCoinTransaction = (balance: number, amount: number): boolean => {
  return balance >= amount;
};

export const validateExerciseTarget = (target: number, exerciseType?: ExerciseType): boolean => {
  if (target < MIN_EXERCISE_TARGET || target > MAX_EXERCISE_TARGET) {
    return false;
  }
  return true;
};

export const sanitizeString = (input: string, maxLength: number): string => {
  if (!input) return '';
  const trimmed = input.trim();
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
};

export const isValidReward = (coins: number, xp: number): boolean => {
  return coins >= 0 && coins <= MAX_CUSTOM_QUEST_COINS && xp >= 0 && xp <= MAX_CUSTOM_QUEST_XP;
};
