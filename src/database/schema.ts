import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const userProfile = sqliteTable('user_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull().default('Warrior'),
  level: integer('level').notNull().default(1),
  currentXP: integer('current_xp').notNull().default(0),
  totalXP: integer('total_xp').notNull().default(0),
  coins: integer('coins').notNull().default(0),
  totalCoinsEarned: integer('total_coins_earned').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  strength: integer('strength').notNull().default(0),
  discipline: integer('discipline').notNull().default(0),
  focus: integer('focus').notNull().default(0),
  health: integer('health').notNull().default(0),
  knowledge: integer('knowledge').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const quest = sqliteTable('quest', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  exerciseType: text('exercise_type'),
  target: integer('target'),
  rewardCoins: integer('reward_coins').notNull().default(0),
  rewardXP: integer('reward_xp').notNull().default(0),
  difficulty: text('difficulty').notNull().default('easy'),
  completed: integer('completed').notNull().default(0),
  questType: text('quest_type').notNull().default('TRACKED'),
  date: text('date').notNull(),
  isCustom: integer('is_custom').notNull().default(0),
  repeatSchedule: text('repeat_schedule'),
  createdAt: text('created_at').notNull(),
});

export const coinTransaction = sqliteTable('coin_transaction', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: integer('amount').notNull(),
  type: text('type').notNull(), // 'earn' | 'spend'
  description: text('description').notNull(),
  source: text('source').notNull(),
  timestamp: text('timestamp').notNull(),
});

export const screenTimeSession = sqliteTable('screen_time_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  packageName: text('package_name').notNull(),
  appName: text('app_name').notNull(),
  durationMs: integer('duration_ms').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  targetEndEpoch: integer('target_end_epoch').notNull(),
  status: text('status').notNull(), // 'ACTIVE'|'COMPLETED'|'EXPIRED'|'CANCELLED'
});

export const achievement = sqliteTable('achievement', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  achievementId: text('achievement_id').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(),
  unlockedAt: text('unlocked_at').notNull(),
});

export const exerciseSession = sqliteTable('exercise_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseType: text('exercise_type').notNull(),
  target: integer('target').notNull(),
  completedReps: integer('completed_reps').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  formScore: integer('form_score').notNull(),
  timestamp: text('timestamp').notNull(),
  questId: integer('quest_id'),
});

export const focusSession = sqliteTable('focus_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  targetMinutes: integer('target_minutes').notNull(),
  completedMinutes: integer('completed_minutes').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  status: text('status').notNull(), // 'ACTIVE'|'COMPLETED'|'ABANDONED'
  rewardCoins: integer('reward_coins').notNull().default(0),
  rewardXP: integer('reward_xp').notNull().default(0),
});

export const progressPhoto = sqliteTable('progress_photo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filePath: text('file_path').notNull(),
  date: text('date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const appRestriction = sqliteTable('app_restriction', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  packageName: text('package_name').notNull(),
  appName: text('app_name').notNull(),
  appIconUri: text('app_icon_uri'),
  isRestricted: integer('is_restricted').notNull().default(0),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sfxEnabled: integer('sfx_enabled').notNull().default(1),
  sfxVolume: real('sfx_volume').notNull().default(0.7),
  hapticsEnabled: integer('haptics_enabled').notNull().default(1),
  notificationsEnabled: integer('notifications_enabled').notNull().default(0),
  onboardingCompleted: integer('onboarding_completed').notNull().default(0),
  dailyBudgetMinutes: integer('daily_budget_minutes').notNull().default(120),
  theme: text('theme').notNull().default('dark'),
});
