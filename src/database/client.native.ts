import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const DATABASE_NAME = "arise.db";

export const expoDb = openDatabaseSync(DATABASE_NAME);
expoDb.execSync("PRAGMA journal_mode = WAL;");
expoDb.execSync("PRAGMA foreign_keys = ON;");

export const db: ReturnType<typeof drizzle<typeof schema>> = drizzle(expoDb, {
  schema,
});

export async function initializeDatabase(): Promise<void> {
  console.log("[ARISE Persistence] Opening SQLite database:", DATABASE_NAME);

  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL DEFAULT 'Warrior',
      avatar_icon TEXT DEFAULT 'user',
      profile_image_uri TEXT,
      bio TEXT DEFAULT 'Disciplined warrior in training.',
      workout_goal TEXT DEFAULT 'strength',
      daily_focus_goal INTEGER NOT NULL DEFAULT 30,
      daily_quest_target INTEGER NOT NULL DEFAULT 4,
      level INTEGER NOT NULL DEFAULT 1,
      current_xp INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      total_coins_earned INTEGER NOT NULL DEFAULT 0,
      sponsor_passes INTEGER NOT NULL DEFAULT 0,
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
      quest_type TEXT NOT NULL DEFAULT 'TRACKED',
      frequency TEXT NOT NULL DEFAULT 'DAILY',
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

    CREATE TABLE IF NOT EXISTS notification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      entity_id TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sfx_enabled INTEGER NOT NULL DEFAULT 1,
      sfx_volume REAL NOT NULL DEFAULT 0.7,
      haptics_enabled INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 0,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      daily_budget_minutes INTEGER NOT NULL DEFAULT 120,
      theme TEXT NOT NULL DEFAULT 'system',
      bg_music_enabled INTEGER NOT NULL DEFAULT 0,
      bg_music_volume REAL NOT NULL DEFAULT 0.5,
      focus_music_track TEXT NOT NULL DEFAULT 'deep_focus',
      focus_music_volume REAL NOT NULL DEFAULT 0.6
    );

    CREATE TABLE IF NOT EXISTS workout_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal TEXT NOT NULL DEFAULT 'strength',
      experience TEXT NOT NULL DEFAULT 'beginner',
      equipment TEXT NOT NULL DEFAULT 'full_gym',
      days_per_week INTEGER NOT NULL DEFAULT 4,
      workout_duration_minutes INTEGER NOT NULL DEFAULT 45,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      split_type TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      target_muscle_groups TEXT NOT NULL,
      is_rest_day INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      category TEXT NOT NULL,
      tracking_mode TEXT NOT NULL DEFAULT 'manual',
      target_sets INTEGER NOT NULL DEFAULT 3,
      target_reps TEXT NOT NULL DEFAULT '8-12',
      rest_seconds INTEGER NOT NULL DEFAULT 90,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      day_id INTEGER,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      total_volume_kg REAL NOT NULL DEFAULT 0,
      total_reps INTEGER NOT NULL DEFAULT 0,
      total_sets INTEGER NOT NULL DEFAULT 0,
      reward_coins INTEGER NOT NULL DEFAULT 0,
      reward_xp INTEGER NOT NULL DEFAULT 0,
      quest_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      target_reps INTEGER NOT NULL DEFAULT 10,
      completed_reps INTEGER NOT NULL DEFAULT 0,
      weight_kg REAL NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      record_type TEXT NOT NULL,
      value REAL NOT NULL,
      weight_kg REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      achieved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payout_request (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      amount_inr INTEGER NOT NULL,
      coins_spent INTEGER NOT NULL,
      upi_id TEXT NOT NULL,
      sponsor_passes_used INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL UNIQUE,
      item_type TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      is_equipped INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guild (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      banner_color TEXT NOT NULL DEFAULT '#0A84FF',
      rank_requirement TEXT NOT NULL DEFAULT 'E',
      leader_name TEXT NOT NULL DEFAULT 'Hunter Master',
      member_count INTEGER NOT NULL DEFAULT 1,
      max_members INTEGER NOT NULL DEFAULT 50,
      total_xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      is_user_member INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guild_raid (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      gate_rank TEXT NOT NULL DEFAULT 'C',
      boss_name TEXT NOT NULL,
      boss_max_hp INTEGER NOT NULL,
      boss_current_hp INTEGER NOT NULL,
      reward_xp INTEGER NOT NULL DEFAULT 500,
      reward_coins INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guild_member (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      hunter_name TEXT NOT NULL,
      hunter_rank TEXT NOT NULL DEFAULT 'E',
      role TEXT NOT NULL DEFAULT 'MEMBER',
      contribution_points INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      is_current_user INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS crystal_redemption (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      amount_inr INTEGER NOT NULL,
      crystals_spent INTEGER NOT NULL,
      method TEXT NOT NULL DEFAULT 'UPI',
      destination TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS crystal_transaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      gate_id TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quest_date_freq ON quest(date, frequency);
    CREATE INDEX IF NOT EXISTS idx_coin_tx_id ON coin_transaction(id DESC);
    CREATE INDEX IF NOT EXISTS idx_exercise_session_time ON exercise_session(timestamp);
    CREATE INDEX IF NOT EXISTS idx_focus_session_time ON focus_session(start_time);
    CREATE INDEX IF NOT EXISTS idx_app_restriction_pkg ON app_restriction(package_name);
    CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_request(status);
    CREATE INDEX IF NOT EXISTS idx_inventory_item ON user_inventory(item_id);
    CREATE INDEX IF NOT EXISTS idx_guild_name ON guild(name);
    CREATE INDEX IF NOT EXISTS idx_guild_member_gid ON guild_member(guild_id);
    CREATE INDEX IF NOT EXISTS idx_guild_raid_gid ON guild_raid(guild_id);
    CREATE INDEX IF NOT EXISTS idx_crystal_tx_id ON crystal_transaction(id DESC);
    CREATE INDEX IF NOT EXISTS idx_crystal_redemption_status ON crystal_redemption(status);
  `;

  expoDb.execSync(createTablesSql);

  // Safe schema migrations for existing databases
  const migrationStatements = [
    "ALTER TABLE user_profile ADD COLUMN profile_image_uri TEXT;",
    "ALTER TABLE user_profile ADD COLUMN bio TEXT DEFAULT 'Disciplined warrior in training.';",
    "ALTER TABLE user_profile ADD COLUMN workout_goal TEXT DEFAULT 'strength';",
    "ALTER TABLE user_profile ADD COLUMN daily_focus_goal INTEGER DEFAULT 30;",
    "ALTER TABLE user_profile ADD COLUMN daily_quest_target INTEGER DEFAULT 4;",
    "ALTER TABLE user_profile ADD COLUMN sponsor_passes INTEGER DEFAULT 0;",
    "ALTER TABLE user_profile ADD COLUMN mana_crystals INTEGER DEFAULT 0;",
    "ALTER TABLE payout_request ADD COLUMN sponsor_passes_used INTEGER DEFAULT 0;",
    "ALTER TABLE settings ADD COLUMN bg_music_enabled INTEGER DEFAULT 0;",
    "ALTER TABLE settings ADD COLUMN bg_music_volume REAL DEFAULT 0.5;",
    "ALTER TABLE settings ADD COLUMN focus_music_track TEXT DEFAULT 'deep_focus';",
    "ALTER TABLE settings ADD COLUMN focus_music_volume REAL DEFAULT 0.6;",
    "ALTER TABLE settings ADD COLUMN voice_accent TEXT DEFAULT 'en-IN';",
    "ALTER TABLE settings ADD COLUMN voice_language TEXT DEFAULT 'hi-IN';",
    "ALTER TABLE settings ADD COLUMN language TEXT DEFAULT 'en-US';",
  ];

  for (const sql of migrationStatements) {
    try {
      expoDb.execSync(sql);
    } catch (_) {}
  }

  // Check and seed User Profile only if not existing
  const profileRows = await db.select().from(schema.userProfile).limit(1);
  if (profileRows.length === 0) {
    console.log(
      "[ARISE Persistence] First launch detected: creating initial Level 1 user",
    );
    await db.insert(schema.userProfile).values({
      displayName: "Warrior",
      avatarIcon: "user",
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

  // Check and seed Settings only if not existing
  const settingsRows = await db.select().from(schema.settings).limit(1);
  if (settingsRows.length === 0) {
    await db.insert(schema.settings).values({
      sfxEnabled: 1,
      sfxVolume: 0.7,
      hapticsEnabled: 1,
      notificationsEnabled: 0,
      onboardingCompleted: 0,
      dailyBudgetMinutes: 30,
      theme: "system",
      bgMusicEnabled: 0,
      bgMusicVolume: 0.5,
      focusMusicTrack: "deep_focus",
      focusMusicVolume: 0.6,
      voiceAccent: "en-IN",
      voiceLanguage: "hi-IN",
    });
  }
}
