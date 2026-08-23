export type StatName = 'strength' | 'discipline' | 'focus' | 'health' | 'knowledge';

export type PlayerStats = {
  [K in StatName]: number;
};

export interface PlayerProfile extends PlayerStats {
  id: string;
  displayName: string;
  level: number;
  currentXP: number;
  totalXP: number;
  coins: number;
  totalCoinsEarned: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  createdAt: string;
}

export type LevelInfo = {
  level: number;
  currentXP: number;
  requiredXP: number;
  progress: number;
};
