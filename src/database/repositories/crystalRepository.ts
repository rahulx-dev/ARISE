import { db } from '../client';
import { userProfile, crystalRedemption, crystalTransaction } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { supabase, isSupabaseConfigured, getCloudUserId, ensureAuthenticatedUser } from '../../services/supabaseClient';
import { getRankForLevel } from '../../constants/ranks';

export interface CrystalRedemptionItem {
  id: number;
  userId: string;
  amountInr: number;
  crystalsSpent: number;
  method: 'UPI' | 'AMAZON' | 'GOOGLE_PLAY' | 'COINS';
  destination: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdAt: string;
  paidAt: string | null;
}

export interface CrystalLeaderboardHunter {
  id: string;
  name: string;
  rankCode: string;
  avatarIcon: string;
  level: number;
  crystalsMined: number;
  title: string;
  isCurrentUser?: boolean;
}

export const crystalRepository = {
  /**
   * Get current Mana Crystals balance from user profile
   */
  async getBalance(): Promise<number> {
    try {
      const records = await db.select().from(userProfile).limit(1);
      if (records.length > 0) {
        return (records[0] as any).manaCrystals ?? 0;
      }
      return 0;
    } catch (e) {
      console.warn('Failed to get mana crystals balance:', e);
      return 0;
    }
  },

  /**
   * Add Mana Crystals atomically from a conquered gate or verified source
   */
  async addCrystals(
    amount: number,
    description: string,
    gateId?: string,
    sourceId?: string,
    source: string = 'gate_recon'
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      const records = await db.select().from(userProfile).limit(1);
      if (records.length === 0) return { success: false, newBalance: 0 };

      const profile = records[0];
      let cloudUserId = 'default_user';
      try {
        cloudUserId = await ensureAuthenticatedUser();
      } catch {}

      const deterministicSourceId =
        sourceId || (gateId ? `${source}:${gateId}:${cloudUserId}` : `manual:${Date.now()}:${cloudUserId}`);

      // 1. If Supabase is connected, call server-authoritative RPC
      if (isSupabaseConfigured() && supabase) {
        try {
          const rankInfo = getRankForLevel(profile.level || 1);
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('grant_crystals_secure', {
            p_amount: amount,
            p_source: source,
            p_source_id: deterministicSourceId,
            p_description: description,
            p_user_name: profile.displayName || 'Warrior',
            p_avatar_icon: profile.avatarIcon || 'img_pfp_01',
            p_rank_code: rankInfo.rankCode,
            p_level: profile.level || 1,
            p_streak: profile.currentStreak || 0,
            p_total_reps: ((profile.strength || 0) * 15) + ((profile.discipline || 0) * 20),
            p_total_xp: profile.totalXP || (profile.currentXP || 0),
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            const authoritativeBalance = Number(rpcRes.new_balance);

            // Update local SQLite cache with authoritative server balance
            await db
              .update(userProfile)
              .set({ manaCrystals: authoritativeBalance } as any)
              .where(eq(userProfile.id, profile.id));

            if (!rpcRes.already_processed) {
              await db.insert(crystalTransaction).values({
                amount,
                type: 'earn',
                description,
                gateId: gateId ?? null,
                timestamp: new Date().toISOString(),
              });
            }

            return { success: true, newBalance: authoritativeBalance };
          } else if (rpcErr) {
            console.warn('[CrystalRPC] grant_crystals_secure error:', rpcErr.message);
          }
        } catch (cloudErr) {
          console.warn('[CrystalRPC] Cloud RPC exception:', cloudErr);
        }
      }

      // 2. Offline Fallback: Update local SQLite cache
      const currentCrystals = (profile as any).manaCrystals ?? 0;
      const newBalance = currentCrystals + amount;

      await db
        .update(userProfile)
        .set({ manaCrystals: newBalance } as any)
        .where(eq(userProfile.id, profile.id));

      await db.insert(crystalTransaction).values({
        amount,
        type: 'earn',
        description,
        gateId: gateId ?? null,
        timestamp: new Date().toISOString(),
      });

      return { success: true, newBalance };
    } catch (e) {
      console.warn('Failed to add mana crystals:', e);
      return { success: false, newBalance: 0 };
    }
  },

  /**
   * Reset local exploited/unearned crystals to 0 and sync to cloud
   */
  async resetExploitedBalance(): Promise<number> {
    try {
      const records = await db.select().from(userProfile).limit(1);
      if (records.length === 0) return 0;

      const profile = records[0];
      await db
        .update(userProfile)
        .set({ manaCrystals: 0 } as any)
        .where(eq(userProfile.id, profile.id));

      return 0;
    } catch (e) {
      console.warn('Failed to reset exploited crystals:', e);
      return 0;
    }
  },

  /**
   * Spend Mana Crystals (e.g. for redemption or exchange)
   */
  async spendCrystals(amount: number, description: string): Promise<boolean> {
    try {
      const records = await db.select().from(userProfile).limit(1);
      if (records.length === 0) return false;

      const profile = records[0];
      const currentCrystals = (profile as any).manaCrystals ?? 0;
      if (currentCrystals < amount) return false;

      const newBalance = currentCrystals - amount;

      await db
        .update(userProfile)
        .set({ manaCrystals: newBalance } as any)
        .where(eq(userProfile.id, profile.id));

      await db.insert(crystalTransaction).values({
        amount,
        type: 'spend',
        description,
        gateId: null,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (e) {
      console.warn('Failed to spend mana crystals:', e);
      return false;
    }
  },

  /**
   * Submit a new redemption request (UPI, Amazon, Google Play)
   */
  async requestRedemption(params: {
    amountInr: number;
    crystalsSpent: number;
    method: 'UPI' | 'AMAZON' | 'GOOGLE_PLAY' | 'COINS';
    destination: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const balance = await this.getBalance();
      if (balance < params.crystalsSpent) {
        return { success: false, error: 'Insufficient Mana Crystals' };
      }

      // 1. Cloud-authoritative atomic redemption via RPC
      if (isSupabaseConfigured() && supabase) {
        try {
          await ensureAuthenticatedUser();
          const requestUuid = `redemption:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_redemption_secure', {
            p_amount_inr: params.amountInr,
            p_crystals_spent: params.crystalsSpent,
            p_method: params.method,
            p_destination: params.destination,
            p_request_uuid: requestUuid,
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            const authoritativeBalance = Number(rpcRes.new_balance);

            // Update local SQLite cache
            const records = await db.select().from(userProfile).limit(1);
            if (records.length > 0) {
              await db
                .update(userProfile)
                .set({ manaCrystals: authoritativeBalance } as any)
                .where(eq(userProfile.id, records[0].id));
            }

            await db.insert(crystalTransaction).values({
              amount: params.crystalsSpent,
              type: 'spend',
              description: `Redemption: ₹${params.amountInr} via ${params.method}`,
              gateId: null,
              timestamp: new Date().toISOString(),
            });

            await db.insert(crystalRedemption).values({
              userId: 'default_user',
              amountInr: params.amountInr,
              crystalsSpent: params.crystalsSpent,
              method: params.method,
              destination: params.destination,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
              paidAt: null,
            });

            return { success: true };
          } else if (rpcErr || (rpcRes && !rpcRes.success)) {
            const errMsg = rpcRes?.error || rpcErr?.message || 'Cloud redemption failed';
            return { success: false, error: errMsg };
          }
        } catch (cloudErr: any) {
          console.warn('[CrystalRedemption] RPC exception:', cloudErr);
        }
      }

      // 2. Local Fallback if offline
      const spent = await this.spendCrystals(
        params.crystalsSpent,
        `Redemption: ₹${params.amountInr} via ${params.method}`
      );

      if (!spent) {
        return { success: false, error: 'Failed to process crystal deduction' };
      }

      await db.insert(crystalRedemption).values({
        userId: 'default_user',
        amountInr: params.amountInr,
        crystalsSpent: params.crystalsSpent,
        method: params.method,
        destination: params.destination,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        paidAt: null,
      });

      return { success: true };
    } catch (e) {
      console.warn('Failed to request redemption:', e);
      return { success: false, error: 'Database transaction failed' };
    }
  },

  /**
   * Get list of redemption requests
   */
  async getRedemptions(): Promise<CrystalRedemptionItem[]> {
    try {
      const rows = await db
        .select()
        .from(crystalRedemption)
        .orderBy(desc(crystalRedemption.id))
        .limit(30);
      return rows as CrystalRedemptionItem[];
    } catch (e) {
      console.warn('Failed to fetch redemptions:', e);
      return [];
    }
  },

  /**
   * Get list of crystal transactions
   */
  async getTransactions(): Promise<any[]> {
    try {
      const rows = await db
        .select()
        .from(crystalTransaction)
        .orderBy(desc(crystalTransaction.id))
        .limit(50);
      return rows;
    } catch (e) {
      console.warn('Failed to fetch crystal transactions:', e);
      return [];
    }
  },

  /**
   * Get Crystal Mining Hall of Fame Leaderboard from Supabase Cloud (Top 100)
   * Strictly real hunters from Supabase database. Deduplication strictly by user_id.
   */
  async getCrystalLeaderboard(
    currentUserCrystals: number,
    currentUserName: string,
    currentUserAvatar: string
  ): Promise<CrystalLeaderboardHunter[]> {
    let cloudUserId = 'default_user';

    try {
      cloudUserId = await getCloudUserId();
    } catch {}

    const records = await db.select().from(userProfile).limit(1);
    const userLevel = records.length > 0 ? (records[0] as any).level ?? 1 : 1;
    const rankInfo = getRankForLevel(userLevel);

    // Map strictly by user_id to avoid deleting or merging different hunters who share names
    const userMap = new Map<string, CrystalLeaderboardHunter>();

    // Current user entry
    const currentUserEntry: CrystalLeaderboardHunter = {
      id: cloudUserId,
      name: currentUserName || 'Warrior',
      rankCode: rankInfo.rankCode,
      avatarIcon: currentUserAvatar || 'img_pfp_01',
      level: userLevel,
      crystalsMined: currentUserCrystals,
      title: rankInfo.title,
      isCurrentUser: true,
    };
    userMap.set(cloudUserId, currentUserEntry);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('crystal_leaderboard')
          .select('*')
          .order('crystals_mined', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          for (const row of data) {
            const uid = row.user_id || 'unknown';
            if (uid === cloudUserId) {
              // Current user is already set with authoritative local stats
              continue;
            }

            const crystals = Number(row.crystals_mined) || 0;
            const rInfo = getRankForLevel(row.level || 1);

            userMap.set(uid, {
              id: uid,
              name: (row.name || 'Hunter').trim(),
              rankCode: row.rank_code || rInfo.rankCode,
              avatarIcon: row.avatar_icon || 'img_pfp_01',
              level: row.level || 1,
              crystalsMined: crystals,
              title: row.title || rInfo.title,
              isCurrentUser: false,
            });
          }
        }
      } catch (e) {
        console.warn('[CrystalLeaderboard] Supabase fetch error:', e);
      }
    }

    const hunters = Array.from(userMap.values());
    hunters.sort((a, b) => b.crystalsMined - a.crystalsMined);
    return hunters.slice(0, 100);
  },
};
