-- ==============================================================================
-- ARISE CLOUD BACKEND SCHEMA & SECURE RPC SYSTEM (SUPABASE POSTGRESQL)
-- ==============================================================================

-- 1. Anti-Cheat Cloud Crystal Ledger (Database-Enforced Idempotency)
CREATE TABLE IF NOT EXISTS public.crystal_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND')),
    source TEXT NOT NULL, -- 'gate_recon', 'red_gate', 'cpx_survey', 'bitlabs_survey', 'redemption'
    source_id TEXT NOT NULL, -- Canonical idempotency key (e.g. 'recon:e_mobile:user_1', 'redgate:rg_1:user_1', 'cpx:tx_1:user_1')
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_crystal_ledger_event UNIQUE (source, source_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crystal_ledger_user ON public.crystal_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_crystal_ledger_source ON public.crystal_ledger (source, source_id);

-- 2. Anti-Cheat Cloud Coin Ledger (In-game Currency Ledger)
CREATE TABLE IF NOT EXISTS public.coin_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND')),
    source TEXT NOT NULL, -- 'quest', 'workout', 'boss_raid', 'payout', 'shop'
    source_id TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user ON public.coin_ledger (user_id);

-- 3. Private User Wallets (Authoritative Account & Currency State - PRIVATE)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id TEXT PRIMARY KEY,
    display_name TEXT DEFAULT 'Warrior',
    rank_code TEXT DEFAULT 'E',
    level INTEGER NOT NULL DEFAULT 1,
    streak INTEGER NOT NULL DEFAULT 0,
    total_reps INTEGER NOT NULL DEFAULT 0,
    total_xp INTEGER NOT NULL DEFAULT 0,
    cloud_coins INTEGER NOT NULL DEFAULT 0,
    mana_crystals INTEGER NOT NULL DEFAULT 0 CHECK (mana_crystals >= 0),
    device_id TEXT,
    app_version TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_synced ON public.user_wallets (last_synced_at);

-- 3b. Persistent Google Cloud Saves (Preserves game progression across app uninstalls & reinstalls)
CREATE TABLE IF NOT EXISTS public.user_cloud_saves (
    email TEXT PRIMARY KEY,
    display_name TEXT DEFAULT 'Warrior',
    avatar_icon TEXT DEFAULT 'img_pfp_01',
    backup_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);
-- M17: stable owner identity. Email is a mutable claim (it can change),
-- so new saves also record auth.uid(). The email policy stays for
-- backward compatibility with existing rows.
ALTER TABLE public.user_cloud_saves ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_user_cloud_saves_user ON public.user_cloud_saves (user_id);

CREATE INDEX IF NOT EXISTS idx_user_cloud_saves_updated ON public.user_cloud_saves (updated_at DESC);

-- Allow public access for client cloud saves
ALTER TABLE public.user_cloud_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write on user_cloud_saves" ON public.user_cloud_saves;
-- Idempotency: the DO block below drops all policies, but it runs AFTER
-- this CREATE. On re-run this policy already exists, so drop it first
-- (otherwise the script dies here with 42710 before reaching cleanup).
DROP POLICY IF EXISTS "Allow owner read-write on user_cloud_saves" ON public.user_cloud_saves;
CREATE POLICY "Allow owner read-write on user_cloud_saves"
ON public.user_cloud_saves
FOR ALL
USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

-- 4. Public Crystal & Hunter Leaderboard Projection (PUBLIC READ)
CREATE TABLE IF NOT EXISTS public.crystal_leaderboard (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Warrior',
    avatar_icon TEXT NOT NULL DEFAULT 'img_pfp_01',
    rank_code TEXT NOT NULL DEFAULT 'E',
    level INTEGER NOT NULL DEFAULT 1,
    streak INTEGER NOT NULL DEFAULT 0,
    total_reps INTEGER NOT NULL DEFAULT 0,
    total_xp INTEGER NOT NULL DEFAULT 0,
    crystals_mined INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT 'Hunter',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Existing installations may have an older leaderboard shape.  Add the
-- projection columns before creating indexes or replacing RPCs that reference
-- them; this is safe and preserves existing rows.
ALTER TABLE public.crystal_leaderboard
    ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Warrior',
    ADD COLUMN IF NOT EXISTS avatar_icon TEXT NOT NULL DEFAULT 'img_pfp_01',
    ADD COLUMN IF NOT EXISTS rank_code TEXT NOT NULL DEFAULT 'E',
    ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_reps INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS crystals_mined INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Hunter',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_crystal_leaderboard_crystals ON public.crystal_leaderboard (crystals_mined DESC);
CREATE INDEX IF NOT EXISTS idx_crystal_leaderboard_streak ON public.crystal_leaderboard (streak DESC);
CREATE INDEX IF NOT EXISTS idx_crystal_leaderboard_reps ON public.crystal_leaderboard (total_reps DESC);
CREATE INDEX IF NOT EXISTS idx_crystal_leaderboard_xp ON public.crystal_leaderboard (total_xp DESC);

-- Enable Supabase Realtime publication for leaderboard projection
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'crystal_leaderboard'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crystal_leaderboard;
    END IF;
END
$$;

-- 5. Crystal Redemptions Table (Mana Crystal Cashout Requests)
CREATE TABLE IF NOT EXISTS public.crystal_redemptions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_inr INTEGER NOT NULL CHECK (amount_inr >= 25),
    crystals_spent INTEGER NOT NULL CHECK (crystals_spent >= 250),
    method TEXT NOT NULL CHECK (method IN ('UPI', 'AMAZON', 'GOOGLE_PLAY', 'COINS')),
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    paid_at TIMESTAMPTZ,
    admin_notes TEXT
);

ALTER TABLE public.crystal_redemptions
    ADD COLUMN IF NOT EXISTS request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crystal_redemptions_request
    ON public.crystal_redemptions (user_id, request_id)
    WHERE request_id IS NOT NULL;
ALTER TABLE public.crystal_redemptions
    DROP CONSTRAINT IF EXISTS crystal_redemptions_minimum_amount;
ALTER TABLE public.crystal_redemptions
    ADD CONSTRAINT crystal_redemptions_minimum_amount CHECK (amount_inr >= 25);
ALTER TABLE public.crystal_redemptions
    DROP CONSTRAINT IF EXISTS crystal_redemptions_minimum_crystals;
ALTER TABLE public.crystal_redemptions
    ADD CONSTRAINT crystal_redemptions_minimum_crystals CHECK (crystals_spent >= 250);

CREATE INDEX IF NOT EXISTS idx_crystal_redemptions_user ON public.crystal_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_crystal_redemptions_status ON public.crystal_redemptions (status);

-- 6. Payout Requests Table (Coin UPI Cashouts)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Warrior',
    amount_inr NUMERIC(10, 2) NOT NULL CHECK (amount_inr >= 10),
    coins_spent INTEGER NOT NULL CHECK (coins_spent >= 1000),
    upi_id TEXT NOT NULL,
    request_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    paid_at TIMESTAMPTZ,
    admin_notes TEXT
);
ALTER TABLE public.payout_requests
    ADD COLUMN IF NOT EXISTS request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_requests_request
    ON public.payout_requests (user_id, request_id)
    WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests (status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON public.payout_requests (user_id);

-- 7. CPX Research Survey Postback Audit Log
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


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.crystal_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crystal_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crystal_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpx_postback_log ENABLE ROW LEVEL SECURITY;

-- Clean up any legacy or dashboard-generated overly permissive policies automatically
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('coin_ledger', 'crystal_redemptions', 'payout_requests', 'crystal_ledger', 'user_wallets', 'crystal_leaderboard', 'user_cloud_saves', 'cpx_postback_log')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 1. Crystal Ledger: Direct client modifications forbidden. Select allowed only for owner.
CREATE POLICY "crystal_ledger_select_owner" ON public.crystal_ledger
FOR SELECT USING (user_id = auth.uid()::text);

-- 2. Coin Ledger: Select allowed for owner.
CREATE POLICY "coin_ledger_select_owner" ON public.coin_ledger
FOR SELECT USING (user_id = auth.uid()::text);

-- 3. User Wallets: PRIVATE table. Direct public/anon updates to mana_crystals are forbidden.
-- Users can read only their own wallet.
CREATE POLICY "user_wallets_select_owner" ON public.user_wallets
FOR SELECT USING (user_id = auth.uid()::text);

-- 4. Crystal Leaderboard: PUBLIC read projection.
-- Direct UPDATE/DELETE by client is forbidden. Updated solely via SECURITY DEFINER functions.
CREATE POLICY "crystal_leaderboard_select_public" ON public.crystal_leaderboard
FOR SELECT USING (user_id IS NOT NULL);

-- 5. Crystal Redemptions: Users can SELECT only their own requests. Direct UPDATE is forbidden.
CREATE POLICY "crystal_redemptions_select_owner" ON public.crystal_redemptions
FOR SELECT USING (user_id = auth.uid()::text);

-- 6. Payout Requests: Users can SELECT only their own requests. Direct UPDATE is forbidden.
CREATE POLICY "payout_requests_select_owner" ON public.payout_requests
FOR SELECT USING (user_id = auth.uid()::text);

-- 7. CPX Postback: Internal only.
CREATE POLICY "cpx_postback_select_owner" ON public.cpx_postback_log
FOR SELECT USING (user_id = auth.uid()::text);

-- 8. User Cloud Saves: Owner read-write
-- M17: the email-keyed policy below is kept for backward compatibility
-- (existing rows are keyed by email), but email is a mutable claim.
-- New saves also carry auth.uid() in user_id, and the uid policy is the
-- stable owner identity going forward.
CREATE POLICY "user_cloud_saves_owner_rw" ON public.user_cloud_saves
FOR ALL
USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

CREATE POLICY "user_cloud_saves_owner_uid" ON public.user_cloud_saves
FOR ALL
USING (user_id IS NOT NULL AND user_id = auth.uid()::text)
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid()::text);

-- Drop any obsolete legacy function overloads that cause duplicate warnings in Supabase Linter
DROP FUNCTION IF EXISTS public.sync_hunter_profile_secure(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.sync_hunter_profile_secure(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);


-- ==============================================================================
-- ATOMIC SECURITY DEFINER PROCEDURES (RPC)
-- ==============================================================================

-- 1. grant_crystals_secure: Grants crystals ONLY for server-verified events.
-- SECURITY (C2): the server NEVER mints crystals from a client-asserted
-- completion. Only 'cpx_survey' is grantable, and only when a matching
-- server-recorded postback row exists in cpx_postback_log (written by the
-- CPX postback webhook, never by the client). 'gate_recon' / 'red_gate'
-- completions happen on-device and have no server-side verifier, so they
-- are REJECTED here; the client falls back to local-only crystals.
-- 'bitlabs_survey' is rejected until a Bitlabs postback log exists.
-- Enforces ledger idempotency, a per-user daily cap, updates the
-- authoritative wallet + leaderboard projection, triggers Realtime.
-- Identity is STRICTLY derived from authenticated auth.uid() session (zero client fallback).
CREATE OR REPLACE FUNCTION public.grant_crystals_secure(
    p_amount INTEGER,
    p_source TEXT,
    p_source_id TEXT,
    p_description TEXT,
    p_user_name TEXT DEFAULT 'Warrior',
    p_avatar_icon TEXT DEFAULT 'img_pfp_01',
    p_rank_code TEXT DEFAULT 'E',
    p_level INTEGER DEFAULT 1,
    p_streak INTEGER DEFAULT 0,
    p_total_reps INTEGER DEFAULT 0,
    p_total_xp INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id TEXT;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
    v_clean_rank TEXT;
    v_clean_level INTEGER;
    v_clean_streak INTEGER;
    v_clean_reps INTEGER;
    v_clean_xp INTEGER;
    v_postback_amount INTEGER := 0;
    v_today_earned INTEGER := 0;
    v_current_crystals INTEGER := 0;
    v_new_crystals INTEGER := 0;
    v_inserted_id BIGINT;
BEGIN
    -- 1. Determine & Authenticate User Identity STRICTLY from auth.uid()
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL OR length(trim(v_user_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated caller');
    END IF;

    -- 2. Clean & Sanitize Inputs
    -- M18: allowlists + length caps. Rank must be a known code (an
    -- arbitrary string could poison the leaderboard display); names and
    -- icon ids are capped so a crafted call cannot stuff huge values.
    v_clean_name := LEFT(COALESCE(NULLIF(trim(p_user_name), ''), 'Warrior'), 64);
    v_clean_avatar := LEFT(COALESCE(NULLIF(trim(p_avatar_icon), ''), 'img_pfp_01'), 64);
    v_clean_rank := CASE WHEN upper(trim(p_rank_code)) IN ('E','D','C','B','A','S','NATIONAL')
        THEN upper(trim(p_rank_code)) ELSE 'E' END;
    -- Sanity caps: progress fields are self-reported display data, never money.
    -- Cap them so a crafted call cannot stuff absurd values into the wallet.
    v_clean_level := LEAST(100, GREATEST(1, COALESCE(p_level, 1)));
    v_clean_streak := LEAST(3650, GREATEST(0, COALESCE(p_streak, 0)));
    v_clean_reps := LEAST(100000000, GREATEST(0, COALESCE(p_total_reps, 0)));
    v_clean_xp := LEAST(10000000, GREATEST(0, COALESCE(p_total_xp, 0)));

    -- 3. Enforce Server-Side Verification (C2). The amount is NEVER taken
    -- on the caller's word: it must be backed by a server-recorded event.
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid crystal reward amount');
    END IF;

    IF p_source IS NULL OR p_source_id IS NULL OR length(trim(p_source_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reward source');
    END IF;

    -- On-device completions have no server-side verifier: reject, do not mint.
    IF p_source = 'gate_recon' OR p_source = 'red_gate' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SERVER_VERIFICATION_REQUIRED: gate/red_gate crystal grants require a server-verified event; client-asserted completions cannot mint server crystals');
    END IF;

    IF p_source = 'bitlabs_survey' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SERVER_VERIFICATION_REQUIRED: bitlabs_survey has no server-side postback log yet');
    END IF;

    IF p_source <> 'cpx_survey' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reward source');
    END IF;

    -- CPX: the postback row must exist for THIS user + trans_id, be
    -- completed, and cover the requested amount. Callers must pass the
    -- raw CPX trans_id as p_source_id. The row is written by the CPX
    -- postback webhook (service_role), never by the client.
    SELECT amount_crystals INTO v_postback_amount
    FROM public.cpx_postback_log
    WHERE trans_id = trim(p_source_id)
      AND user_id = v_user_id
      AND status = 'completed';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No verified CPX postback for this transaction');
    END IF;

    IF p_amount > v_postback_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward exceeds the verified CPX postback amount');
    END IF;

    -- Daily cap (defense-in-depth): at most 5000 crystals/day/user.
    SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
    FROM public.crystal_ledger
    WHERE user_id = v_user_id
      AND type = 'EARN'
      AND created_at >= date_trunc('day', TIMEZONE('utc'::text, NOW()));

    IF v_today_earned + p_amount > 5000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily crystal grant cap reached');
    END IF;

    -- 4. Database-Enforced Idempotency Check via crystal_ledger
    BEGIN
        INSERT INTO public.crystal_ledger (
            user_id,
            amount,
            type,
            source,
            source_id,
            description,
            created_at
        ) VALUES (
            v_user_id,
            p_amount,
            'EARN',
            p_source,
            p_source_id,
            -- L27: description is NOT NULL in crystal_ledger. A NULL
            -- description raised an unhandled NOT NULL violation.
            COALESCE(NULLIF(trim(p_description), ''), 'Crystal grant'),
            TIMEZONE('utc'::text, NOW())
        ) RETURNING id INTO v_inserted_id;
    EXCEPTION WHEN unique_violation THEN
        -- Already credited idempotently! Return current authoritative balance without double-awarding.
        SELECT mana_crystals INTO v_current_crystals
        FROM public.user_wallets
        WHERE user_id = v_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'amount_granted', 0,
            'new_balance', COALESCE(v_current_crystals, 0),
            'user_id', v_user_id
        );
    END;

    -- 5. Atomically Update Private User Wallet
    INSERT INTO public.user_wallets (
        user_id,
        display_name,
        rank_code,
        level,
        streak,
        total_reps,
        total_xp,
        mana_crystals,
        last_synced_at
    ) VALUES (
        v_user_id,
        v_clean_name,
        v_clean_rank,
        v_clean_level,
        v_clean_streak,
        v_clean_reps,
        v_clean_xp,
        p_amount,
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = v_clean_name,
        rank_code = v_clean_rank,
        level = GREATEST(user_wallets.level, v_clean_level),
        streak = GREATEST(user_wallets.streak, v_clean_streak),
        total_reps = GREATEST(user_wallets.total_reps, v_clean_reps),
        total_xp = GREATEST(user_wallets.total_xp, v_clean_xp),
        -- L25: overflow-safe addition. Plain `mana_crystals + p_amount`
        -- raises an unhandled "integer out of range" if the wallet is
        -- near INT_MAX. Saturate at INT_MAX instead of erroring.
        mana_crystals = CASE
            WHEN user_wallets.mana_crystals > 2147483647 - p_amount THEN 2147483647
            ELSE user_wallets.mana_crystals + p_amount
        END,
        last_synced_at = TIMEZONE('utc'::text, NOW())
    RETURNING mana_crystals INTO v_new_crystals;

    -- 6. Atomically Update Public Leaderboard Projection (triggers Supabase Realtime broadcast)
    INSERT INTO public.crystal_leaderboard (
        user_id,
        name,
        avatar_icon,
        rank_code,
        level,
        streak,
        total_reps,
        total_xp,
        crystals_mined,
        title,
        updated_at
    ) VALUES (
        v_user_id,
        v_clean_name,
        v_clean_avatar,
        v_clean_rank,
        v_clean_level,
        v_clean_streak,
        v_clean_reps,
        v_clean_xp,
        v_new_crystals,
        'Hunter',
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = v_clean_name,
        avatar_icon = v_clean_avatar,
        rank_code = v_clean_rank,
        level = GREATEST(crystal_leaderboard.level, v_clean_level),
        streak = GREATEST(crystal_leaderboard.streak, v_clean_streak),
        total_reps = GREATEST(crystal_leaderboard.total_reps, v_clean_reps),
        total_xp = GREATEST(crystal_leaderboard.total_xp, v_clean_xp),
        crystals_mined = v_new_crystals,
        updated_at = TIMEZONE('utc'::text, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'amount_granted', p_amount,
        'new_balance', v_new_crystals,
        'user_id', v_user_id
    );
END;
$$;


-- 2. request_redemption_secure: Atomically locks wallet row, verifies balance, deducts crystals,
-- inserts spend ledger record, records redemption, and updates leaderboard.
-- Identity is STRICTLY derived from authenticated auth.uid() session (zero client fallback).
CREATE OR REPLACE FUNCTION public.request_redemption_secure(
    p_amount_inr INTEGER,
    p_crystals_spent INTEGER,
    p_method TEXT,
    p_destination TEXT,
    p_request_uuid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id TEXT;
    v_current_crystals INTEGER := 0;
    v_new_crystals INTEGER := 0;
    v_redemption_id BIGINT;
    v_expected_crystals INTEGER;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL OR length(trim(v_user_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated caller');
    END IF;

    -- 1. Validate Amounts & Conversion Rate (10 crystals = 1 INR)
    IF p_amount_inr IS NULL OR p_crystals_spent IS NULL
        OR p_amount_inr < 25 OR p_amount_inr > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Redemption must be between 25 and 2000 INR');
    END IF;

    v_expected_crystals := p_amount_inr * 10;
    IF p_crystals_spent <> v_expected_crystals THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid crystal conversion rate');
    END IF;

    IF p_method IS NULL OR p_method NOT IN ('UPI', 'AMAZON', 'GOOGLE_PLAY', 'COINS') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid redemption method');
    END IF;

    IF p_destination IS NULL OR length(trim(p_destination)) < 4 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid redemption destination format');
    END IF;
    IF p_method = 'UPI' AND trim(p_destination) !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,32}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid UPI destination format');
    END IF;
    IF p_request_uuid IS NULL OR length(trim(p_request_uuid)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing redemption request id');
    END IF;
    IF length(trim(p_request_uuid)) > 128 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid redemption request id');
    END IF;

    -- 2. Row Lock on User Wallet FIRST (M15). The idempotency EXISTS check
    -- below must run AFTER the lock: two concurrent calls for the same user
    -- serialize on this row, so the second sees the first's committed
    -- ledger row. (Checking before the lock let both pass, then one died
    -- on the UNIQUE constraint with a raw 500 instead of already_processed.)
    SELECT mana_crystals INTO v_current_crystals
    FROM public.user_wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    -- 3. Check Idempotency via crystal_ledger (after the lock — see above).
    -- This runs BEFORE the balance check on purpose: a retry must return
    -- already_processed even if the user spent crystals after the first
    -- (successful) redemption dropped their balance below the amount.
    IF EXISTS (
        SELECT 1 FROM public.crystal_ledger
        WHERE source = 'redemption' AND source_id = p_request_uuid AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'error', 'Redemption request already processed');
    END IF;

    IF v_current_crystals IS NULL OR v_current_crystals < p_crystals_spent THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient Mana Crystals');
    END IF;

    v_new_crystals := v_current_crystals - p_crystals_spent;

    -- 4. Insert Spend Record into crystal_ledger
    INSERT INTO public.crystal_ledger (
        user_id,
        amount,
        type,
        source,
        source_id,
        description,
        created_at
    ) VALUES (
        v_user_id,
        -p_crystals_spent,
        'SPEND',
        'redemption',
        p_request_uuid,
        'Redemption INR ' || p_amount_inr || ' via ' || p_method,
        TIMEZONE('utc'::text, NOW())
    );

    -- 5. Insert into crystal_redemptions
    INSERT INTO public.crystal_redemptions (
        user_id,
        amount_inr,
        crystals_spent,
        method,
        destination,
        status,
        request_id,
        created_at
    ) VALUES (
        v_user_id,
        p_amount_inr,
        p_crystals_spent,
        p_method,
        trim(p_destination),
        'PENDING',
        p_request_uuid,
        TIMEZONE('utc'::text, NOW())
    ) RETURNING id INTO v_redemption_id;

    -- 6. Update User Wallet
    UPDATE public.user_wallets
    SET mana_crystals = v_new_crystals,
        last_synced_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_user_id;

    -- 7. Upsert Leaderboard Projection (L29: plain UPDATE silently did
    -- nothing when the row was missing, leaving a stale leaderboard).
    INSERT INTO public.crystal_leaderboard (user_id, crystals_mined, updated_at)
    VALUES (v_user_id, v_new_crystals, TIMEZONE('utc'::text, NOW()))
    ON CONFLICT (user_id) DO UPDATE
        SET crystals_mined = EXCLUDED.crystals_mined,
            updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'redemption_id', v_redemption_id,
        'new_balance', v_new_crystals
    );
EXCEPTION
    -- M15 defense-in-depth: the UNIQUE (source, source_id, user_id) on
    -- crystal_ledger is the hard guard. A concurrent duplicate lands here
    -- and gets a clean already_processed instead of a raw 500.
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'error', 'Redemption request already processed');
END;
$$;


-- 2b. request_payout_secure: validated coin→INR payout (H7/H58).
-- Mirrors request_redemption_secure. There was previously NO validated
-- payout function: the only guards were amount_inr >= 10 and
-- coins_spent >= 1000, with no ratio between them, so a privileged
-- write could claim ₹999,999 for 1,000 coins. This RPC enforces a
-- fixed server-side rate, locks the wallet row, checks the balance,
-- writes a coin_ledger SPEND entry, and inserts a PENDING-only
-- payout_requests row. Direct INSERT into payout_requests stays
-- RLS-denied (no INSERT policy) — this RPC is the only write path.
-- RATE: 100 coins = 1 INR, encoded from the table's minimums
-- (1000 coins minimum / 10 INR minimum). To change the rate, change
-- the multiplier below AND the client-side display together.
-- Identity is STRICTLY derived from authenticated auth.uid() session.
CREATE OR REPLACE FUNCTION public.request_payout_secure(
    p_amount_inr INTEGER,
    p_coins_spent INTEGER,
    p_upi_id TEXT,
    p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id TEXT;
    v_current_coins INTEGER := 0;
    v_new_coins INTEGER := 0;
    v_payout_id BIGINT;
    v_expected_coins INTEGER;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL OR length(trim(v_user_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated caller');
    END IF;

    -- 1. Validate amounts & fixed conversion rate (100 coins = 1 INR)
    IF p_amount_inr IS NULL OR p_coins_spent IS NULL
        OR p_amount_inr < 10 OR p_amount_inr > 100000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payout must be between 10 and 100000 INR');
    END IF;

    v_expected_coins := p_amount_inr * 100;
    IF p_coins_spent <> v_expected_coins THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid coin conversion rate');
    END IF;

    IF p_upi_id IS NULL OR trim(p_upi_id) !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,32}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid UPI ID format');
    END IF;
    IF p_request_id IS NULL OR length(trim(p_request_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing payout request id');
    END IF;
    IF length(trim(p_request_id)) > 128 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid payout request id');
    END IF;

    -- 2. Row Lock on User Wallet FIRST (M15, same race as redemption).
    -- The EXISTS checks below must run after the lock so concurrent calls
    -- for the same user serialize and the second sees committed state.
    SELECT cloud_coins INTO v_current_coins
    FROM public.user_wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    -- 3. Idempotency: an already-processed request returns success.
    -- Runs BEFORE the balance check on purpose: a retry must return
    -- already_processed even if later spending dropped the balance.
    IF EXISTS (
        SELECT 1 FROM public.payout_requests
        WHERE user_id = v_user_id AND request_id = p_request_id
    ) THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'error', 'Payout request already processed');
    END IF;

    -- 4. One pending payout at a time
    IF EXISTS (
        SELECT 1 FROM public.payout_requests
        WHERE user_id = v_user_id AND status = 'PENDING'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'A payout request is already pending');
    END IF;

    -- 5. Balance check (after lock + idempotency)
    IF v_current_coins IS NULL OR v_current_coins < p_coins_spent THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins');
    END IF;

    v_new_coins := v_current_coins - p_coins_spent;

    -- 6. Insert Spend Record into coin_ledger
    INSERT INTO public.coin_ledger (
        user_id,
        amount,
        type,
        source,
        source_id,
        description,
        created_at
    ) VALUES (
        v_user_id,
        -p_coins_spent,
        'SPEND',
        'payout',
        p_request_id,
        'UPI Cashout INR ' || p_amount_inr,
        TIMEZONE('utc'::text, NOW())
    );

    -- 7. Insert PENDING payout request (PENDING-only; admin flips to PAID)
    INSERT INTO public.payout_requests (
        user_id,
        amount_inr,
        coins_spent,
        upi_id,
        request_id,
        status,
        created_at
    ) VALUES (
        v_user_id,
        p_amount_inr,
        p_coins_spent,
        trim(p_upi_id),
        p_request_id,
        'PENDING',
        TIMEZONE('utc'::text, NOW())
    ) RETURNING id INTO v_payout_id;

    -- 8. Update User Wallet
    UPDATE public.user_wallets
    SET cloud_coins = v_new_coins,
        last_synced_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'payout_id', v_payout_id,
        'new_balance', v_new_coins
    );
EXCEPTION
    -- M15 defense-in-depth: uq_payout_requests_request is the hard guard.
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'error', 'Payout request already processed');
END;
$$;


-- 3. sync_hunter_profile_secure: Safely syncs profile & stats (streak, reps, xp, level, rank)
-- to user_wallets and crystal_leaderboard WITHOUT touching mana_crystals or
-- cloud_coins. Money moves ONLY via ledger functions (e.g. grant_crystals_secure):
-- this function NEVER writes a caller-supplied coin balance (C3). The
-- p_cloud_coins parameter is accepted for backward compatibility and IGNORED;
-- the server's stored coin balance is preserved and returned as
-- authoritative_coins. Triggers Realtime broadcast for all metric categories!
-- Identity is STRICTLY derived from authenticated auth.uid() session (zero client fallback).
CREATE OR REPLACE FUNCTION public.sync_hunter_profile_secure(
    p_display_name TEXT DEFAULT 'Warrior',
    p_avatar_icon TEXT DEFAULT 'img_pfp_01',
    p_rank_code TEXT DEFAULT 'E',
    p_level INTEGER DEFAULT 1,
    p_streak INTEGER DEFAULT 0,
    p_total_reps INTEGER DEFAULT 0,
    p_total_xp INTEGER DEFAULT 0,
    p_cloud_coins INTEGER DEFAULT 0,
    p_title TEXT DEFAULT 'Hunter',
    p_current_streak INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id TEXT;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
    v_clean_rank TEXT;
    v_clean_title TEXT;
    v_clean_level INTEGER;
    v_clean_streak INTEGER;
    v_clean_reps INTEGER;
    v_clean_xp INTEGER;
    v_current_crystals INTEGER := 0;
    v_ret_level INTEGER := 1;
    v_ret_xp INTEGER := 0;
    v_ret_streak INTEGER := 0;
    v_ret_reps INTEGER := 0;
    v_ret_coins INTEGER := 0;
    v_ret_name TEXT := 'Warrior';
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL OR length(trim(v_user_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated caller');
    END IF;

    -- M18: allowlists + length caps (see grant_crystals_secure).
    v_clean_name := LEFT(COALESCE(NULLIF(trim(p_display_name), ''), 'Warrior'), 64);
    v_clean_avatar := LEFT(COALESCE(NULLIF(trim(p_avatar_icon), ''), 'img_pfp_01'), 64);
    v_clean_rank := CASE WHEN upper(trim(p_rank_code)) IN ('E','D','C','B','A','S','NATIONAL')
        THEN upper(trim(p_rank_code)) ELSE 'E' END;
    v_clean_title := LEFT(COALESCE(NULLIF(trim(p_title), ''), 'Hunter'), 64);
    -- Sanity caps on self-reported progress (display/leaderboard data, never money).
    v_clean_level := LEAST(100, GREATEST(1, COALESCE(p_level, 1)));
    v_clean_streak := LEAST(3650, GREATEST(0, COALESCE(p_current_streak, p_streak, 0)));
    v_clean_reps := LEAST(100000000, GREATEST(0, COALESCE(p_total_reps, 0)));
    v_clean_xp := LEAST(10000000, GREATEST(0, COALESCE(p_total_xp, 0)));
    -- NOTE (C3): p_cloud_coins is deliberately NOT read. The caller's coin
    -- balance is never trusted: the server value is preserved below.

    -- Upsert user_wallets metadata (mana_crystals is preserved from server state)
    INSERT INTO public.user_wallets (
        user_id,
        display_name,
        rank_code,
        level,
        streak,
        total_reps,
        total_xp,
        cloud_coins,
        mana_crystals,
        last_synced_at
    ) VALUES (
        v_user_id,
        v_clean_name,
        v_clean_rank,
        v_clean_level,
        v_clean_streak,
        v_clean_reps,
        v_clean_xp,
        0, -- cloud_coins: new wallets start at 0; caller input never sets it (C3)
        0,
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = v_clean_name,
        rank_code = v_clean_rank,
        level = GREATEST(user_wallets.level, v_clean_level),
        streak = GREATEST(user_wallets.streak, v_clean_streak),
        total_reps = GREATEST(user_wallets.total_reps, v_clean_reps),
        total_xp = GREATEST(user_wallets.total_xp, v_clean_xp),
        -- cloud_coins intentionally NOT assigned: the server balance is preserved (C3).
        last_synced_at = TIMEZONE('utc'::text, NOW())
    RETURNING mana_crystals, level, total_xp, streak, total_reps, cloud_coins, display_name
    INTO v_current_crystals, v_ret_level, v_ret_xp, v_ret_streak, v_ret_reps, v_ret_coins, v_ret_name;

    -- Upsert crystal_leaderboard projection (Triggers Realtime for streak, reps, xp, crystals)
    INSERT INTO public.crystal_leaderboard (
        user_id,
        name,
        avatar_icon,
        rank_code,
        level,
        streak,
        total_reps,
        total_xp,
        crystals_mined,
        title,
        updated_at
    ) VALUES (
        v_user_id,
        v_clean_name,
        v_clean_avatar,
        v_clean_rank,
        v_clean_level,
        v_clean_streak,
        v_clean_reps,
        v_clean_xp,
        v_current_crystals,
        v_clean_title,
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = v_clean_name,
        avatar_icon = v_clean_avatar,
        rank_code = v_clean_rank,
        title = v_clean_title,
        level = GREATEST(crystal_leaderboard.level, v_clean_level),
        streak = GREATEST(crystal_leaderboard.streak, v_clean_streak),
        total_reps = GREATEST(crystal_leaderboard.total_reps, v_clean_reps),
        total_xp = GREATEST(crystal_leaderboard.total_xp, v_clean_xp),
        crystals_mined = v_current_crystals,
        updated_at = TIMEZONE('utc'::text, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'authoritative_crystals', v_current_crystals,
        'authoritative_mana_crystals', v_current_crystals,
        'authoritative_level', v_ret_level,
        'authoritative_xp', v_ret_xp,
        'authoritative_streak', v_ret_streak,
        'authoritative_reps', v_ret_reps,
        'authoritative_coins', v_ret_coins,
        'display_name', v_ret_name,
        'user_id', v_user_id
    );
END;
$$;


-- 4. get_hunter_leaderboard: Returns real hunter rankings with deterministic tie-breaking,
-- accurate total user counts, and current user rank even if outside top 100.
CREATE OR REPLACE FUNCTION public.get_hunter_leaderboard(
    p_category TEXT DEFAULT 'streak',
    p_limit INTEGER DEFAULT 100,
    p_current_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_entries JSONB;
    v_current_user_rank JSONB := NULL;
    v_total_count INTEGER := 0;
BEGIN
    -- M16: clamp p_limit. In Postgres, LIMIT with a negative value means
    -- "no limit", so an unvalidated p_limit=-1 dumped the whole table and
    -- a huge p_limit meant a DoS-sized JSON payload.
    p_limit := LEAST(100, GREATEST(1, COALESCE(p_limit, 100)));
    -- Unknown categories fall back to 'streak' instead of returning empty.
    IF p_category IS NULL OR p_category NOT IN ('streak', 'reps', 'power') THEN
        p_category := 'streak';
    END IF;

    SELECT COUNT(*) INTO v_total_count FROM public.crystal_leaderboard;

    IF p_category = 'streak' THEN
        SELECT jsonb_agg(sub) INTO v_entries FROM (
            SELECT 
                user_id,
                name,
                avatar_icon,
                rank_code,
                level,
                streak AS current_streak,
                total_reps,
                total_xp,
                crystals_mined,
                title,
                ROW_NUMBER() OVER (ORDER BY streak DESC, updated_at ASC, user_id ASC) AS rank_position
            FROM public.crystal_leaderboard
            ORDER BY streak DESC, updated_at ASC, user_id ASC
            LIMIT p_limit
        ) sub;

        IF p_current_user_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'user_id', user_id,
                'name', name,
                'avatar_icon', avatar_icon,
                'rank_code', rank_code,
                'level', level,
                'current_streak', streak,
                'total_reps', total_reps,
                'total_xp', total_xp,
                'crystals_mined', crystals_mined,
                'title', title,
                'rank_position', rank_position
            ) INTO v_current_user_rank
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY streak DESC, updated_at ASC, user_id ASC) AS rank_position
                FROM public.crystal_leaderboard
            ) all_ranks
            WHERE user_id = p_current_user_id;
        END IF;

    ELSIF p_category = 'reps' THEN
        SELECT jsonb_agg(sub) INTO v_entries FROM (
            SELECT 
                user_id,
                name,
                avatar_icon,
                rank_code,
                level,
                streak AS current_streak,
                total_reps,
                total_xp,
                crystals_mined,
                title,
                ROW_NUMBER() OVER (ORDER BY total_reps DESC, updated_at ASC, user_id ASC) AS rank_position
            FROM public.crystal_leaderboard
            ORDER BY total_reps DESC, updated_at ASC, user_id ASC
            LIMIT p_limit
        ) sub;

        IF p_current_user_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'user_id', user_id,
                'name', name,
                'avatar_icon', avatar_icon,
                'rank_code', rank_code,
                'level', level,
                'current_streak', streak,
                'total_reps', total_reps,
                'total_xp', total_xp,
                'crystals_mined', crystals_mined,
                'title', title,
                'rank_position', rank_position
            ) INTO v_current_user_rank
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY total_reps DESC, updated_at ASC, user_id ASC) AS rank_position
                FROM public.crystal_leaderboard
            ) all_ranks
            WHERE user_id = p_current_user_id;
        END IF;

    ELSIF p_category = 'power' THEN
        SELECT jsonb_agg(sub) INTO v_entries FROM (
            SELECT 
                user_id,
                name,
                avatar_icon,
                rank_code,
                level,
                streak AS current_streak,
                total_reps,
                total_xp,
                crystals_mined,
                title,
                ROW_NUMBER() OVER (ORDER BY total_xp DESC, updated_at ASC, user_id ASC) AS rank_position
            FROM public.crystal_leaderboard
            ORDER BY total_xp DESC, updated_at ASC, user_id ASC
            LIMIT p_limit
        ) sub;

        IF p_current_user_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'user_id', user_id,
                'name', name,
                'avatar_icon', avatar_icon,
                'rank_code', rank_code,
                'level', level,
                'current_streak', streak,
                'total_reps', total_reps,
                'total_xp', total_xp,
                'crystals_mined', crystals_mined,
                'title', title,
                'rank_position', rank_position
            ) INTO v_current_user_rank
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY total_xp DESC, updated_at ASC, user_id ASC) AS rank_position
                FROM public.crystal_leaderboard
            ) all_ranks
            WHERE user_id = p_current_user_id;
        END IF;

    ELSE
        -- Default to crystal mining category
        SELECT jsonb_agg(sub) INTO v_entries FROM (
            SELECT 
                user_id,
                name,
                avatar_icon,
                rank_code,
                level,
                streak AS current_streak,
                total_reps,
                total_xp,
                crystals_mined,
                title,
                ROW_NUMBER() OVER (ORDER BY crystals_mined DESC, updated_at ASC, user_id ASC) AS rank_position
            FROM public.crystal_leaderboard
            ORDER BY crystals_mined DESC, updated_at ASC, user_id ASC
            LIMIT p_limit
        ) sub;

        IF p_current_user_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'user_id', user_id,
                'name', name,
                'avatar_icon', avatar_icon,
                'rank_code', rank_code,
                'level', level,
                'current_streak', streak,
                'total_reps', total_reps,
                'total_xp', total_xp,
                'crystals_mined', crystals_mined,
                'title', title,
                'rank_position', rank_position
            ) INTO v_current_user_rank
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY crystals_mined DESC, updated_at ASC, user_id ASC) AS rank_position
                FROM public.crystal_leaderboard
            ) all_ranks
            WHERE user_id = p_current_user_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'entries', COALESCE(v_entries, '[]'::jsonb),
        'current_user', v_current_user_rank,
        'total_count', v_total_count
    );
END;
$$;

-- Harden all SECURITY DEFINER RPCs after every definition exists.
ALTER FUNCTION public.grant_crystals_secure(
    INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) SET search_path = public;
ALTER FUNCTION public.request_redemption_secure(INTEGER, INTEGER, TEXT, TEXT, TEXT)
    SET search_path = public;
ALTER FUNCTION public.request_payout_secure(INTEGER, INTEGER, TEXT, TEXT)
    SET search_path = public;
ALTER FUNCTION public.sync_hunter_profile_secure(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER
) SET search_path = public;
ALTER FUNCTION public.get_hunter_leaderboard(TEXT, INTEGER, TEXT)
    SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.grant_crystals_secure(
    INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_redemption_secure(INTEGER, INTEGER, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_payout_secure(INTEGER, INTEGER, TEXT, TEXT)
    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_hunter_profile_secure(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hunter_leaderboard(TEXT, INTEGER, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_crystals_secure(
    INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_redemption_secure(INTEGER, INTEGER, TEXT, TEXT, TEXT)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_payout_secure(INTEGER, INTEGER, TEXT, TEXT)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_hunter_profile_secure(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_hunter_leaderboard(TEXT, INTEGER, TEXT)
    TO authenticated, service_role;
