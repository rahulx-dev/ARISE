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
    avatar_icon TEXT DEFAULT 'img_pfp_01',
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

CREATE INDEX IF NOT EXISTS idx_user_cloud_saves_updated ON public.user_cloud_saves (updated_at DESC);

-- Allow public access for client cloud saves
ALTER TABLE public.user_cloud_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write on user_cloud_saves" ON public.user_cloud_saves;
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

-- 1. Crystal Ledger: Direct client modifications forbidden. Select allowed only for owner.
DROP POLICY IF EXISTS "crystal_ledger_select_owner" ON public.crystal_ledger;
DROP POLICY IF EXISTS "Public Access" ON public.crystal_ledger;
DROP POLICY IF EXISTS "Allow all" ON public.crystal_ledger;
CREATE POLICY "crystal_ledger_select_owner" ON public.crystal_ledger
FOR SELECT USING (user_id = auth.uid()::text);

-- 2. Coin Ledger: Select allowed for owner.
DROP POLICY IF EXISTS "coin_ledger_select_owner" ON public.coin_ledger;
DROP POLICY IF EXISTS "Public Access" ON public.coin_ledger;
DROP POLICY IF EXISTS "Allow all" ON public.coin_ledger;
CREATE POLICY "coin_ledger_select_owner" ON public.coin_ledger
FOR SELECT USING (user_id = auth.uid()::text);

-- 3. User Wallets: PRIVATE table. Direct public/anon updates to mana_crystals are forbidden.
-- Users can read only their own wallet.
DROP POLICY IF EXISTS "user_wallets_select_owner" ON public.user_wallets;
DROP POLICY IF EXISTS "Public Access" ON public.user_wallets;
DROP POLICY IF EXISTS "Allow all" ON public.user_wallets;
CREATE POLICY "user_wallets_select_owner" ON public.user_wallets
FOR SELECT USING (user_id = auth.uid()::text);

-- 4. Crystal Leaderboard: PUBLIC read projection.
-- Direct UPDATE/DELETE by client is forbidden. Updated solely via SECURITY DEFINER functions.
DROP POLICY IF EXISTS "crystal_leaderboard_select_public" ON public.crystal_leaderboard;
DROP POLICY IF EXISTS "Public Access" ON public.crystal_leaderboard;
DROP POLICY IF EXISTS "Allow all" ON public.crystal_leaderboard;
CREATE POLICY "crystal_leaderboard_select_public" ON public.crystal_leaderboard
FOR SELECT USING (true);

-- 5. Crystal Redemptions: Users can SELECT only their own requests. Direct UPDATE is forbidden.
DROP POLICY IF EXISTS "crystal_redemptions_select_owner" ON public.crystal_redemptions;
DROP POLICY IF EXISTS "Public Access" ON public.crystal_redemptions;
DROP POLICY IF EXISTS "Allow all" ON public.crystal_redemptions;
CREATE POLICY "crystal_redemptions_select_owner" ON public.crystal_redemptions
FOR SELECT USING (user_id = auth.uid()::text);

-- 6. Payout Requests: Users can SELECT only their own requests. Direct UPDATE is forbidden.
DROP POLICY IF EXISTS "payout_requests_select_owner" ON public.payout_requests;
DROP POLICY IF EXISTS "Public Access" ON public.payout_requests;
DROP POLICY IF EXISTS "Allow all" ON public.payout_requests;
CREATE POLICY "payout_requests_select_owner" ON public.payout_requests
FOR SELECT USING (user_id = auth.uid()::text);

-- 7. CPX Postback: Internal only.
DROP POLICY IF EXISTS "cpx_postback_select_owner" ON public.cpx_postback_log;
DROP POLICY IF EXISTS "Public Access" ON public.cpx_postback_log;
DROP POLICY IF EXISTS "Allow all" ON public.cpx_postback_log;
CREATE POLICY "cpx_postback_select_owner" ON public.cpx_postback_log
FOR SELECT USING (user_id = auth.uid()::text);


-- ==============================================================================
-- ATOMIC SECURITY DEFINER PROCEDURES (RPC)
-- ==============================================================================

-- 1. grant_crystals_secure: Atomically validates source bounds, enforces idempotency in crystal_ledger,
-- updates authoritative wallet, updates leaderboard projection, and triggers Realtime broadcast.
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
    v_allowed_max INTEGER;
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
    v_clean_name := COALESCE(NULLIF(trim(p_user_name), ''), 'Warrior');
    v_clean_avatar := COALESCE(NULLIF(trim(p_avatar_icon), ''), 'img_pfp_01');
    v_clean_rank := COALESCE(NULLIF(trim(p_rank_code), ''), 'E');
    v_clean_level := GREATEST(1, COALESCE(p_level, 1));
    v_clean_streak := GREATEST(0, COALESCE(p_streak, 0));
    v_clean_reps := GREATEST(0, COALESCE(p_total_reps, 0));
    v_clean_xp := GREATEST(0, COALESCE(p_total_xp, 0));

    -- 3. Enforce Server-Side Amount Bounds Per Source
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid crystal reward amount');
    END IF;

    IF p_source IS NULL OR p_source NOT IN (
        'gate_recon', 'red_gate', 'cpx_survey', 'bitlabs_survey'
    ) OR p_source_id IS NULL OR length(trim(p_source_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reward source');
    END IF;

    IF p_source = 'gate_recon' THEN
        v_allowed_max := 500;
    ELSIF p_source = 'red_gate' THEN
        v_allowed_max := 1000;
    ELSIF p_source = 'cpx_survey' OR p_source = 'bitlabs_survey' THEN
        v_allowed_max := 5000;
    ELSE
        v_allowed_max := 0;
    END IF;

    IF p_amount > v_allowed_max THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward exceeds maximum allowed bound for source ' || p_source);
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
            p_description,
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
        avatar_icon,
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
        v_clean_avatar,
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
        avatar_icon = v_clean_avatar,
        rank_code = v_clean_rank,
        level = GREATEST(user_wallets.level, v_clean_level),
        streak = GREATEST(user_wallets.streak, v_clean_streak),
        total_reps = GREATEST(user_wallets.total_reps, v_clean_reps),
        total_xp = GREATEST(user_wallets.total_xp, v_clean_xp),
        mana_crystals = user_wallets.mana_crystals + p_amount,
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

    -- 2. Check Idempotency via crystal_ledger
    IF EXISTS (
        SELECT 1 FROM public.crystal_ledger
        WHERE source = 'redemption' AND source_id = p_request_uuid AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'error', 'Redemption request already processed');
    END IF;

    -- 3. Row Lock on User Wallet (FOR UPDATE)
    SELECT mana_crystals INTO v_current_crystals
    FROM public.user_wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

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

    -- 7. Update Leaderboard Projection
    UPDATE public.crystal_leaderboard
    SET crystals_mined = v_new_crystals,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'redemption_id', v_redemption_id,
        'new_balance', v_new_crystals
    );
END;
$$;


-- 3. sync_hunter_profile_secure: Safely syncs profile & stats (streak, reps, xp, level, rank)
-- to user_wallets and crystal_leaderboard WITHOUT touching mana_crystals. Triggers Realtime broadcast for all metric categories!
-- Identity is STRICTLY derived from authenticated auth.uid() session (zero client fallback).
CREATE OR REPLACE FUNCTION public.sync_hunter_profile_secure(
    p_display_name TEXT,
    p_avatar_icon TEXT,
    p_rank_code TEXT,
    p_level INTEGER,
    p_streak INTEGER,
    p_total_reps INTEGER,
    p_total_xp INTEGER,
    p_cloud_coins INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_clean_coins INTEGER;
    v_current_crystals INTEGER := 0;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL OR length(trim(v_user_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated caller');
    END IF;

    v_clean_name := COALESCE(NULLIF(trim(p_display_name), ''), 'Warrior');
    v_clean_avatar := COALESCE(NULLIF(trim(p_avatar_icon), ''), 'img_pfp_01');
    v_clean_rank := COALESCE(NULLIF(trim(p_rank_code), ''), 'E');
    v_clean_level := GREATEST(1, COALESCE(p_level, 1));
    v_clean_streak := GREATEST(0, COALESCE(p_streak, 0));
    v_clean_reps := GREATEST(0, COALESCE(p_total_reps, 0));
    v_clean_xp := GREATEST(0, COALESCE(p_total_xp, 0));
    v_clean_coins := GREATEST(0, COALESCE(p_cloud_coins, 0));

    -- Upsert user_wallets metadata (mana_crystals is preserved from server state)
    INSERT INTO public.user_wallets (
        user_id,
        display_name,
        avatar_icon,
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
        v_clean_avatar,
        v_clean_rank,
        v_clean_level,
        v_clean_streak,
        v_clean_reps,
        v_clean_xp,
        v_clean_coins,
        0,
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = v_clean_name,
        avatar_icon = v_clean_avatar,
        rank_code = v_clean_rank,
        level = GREATEST(user_wallets.level, v_clean_level),
        streak = GREATEST(user_wallets.streak, v_clean_streak),
        total_reps = GREATEST(user_wallets.total_reps, v_clean_reps),
        total_xp = GREATEST(user_wallets.total_xp, v_clean_xp),
        cloud_coins = v_clean_coins,
        last_synced_at = TIMEZONE('utc'::text, NOW())
    RETURNING mana_crystals INTO v_current_crystals;

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
        crystals_mined = v_current_crystals,
        updated_at = TIMEZONE('utc'::text, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'authoritative_crystals', v_current_crystals,
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
SECURITY DEFINER
AS $$
DECLARE
    v_entries JSONB;
    v_current_user_rank JSONB := NULL;
    v_total_count INTEGER := 0;
BEGIN
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
ALTER FUNCTION public.sync_hunter_profile_secure(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) SET search_path = public;
ALTER FUNCTION public.get_hunter_leaderboard(TEXT, INTEGER, TEXT)
    SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.grant_crystals_secure(
    INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_redemption_secure(INTEGER, INTEGER, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_hunter_profile_secure(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hunter_leaderboard(TEXT, INTEGER, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_crystals_secure(
    INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_redemption_secure(INTEGER, INTEGER, TEXT, TEXT, TEXT)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_hunter_profile_secure(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_hunter_leaderboard(TEXT, INTEGER, TEXT)
    TO authenticated, service_role;
