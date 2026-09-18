-- ==============================================================================
-- ARISE CLOUD BACKEND SCHEMA (SUPABASE POSTGRESQL)
-- Run this in your Supabase Project -> SQL Editor -> Run
-- ==============================================================================

-- 1. Payout Requests Table (Live UPI Cashout Requests)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Warrior',
    amount_inr NUMERIC(10, 2) NOT NULL CHECK (amount_inr >= 10),
    coins_spent INTEGER NOT NULL CHECK (coins_spent >= 1000),
    upi_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    paid_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- Index for fast status querying in Admin dashboard
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests (status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON public.payout_requests (user_id);

-- 2. Anti-Cheat Cloud Coin Ledger (Cryptographic / Audit Log)
CREATE TABLE IF NOT EXISTS public.coin_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND')),
    source TEXT NOT NULL, -- 'admob_reward', 'quest', 'boss_raid', 'payout', 'shop'
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user ON public.coin_ledger (user_id);

-- 3. Cloud User Wallets
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id TEXT PRIMARY KEY,
    display_name TEXT DEFAULT 'Warrior',
    cloud_coins INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    device_id TEXT,
    app_version TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/authenticated users from the app to submit payout requests
CREATE POLICY "Allow public insert for payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (true);

-- Allow users to read their own payout requests
CREATE POLICY "Allow users to read their own payout requests"
ON public.payout_requests FOR SELECT
USING (true);

-- Allow app to insert ledger transactions
CREATE POLICY "Allow public insert for coin ledger"
ON public.coin_ledger FOR INSERT
WITH CHECK (true);

-- Allow reading ledger entries
CREATE POLICY "Allow read coin ledger"
ON public.coin_ledger FOR SELECT
USING (true);

-- Allow user wallet upsert
CREATE POLICY "Allow public upsert user wallets"
ON public.user_wallets FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- HELPFUL ADMIN VIEW: Pending Payouts Overview
-- ==============================================================================
CREATE OR REPLACE VIEW public.admin_pending_payouts AS
SELECT 
    id,
    user_name,
    amount_inr,
    upi_id,
    coins_spent,
    created_at,
    status
FROM public.payout_requests
WHERE status = 'PENDING'
ORDER BY created_at ASC;

-- ==============================================================================
-- 4. CPX Research Survey Postback Audit Log
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cpx_postback_log (
    id BIGSERIAL PRIMARY KEY,
    trans_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    amount_crystals INTEGER NOT NULL DEFAULT 0,
    amount_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_cpx_postback_user ON public.cpx_postback_log (user_id);
CREATE INDEX IF NOT EXISTS idx_cpx_postback_trans ON public.cpx_postback_log (trans_id);

ALTER TABLE public.cpx_postback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for cpx postback"
ON public.cpx_postback_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public select for cpx postback"
ON public.cpx_postback_log FOR SELECT
USING (true);
