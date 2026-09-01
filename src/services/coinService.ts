import { db } from '../database/client';
import { userProfile, coinTransaction } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { notificationService } from './notificationService';
import { historyService } from './historyService';

export interface CoinTx {
  id?: number;
  amount: number;
  type: 'earn' | 'spend';
  description: string;
  source: string;
  timestamp: string;
}

class CoinService {
  /**
   * Get authoritative coin balance from SQLite database
   */
  async getBalance(): Promise<number> {
    const results = await db.select().from(userProfile).limit(1);
    return results.length > 0 ? results[0].coins : 0;
  }

  /**
   * Add coins atomically with transaction logging
   */
  async addCoins(amount: number, description: string, source: string): Promise<number> {
    if (amount <= 0) return await this.getBalance();

    let newBalance = 0;
    const now = new Date().toISOString();

    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      newBalance = (profile.coins || 0) + amount;
      const newTotal = (profile.totalCoinsEarned || 0) + amount;

      await tx
        .update(userProfile)
        .set({
          coins: newBalance,
          totalCoinsEarned: newTotal,
        })
        .where(eq(userProfile.id, profile.id));

      await tx.insert(coinTransaction).values({
        amount,
        type: 'earn',
        description,
        source,
        timestamp: now,
      });
    });

    // Notify user of reward
    await notificationService.createNotification(
      'REWARD',
      'Coins Earned',
      `+${amount} Coins awarded for ${description}`,
      source
    );

    return newBalance;
  }

  /**
   * Spend coins atomically with balance validation (Prevents negative balance)
   */
  async spendCoins(amount: number, description: string, source = 'store'): Promise<boolean> {
    if (amount <= 0) return false;

    let success = false;
    const now = new Date().toISOString();

    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      if ((profile.coins || 0) < amount) {
        success = false;
        return;
      }

      const newBalance = profile.coins - amount;

      await tx
        .update(userProfile)
        .set({
          coins: newBalance,
        })
        .where(eq(userProfile.id, profile.id));

      await tx.insert(coinTransaction).values({
        amount: -amount,
        type: 'spend',
        description,
        source,
        timestamp: now,
      });

      success = true;
    });

    return success;
  }

  /**
   * Get real chronological transaction history
   */
  async getTransactions(limit = 20): Promise<CoinTx[]> {
    try {
      const rows = await db
        .select()
        .from(coinTransaction)
        .orderBy(desc(coinTransaction.id))
        .limit(limit);
      return rows as CoinTx[];
    } catch {
      return [];
    }
  }
}

export const coinService = new CoinService();
