import { usePlayerStore } from '../stores/usePlayerStore';
import { coinRepository } from '../database/repositories/coinRepository';
import { CoinTransaction } from '../types';

export interface PurchaseResult {
  success: boolean;
  message?: string;
}

export const coinService = {
  earnCoins: async (amount: number, description: string, source: string): Promise<{ newBalance: number }> => {
    if (amount <= 0) throw new Error('Amount must be positive');
    
    const playerStore = usePlayerStore.getState();
    await playerStore.addCoins(amount, description, source);
    
    return { newBalance: playerStore.profile?.coins || 0 };
  },

  purchaseScreenTime: async (durationMinutes: number, coinCost: number): Promise<PurchaseResult> => {
    const playerStore = usePlayerStore.getState();
    const balance = playerStore.profile?.coins || 0;
    
    if (balance < coinCost) {
      return { success: false, message: 'Insufficient coins' };
    }
    
    const success = await playerStore.spendCoins(coinCost, `Screen time: ${durationMinutes} mins`);
    
    if (success) {
      return { success: true };
    }
    
    return { success: false, message: 'Transaction failed' };
  },

  getTransactionHistory: async (limit: number = 50): Promise<CoinTransaction[]> => {
    const records = await coinRepository.getTransactions(limit);
    return records.map((r) => ({
      id: r.id,
      amount: r.amount,
      type: r.type as 'earn' | 'spend',
      description: r.description,
      source: r.source,
      timestamp: r.timestamp,
    }));
  }
};
