import { db } from '../client';
import { userProfile, crystalRedemption, crystalTransaction } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { supabase, isSupabaseConfigured, getCloudUserId } from '../../services/supabaseClient';
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
   * Add Mana Crystals atomically from a conquered gate
   */
  async addCrystals(
    amount: number,
    description: string,
    gateId?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      const records = await db.select().from(userProfile).limit(1);
      if (records.length === 0) return { success: false, newBalance: 0 };

      const profile = records[0];
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

      // Sync to Supabase Cloud crystal_leaderboard
      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          const rankInfo = getRankForLevel((profile as any).level ?? 1);
          const userName = (profile as any).displayName || 'Hunter';

          await supabase.from('crystal_leaderboard').upsert({
            user_id: cloudUserId,
            name: userName,
            avatar_icon: (profile as any).avatarIcon || 'img_pfp_01',
            rank_code: rankInfo.rankCode,
            level: (profile as any).level ?? 1,
            crystals_mined: newBalance,
            title: rankInfo.title,
            updated_at: new Date().toISOString(),
          });

          // Delete stale duplicate rows with same name but different user_id
          await supabase
            .from('crystal_leaderboard')
            .delete()
            .eq('name', userName)
            .neq('user_id', cloudUserId);
        } catch (cloudErr) {
          console.warn('[CrystalCloudSync] Sync error:', cloudErr);
        }
      }

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

      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          const userName = (profile as any).displayName || 'Hunter';
          const rankInfo = getRankForLevel((profile as any).level ?? 1);

          await supabase.from('crystal_leaderboard').upsert({
            user_id: cloudUserId,
            name: userName,
            avatar_icon: (profile as any).avatarIcon || 'img_pfp_01',
            rank_code: rankInfo.rankCode,
            level: (profile as any).level ?? 1,
            crystals_mined: 0,
            title: rankInfo.title,
            updated_at: new Date().toISOString(),
          });

          await supabase
            .from('crystal_leaderboard')
            .delete()
            .eq('name', userName)
            .neq('user_id', cloudUserId);
        } catch {}
      }

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

      // Sync redemption to Supabase Cloud for Admin Dashboard
      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          await supabase.from('crystal_redemptions').insert({
            user_id: cloudUserId,
            amount_inr: params.amountInr,
            crystals_spent: params.crystalsSpent,
            method: params.method,
            destination: params.destination,
            status: 'PENDING',
            created_at: new Date().toISOString(),
          });
        } catch (cloudErr) {
          console.warn('[CrystalRedemptionCloudSync] Sync warning:', cloudErr);
        }
      }

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
   * Strictly real hunters from Supabase database. Zero duplicates.
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

    const normalizedCurrentName = (currentUserName || 'Hunter').trim().toLowerCase();

    // Map by normalized name to guarantee 100% deduplication
    const nameMap = new Map<string, CrystalLeaderboardHunter>();

    // Current user entry is always authoritative for their slot
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
    nameMap.set(normalizedCurrentName, currentUserEntry);

    if (isSupabaseConfigured() && supabase) {
      try {
        // Clean any stale duplicate rows for current user in background
        if (currentUserName) {
          supabase
            .from('crystal_leaderboard')
            .delete()
            .eq('name', currentUserName)
            .neq('user_id', cloudUserId)
            .then(
              () => {},
              () => {}
            );
        }

        const { data, error } = await supabase
          .from('crystal_leaderboard')
          .select('*')
          .order('crystals_mined', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          for (const row of data) {
            const rowName = (row.name || 'Hunter').trim();
            const normalizedRowName = rowName.toLowerCase();

            // If this is current user (by ID or by name), skip (already added with local data)
            if (row.user_id === cloudUserId || normalizedRowName === normalizedCurrentName) {
              continue;
            }

            const crystals = Number(row.crystals_mined) || 0;
            const existing = nameMap.get(normalizedRowName);

            // Deduplicate: only store the highest crystal count for a unique hunter name
            if (!existing || crystals > existing.crystalsMined) {
              nameMap.set(normalizedRowName, {
                id: row.user_id,
                name: rowName,
                rankCode: row.rank_code || 'E',
                avatarIcon: row.avatar_icon || 'img_pfp_01',
                level: row.level || 1,
                crystalsMined: crystals,
                title: row.title || 'Hunter',
                isCurrentUser: false,
              });
            }
          }
        }
      } catch (e) {
        console.warn('[CrystalLeaderboard] Supabase fetch error:', e);
      }
    }

    const hunters = Array.from(nameMap.values());
    hunters.sort((a, b) => b.crystalsMined - a.crystalsMined);
    return hunters.slice(0, 100);
  },
};
