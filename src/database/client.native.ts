import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'arise.db';

export const expoDb = openDatabaseSync(DATABASE_NAME);
expoDb.execSync('PRAGMA journal_mode = WAL;');
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db: ReturnType<typeof drizzle<typeof schema>> = drizzle(expoDb, { schema });

export async function initializeDatabase(): Promise<void> {
  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL DEFAULT 'Warrior',
      level INTEGER NOT NULL DEFAULT 1,
      current_xp INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      total_coins_earned INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT,
      strength INTEGER NOT NULL DEFAULT 0,
      discipline INTEGER NOT NULL DEFAULT 0,
      focus INTEGER NOT NULL DEFAULT 0,
      health INTEGER NOT NULL DEFAULT 0,
      knowledge INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      exercise_type TEXT,
      target INTEGER,
      reward_coins INTEGER NOT NULL DEFAULT 0,
      reward_xp INTEGER NOT NULL DEFAULT 0,
      difficulty TEXT NOT NULL DEFAULT 'easy',
      completed INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      repeat_schedule TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coin_transaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS screen_time_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_name TEXT NOT NULL,
      app_name TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      target_end_epoch INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      achievement_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      unlocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_type TEXT NOT NULL,
      target INTEGER NOT NULL,
      completed_reps INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      form_score INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      quest_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS focus_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_minutes INTEGER NOT NULL,
      completed_minutes INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL,
      reward_coins INTEGER NOT NULL DEFAULT 0,
      reward_xp INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS progress_photo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_restriction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_name TEXT NOT NULL,
      app_name TEXT NOT NULL,
      app_icon_uri TEXT,
      is_restricted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sfx_enabled INTEGER NOT NULL DEFAULT 1,
      sfx_volume REAL NOT NULL DEFAULT 0.7,
      haptics_enabled INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 0,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      daily_budget_minutes INTEGER NOT NULL DEFAULT 120,
      theme TEXT NOT NULL DEFAULT 'dark'
    );
  `;

  expoDb.execSync(createTablesSql);

  // Check and seed User Profile
  const profileRows = await db.select().from(schema.userProfile).limit(1);
  if (profileRows.length === 0) {
    await db.insert(schema.userProfile).values({
      displayName: 'Warrior',
      level: 1,
      currentXP: 0,
      totalXP: 0,
      coins: 0,
      totalCoinsEarned: 0,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date().toISOString(),
    });
  }

  // Check and seed Settings
  const settingsRows = await db.select().from(schema.settings).limit(1);
  if (settingsRows.length === 0) {
    await db.insert(schema.settings).values({
      sfxEnabled: 1,
      sfxVolume: 0.7,
      hapticsEnabled: 1,
      notificationsEnabled: 0,
      onboardingCompleted: 0,
      dailyBudgetMinutes: 120,
      theme: 'dark',
    });
  }
}
