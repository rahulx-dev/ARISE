/**
 * ARISE — Authoritative Cloud Backup & Save File Validation
 * Type definitions and re-export.
 */

export interface ValidatedInventoryItem {
  itemId: string;
  itemType: string;
  unlockedAt: string;
  isEquipped: boolean;
}

export interface ValidatedAchievement {
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string;
}

export interface ValidatedQuest {
  id?: number;
  title: string;
  description: string;
  category: string;
  exerciseType?: string | null;
  target: number;
  rewardCoins: number;
  rewardXP: number;
  difficulty: string;
  completed: number;
  questType: string;
  frequency: string;
  date: string;
}

export interface ValidatedExerciseSession {
  exerciseType: string;
  target: number;
  completedReps: number;
  durationSeconds: number;
  formScore: number;
  timestamp: string;
  questId?: number | null;
}

export interface ValidatedFocusSession {
  durationMinutes: number;
  completed: number;
  timestamp: string;
}

export interface ValidatedHunterBackup {
  level: number;
  coins: number;
  currentXP: number;
  totalXP: number;
  manaCrystals: number;
  currentStreak: number;
  longestStreak: number;
  displayName: string;
  avatarIcon: string;
  profileImageUri: string | null;
  strength: number;
  discipline: number;
  focus: number;
  health: number;
  knowledge: number;
  unlockedInventory: ValidatedInventoryItem[];
  achievements: ValidatedAchievement[];
  quests: ValidatedQuest[];
  exerciseSessions: ValidatedExerciseSession[];
  focusSessions: ValidatedFocusSession[];
  lastSyncedAt: string;
}

// Re-export implementation from pure JS module
// @ts-ignore
export { validateBackupData } from './backupValidation.js';
