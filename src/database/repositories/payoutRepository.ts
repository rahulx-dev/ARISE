import { db } from '../client';
import { payoutRequest, userProfile, coinTransaction } from '../schema';
import { eq, desc, and, gte } from 'drizzle-orm';
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
      const trimmedUpi = upiId.trim();

      // 1. Basic validation
      if (!trimmedUpi || !trimmedUpi.includes('@')) {
        return { success: false, error: 'Invalid UPI ID format. Must contain @ (e.g. name@upi)' };
      }

      if (amountInr <= 0 || coinsSpent <= 0) {
        return { success: false, error: 'Invalid payout amount.' };
      }

      // 2. Fetch fresh user profile
      const user = await userRepository.getProfile();
      if (!user) {
        return { success: false, error: 'User profile not found.' };
      }

      if (!Number.isSafeInteger(amountInr) || !Number.isSafeInteger(coinsSpent) ||
          amountInr <= 0 || coinsSpent <= 0 || !Number.isSafeInteger(sponsorPassesUsed) ||
          sponsorPassesUsed < 0) {
        return { success: false, error: 'Invalid payout amount.' };
      }

      // 3. Verify balance (the transaction below repeats this check under the
      // write lock; this check is only for a useful early error).
      if (user.coins < coinsSpent) {
        return { success: false, error: `Insufficient coins. You have ${user.coins.toLocaleString()} coins, but need ${coinsSpent.toLocaleString()}.` };
      }

      const createdAt = new Date().toISOString();
      const requestId = `payout:${Date.now()}:${Math.random().toString(36).slice(2)}`;

      // Deduction, pass consumption, and request insertion must commit
      // together. The previous sequence could lose coins if insertion failed,
      // and two callers could both pass the pending check.
      await db.transaction(async (tx: any) => {
        const pending = await tx.select().from(payoutRequest)
          .where(eq(payoutRequest.status, 'PENDING')).limit(1);
        if (pending.length > 0) throw new Error('A withdrawal request is already pending');

        const fresh = (await tx.select().from(userProfile).limit(1))[0];
        if (!fresh || fresh.coins < coinsSpent) throw new Error('Insufficient coins');
        if ((fresh.sponsorPasses ?? 0) < sponsorPassesUsed) {
          throw new Error('Insufficient sponsor passes');
        }
        await tx.update(userProfile).set({
          coins: fresh.coins - coinsSpent,
          sponsorPasses: (fresh.sponsorPasses ?? 0) - sponsorPassesUsed,
        }).where(and(eq(userProfile.id, fresh.id), gte(userProfile.coins, coinsSpent)));
        await tx.insert(coinTransaction).values({
          amount: -coinsSpent,
          type: 'spend',
          description: `UPI Cashout INR ${amountInr}`,
          source: 'payout',
          timestamp: createdAt,
          requestId,
        });
        await tx.insert(payoutRequest).values({
          amountInr, coinsSpent, upiId: trimmedUpi, sponsorPassesUsed,
          status: 'PENDING', createdAt, requestId,
        });
      });

      // Sync to Supabase Cloud Database (Live Admin Dashboard)
      if (isSupabaseConfigured() && supabase) {
        try {
          const cloudUserId = await getCloudUserId();
          const { error } = await supabase.from('payout_requests').insert({
            user_id: cloudUserId,
            user_name: user.displayName || 'Warrior',
            amount_inr: amountInr,
            coins_spent: coinsSpent,
            upi_id: trimmedUpi,
            request_id: requestId,
            status: 'PENDING',
            created_at: createdAt,
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
              const condition = item.created_at
                ? and(eq(payoutRequest.upiId, item.upi_id), eq(payoutRequest.createdAt, item.created_at))
                : and(eq(payoutRequest.upiId, item.upi_id), eq(payoutRequest.amountInr, Number(item.amount_inr)));

              if (item.status === 'PAID') {
                await db
                  .update(payoutRequest)
                  .set({ status: 'PAID', paidAt: item.paid_at })
                  .where(condition);
              } else if (item.status === 'REJECTED') {
                await db
                  .update(payoutRequest)
                  .set({ status: 'REJECTED' })
                  .where(condition);
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

      if (req.length === 0 || req[0].status !== 'PENDING') {
        return false;
      }

      if (refundCoins) {
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
