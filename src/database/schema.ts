import { sqliteTable, text, integer, real, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull().default("Warrior"),
  avatarIcon: text("avatar_icon").default("user"),
  profileImageUri: text("profile_image_uri"),
  bio: text("bio").default("Disciplined warrior in training."),
  workoutGoal: text("workout_goal").default("strength"),
  dailyFocusGoal: integer("daily_focus_goal").notNull().default(30),
  dailyQuestTarget: integer("daily_quest_target").notNull().default(4),
  level: integer("level").notNull().default(1),
  currentXP: integer("current_xp").notNull().default(0),
  totalXP: integer("total_xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  manaCrystals: integer("mana_crystals").notNull().default(0),
  totalCoinsEarned: integer("total_coins_earned").notNull().default(0),
  sponsorPasses: integer("sponsor_passes").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  strength: integer("strength").notNull().default(0),
  discipline: integer("discipline").notNull().default(0),
  focus: integer("focus").notNull().default(0),
  health: integer("health").notNull().default(0),
  knowledge: integer("knowledge").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const quest = sqliteTable("quest", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  exerciseType: text("exercise_type"),
  target: integer("target"),
  rewardCoins: integer("reward_coins").notNull().default(0),
  rewardXP: integer("reward_xp").notNull().default(0),
  difficulty: text("difficulty").notNull().default("easy"),
  completed: integer("completed").notNull().default(0),
  questType: text("quest_type").notNull().default("TRACKED"),
  frequency: text("frequency").notNull().default("DAILY"), // 'DAILY' | 'WEEKLY' | 'ACHIEVEMENT'
  date: text("date").notNull(),
  isCustom: integer("is_custom").notNull().default(0),
  repeatSchedule: text("repeat_schedule"),
  createdAt: text("created_at").notNull(),
});

export const coinTransaction = sqliteTable("coin_transaction", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'earn' | 'spend'
  description: text("description").notNull(),
  source: text("source").notNull(),
  timestamp: text("timestamp").notNull(),
  requestId: text("request_id").unique(),
});

export const screenTimeSession = sqliteTable("screen_time_session", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  packageName: text("package_name").notNull(),
  appName: text("app_name").notNull(),
  durationMs: integer("duration_ms").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  targetEndEpoch: integer("target_end_epoch").notNull(),
  status: text("status").notNull(), // 'ACTIVE'|'COMPLETED'|'EXPIRED'|'CANCELLED'
});

export const achievement = sqliteTable("achievement", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  achievementId: text("achievement_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  unlockedAt: text("unlocked_at").notNull(),
});

export const exerciseSession = sqliteTable("exercise_session", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exerciseType: text("exercise_type").notNull(),
  target: integer("target").notNull(),
  completedReps: integer("completed_reps").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  formScore: integer("form_score").notNull(),
  timestamp: text("timestamp").notNull(),
  questId: integer("quest_id"),
});

export const focusSession = sqliteTable("focus_session", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetMinutes: integer("target_minutes").notNull(),
  completedMinutes: integer("completed_minutes").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  status: text("status").notNull(), // 'ACTIVE'|'COMPLETED'|'ABANDONED'
  rewardCoins: integer("reward_coins").notNull().default(0),
  rewardXP: integer("reward_xp").notNull().default(0),
});

export const progressPhoto = sqliteTable("progress_photo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filePath: text("file_path").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const appRestriction = sqliteTable("app_restriction", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  packageName: text("package_name").notNull(),
  appName: text("app_name").notNull(),
  appIconUri: text("app_icon_uri"),
  isRestricted: integer("is_restricted").notNull().default(0),
});

export const notification = sqliteTable("notification", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'QUEST' | 'REWARD' | 'ACHIEVEMENT' | 'STREAK' | 'FOCUS' | 'SYSTEM' | 'GYM'
  title: text("title").notNull(),
  message: text("message").notNull(),
  timestamp: text("timestamp").notNull(),
  isRead: integer("is_read").notNull().default(0),
  entityId: text("entity_id"),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sfxEnabled: integer("sfx_enabled").notNull().default(1),
  sfxVolume: real("sfx_volume").notNull().default(0.7),
  hapticsEnabled: integer("haptics_enabled").notNull().default(1),
  notificationsEnabled: integer("notifications_enabled").notNull().default(0),
  onboardingCompleted: integer("onboarding_completed").notNull().default(0),
  dailyBudgetMinutes: integer("daily_budget_minutes").notNull().default(30),
  theme: text("theme").notNull().default("light"), // 'dark' | 'light' | 'system'
  bgMusicEnabled: integer("bg_music_enabled").notNull().default(0),
  bgMusicVolume: real("bg_music_volume").notNull().default(0.5),
  focusMusicTrack: text("focus_music_track").notNull().default("deep_focus"),
  focusMusicVolume: real("focus_music_volume").notNull().default(0.6),
  voiceAccent: text("voice_accent").notNull().default("en-IN"),
  voiceLanguage: text("voice_language").notNull().default("hi-IN"),
});

// ================= GYM & WORKOUT TABLES =================

export const workoutPreferences = sqliteTable("workout_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goal: text("goal").notNull().default("strength"), // 'muscle_gain' | 'fat_loss' | 'strength' | 'general_fitness'
  experience: text("experience").notNull().default("beginner"), // 'beginner' | 'intermediate' | 'advanced'
  equipment: text("equipment").notNull().default("full_gym"), // 'full_gym' | 'dumbbells' | 'home' | 'bodyweight'
  daysPerWeek: integer("days_per_week").notNull().default(4),
  workoutDurationMinutes: integer("workout_duration_minutes")
    .notNull()
    .default(45),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workoutPlans = sqliteTable("workout_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  splitType: text("split_type").notNull(), // 'ppl' | 'upper_lower' | 'full_body' | 'custom'
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const workoutDays = sqliteTable("workout_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday ... 6=Saturday
  dayName: text("day_name").notNull(), // 'Push Day', 'Pull Day', 'Leg Day', 'Rest Day'
  targetMuscleGroups: text("target_muscle_groups").notNull(), // JSON array string
  isRestDay: integer("is_rest_day").notNull().default(0),
});

export const workoutExercises = sqliteTable("workout_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  category: text("category").notNull(),
  trackingMode: text("tracking_mode").notNull().default("manual"), // 'ai' | 'timer' | 'manual'
  targetSets: integer("target_sets").notNull().default(3),
  targetReps: text("target_reps").notNull().default("8-12"),
  restSeconds: integer("rest_seconds").notNull().default(90),
  orderIndex: integer("order_index").notNull().default(0),
});

export const workoutSessions = sqliteTable("workout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id"),
  dayId: integer("day_id"),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  status: text("status").notNull().default("ACTIVE"), // 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
  totalVolumeKg: real("total_volume_kg").notNull().default(0),
  totalReps: integer("total_reps").notNull().default(0),
  totalSets: integer("total_sets").notNull().default(0),
  rewardCoins: integer("reward_coins").notNull().default(0),
  rewardXP: integer("reward_xp").notNull().default(0),
  questId: integer("quest_id"),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  targetReps: integer("target_reps").notNull().default(10),
  completedReps: integer("completed_reps").notNull().default(0),
  weightKg: real("weight_kg").notNull().default(0),
  completed: integer("completed").notNull().default(0),
  timestamp: text("timestamp").notNull(),
});

export const personalRecords = sqliteTable("personal_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exerciseId: text("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  recordType: text("record_type").notNull(), // 'MAX_WEIGHT' | 'MAX_REPS' | 'MAX_VOLUME'
  value: real("value").notNull(),
  weightKg: real("weight_kg").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  achievedAt: text("achieved_at").notNull(),
});

export const payoutRequest = sqliteTable("payout_request", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default("default_user"),
  amountInr: integer("amount_inr").notNull(),
  coinsSpent: integer("coins_spent").notNull(),
  upiId: text("upi_id").notNull(),
  sponsorPassesUsed: integer("sponsor_passes_used").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'PAID' | 'REJECTED'
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
  requestId: text("request_id").notNull().unique(),
});

// ================= HUNTER GUILD TABLES =================

export const guild = sqliteTable("guild", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull().unique(),
  description: text("description").notNull(),
  bannerColor: text("banner_color").notNull().default("#0A84FF"),
  rankRequirement: text("rank_requirement").notNull().default("E"),
  leaderName: text("leader_name").notNull().default("Hunter Master"),
  memberCount: integer("member_count").notNull().default(1),
  maxMembers: integer("max_members").notNull().default(50),
  totalXP: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  isUserMember: integer("is_user_member").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const guildRaid = sqliteTable("guild_raid", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: integer("guild_id").notNull(),
  gateRank: text("gate_rank").notNull().default("C"),
  bossName: text("boss_name").notNull(),
  bossMaxHp: integer("boss_max_hp").notNull(),
  bossCurrentHp: integer("boss_current_hp").notNull(),
  rewardXP: integer("reward_xp").notNull().default(500),
  rewardCoins: integer("reward_coins").notNull().default(100),
  status: text("status").notNull().default("ACTIVE"), // 'ACTIVE' | 'CLEARED'
  createdAt: text("created_at").notNull(),
});

export const guildMember = sqliteTable("guild_member", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: integer("guild_id").notNull(),
  hunterName: text("hunter_name").notNull(),
  hunterRank: text("hunter_rank").notNull().default("E"),
  role: text("role").notNull().default("MEMBER"), // 'MASTER' | 'VICE_MASTER' | 'ELITE' | 'MEMBER'
  contributionPoints: integer("contribution_points").notNull().default(0),
  joinedAt: text("joined_at").notNull(),
  isCurrentUser: integer("is_current_user").notNull().default(0),
});

// ================= MANA CRYSTALS & REDEMPTION TABLES =================

export const crystalRedemption = sqliteTable("crystal_redemption", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default("default_user"),
  amountInr: integer("amount_inr").notNull(),
  crystalsSpent: integer("crystals_spent").notNull(),
  method: text("method").notNull().default("UPI"), // 'UPI' | 'AMAZON' | 'GOOGLE_PLAY' | 'COINS'
  destination: text("destination").notNull(),
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'PAID' | 'REJECTED'
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
  requestId: text("request_id").notNull().unique(),
}, (table) => ({
  validAmount: check("crystal_redemption_positive_amount", sql`${table.amountInr} > 0 AND ${table.crystalsSpent} > 0`),
  validStatus: check("crystal_redemption_status", sql`${table.status} IN ('PENDING', 'PAID', 'REJECTED')`),
}));

export const crystalTransaction = sqliteTable("crystal_transaction", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'earn' | 'spend'
  description: text("description").notNull(),
  gateId: text("gate_id"),
  timestamp: text("timestamp").notNull(),
  requestId: text("request_id").unique(),
}, (table) => ({
  validAmount: check("crystal_transaction_nonzero", sql`${table.amount} != 0`),
  validType: check("crystal_transaction_type", sql`${table.type} IN ('earn', 'spend')`),
}));

export const syncQueue = sqliteTable("sync_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  requestId: text("request_id").notNull().unique(),
  payload: text("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: integer("next_attempt_at").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
