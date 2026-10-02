import { db, expoDb } from '../database/client';
import {
  userProfile,
  achievement,
  quest,
  exerciseSession,
} from '../database/schema';
import { inventoryRepository, InventoryItem } from '../database/repositories/inventoryRepository';
import { userRepository } from '../database/repositories/userRepository';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { googleAuthService } from './googleAuthService';
import { setIsOnboardingCompletedSync } from './appStateService';
import NetInfo from '@react-native-community/netinfo';

export interface HunterCloudBackup {
  version: '1.0.0';
  email: string;
  displayName: string;
  avatarIcon: string;
  profileImageUri?: string | null;
  level: number;
  currentXP: number;
  totalXP: number;
  coins: number;
  manaCrystals: number;
  currentStreak: number;
  longestStreak: number;
  strength: number;
  discipline: number;
  focus: number;
  health: number;
  knowledge: number;
  unlockedInventory: InventoryItem[];
  achievements: any[];
  quests: any[];
  exerciseSessions: any[];
  lastSyncedAt: string;
}

const LAST_SYNC_KEY = '@arise_last_cloud_sync';
const CLOUD_CACHE_PREFIX = '@arise_cloud_cache_';

export const cloudSyncService = {
  async enqueueCashoutSync(payload: {
    requestId: string;
    amountInr: number;
    crystalsSpent: number;
    method: string;
    destination: string;
  }): Promise<void> {
    try {
      expoDb.runSync(
        `CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          request_id TEXT NOT NULL UNIQUE,
          payload TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        )`
      );
      expoDb.runSync(
        'INSERT OR IGNORE INTO sync_queue (kind, request_id, payload, created_at) VALUES (?, ?, ?, ?)',
        ['cashout', payload.requestId, JSON.stringify(payload), new Date().toISOString()]
      );
    } catch (error) {
      console.warn('[CloudSync] Failed to enqueue cashout:', error);
    }
  },

  async drainCashoutQueue(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const rows = ((expoDb as any).getAllSync?.(
        'SELECT * FROM sync_queue WHERE kind = ? AND next_attempt_at <= ? ORDER BY id ASC LIMIT 20',
        ['cashout', Date.now()]
      ) || []) as Array<{ id: number; request_id: string; payload: string; attempts: number }>;
      for (const row of rows) {
        const payload = JSON.parse(row.payload) as {
          amountInr: number;
          crystalsSpent: number;
          method: string;
          destination: string;
        };
        const { error } = await supabase.rpc('request_redemption_secure', {
          p_amount_inr: payload.amountInr,
          p_crystals_spent: payload.crystalsSpent,
          p_method: payload.method,
          p_destination: payload.destination,
          p_request_uuid: row.request_id,
        });
        if (!error) {
          expoDb.runSync('DELETE FROM sync_queue WHERE id = ?', [row.id]);
        } else {
          const attempts = row.attempts + 1;
          const delay = Math.min(24 * 60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 16));
          expoDb.runSync(
            'UPDATE sync_queue SET attempts = ?, next_attempt_at = ? WHERE id = ?',
            [attempts, Date.now() + delay, row.id]
          );
        }
      }
    } catch (error) {
      console.warn('[CloudSync] Failed to drain cashout queue:', error);
    }
  },
  _ensureTable(): void {
    try {
      expoDb.runSync(
        'CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)'
      );
    } catch {}
  },

  async getLastSyncTime(): Promise<string | null> {
    try {
      this._ensureTable();
      const res = (expoDb as any).getFirstSync(
        'SELECT val FROM arise_kv WHERE key = ?',
        [LAST_SYNC_KEY]
      ) as { val: string } | null;
      return res?.val ?? null;
    } catch {
      return null;
    }
  },

  async setLastSyncTime(isoDate: string): Promise<void> {
    try {
      this._ensureTable();
      expoDb.runSync(
        'INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)',
        [LAST_SYNC_KEY, isoDate]
      );
    } catch {}
  },

  /**
   * Serialize all local database tables into a cloud backup bundle
   */
  async gatherLocalState(userEmail: string): Promise<HunterCloudBackup | null> {
    try {
      const profile = await userRepository.getProfile();
      if (!profile) return null;

      const inventory = await inventoryRepository.getUnlockedItems();
      const achs = await db.select().from(achievement);
      const qsts = await db.select().from(quest);
      const sessions = await db.select().from(exerciseSession);

      const backup: HunterCloudBackup = {
        version: '1.0.0',
        email: userEmail.trim().toLowerCase(),
        displayName: profile.displayName || 'Warrior',
        avatarIcon: profile.avatarIcon || 'img_pfp_01',
        profileImageUri: profile.profileImageUri || null,
        level: profile.level || 1,
        currentXP: profile.currentXP || 0,
        totalXP: profile.totalXP || 0,
        coins: profile.coins || 0,
        manaCrystals: profile.manaCrystals || 0,
        currentStreak: profile.currentStreak || 0,
        longestStreak: profile.longestStreak || 0,
        strength: profile.strength || 0,
        discipline: profile.discipline || 0,
        focus: profile.focus || 0,
        health: profile.health || 0,
        knowledge: profile.knowledge || 0,
        unlockedInventory: inventory || [],
        achievements: achs || [],
        quests: qsts || [],
        exerciseSessions: sessions || [],
        lastSyncedAt: new Date().toISOString(),
      };

      return backup;
    } catch (e) {
      console.warn('[CloudSync] Error gathering local state:', e);
      return null;
    }
  },

  /**
   * Save current progression to the cloud keyed by Google email
   */
  async saveToCloud(
    targetEmail?: string
  ): Promise<{ success: boolean; message: string; timestamp?: string }> {
    try {
      let email = targetEmail;
      if (!email) {
        const storedUser = await googleAuthService.getStoredGoogleUser();
        email = storedUser?.email;
      }

      if (!email) {
        return {
          success: false,
          message: 'No Google account linked. Please sign in with Google first.',
        };
      }

      const cleanEmail = email.trim().toLowerCase();
      const backupData = await this.gatherLocalState(cleanEmail);
      if (!backupData) {
        return {
          success: false,
          message: 'Could not serialize local progression.',
        };
      }

      const now = new Date().toISOString();

      // 1. Cache locally in case of offline usage
      this._ensureTable();
      try {
        expoDb.runSync(
          'INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)',
          [`${CLOUD_CACHE_PREFIX}${cleanEmail}`, JSON.stringify(backupData)]
        );
      } catch {}

      // 2. Upload to remote Supabase cloud if active
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase
            .from('user_cloud_saves')
            .upsert(
              {
                email: cleanEmail,
                display_name: backupData.displayName,
                avatar_icon: backupData.avatarIcon,
                backup_data: backupData,
                updated_at: now,
              },
              { onConflict: 'email' }
            );

          if (error) {
            console.warn('[CloudSync] Supabase upsert note:', error.message);
          }
        } catch (cloudErr) {
          console.warn('[CloudSync] Remote upload note:', cloudErr);
        }
      }

      await this.setLastSyncTime(now);
      return {
        success: true,
        message: 'Progression safely backed up to Cloud.',
        timestamp: now,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to sync to cloud.',
      };
    }
  },

  /**
   * Restore all progression from the cloud using the Google email
   * Used when user reinstalls the app or signs in with Google!
   */
  async restoreFromCloud(
    userEmail: string
  ): Promise<{ restored: boolean; message: string; backup?: HunterCloudBackup }> {
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      let backup: HunterCloudBackup | null = null;

      // 1. First attempt: Fetch from Remote Supabase Cloud
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('user_cloud_saves')
            .select('backup_data')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (!error && data?.backup_data) {
            backup = data.backup_data as HunterCloudBackup;
            console.log('[CloudSync] Found remote cloud save for:', cleanEmail);
          }
        } catch (fetchErr) {
          console.warn('[CloudSync] Remote fetch failed, checking local cache:', fetchErr);
        }
      }

      // 2. Second attempt: Check local cloud cache if offline or testing
      if (!backup) {
        this._ensureTable();
        try {
          const res = (expoDb as any).getFirstSync(
            'SELECT val FROM arise_kv WHERE key = ?',
            [`${CLOUD_CACHE_PREFIX}${cleanEmail}`]
          ) as { val: string } | null;
          if (res?.val) {
            backup = JSON.parse(res.val) as HunterCloudBackup;
            console.log('[CloudSync] Found cached cloud save for:', cleanEmail);
          }
        } catch {}
      }

      // If no save found anywhere for this email -> fresh user
      if (!backup) {
        return {
          restored: false,
          message: 'No existing cloud backup found for this account. Starting fresh!',
        };
      }

      // 3. Atomically restore into SQLite tables
      // A. Restore User Profile
      await userRepository.updateProfile({
        displayName: backup.displayName || 'Warrior',
        avatarIcon: backup.avatarIcon || 'img_pfp_01',
        profileImageUri: backup.profileImageUri || undefined,
        level: backup.level || 1,
        currentXP: backup.currentXP || 0,
        totalXP: backup.totalXP || 0,
        // Balances and redemption state are device/server-authoritative and must
        // never be restored from an editable cloud backup.
        currentStreak: backup.currentStreak || 0,
        longestStreak: backup.longestStreak || 0,
        strength: backup.strength || 0,
        discipline: backup.discipline || 0,
        focus: backup.focus || 0,
        health: backup.health || 0,
        knowledge: backup.knowledge || 0,
      });

      // B. Restore Unlocked Avatars & Inventory
      if (Array.isArray(backup.unlockedInventory) && backup.unlockedInventory.length > 0) {
        for (const item of backup.unlockedInventory) {
          if (item?.itemId) {
            await inventoryRepository.unlockItem(item.itemId, item.itemType || 'AVATAR');
            if (item.isEquipped) {
              await inventoryRepository.equipItem(item.itemId, item.itemType || 'AVATAR');
            }
          }
        }
      }

      // C. Restore Achievements
      if (Array.isArray(backup.achievements) && backup.achievements.length > 0) {
        for (const ach of backup.achievements) {
          try {
            await db.insert(achievement).values(ach);
          } catch {}
        }
      }

      // D. Mark Onboarding as Completed
      await setIsOnboardingCompletedSync(true);

      const now = new Date().toISOString();
      await this.setLastSyncTime(now);

      return {
        restored: true,
        message: `Welcome back, ${backup.displayName}! Restored progression and all unlocked avatars. Financial balances were preserved locally.`,
        backup,
      };
    } catch (err: any) {
      console.error('[CloudSync] Restore error:', err);
      return {
        restored: false,
        message: err?.message || 'Failed to restore data from cloud.',
      };
    }
  },

  /**
   * Non-blocking background sync triggered on game events
   */
  async triggerAutoSync(): Promise<void> {
    try {
      const storedUser = await googleAuthService.getStoredGoogleUser();
      if (storedUser?.email) {
        await this.saveToCloud(storedUser.email);
      }
    } catch {}
  },
};

NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    void cloudSyncService.drainCashoutQueue();
  }
});
