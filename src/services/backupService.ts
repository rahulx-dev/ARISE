/**
 * ARISE — Offline Backup & Restore Service
 *
 * Exports and imports .arise offline save files locally using expo-file-system and expo-sharing.
 * 100% Offline, Zero Cloud accounts needed.
 *
 * NOTE: backup files are PLAIN JSON, not encrypted. They were previously
 * mislabeled "Encrypted" — that claim was false and is now removed.
 * Restore validates + sanitizes every field (whitelist + clamps) and
 * applies the whole restore inside ONE database transaction via the tx
 * handle (previously the tx handle was never used, so each statement
 * auto-committed and a mid-restore failure left a half-restored DB).
 * A crafted backup can never inject arbitrary columns, oversized values,
 * or duplicate unique keys: unknown fields are dropped, numbers clamped,
 * and rows failing required checks are skipped.
 */

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { db } from "../database/client";
import {
  userProfile,
  quest,
  exerciseSession,
  coinTransaction,
  appRestriction,
  focusSession,
  achievement,
  crystalTransaction,
  crystalRedemption,
} from "../database/schema";

export interface AriseBackupData {
  version: string;
  timestamp: string;
  app: "ARISE_V1";
  profile: any;
  quests: any[];
  sessions: any[];
  transactions: any[];
  restrictions: any[];
  focusSessions?: any[];
  achievements?: any[];
  crystalTransactions?: any[];
  crystalRedemptions?: any[];
}

type SanitizedBackup = {
  profile: Record<string, any>;
  quests: Record<string, any>[];
  sessions: Record<string, any>[];
  transactions: Record<string, any>[];
  restrictions: Record<string, any>[];
  focusSessions: Record<string, any>[];
  achievements: Record<string, any>[];
  crystalTransactions: Record<string, any>[];
  crystalRedemptions: Record<string, any>[];
};

const TOP_LEVEL_KEYS = new Set([
  "version",
  "timestamp",
  "app",
  "profile",
  "quests",
  "sessions",
  "transactions",
  "restrictions",
  "focusSessions",
  "achievements",
  "crystalTransactions",
  "crystalRedemptions",
]);

const isObj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const cleanStr = (v: unknown, max: number, fallback = ""): string =>
  typeof v === "string" ? v.slice(0, max) : fallback;

const cleanOptStr = (v: unknown, max: number): string | null =>
  typeof v === "string" ? v.slice(0, max) : null;

const cleanInt = (v: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(v) ? Math.max(min, Math.min(max, v as number)) : fallback;

const cleanOptInt = (v: unknown, min: number, max: number): number | null =>
  Number.isInteger(v) ? Math.max(min, Math.min(max, v as number)) : null;

const cleanDate = (v: unknown): string =>
  typeof v === "string" && v.length > 0 ? v.slice(0, 64) : new Date().toISOString();

// URIs: allow local + https + data, never cleartext http (cleartext is disabled app-wide).
const cleanUri = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.slice(0, max);
  if (s.toLowerCase().startsWith("http://")) return null;
  return s;
};

function sanitizeProfile(p: unknown): Record<string, any> | null {
  if (!isObj(p)) return null;
  return {
    displayName: cleanStr(p.displayName, 100, "Warrior") || "Warrior",
    avatarIcon: cleanStr(p.avatarIcon, 64, "user"),
    profileImageUri: cleanUri(p.profileImageUri, 2048),
    bio: cleanStr(p.bio, 1000, ""),
    workoutGoal: cleanStr(p.workoutGoal, 50, "strength"),
    dailyFocusGoal: cleanInt(p.dailyFocusGoal, 1, 1440, 30),
    dailyQuestTarget: cleanInt(p.dailyQuestTarget, 1, 100, 4),
    level: cleanInt(p.level, 1, 100, 1),
    currentXP: cleanInt(p.currentXP, 0, 10000000, 0),
    totalXP: cleanInt(p.totalXP, 0, 10000000, 0),
    coins: cleanInt(p.coins, 0, 1000000, 0),
    manaCrystals: cleanInt(p.manaCrystals, 0, 1000000, 0),
    totalCoinsEarned: cleanInt(p.totalCoinsEarned, 0, 100000000, 0),
    sponsorPasses: cleanInt(p.sponsorPasses, 0, 100000, 0),
    currentStreak: cleanInt(p.currentStreak, 0, 3650, 0),
    longestStreak: cleanInt(p.longestStreak, 0, 3650, 0),
    lastActiveDate: cleanOptStr(p.lastActiveDate, 64),
    strength: cleanInt(p.strength, 0, 100000, 0),
    discipline: cleanInt(p.discipline, 0, 100000, 0),
    focus: cleanInt(p.focus, 0, 100000, 0),
    health: cleanInt(p.health, 0, 100000, 0),
    knowledge: cleanInt(p.knowledge, 0, 100000, 0),
    createdAt: cleanDate(p.createdAt),
  };
}

// Each sanitizer returns null for rows that fail required checks (row skipped).
function sanitizeQuest(q: unknown): Record<string, any> | null {
  if (!isObj(q)) return null;
  const title = cleanStr(q.title, 200, "");
  if (!title) return null;
  return {
    title,
    description: cleanStr(q.description, 1000, ""),
    category: cleanStr(q.category, 50, "FITNESS"),
    exerciseType: cleanOptStr(q.exerciseType, 50),
    target: cleanInt(q.target, 1, 1000, 10),
    rewardCoins: cleanInt(q.rewardCoins, 0, 100, 0),
    rewardXP: cleanInt(q.rewardXP, 0, 500, 0),
    difficulty: cleanStr(q.difficulty, 20, "easy"),
    completed: cleanInt(q.completed, 0, 1, 0),
    questType: cleanStr(q.questType, 50, "TRACKED"),
    frequency: cleanStr(q.frequency, 50, "DAILY"),
    date: cleanStr(q.date, 50, ""),
    isCustom: cleanInt(q.isCustom, 0, 1, 0),
    repeatSchedule: cleanOptStr(q.repeatSchedule, 200),
    createdAt: cleanDate(q.createdAt),
  };
}

function sanitizeExerciseSession(s: unknown): Record<string, any> | null {
  if (!isObj(s)) return null;
  const exerciseType = cleanStr(s.exerciseType, 50, "");
  if (!exerciseType) return null;
  return {
    exerciseType,
    target: cleanInt(s.target, 1, 1000, 10),
    completedReps: cleanInt(s.completedReps, 0, 1000, 0),
    durationSeconds: cleanInt(s.durationSeconds, 1, 86400, 60),
    formScore: cleanInt(s.formScore, 0, 100, 100),
    timestamp: cleanDate(s.timestamp),
    questId: cleanOptInt(s.questId, 1, 2147483647),
  };
}

function sanitizeCoinTransaction(t: unknown, seenRequestIds: Set<string>): Record<string, any> | null {
  if (!isObj(t)) return null;
  if (t.type !== "earn" && t.type !== "spend") return null;
  const requestId = cleanOptStr(t.requestId, 128);
  if (requestId) {
    if (seenRequestIds.has(requestId)) return null; // duplicate unique key would abort the tx
    seenRequestIds.add(requestId);
  }
  return {
    amount: cleanInt(t.amount, -1000000, 1000000, 0),
    type: t.type,
    description: cleanStr(t.description, 500, ""),
    source: cleanStr(t.source, 100, ""),
    timestamp: cleanDate(t.timestamp),
    requestId,
  };
}

function sanitizeAppRestriction(r: unknown): Record<string, any> | null {
  if (!isObj(r)) return null;
  const packageName = cleanStr(r.packageName, 200, "");
  if (!packageName) return null;
  return {
    packageName,
    appName: cleanStr(r.appName, 200, ""),
    appIconUri: cleanUri(r.appIconUri, 2048),
    isRestricted: cleanInt(r.isRestricted, 0, 1, 0),
  };
}

function sanitizeFocusSession(f: unknown): Record<string, any> | null {
  if (!isObj(f)) return null;
  if (f.status !== "ACTIVE" && f.status !== "COMPLETED" && f.status !== "ABANDONED") return null;
  return {
    targetMinutes: cleanInt(f.targetMinutes, 1, 1440, 25),
    completedMinutes: cleanInt(f.completedMinutes, 0, 1440, 0),
    startTime: cleanDate(f.startTime),
    endTime: cleanOptStr(f.endTime, 64),
    status: f.status,
    rewardCoins: cleanInt(f.rewardCoins, 0, 1000, 0),
    rewardXP: cleanInt(f.rewardXP, 0, 5000, 0),
  };
}

function sanitizeAchievement(a: unknown, seenIds: Set<string>): Record<string, any> | null {
  if (!isObj(a)) return null;
  const achievementId = cleanStr(a.achievementId, 128, "");
  if (!achievementId || seenIds.has(achievementId)) return null;
  seenIds.add(achievementId);
  return {
    achievementId,
    title: cleanStr(a.title, 200, ""),
    description: cleanStr(a.description, 1000, ""),
    icon: cleanStr(a.icon, 50, ""),
    category: cleanStr(a.category, 50, ""),
    unlockedAt: cleanDate(a.unlockedAt),
  };
}

function sanitizeCrystalTransaction(t: unknown, seenRequestIds: Set<string>): Record<string, any> | null {
  if (!isObj(t)) return null;
  if (t.type !== "earn" && t.type !== "spend") return null;
  const amount = cleanInt(t.amount, -1000000, 1000000, 0);
  if (amount === 0) return null; // table CHECK: amount != 0
  const requestId = cleanOptStr(t.requestId, 128);
  if (requestId) {
    if (seenRequestIds.has(requestId)) return null;
    seenRequestIds.add(requestId);
  }
  return {
    amount,
    type: t.type,
    description: cleanStr(t.description, 500, ""),
    gateId: cleanOptStr(t.gateId, 128),
    timestamp: cleanDate(t.timestamp),
    requestId,
  };
}

function sanitizeCrystalRedemption(r: unknown, seenRequestIds: Set<string>): Record<string, any> | null {
  if (!isObj(r)) return null;
  if (r.method !== "UPI" && r.method !== "AMAZON" && r.method !== "GOOGLE_PLAY" && r.method !== "COINS") return null;
  if (r.status !== "PENDING" && r.status !== "PAID" && r.status !== "REJECTED") return null;
  const amountInr = cleanInt(r.amountInr, 1, 100000, 0);
  const crystalsSpent = cleanInt(r.crystalsSpent, 1, 10000000, 0);
  if (amountInr <= 0 || crystalsSpent <= 0) return null;
  const destination = cleanStr(r.destination, 200, "");
  if (!destination) return null;
  const requestId = cleanStr(r.requestId, 128, "");
  if (!requestId || seenRequestIds.has(requestId)) return null;
  seenRequestIds.add(requestId);
  return {
    userId: cleanStr(r.userId, 128, "default_user"),
    amountInr,
    crystalsSpent,
    method: r.method,
    destination,
    status: r.status,
    createdAt: cleanDate(r.createdAt),
    paidAt: cleanOptStr(r.paidAt, 64),
    requestId,
  };
}

function sanitizeArray<T>(rows: unknown, sanitize: (row: unknown) => T | null): T[] {
  if (!Array.isArray(rows)) return [];
  const out: T[] = [];
  for (const row of rows) {
    const clean = sanitize(row);
    if (clean) out.push(clean);
  }
  return out;
}

/**
 * Validate + sanitize an untrusted backup payload (C12). Returns null when
 * the file is structurally invalid (wrong app marker, unknown top-level
 * keys, bad profile). Unknown fields are DROPPED, never inserted.
 */
function validateRestorePayload(data: unknown): SanitizedBackup | null {
  if (!isObj(data)) return null;
  for (const key of Object.keys(data)) {
    if (!TOP_LEVEL_KEYS.has(key)) return null;
  }
  if (data.app !== "ARISE_V1") return null;
  if (typeof data.version !== "string" || typeof data.timestamp !== "string") return null;
  const profile = sanitizeProfile(data.profile);
  if (!profile) return null;
  const seenTxRequestIds = new Set<string>();
  const seenCrystalTxRequestIds = new Set<string>();
  const seenRedemptionRequestIds = new Set<string>();
  const seenAchievementIds = new Set<string>();
  return {
    profile,
    quests: sanitizeArray(data.quests, sanitizeQuest),
    sessions: sanitizeArray(data.sessions, sanitizeExerciseSession),
    transactions: sanitizeArray(data.transactions, (row) => sanitizeCoinTransaction(row, seenTxRequestIds)),
    restrictions: sanitizeArray(data.restrictions, sanitizeAppRestriction),
    focusSessions: sanitizeArray(data.focusSessions, sanitizeFocusSession),
    achievements: sanitizeArray(data.achievements, (row) => sanitizeAchievement(row, seenAchievementIds)),
    crystalTransactions: sanitizeArray(data.crystalTransactions, (row) =>
      sanitizeCrystalTransaction(row, seenCrystalTxRequestIds)
    ),
    crystalRedemptions: sanitizeArray(data.crystalRedemptions, (row) =>
      sanitizeCrystalRedemption(row, seenRedemptionRequestIds)
    ),
  };
}

export const backupService = {
  async exportBackup(): Promise<boolean> {
    try {
      const profile = (await db.select().from(userProfile).limit(1))[0] || null;
      const quests = await db.select().from(quest);
      const sessions = await db.select().from(exerciseSession);
      const transactions = await db.select().from(coinTransaction);
      const restrictions = await db.select().from(appRestriction);
      const fSessions = await db.select().from(focusSession);
      const achs = await db.select().from(achievement);
      const cTxs = await db.select().from(crystalTransaction);
      const cReds = await db.select().from(crystalRedemption);

      const backup: AriseBackupData = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        app: "ARISE_V1",
        profile,
        quests,
        sessions,
        transactions,
        restrictions,
        focusSessions: fSessions,
        achievements: achs,
        crystalTransactions: cTxs,
        crystalRedemptions: cReds,
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const fileName = `ARISE_Backup_${Date.now()}.arise`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export ARISE Offline Backup",
          UTI: "public.json",
        });
      }

      return true;
    } catch (e) {
      console.warn("Backup export failed:", e);
      return false;
    }
  },

  async restoreBackupFromJson(
    jsonString: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      let data: unknown;
      try {
        data = JSON.parse(jsonString);
      } catch {
        return { success: false, message: "Invalid or corrupt ARISE save file." };
      }

      // Validate + sanitize BEFORE touching the database. A rejected file
      // leaves local data untouched.
      const backup = validateRestorePayload(data);
      if (!backup) {
        return {
          success: false,
          message: "Invalid or corrupt ARISE save file.",
        };
      }

      const restoreTable = async (tx: any, table: any, rows: Record<string, any>[]) => {
        await tx.delete(table);
        for (const item of rows) {
          await tx.insert(table).values(item);
        }
      };

      // ONE transaction, via the tx handle: all-or-nothing restore.
      await db.transaction(async (tx: any) => {
        await tx.delete(userProfile);
        await tx.insert(userProfile).values(backup.profile);

        await restoreTable(tx, quest, backup.quests);
        await restoreTable(tx, exerciseSession, backup.sessions);
        await restoreTable(tx, coinTransaction, backup.transactions);
        await restoreTable(tx, appRestriction, backup.restrictions);
        await restoreTable(tx, focusSession, backup.focusSessions);
        await restoreTable(tx, achievement, backup.achievements);
        await restoreTable(tx, crystalTransaction, backup.crystalTransactions);
        await restoreTable(tx, crystalRedemption, backup.crystalRedemptions);
      });

      return {
        success: true,
        message: "ARISE progression successfully restored!",
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || "Failed to restore backup.",
      };
    }
  },
};
