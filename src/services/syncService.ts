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
import { db, expoDb } from "../database/client";
import { userProfile } from "../database/schema";
import { eq } from "drizzle-orm";
import { logErrorToSentry } from "./sentryService";

const LAST_SYNC_AT_KEY = "@arise_sync_last_sync";

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
          const updates: Record<string, any> = {};
          if (typeof authCrystals === "number" && !isNaN(authCrystals)) {
            updates.manaCrystals = authCrystals;
          }

          const authLevel = Number(syncRes.authoritative_level);
          if (!isNaN(authLevel) && authLevel > (profile.level || 1)) {
            updates.level = authLevel;
          }

          const authXP = Number(syncRes.authoritative_xp);
          if (!isNaN(authXP) && authXP > (profile.totalXP || 0)) {
            updates.totalXP = authXP;
          }

          const authStreak = Number(syncRes.authoritative_streak);
          // H42: never resurrect a broken streak. If the local streak
          // broke (no activity for > 1 day), the server value is stale
          // (it is client-fed GREATEST) — skip it and let streakService
          // reset. Only max-merge while the streak is unbroken.
          const lastActive = (profile as any).lastActiveDate as string | undefined;
          const daysSinceActive = lastActive
            ? (Date.now() - new Date(lastActive).getTime()) / 86400000
            : 0;
          const streakBroken = Number.isFinite(daysSinceActive) && daysSinceActive > 1;
          if (!streakBroken && !isNaN(authStreak) && authStreak > (profile.currentStreak || 0)) {
            updates.currentStreak = authStreak;
          }

          const authCoins = Number(syncRes.authoritative_coins);
          // H42: never resurrect spent coins. The server never sees
          // local spends (C3 ignores caller coin balances), so a
          // server value higher than local is STALE whenever the local
          // ledger has any transaction since the last sync (a spend
          // would be undone; an unsynced earn would be lost). Apply
          // the server value only when local was idle since last sync.
          if (!isNaN(authCoins) && authCoins !== (profile.coins || 0)) {
            let lastSyncAt = "";
            try {
              const row = (expoDb as any).getFirstSync(
                "SELECT val FROM arise_kv WHERE key = ?",
                [LAST_SYNC_AT_KEY],
              ) as { val: string } | null;
              lastSyncAt = row?.val || "";
            } catch {}
            let localTxSinceSync = 0;
            try {
              const row = (expoDb as any).getFirstSync(
                "SELECT COUNT(*) as c FROM coin_transaction WHERE timestamp > ?",
                [lastSyncAt || "1970-01-01T00:00:00.000Z"],
              ) as { c: number } | null;
              localTxSinceSync = Number(row?.c || 0);
            } catch {}
            if (localTxSinceSync === 0) {
              updates.coins = authCoins;
            }
          }

          if (
            syncRes.display_name &&
            typeof syncRes.display_name === "string" &&
            syncRes.display_name !== "Warrior" &&
            (!profile.displayName || profile.displayName === "Warrior")
          ) {
            updates.displayName = syncRes.display_name;
          }

          if (Object.keys(updates).length > 0) {
            await db
              .update(userProfile)
              .set(updates as any)
              .where(eq(userProfile.id, profile.id));

            try {
              const { usePlayerStore } = await import("../stores/usePlayerStore");
              await usePlayerStore.getState().loadProfile();
              const { achievementService } = await import("./achievementService");
              await achievementService.evaluateAchievements();
            } catch (storeErr) {
              console.warn("[AutoSync] Store refresh note:", storeErr);
            }
          }
          console.log(
            "[AutoSync] Profile & authoritative stats synchronized!",
          );
          // H42: advance the local-activity watermark. The next sync
          // applies the server coin value only if local had no
          // transactions after this point.
          try {
            (expoDb as any).runSync(
              "INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)",
              [LAST_SYNC_AT_KEY, new Date().toISOString()],
            );
          } catch {}
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
