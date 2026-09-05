import { db } from '../client';
import { payoutRequest } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { userRepository } from './userRepository';
import { supabase, isSupabaseConfigured, getCloudUserId } from '../../services/supabaseClient';

export interface PayoutRequestItem {
  id: number;
  userId?: string;
  amountInr: number;
  coinsSpent: number;
  upiId: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  cloudSynced?: boolean;
}

export const payoutRepository = {
  async createRequest(amountInr: number, coinsSpent: number, upiId: string): Promise<boolean> {
    try {
      const user = await userRepository.getProfile();
      if (!user || user.coins < coinsSpent) {
        return false;
      }

      // 1. Deduct coins from user local balance
      const deducted = await userRepository.deductCoins(
        coinsSpent,
        `UPI Cashout INR ${amountInr}`,
        'payout'
      );

      if (!deducted) return false;

      // 2. Insert into local SQLite
      await db.insert(payoutRequest).values({
        amountInr,
        coinsSpent,
        upiId: upiId.trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      // 3. Sync to Supabase Cloud Database (Live Admin Dashboard)
      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          const { error } = await supabase.from('payout_requests').insert({
            user_id: cloudUserId,
            user_name: user.displayName || 'Warrior',
            amount_inr: amountInr,
            coins_spent: coinsSpent,
            upi_id: upiId.trim(),
            status: 'PENDING',
          });

          if (error) {
            console.warn('[PayoutCloudSync] Supabase push error:', error.message);
          } else {
            console.log('[PayoutCloudSync] Payout request successfully pushed to Supabase Cloud!');
          }
        } catch (cloudErr) {
          console.warn('[PayoutCloudSync] Offline queue warning:', cloudErr);
        }
      }

      return true;
    } catch (e) {
      console.error('Failed to create payout request:', e);
      return false;
    }
  },

  async getUserRequests(): Promise<PayoutRequestItem[]> {
    try {
      // If cloud is connected, fetch latest live status from Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          const { data } = await supabase
            .from('payout_requests')
            .select('*')
            .eq('user_id', cloudUserId)
            .order('id', { ascending: false });

          if (data && data.length > 0) {
            for (const item of data) {
              if (item.status === 'PAID') {
                await db
                  .update(payoutRequest)
                  .set({ status: 'PAID', paidAt: item.paid_at })
                  .where(eq(payoutRequest.upiId, item.upi_id));
              } else if (item.status === 'REJECTED') {
                await db
                  .update(payoutRequest)
                  .set({ status: 'REJECTED' })
                  .where(eq(payoutRequest.upiId, item.upi_id));
              }
            }
          }
        } catch (syncErr) {
          console.warn('[PayoutCloudSync] Could not refresh live cloud status:', syncErr);
        }
      }

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
