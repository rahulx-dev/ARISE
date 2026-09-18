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

export interface PayoutResult {
  success: boolean;
  error?: string;
}

export const payoutRepository = {
  async createRequest(
    amountInr: number,
    coinsSpent: number,
    upiId: string,
    sponsorPassesUsed: number = 0
  ): Promise<PayoutResult> {
    try {
      // 1. Strict amount limits validation (Phase 6: Min ₹29, Max ₹1000)
      if (typeof amountInr !== 'number' || isNaN(amountInr) || !isFinite(amountInr)) {
        return { success: false, error: 'Invalid cashout amount.' };
      }
      if (amountInr < 29 || amountInr > 1000) {
        return { success: false, error: 'Cashout amount must be between ₹29 and ₹1,000.' };
      }
      if (typeof coinsSpent !== 'number' || isNaN(coinsSpent) || coinsSpent <= 0) {
        return { success: false, error: 'Invalid coins amount.' };
      }

      // 2. UPI format validation
      const trimmedUpi = upiId?.trim();
      if (!trimmedUpi || !trimmedUpi.includes('@') || trimmedUpi.length < 5) {
        return { success: false, error: 'Please enter a valid UPI ID (e.g. name@upi).' };
      }

      // 3. User balance verification
      const user = await userRepository.getProfile();
      if (!user) {
        return { success: false, error: 'Hunter profile not found.' };
      }
      if (user.coins < coinsSpent) {
        return {
          success: false,
          error: `Insufficient Coins. You need ${coinsSpent.toLocaleString()} Coins (Current: ${user.coins.toLocaleString()}).`,
        };
      }
      if ((user.sponsorPasses ?? 0) < sponsorPassesUsed) {
        return { success: false, error: 'Insufficient sponsor passes.' };
      }

      // 4. Duplicate pending check
      const recentPending = await db
        .select()
        .from(payoutRequest)
        .where(eq(payoutRequest.status, 'PENDING'))
        .limit(20);

      const isDuplicate = recentPending.some(
        (r) => r.upiId.toLowerCase() === trimmedUpi.toLowerCase() && r.amountInr === amountInr
      );
      if (isDuplicate) {
        return {
          success: false,
          error: 'A pending cashout request for this amount and UPI ID already exists.',
        };
      }

      // 5. Deduct coins from user local balance
      const deducted = await userRepository.deductCoins(
        coinsSpent,
        `UPI Cashout INR ${amountInr}`,
        'payout'
      );

      if (!deducted) {
        return { success: false, error: 'Failed to process coin deduction.' };
      }

      // 6. Consume sponsor passes
      if (sponsorPassesUsed > 0) {
        await userRepository.consumeSponsorPasses(sponsorPassesUsed);
      }

      // 7. Insert into local SQLite
      await db.insert(payoutRequest).values({
        amountInr,
        coinsSpent,
        upiId: trimmedUpi,
        sponsorPassesUsed,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      // 8. Sync to Supabase Cloud Database (Live Admin Dashboard)
      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          const { error } = await supabase.from('payout_requests').insert({
            user_id: cloudUserId,
            user_name: user.displayName || 'Warrior',
            amount_inr: amountInr,
            coins_spent: coinsSpent,
            upi_id: trimmedUpi,
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

      return { success: true };
    } catch (e: any) {
      console.error('Failed to create payout request:', e);
      return { success: false, error: e?.message || 'Failed to process payout request.' };
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
