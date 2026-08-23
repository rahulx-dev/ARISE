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

      await tx
        .update(userProfile)
        .set({
          coins: profile.coins + amount,
          totalCoinsEarned: profile.totalCoinsEarned + amount,
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

        const updates: any = {
          coins: profile.coins + rewardCoins,
          totalCoinsEarned: profile.totalCoinsEarned + rewardCoins,
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
          amount: rewardCoins,
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
      const today = new Date().toISOString().split('T')[0];

      if (profile.lastActiveDate === today) {
        return; // Already active today
      }

      let newStreak = profile.currentStreak;
      if (profile.lastActiveDate) {
        const lastActive = new Date(profile.lastActiveDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (
          lastActive.toISOString().split('T')[0] ===
          yesterday.toISOString().split('T')[0]
        ) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const newLongest = Math.max(newStreak, profile.longestStreak);

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
