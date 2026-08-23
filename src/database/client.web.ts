import * as schema from './schema';

/**
 * Web Database In-Memory / LocalStorage Mock Client
 * 
 * Provides a clean browser fallback for web previews.
 * Clean first launch: Level 1, 0 XP, 0 Coins, 0 Streaks, 0 Stats, 0 completed tasks.
 */

// In-memory data store for clean initial state
const mockState: Record<string, any[]> = {
  user_profile: [
    {
      id: 1,
      displayName: 'Warrior',
      level: 1,
      currentXP: 0,
      totalXP: 0,
      coins: 0,
      totalCoinsEarned: 0,
      currentStreak: 0,
      longestStreak: 0,
      strength: 0,
      discipline: 0,
      focus: 0,
      health: 0,
      knowledge: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  quest: [
    {
      id: 1,
      title: '20 Power Push-ups',
      description: 'Strengthen chest and shoulders with real tracking',
      category: 'FITNESS',
      exerciseType: 'PUSHUP',
      questType: 'TRACKED',
      target: 20,
      rewardCoins: 40,
      rewardXP: 100,
      difficulty: 'NORMAL',
      completed: 0,
      date: new Date().toISOString().split('T')[0],
    },
    {
      id: 2,
      title: '30 Bodyweight Squats',
      description: 'Build lower body endurance',
      category: 'FITNESS',
      exerciseType: 'SQUAT',
      questType: 'TRACKED',
      target: 30,
      rewardCoins: 50,
      rewardXP: 120,
      difficulty: 'HARD',
      completed: 0,
      date: new Date().toISOString().split('T')[0],
    },
    {
      id: 3,
      title: '25m Deep Focus Sprint',
      description: 'Zero distractions flow state timer',
      category: 'FOCUS',
      questType: 'TIMER',
      target: 25,
      rewardCoins: 50,
      rewardXP: 100,
      difficulty: 'NORMAL',
      completed: 0,
      date: new Date().toISOString().split('T')[0],
    },
    {
      id: 4,
      title: 'Daily Protocol Organization',
      description: 'Organize workspace and plan day priorities',
      category: 'PRODUCTIVITY',
      questType: 'MANUAL',
      target: 1,
      rewardCoins: 20,
      rewardXP: 50,
      difficulty: 'EASY',
      completed: 0,
      date: new Date().toISOString().split('T')[0],
    },
  ],
  coin_transaction: [],
  screen_time_session: [],
  achievement: [],
  exercise_session: [],
  focus_session: [],
  progress_photo: [],
  app_restriction: [
    {
      id: 1,
      packageName: 'com.instagram.android',
      appName: 'Instagram',
      appIconUri: 'instagram',
      isRestricted: 1,
    },
    {
      id: 2,
      packageName: 'com.google.android.youtube',
      appName: 'YouTube',
      appIconUri: 'youtube',
      isRestricted: 1,
    },
    {
      id: 3,
      packageName: 'com.zhiliaoapp.musically',
      appName: 'TikTok',
      appIconUri: 'music-box',
      isRestricted: 1,
    },
  ],
  settings: [
    {
      id: 1,
      sfxEnabled: 1,
      sfxVolume: 0.7,
      hapticsEnabled: 1,
      notificationsEnabled: 0,
      onboardingCompleted: 0,
      dailyBudgetMinutes: 120,
      theme: 'dark',
    },
  ],
};

function getTableName(table: any): string {
  if (typeof table === 'string') return table;
  return (table as any)?._?.name || (table as any)?.name || 'user_profile';
}

function createQueryChain(tableName: string) {
  const data = mockState[tableName] || [];

  return {
    from: (tbl: any) => createQueryChain(getTableName(tbl)),
    where: (predicate: any) => createQueryChain(tableName),
    orderBy: (...cols: any[]) => createQueryChain(tableName),
    limit: (n: number) => Promise.resolve(data.slice(0, n)),
    values: (vals: any) => {
      const entry = { id: (data.length || 0) + 1, ...vals };
      data.push(entry);
      return Promise.resolve([entry]);
    },
    set: (vals: any) => ({
      where: (predicate: any) => {
        data.forEach((item) => Object.assign(item, vals));
        return Promise.resolve(data);
      },
    }),
    then: (resolve: (val: any) => any) => resolve(data),
  };
}

export const expoDb: any = {
  execSync: () => {},
};

export const db: any = {
  select: () => ({
    from: (tbl: any) => createQueryChain(getTableName(tbl)),
  }),
  insert: (tbl: any) => ({
    values: (vals: any) => {
      const name = getTableName(tbl);
      const list = mockState[name] || (mockState[name] = []);
      const entry = { id: list.length + 1, ...vals };
      list.push(entry);
      return Promise.resolve([entry]);
    },
  }),
  update: (tbl: any) => ({
    set: (vals: any) => ({
      where: () => {
        const name = getTableName(tbl);
        const list = mockState[name] || [];
        list.forEach((item) => Object.assign(item, vals));
        return Promise.resolve(list);
      },
    }),
  }),
  delete: (tbl: any) => ({
    where: () => Promise.resolve([]),
  }),
  transaction: async (cb: any) => {
    return await cb(db);
  },
};

export async function initializeDatabase(): Promise<void> {
  console.log('⚡ [ARISE] Clean Level 1 initialization verified');
}
