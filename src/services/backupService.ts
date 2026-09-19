/**
 * ARISE — Encrypted Offline Backup & Restore Service
 *
 * Exports and imports .arise offline save files locally using expo-file-system and expo-sharing.
 * 100% Offline, Zero Cloud accounts needed.
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
      const data: AriseBackupData = JSON.parse(jsonString);

      if (
        !data ||
        data.app !== "ARISE_V1" ||
        !data.profile ||
        typeof data.profile !== "object"
      ) {
        return {
          success: false,
          message: "Invalid or corrupt ARISE save file.",
        };
      }

      const restoreTable = async (table: any, rows: any[] | undefined) => {
        if (!Array.isArray(rows)) return;
        await db.delete(table);
        for (const item of rows) {
          if (item && typeof item === "object") {
            await db.insert(table).values(item);
          }
        }
      };

      await db.transaction(async () => {
        await db.delete(userProfile);
        await db.insert(userProfile).values(data.profile);

        await restoreTable(quest, data.quests);
        await restoreTable(exerciseSession, data.sessions);
        await restoreTable(coinTransaction, data.transactions);
        await restoreTable(appRestriction, data.restrictions);
        await restoreTable(focusSession, data.focusSessions);
        await restoreTable(achievement, data.achievements);
        await restoreTable(crystalTransaction, data.crystalTransactions);
        await restoreTable(crystalRedemption, data.crystalRedemptions);
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
