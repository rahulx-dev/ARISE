import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured, getCloudUserId, ensureAuthenticatedUser } from './supabaseClient';
import { userRepository } from '../database/repositories/userRepository';
import { payoutRepository } from '../database/repositories/payoutRepository';
import { getRankForLevel } from '../constants/ranks';
import { db } from '../database/client';
import { userProfile } from '../database/schema';
import { eq } from 'drizzle-orm';

class SyncService {
  private isSyncing = false;
  private lastSyncTime = 0;

  constructor() {
    this.init();
  }

  private init() {
    // Auto-sync on app foreground
    AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        this.syncAll();
      }
    });

    // Periodic background sync every 60 seconds when app is active
    setInterval(() => {
      this.syncAll();
    }, 60000);
  }

  /**
   * Main sync method: Synchronizes local profile stats & retrieves authoritative cloud balance
   */
  async syncAll(): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || this.isSyncing) {
      return false;
    }

    // Rate-limit sync to once every 10 seconds
    const now = Date.now();
    if (now - this.lastSyncTime < 10000) {
      return false;
    }

    this.isSyncing = true;
    this.lastSyncTime = now;

    try {
      await ensureAuthenticatedUser();
      const profile = await userRepository.getProfile();

      if (profile) {
        const rankInfo = getRankForLevel(profile.level || 1);
        const userName = profile.displayName || 'Hunter';
        const totalReps = ((profile.strength || 0) * 15) + ((profile.discipline || 0) * 20);
        const totalXP = profile.totalXP || (profile.currentXP || 0);

        // 1. Call secure server-authoritative sync RPC
        const { data: syncRes, error: syncErr } = await supabase.rpc('sync_hunter_profile_secure', {
          p_display_name: userName,
          p_avatar_icon: profile.avatarIcon || 'img_pfp_01',
          p_level: profile.level || 1,
          p_rank_code: rankInfo.rankCode,
          p_title: rankInfo.title,
          p_current_streak: profile.currentStreak || 0,
          p_total_reps: totalReps,
          p_total_xp: totalXP,
          p_cloud_coins: profile.coins || 0,
        });

        if (syncErr) {
          console.warn('[AutoSync] Server profile sync error:', syncErr.message);
        } else if (syncRes && syncRes.success) {
          const authCrystals = Number(syncRes.authoritative_mana_crystals);
          // Apply authoritative cloud crystal balance to local SQLite cache
          if (typeof authCrystals === 'number' && !isNaN(authCrystals)) {
            await db
              .update(userProfile)
              .set({ manaCrystals: authCrystals } as any)
              .where(eq(userProfile.id, profile.id));
          }
          console.log('[AutoSync] Profile & authoritative crystals synchronized!');
        }
      }

      // 2. Refresh pending payout status from Cloud (e.g. PAID or REJECTED)
      await payoutRepository.getUserRequests();

      return true;
    } catch (err) {
      console.warn('[AutoSync] Sync exception:', err);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();

