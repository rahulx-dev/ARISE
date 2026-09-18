import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured, getCloudUserId } from './supabaseClient';
import { userRepository } from '../database/repositories/userRepository';
import { payoutRepository } from '../database/repositories/payoutRepository';
import { getRankForLevel } from '../constants/ranks';

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
   * Main sync method: Uploads local profile stats & pending payouts to Supabase
   * and downloads latest payout statuses & rankings.
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
      const cloudUserId = await getCloudUserId();
      const profile = await userRepository.getProfile();

      if (profile) {
        const rankInfo = getRankForLevel(profile.level || 1);
        const userName = profile.displayName || 'Hunter';
        const userCrystals = (profile as any).manaCrystals || 0;

        // 1. Sync User Wallet / Profile to Supabase
        const { error: walletError } = await supabase.from('user_wallets').upsert({
          user_id: cloudUserId,
          display_name: userName,
          cloud_coins: profile.coins || 0,
          total_earned: profile.totalXP || 0,
          last_synced_at: new Date().toISOString(),
        });

        if (walletError) {
          console.warn('[AutoSync] Wallet sync error:', walletError.message);
        } else {
          console.log('[AutoSync] Profile & coins synced to Supabase Cloud!');
        }

        // 2. Sync to crystal_leaderboard table for 100% authentic live leaderboard
        const { error: crystalError } = await supabase.from('crystal_leaderboard').upsert({
          user_id: cloudUserId,
          name: userName,
          avatar_icon: profile.avatarIcon || 'img_pfp_01',
          rank_code: rankInfo.rankCode,
          level: profile.level || 1,
          crystals_mined: userCrystals,
          title: rankInfo.title,
          updated_at: new Date().toISOString(),
        });

        if (crystalError) {
          console.warn('[AutoSync] Crystal leaderboard sync error:', crystalError.message);
        } else {
          console.log('[AutoSync] Crystal leaderboard live synced!');
        }
      }

      // 3. Refresh pending payout status from Cloud (e.g. PAID or REJECTED)
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
