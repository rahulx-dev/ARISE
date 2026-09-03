import { db } from '../client';
import { payoutRequest } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { userRepository } from './userRepository';

export interface PayoutRequestItem {
  id: number;
  userId: string;
  amountInr: number;
  coinsSpent: number;
  upiId: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export const payoutRepository = {
  async createRequest(amountInr: number, coinsSpent: number, upiId: string): Promise<boolean> {
    try {
      const user = await userRepository.getProfile();
      if (!user || user.coins < coinsSpent) {
        return false;
      }

      // Deduct coins from user balance
      const deducted = await userRepository.deductCoins(
        coinsSpent,
        `UPI Cashout INR ${amountInr}`,
        'payout'
      );

      if (!deducted) return false;

      // Insert payout request
      await db.insert(payoutRequest).values({
        amountInr,
        coinsSpent,
        upiId: upiId.trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      return true;
    } catch (e) {
      console.error('Failed to create payout request:', e);
      return false;
    }
  },

  async getUserRequests(): Promise<PayoutRequestItem[]> {
    try {
      const rows = await db
        .select()
        .from(payoutRequest)
        .orderBy(desc(payoutRequest.id));
      return rows as PayoutRequestItem[];
    } catch {
      return [];
    }
  },

  async getAllPendingRequests(): Promise<PayoutRequestItem[]> {
    try {
      const rows = await db
        .select()
        .from(payoutRequest)
        .where(eq(payoutRequest.status, 'PENDING'))
        .orderBy(desc(payoutRequest.id));
      return rows as PayoutRequestItem[];
    } catch {
      return [];
    }
  },

  async markAsPaid(id: number): Promise<boolean> {
    try {
      await db
        .update(payoutRequest)
        .set({
          status: 'PAID',
          paidAt: new Date().toISOString(),
        })
        .where(eq(payoutRequest.id, id));
      return true;
    } catch {
      return false;
    }
  },

  async markAsRejected(id: number, refundCoins: boolean = true): Promise<boolean> {
    try {
      const req = await db
        .select()
        .from(payoutRequest)
        .where(eq(payoutRequest.id, id))
        .limit(1);

      if (req.length > 0 && refundCoins) {
        await userRepository.addCoins(
          req[0].coinsSpent,
          `Refund: UPI Cashout INR ${req[0].amountInr}`,
          'refund'
        );
      }

      await db
        .update(payoutRequest)
        .set({ status: 'REJECTED' })
        .where(eq(payoutRequest.id, id));

      return true;
    } catch {
      return false;
    }
  },
};
