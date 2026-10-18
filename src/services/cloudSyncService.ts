import { db, expoDb } from '../database/client';
import {
  userProfile,
  achievement,
  quest,
  exerciseSession,
  focusSession,
} from '../database/schema';
import { inventoryRepository, InventoryItem } from '../database/repositories/inventoryRepository';
import { userRepository } from '../database/repositories/userRepository';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { googleAuthService } from './googleAuthService';
import { setIsOnboardingCompletedSync, getIsOnboardingCompleted } from './appStateService';
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
  focusSessions?: any[];
  lastSyncedAt: string;
}

const LAST_SYNC_KEY = '@arise_last_cloud_sync';
const CLOUD_CACHE_PREFIX = '@arise_cloud_cache_';

import { validateBackupData, ValidatedHunterBackup } from '../utils/backupValidation';
export { validateBackupData };
export type { ValidatedHunterBackup };

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
      const focuses = await db.select().from(focusSession);

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
        focusSessions: focuses || [],
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
      if (isSupabaseConfigured() && supabase) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          email = authData.user.email;
        }
      }
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

      // Guard: Do not write placeholder profile over real cloud backups if user has not completed onboarding
      const isOnboarded = getIsOnboardingCompleted();
      const localProfile = await userRepository.getProfile();
      if (!isOnboarded && (!localProfile?.displayName || localProfile.displayName === 'Warrior')) {
        console.log('[CloudSync] Skipping saveToCloud: user has not finished onboarding profile yet');
        return { success: false, message: 'Onboarding not finished yet.' };
      }

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

      // 2. Upload to remote Supabase cloud if active and user session matches
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: authData, error: userError } = await supabase.auth.getUser();
          if (userError || !authData?.user) {
            return { success: false, message: 'Cloud authentication session is invalid. Please sign in again.' };
          }
          const authUser = authData.user;
          if (authUser.email?.toLowerCase() !== cleanEmail) {
            return { success: false, message: 'Session mismatch: authenticated email does not match cloud target.' };
          }
          const { error: upsertError } = await supabase
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

          if (upsertError) {
            console.warn('[CloudSync] Supabase upsert error:', upsertError.message);
            return { success: false, message: `Cloud backup failed: ${upsertError.message}` };
          }
        } catch (cloudErr: any) {
          console.warn('[CloudSync] Remote upload error:', cloudErr);
          return { success: false, message: cloudErr?.message || 'Failed to upload backup to cloud.' };
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
      let cleanEmail = userEmail.trim().toLowerCase();
      if (isSupabaseConfigured() && supabase) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          cleanEmail = authData.user.email.trim().toLowerCase();
        }
      }

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

      // 2. Second attempt: Check authoritative user_wallets on Supabase if remote cloud save not found
      if (!backup && isSupabaseConfigured() && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData?.user?.id;
          if (userId) {
            const { data: wallet } = await supabase
              .from('user_wallets')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();

            if (
              wallet &&
              ((wallet.level && wallet.level > 1) ||
                (wallet.total_xp && wallet.total_xp > 0) ||
                (wallet.cloud_coins && wallet.cloud_coins > 0) ||
                (wallet.streak && wallet.streak > 0))
            ) {
              backup = {
                version: '1.0.0',
                email: cleanEmail,
                displayName: wallet.display_name || 'Warrior',
                avatarIcon: 'img_pfp_01',
                level: wallet.level || 1,
                currentXP: 0,
                totalXP: wallet.total_xp || 0,
                coins: wallet.cloud_coins || 0,
                manaCrystals: wallet.mana_crystals || 0,
                currentStreak: wallet.streak || 0,
                longestStreak: wallet.streak || 0,
                strength: 0,
                discipline: 0,
                focus: 0,
                health: 0,
                knowledge: 0,
                unlockedInventory: [],
                achievements: [],
                quests: [],
                exerciseSessions: [],
                focusSessions: [],
                lastSyncedAt: wallet.last_synced_at || new Date().toISOString(),
              };
              console.log('[CloudSync] Reconstructed progression from user_wallets for:', userId);
            }
          }
        } catch (wErr) {
          console.warn('[CloudSync] user_wallets lookup note:', wErr);
        }
      }

      // 3. Third attempt: Check local cloud cache if offline or testing
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

      // Check if backup has authentic gameplay progression or custom profile
      const isAuthenticSave =
        Boolean(backup) &&
        (Boolean(backup?.level && backup.level > 1) ||
          Boolean(backup?.totalXP && backup.totalXP > 0) ||
          Boolean(backup?.currentStreak && backup.currentStreak > 0) ||
          Boolean(backup?.displayName && backup.displayName !== 'Warrior' && backup.displayName.trim().length > 0) ||
          Boolean(Array.isArray(backup?.quests) && backup.quests.length > 0) ||
          Boolean(Array.isArray(backup?.achievements) && backup.achievements.length > 0));

      // If no valid save found anywhere for this email -> fresh user
      const validated = validateBackupData(backup);
      if (!validated || !isAuthenticSave) {
        return {
          restored: false,
          message: 'No prior cloud backup found for this account. Starting fresh!',
        };
      }
      backup = validated;

      // Check local progression vs backup to prevent wiping newer offline progress (NEW-SYNC-2)
      const localProfile = ((expoDb as any).getFirstSync?.(
        'SELECT total_xp, level, coins, mana_crystals FROM user_profile LIMIT 1'
      ) || null) as { total_xp?: number; level?: number; coins?: number; mana_crystals?: number } | null;

      const lastSyncRes = ((expoDb as any).getFirstSync?.(
        'SELECT val FROM arise_kv WHERE key = ?',
        [LAST_SYNC_KEY]
      ) || null) as { val: string } | null;

      const localLastSyncTime = lastSyncRes?.val ? new Date(lastSyncRes.val).getTime() : 0;
      const backupSyncTime = validated.lastSyncedAt ? new Date(validated.lastSyncedAt).getTime() : 0;

      if (
        localProfile &&
        (localProfile.total_xp || 0) > validated.totalXP &&
        localLastSyncTime > backupSyncTime
      ) {
        console.log('[CloudSync] Local progression is ahead of cloud backup. Retaining local progress.');
        return {
          restored: false,
          message: 'Local progression is newer than cloud backup. Retaining local progress.',
        };
      }

      const now = new Date().toISOString();

      // Transaction runner with web environment fallback (NEW-SYNC-1)
      const runTx = (fn: () => void) => {
        if (typeof expoDb.withTransactionSync === 'function') {
          expoDb.withTransactionSync(fn);
        } else {
          fn();
        }
      };

      // 3. Atomically restore into SQLite tables in a single ACID transaction
      runTx(() => {
        // A. Restore User Profile with all validated progression fields
        expoDb.runSync(
          `UPDATE user_profile SET
            display_name = ?,
            avatar_icon = ?,
            profile_image_uri = ?,
            level = ?,
            current_xp = ?,
            total_xp = ?,
            coins = ?,
            mana_crystals = ?,
            current_streak = ?,
            longest_streak = ?,
            strength = ?,
            discipline = ?,
            focus = ?,
            health = ?,
            knowledge = ?
          WHERE id = (SELECT id FROM user_profile LIMIT 1)`,
          [
            validated.displayName,
            validated.avatarIcon,
            validated.profileImageUri,
            validated.level,
            validated.currentXP,
            validated.totalXP,
            validated.coins,
            validated.manaCrystals,
            validated.currentStreak,
            validated.longestStreak,
            validated.strength,
            validated.discipline,
            validated.focus,
            validated.health,
            validated.knowledge,
          ]
        );

        // B. Restore Unlocked Avatars & Inventory (Clear first to prevent conflicting equip states - NEW-SYNC-3)
        expoDb.runSync('DELETE FROM user_inventory');
        for (const item of validated.unlockedInventory) {
          expoDb.runSync(
            'INSERT OR REPLACE INTO user_inventory (item_id, item_type, unlocked_at, is_equipped) VALUES (?, ?, ?, ?)',
            [item.itemId, item.itemType, item.unlockedAt || now, item.isEquipped ? 1 : 0]
          );
        }

        // C. Restore Achievements
        for (const ach of validated.achievements) {
          expoDb.runSync(
            'INSERT OR REPLACE INTO achievement (achievement_id, title, description, icon, category, unlocked_at) VALUES (?, ?, ?, ?, ?, ?)',
            [
              ach.achievementId,
              ach.title,
              ach.description,
              ach.icon,
              ach.category,
              ach.unlockedAt || now,
            ]
          );
        }

        // D. Restore Exercise Sessions (Deduplicate)
        if (validated.exerciseSessions.length > 0) {
          expoDb.runSync('DELETE FROM exercise_session');
          for (const s of validated.exerciseSessions) {
            expoDb.runSync(
              'INSERT INTO exercise_session (exercise_type, target, completed_reps, duration_seconds, form_score, timestamp, quest_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                s.exerciseType,
                s.target,
                s.completedReps,
                s.durationSeconds,
                s.formScore,
                s.timestamp || now,
                s.questId || null,
              ]
            );
          }
        }

        // E. Restore Focus Sessions (Deduplicate)
        if (validated.focusSessions.length > 0) {
          expoDb.runSync('DELETE FROM focus_session');
          for (const f of validated.focusSessions) {
            expoDb.runSync(
              'INSERT INTO focus_session (target_minutes, completed_minutes, start_time, end_time, status, reward_coins, reward_xp) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                f.durationMinutes,
                f.durationMinutes,
                f.timestamp || now,
                f.timestamp || now,
                f.completed ? 'COMPLETED' : 'ABORTED',
                0,
                0,
              ]
            );
          }
        }

        // F. Restore Quests (Deduplicate)
        if (validated.quests.length > 0) {
          expoDb.runSync('DELETE FROM quest');
          for (const q of validated.quests) {
            expoDb.runSync(
              'INSERT INTO quest (title, description, category, exercise_type, target, reward_coins, reward_xp, difficulty, completed, quest_type, frequency, date, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                q.title,
                q.description,
                q.category,
                q.exerciseType,
                q.target,
                q.rewardCoins,
                q.rewardXP,
                q.difficulty,
                q.completed,
                q.questType,
                q.frequency,
                q.date,
                0,
                now,
              ]
            );
          }
        }
      });

      // Refresh in-memory Zustand store and re-evaluate achievements immediately
      try {
        const { usePlayerStore } = await import('../stores/usePlayerStore');
        await usePlayerStore.getState().loadProfile();
        const { achievementService } = await import('./achievementService');
        await achievementService.evaluateAchievements();
      } catch (storeErr) {
        console.warn('[CloudSync] Store refresh note:', storeErr);
      }

      // D. Mark Onboarding as Completed
      await setIsOnboardingCompletedSync(true);

      await this.setLastSyncTime(now);

      return {
        restored: true,
        message: `Welcome back, ${backup.displayName}! Restored your Level ${backup.level || 1} progression, achievements, quests, and unlocked gear.`,
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
