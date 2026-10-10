import { AppState } from "react-native";
import {
  supabase,
  isSupabaseConfigured,
  getCloudUserId,
  ensureAuthenticatedUser,
} from "./supabaseClient";
import { userRepository } from "../database/repositories/userRepository";
import { payoutRepository } from "../database/repositories/payoutRepository";
import { getRankForLevel } from "../constants/ranks";
import { db } from "../database/client";
import { userProfile } from "../database/schema";
import { eq } from "drizzle-orm";
import { logErrorToSentry } from "./sentryService";

class SyncService {
  private isSyncing = false;
  private lastSyncTime = 0;
  private appStateListener: { remove: () => void } | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (this.appStateListener || this.syncTimer) return;

    this.appStateListener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        this.syncAll();
      }
    });

    this.syncTimer = setInterval(() => {
      this.syncAll();
    }, 60000);
  }

  stop() {
    this.appStateListener?.remove();
    this.appStateListener = null;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
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
        const userName = profile.displayName || "Hunter";
        const totalReps =
          (profile.strength || 0) * 15 + (profile.discipline || 0) * 20;
        const totalXP = profile.totalXP || profile.currentXP || 0;

        // 1. Call secure server-authoritative sync RPC
        let syncRes: any = null;
        let syncErr: any = null;

        const call1 = await supabase.rpc("sync_hunter_profile_secure", {
          p_display_name: userName,
          p_level: profile.level || 1,
          p_rank_code: rankInfo.rankCode,
          p_title: rankInfo.title,
          p_current_streak: profile.currentStreak || 0,
          p_total_reps: totalReps,
          p_total_xp: totalXP,
          p_cloud_coins: profile.coins || 0,
        });

        if (
          call1.error &&
          (call1.error.message?.includes("schema cache") ||
            (call1.error as any).code === "PGRST202")
        ) {
          // Fallback to legacy signature in case Supabase schema cache hasn't reloaded
          const call2 = await supabase.rpc("sync_hunter_profile_secure", {
            p_display_name: userName,
            p_rank_code: rankInfo.rankCode,
            p_level: profile.level || 1,
            p_streak: profile.currentStreak || 0,
            p_total_reps: totalReps,
            p_total_xp: totalXP,
            p_cloud_coins: profile.coins || 0,
          });
          syncRes = call2.data;
          syncErr = call2.error;
        } else {
          syncRes = call1.data;
          syncErr = call1.error;
        }

        if (syncErr) {
          console.warn(
            "[AutoSync] Server profile sync error:",
            syncErr.message,
          );
          logErrorToSentry(new Error(syncErr.message), {
            module: "syncService",
            action: "sync_hunter_profile_secure",
            extra: { details: syncErr },
          });
        } else if (syncRes && syncRes.success) {
          const authCrystals = Number(
            syncRes.authoritative_mana_crystals ??
              syncRes.authoritative_crystals ??
              0,
          );
          // Apply authoritative cloud crystal balance to local SQLite cache
          if (typeof authCrystals === "number" && !isNaN(authCrystals)) {
            await db
              .update(userProfile)
              .set({ manaCrystals: authCrystals } as any)
              .where(eq(userProfile.id, profile.id));
          }
          console.log(
            "[AutoSync] Profile & authoritative crystals synchronized!",
          );
        }
      }

      // 2. Refresh pending payout status from Cloud (e.g. PAID or REJECTED)
      await payoutRepository.getUserRequests();

      return true;
    } catch (err) {
      console.warn("[AutoSync] Sync exception:", err);
      logErrorToSentry(err, { module: "syncService", action: "syncAll" });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();
