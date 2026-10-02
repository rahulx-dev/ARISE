import { db } from '../client';
import { userProfile, crystalRedemption, crystalTransaction } from '../schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { supabase, isSupabaseConfigured, getCloudUserId, ensureAuthenticatedUser } from '../../services/supabaseClient';
import { getRankForLevel } from '../../constants/ranks';
import { cloudSyncService } from '../../services/cloudSyncService';

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
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000 || !description.trim()) {
        return { success: false, newBalance: await this.getBalance() };
      }
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
                requestId: deterministicSourceId,
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
      const newBalance = await db.transaction(async (tx: any) => {
        const fresh = (await tx.select().from(userProfile).limit(1))[0];
        if (!fresh) return 0;
        const current = Number(fresh.manaCrystals) || 0;
        const requestId = deterministicSourceId;
        const existing = await tx.select().from(crystalTransaction)
          .where(eq(crystalTransaction.requestId, requestId)).limit(1);
        if (existing.length > 0) return current;
        const next = current + amount;
        await tx.update(userProfile).set({ manaCrystals: next } as any)
          .where(eq(userProfile.id, fresh.id));
        await tx.insert(crystalTransaction).values({
          amount, type: 'earn', description, gateId: gateId ?? null,
          timestamp: new Date().toISOString(), requestId,
        });
        return next;
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
      if (!Number.isSafeInteger(amount) || amount <= 0 || !description.trim()) return false;
      return await db.transaction(async (tx: any) => {
        const records = await tx.select().from(userProfile).limit(1);
        if (records.length === 0) return false;
        const profile = records[0];
        const currentCrystals = Number(profile.manaCrystals) || 0;
        if (currentCrystals < amount) return false;
        const updated = await tx.update(userProfile)
          .set({ manaCrystals: currentCrystals - amount } as any)
          .where(and(eq(userProfile.id, profile.id), gte(userProfile.manaCrystals, amount)));
        if (!updated || ((updated as any).changes ?? 1) === 0) return false;
        await tx.insert(crystalTransaction).values({
          amount: -amount, type: 'spend', description, gateId: null,
          timestamp: new Date().toISOString(), requestId: null,
        });
        return true;
      });
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
    idempotencyKey?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const destination = params.destination.trim().toLowerCase();
      if (!Number.isSafeInteger(params.amountInr) || params.amountInr < 25 || params.amountInr > 2000 ||
          !Number.isSafeInteger(params.crystalsSpent) || params.crystalsSpent !== params.amountInr * 10 ||
          !['UPI', 'AMAZON', 'GOOGLE_PLAY', 'COINS'].includes(params.method)) {
        return { success: false, error: 'Invalid redemption request' };
      }
      if (params.method === 'UPI' && !/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,32}$/.test(destination)) {
        return { success: false, error: 'Invalid UPI destination' };
      }
      if (params.method !== 'UPI' && params.method !== 'COINS' && destination.length < 6) {
        return { success: false, error: 'Invalid destination' };
      }
      const requestId = params.idempotencyKey?.trim() || `redemption:${Date.now()}:${Math.random().toString(36).slice(2)}`;

      // 1. Cloud-authoritative atomic redemption via RPC
      if (isSupabaseConfigured() && supabase) {
        try {
          await ensureAuthenticatedUser();
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_redemption_secure', {
            p_amount_inr: params.amountInr,
            p_crystals_spent: params.crystalsSpent,
            p_method: params.method,
            p_destination: destination,
            p_request_uuid: requestId,
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

            if (!rpcRes.already_processed) {
              const createdAt = new Date().toISOString();
              await db.insert(crystalTransaction).values({
                amount: -params.crystalsSpent,
                type: 'spend',
                description: `Redemption: ₹${params.amountInr} via ${params.method}`,
                gateId: null,
                timestamp: createdAt, requestId,
              });
              await db.insert(crystalRedemption).values({
                userId: 'default_user',
                amountInr: params.amountInr,
                crystalsSpent: params.crystalsSpent,
                method: params.method,
                destination,
                status: 'PENDING',
                createdAt, paidAt: null, requestId,
              });
            }

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
      const createdAt = new Date().toISOString();
      await db.transaction(async (tx: any) => {
        const existing = await tx.select().from(crystalRedemption)
          .where(eq(crystalRedemption.requestId, requestId)).limit(1);
        if (existing.length > 0) return;
        const recent = await tx.select().from(crystalRedemption)
          .where(eq(crystalRedemption.status, 'PENDING'));
        if (recent.length > 0) throw new Error('A redemption is already pending');
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const dailyTotal = (await tx.select().from(crystalRedemption)).reduce((sum: number, row: any) => {
          return sum + (Date.parse(row.createdAt) >= cutoff ? Number(row.amountInr) || 0 : 0);
        }, 0);
        if (dailyTotal + params.amountInr > 2000) throw new Error('Daily redemption limit reached');
        const profile = (await tx.select().from(userProfile).limit(1))[0];
        if (!profile || (profile.manaCrystals ?? 0) < params.crystalsSpent) {
          throw new Error('Insufficient Mana Crystals');
        }
        const updated = await tx.update(userProfile)
          .set({ manaCrystals: profile.manaCrystals - params.crystalsSpent } as any)
          .where(and(eq(userProfile.id, profile.id), gte(userProfile.manaCrystals, params.crystalsSpent)));
        if (!updated || ((updated as any).changes ?? 1) === 0) throw new Error('Failed to process crystal deduction');
        await tx.insert(crystalTransaction).values({
          amount: -params.crystalsSpent, type: 'spend',
          description: `Redemption: ₹${params.amountInr} via ${params.method}`,
          gateId: null, timestamp: createdAt, requestId,
        });
        await tx.insert(crystalRedemption).values({
          userId: 'default_user', amountInr: params.amountInr,
          crystalsSpent: params.crystalsSpent, method: params.method,
          destination, status: 'PENDING', createdAt, paidAt: null, requestId,
        });
      });

      await cloudSyncService.enqueueCashoutSync({
        requestId,
        amountInr: params.amountInr,
        crystalsSpent: params.crystalsSpent,
        method: params.method,
        destination,
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
