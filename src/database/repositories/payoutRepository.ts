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

      // H7/H58: when Supabase is configured, the server RPC is
      // AUTHORITATIVE — it enforces the fixed 100-coins = ₹1 rate,
      // locks the wallet, checks the server balance, writes a
      // coin_ledger SPEND, and inserts the PENDING request. The old
      // code did a direct `payout_requests` INSERT, which is
      // RLS-denied (no INSERT policy) and enforced no rate at all.
      // RPC-first: if it fails, nothing is deducted anywhere.
      let serverProcessed = false;
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.rpc('request_payout_secure', {
          p_amount_inr: amountInr,
          p_coins_spent: coinsSpent,
          p_upi_id: trimmedUpi,
          p_request_id: requestId,
        });
        if (error || !data?.success) {
          return {
            success: false,
            error: error?.message || (data as any)?.error || 'Payout request failed.',
          };
        }
        serverProcessed = true;
        if ((data as any).already_processed) {
          // Server already has this request (retry) — nothing more to do.
          return { success: true };
        }
      }

      // Local mirror (and local-only path when Supabase is off):
      // deduction, pass consumption, and request insertion commit together.
      // The previous sequence could lose coins if insertion failed,
      // and two callers could both pass the pending check.
      try {
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
      } catch (mirrorErr: any) {
        // If the server already processed the payout, the request is
        // real even though the local mirror failed — report success
        // (status sync will reconcile the local record).
        if (serverProcessed) {
          console.warn('[Payout] Local mirror failed after server success:', mirrorErr?.message);
          return { success: true };
        }
        throw mirrorErr;
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
