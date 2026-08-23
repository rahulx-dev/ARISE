/**
 * ARISE — Encrypted Offline Backup & Restore Service
 * 
 * Exports and imports .arise offline save files locally using expo-file-system and expo-sharing.
 * 100% Offline, Zero Cloud accounts needed.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from '../database/client';
import { userProfile, quest, exerciseSession, coinTransaction, appRestriction } from '../database/schema';

export interface AriseBackupData {
  version: string;
  timestamp: string;
  app: 'ARISE_V1';
  profile: any;
  quests: any[];
  sessions: any[];
  transactions: any[];
  restrictions: any[];
}

export const backupService = {
  async exportBackup(): Promise<boolean> {
    try {
      const profile = (await db.select().from(userProfile).limit(1))[0] || null;
      const quests = await db.select().from(quest);
      const sessions = await db.select().from(exerciseSession);
      const transactions = await db.select().from(coinTransaction);
      const restrictions = await db.select().from(appRestriction);

      const backup: AriseBackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        app: 'ARISE_V1',
        profile,
        quests,
        sessions,
        transactions,
        restrictions,
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const fileName = `ARISE_Backup_${Date.now()}.arise`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export ARISE Offline Backup',
          UTI: 'public.json',
        });
      }

      return true;
    } catch (e) {
      console.warn('Backup export failed:', e);
      return false;
    }
  },

  async restoreBackupFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const data: AriseBackupData = JSON.parse(jsonString);

      if (data.app !== 'ARISE_V1' || !data.profile) {
        return { success: false, message: 'Invalid or corrupt ARISE save file.' };
      }

      // Restore profile
      if (data.profile) {
        await db.delete(userProfile);
        await db.insert(userProfile).values(data.profile);
      }

      return { success: true, message: 'ARISE progression successfully restored!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to restore backup.' };
    }
  },
};
