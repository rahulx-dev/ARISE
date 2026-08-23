export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'FITNESS' | 'FOCUS' | 'STREAK' | 'LEVEL' | 'COINS' | 'GENERAL';
  checkFn: string;
}

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  unlocked: boolean;
  unlockedAt?: string;
}
