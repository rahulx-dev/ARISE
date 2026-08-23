export * from './player';
export * from './quest';
export * from './exercise';
export * from './shop';
export * from './achievement';

export interface CoinTransaction {
  id?: number;
  amount: number;
  type: 'earn' | 'spend';
  description: string;
  source: string;
  timestamp: string;
}

export interface ProgressPhoto {
  id?: number;
  filePath: string;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export interface FocusSession {
  id?: number;
  targetMinutes: number;
  completedMinutes: number;
  startTime: string;
  endTime?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  rewardCoins: number;
  rewardXP: number;
}

export interface AppRestriction {
  id?: number;
  packageName: string;
  appName: string;
  appIconUri?: string | null;
  isRestricted: boolean | number;
}

export interface Settings {
  id?: number;
  sfxEnabled: boolean | number;
  sfxVolume: number;
  hapticsEnabled: boolean | number;
  notificationsEnabled: boolean | number;
  onboardingCompleted: boolean | number;
  dailyBudgetMinutes: number;
  theme: string;
}
