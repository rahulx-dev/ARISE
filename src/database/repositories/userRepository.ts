import { db } from '../client';
import { userProfile, coinTransaction, quest, screenTimeSession } from '../schema';
import { eq } from 'drizzle-orm';

type UserProfile = typeof userProfile.$inferSelect;
type UpdateProfileParams = Partial<typeof userProfile.$inferInsert>;

export const userRepository = {
  async getProfile(): Promise<UserProfile | undefined> {
    const results = await db.select().from(userProfile).limit(1);
    return results[0];
  },

  async updateProfile(updates: UpdateProfileParams): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;
    await db.update(userProfile).set(updates).where(eq(userProfile.id, profile.id));
  },

  async addXP(amount: number): Promise<void> {
    await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      let newXP = profile.currentXP + amount;
      const newTotalXP = profile.totalXP + amount;
      let currentLevel = profile.level;

      let requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));

      while (newXP >= requiredXP) {
        newXP -= requiredXP;
        currentLevel += 1;
        requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
      }

      await tx
        .update(userProfile)
        .set({
          currentXP: newXP,
          totalXP: newTotalXP,
          level: currentLevel,
        })
        .where(eq(userProfile.id, profile.id));
    });
  },

  async addCoins(amount: number, description: string, source: string): Promise<void> {
    await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      const isAd = source === 'ad' || source === 'sponsor_video' || source.includes('ad');
      const currentPasses = profile.sponsorPasses ?? 0;

      await tx
        .update(userProfile)
        .set({
          coins: profile.coins + amount,
          totalCoinsEarned: profile.totalCoinsEarned + amount,
          sponsorPasses: isAd ? currentPasses + 1 : currentPasses,
        })
        .where(eq(userProfile.id, profile.id));

      await tx.insert(coinTransaction).values({
        amount,
        type: 'earn',
        description,
        source,
        timestamp: new Date().toISOString(),
      });
    });
  },

  async getSponsorPasses(): Promise<number> {
    const profile = await this.getProfile();
    return profile?.sponsorPasses ?? 0;
  },

  async addSponsorPass(count: number = 1): Promise<number> {
    return await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return 0;
      const profile = results[0];
      const newPasses = (profile.sponsorPasses ?? 0) + count;
      await tx
        .update(userProfile)
        .set({ sponsorPasses: newPasses })
        .where(eq(userProfile.id, profile.id));
      return newPasses;
    });
  },

  async consumeSponsorPasses(count: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return false;
      const profile = results[0];
      const current = profile.sponsorPasses ?? 0;
      if (current < count) return false;
      await tx
        .update(userProfile)
        .set({ sponsorPasses: current - count })
        .where(eq(userProfile.id, profile.id));
      return true;
    });
  },

  async spendCoins(amount: number, description: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return false;

      const profile = results[0];
      if (profile.coins < amount) {
        return false;
      }

      await tx
        .update(userProfile)
        .set({
          coins: profile.coins - amount,
        })
        .where(eq(userProfile.id, profile.id));

      await tx.insert(coinTransaction).values({
        amount: -amount,
        type: 'spend',
        description,
        source: 'store',
        timestamp: new Date().toISOString(),
      });

      return true;
    });
  },

  async deductCoins(amount: number, description: string, source: string = 'store'): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return false;

      const profile = results[0];
      if (profile.coins < amount) {
        return false;
      }

      await tx
        .update(userProfile)
        .set({
          coins: profile.coins - amount,
        })
        .where(eq(userProfile.id, profile.id));

      await tx.insert(coinTransaction).values({
        amount: -amount,
        type: 'spend',
        description,
        source,
        timestamp: new Date().toISOString(),
      });

      return true;
    });
  },


  async purchaseScreenTimeAtomically(
    coinCost: number,
    sessionData: Omit<typeof screenTimeSession.$inferInsert, 'id'>,
    description: string
  ): Promise<{ success: boolean; error?: string; session?: any }> {
    return await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) {
        return { success: false, error: 'User profile not found.' };
      }

      const profile = results[0];
      if (profile.coins < coinCost) {
        return {
          success: false,
          error: `Insufficient Coins. You need ${coinCost} Coins (Current Balance: ${profile.coins} Coins).`,
        };
      }

      // 1. Deduct coins
      await tx
        .update(userProfile)
        .set({ coins: profile.coins - coinCost })
        .where(eq(userProfile.id, profile.id));

      // 2. Insert transaction
      await tx.insert(coinTransaction).values({
        amount: -coinCost,
        type: 'spend',
        description,
        source: 'shop_purchase',
        timestamp: new Date().toISOString(),
      });

      // 3. Create screen time session
      const insertedSession = await tx
        .insert(screenTimeSession)
        .values(sessionData)
        .returning();

      return {
        success: true,
        session: insertedSession[0] || sessionData,
      };
    });
  },

  async completeQuestAndGrantRewards(
    questId: number,
    rewardCoins: number,
    rewardXP: number,
    statType?: 'strength' | 'discipline' | 'focus' | 'health' | 'knowledge'
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const qRows = await tx
        .select()
        .from(quest)
        .where(eq(quest.id, questId))
        .limit(1);
      if (qRows.length === 0 || qRows[0].completed === 1) {
        return false; // Already completed or not found
      }

      // 1. Mark quest completed
      await tx.update(quest).set({ completed: 1 }).where(eq(quest.id, questId));

      // 2. Add Coins & XP to User
      const pRows = await tx.select().from(userProfile).limit(1);
      if (pRows.length > 0) {
        const profile = pRows[0];
        let newXP = profile.currentXP + rewardXP;
        const newTotalXP = profile.totalXP + rewardXP;
        let currentLevel = profile.level;
        let requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));

        while (newXP >= requiredXP) {
          newXP -= requiredXP;
          currentLevel += 1;
          requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
        }

        const finalCoins = Math.max(0, rewardCoins);
        const updates: any = {
          coins: profile.coins + finalCoins,
          totalCoinsEarned: profile.totalCoinsEarned + finalCoins,
          currentXP: newXP,
          totalXP: newTotalXP,
          level: currentLevel,
        };

        if (statType && typeof profile[statType] === 'number') {
          updates[statType] = profile[statType] + 1;
        }

        await tx.update(userProfile).set(updates).where(eq(userProfile.id, profile.id));

        // 3. Insert transaction
        await tx.insert(coinTransaction).values({
          amount: finalCoins,
          type: 'earn',
          description: `Completed Quest: ${qRows[0].title}`,
          source: 'quest_reward',
          timestamp: new Date().toISOString(),
        });
      }

      return true;
    });
  },

  async updateStat(
    statName: 'strength' | 'discipline' | 'focus' | 'health' | 'knowledge',
    amount: number
  ): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;

    const updatePayload: Partial<typeof userProfile.$inferInsert> = {};
    updatePayload[statName] = profile[statName] + amount;

    await db.update(userProfile).set(updatePayload).where(eq(userProfile.id, profile.id));
  },

  async updateStreak(): Promise<void> {
    await db.transaction(async (tx) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const getLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const today = getLocalDateStr(now);

      const lastActiveDateStr = profile.lastActiveDate ? profile.lastActiveDate.split('T')[0] : null;

      if (lastActiveDateStr === today) {
        return; // Already active today
      }

      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterday = getLocalDateStr(yesterdayDate);

      let newStreak = 1;
      if (lastActiveDateStr === yesterday) {
        newStreak = (profile.currentStreak || 0) + 1;
      } else if (lastActiveDateStr && lastActiveDateStr < yesterday) {
        newStreak = 1; // streak reset
      }

      const newLongest = Math.max(newStreak, profile.longestStreak || 0);

      await tx
        .update(userProfile)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
        })
        .where(eq(userProfile.id, profile.id));
    });
  },


  async resetProfile(): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(userProfile);
      await tx.insert(userProfile).values({
        displayName: 'Warrior',
        level: 1,
        currentXP: 0,
        totalXP: 0,
        coins: 0,
        totalCoinsEarned: 0,
        currentStreak: 0,
        longestStreak: 0,
        strength: 0,
        discipline: 0,
        focus: 0,
        health: 0,
        knowledge: 0,
        createdAt: new Date().toISOString(),
      });
    });
  },
};
