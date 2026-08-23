import { db } from '../client';
import { coinTransaction, userProfile } from '../schema';
import { eq, desc, like } from 'drizzle-orm';

export const coinRepository = {
  async getTransactions(limit: number = 50) {
    return await db.select()
      .from(coinTransaction)
      .orderBy(desc(coinTransaction.timestamp))
      .limit(limit);
  },

  async getTransactionsByDate(date: string) {
    return await db.select()
      .from(coinTransaction)
      .where(like(coinTransaction.timestamp, `${date}%`))
      .orderBy(desc(coinTransaction.timestamp));
  },

  async getBalance(): Promise<number> {
    const result = await db.select({ coins: userProfile.coins }).from(userProfile).limit(1);
    return result.length > 0 ? result[0].coins : 0;
  },

  async getTotalEarned(): Promise<number> {
    const result = await db.select({ totalCoinsEarned: userProfile.totalCoinsEarned }).from(userProfile).limit(1);
    return result.length > 0 ? result[0].totalCoinsEarned : 0;
  },

  async recordTransaction(amount: number, type: 'earn' | 'spend', description: string, source: string): Promise<void> {
    await db.insert(coinTransaction).values({
      amount,
      type,
      description,
      source,
      timestamp: new Date().toISOString(),
    });
  }
};
