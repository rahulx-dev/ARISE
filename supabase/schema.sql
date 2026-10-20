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
    CONSTRAINT uq_crystal_ledger_event UNIQUE (source, source_id, user_id),
    -- 5E (#8): amount sign must match type — an EARN of -500 or a SPEND
    -- of +500 would corrupt every balance derived from this ledger.
    CONSTRAINT ck_crystal_ledger_amount_sign CHECK ((type = 'EARN' AND amount > 0) OR (type = 'SPEND' AND amount < 0))
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    -- 5E (#8): amount sign must match type (see crystal_ledger).
    CONSTRAINT ck_coin_ledger_amount_sign CHECK ((type = 'EARN' AND amount > 0) OR (type = 'SPEND' AND amount < 0))
);

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user ON public.coin_ledger (user_id);

-- 3. Private User Wallets (Authoritative Account & Currency State - PRIVATE)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id TEXT PRIMARY KEY,
    display_name TEXT DEFAULT 'Warrior',
    rank_code TEXT DEFAULT 'E',
    level INTEGER NOT NULL DEFAULT 1 CONSTRAINT ck_user_wallets_level CHECK (level >= 1),
    streak INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_user_wallets_streak CHECK (streak >= 0),
    total_reps INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_user_wallets_total_reps CHECK (total_reps >= 0),
    total_xp INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_user_wallets_total_xp CHECK (total_xp >= 0),
    cloud_coins INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_user_wallets_cloud_coins CHECK (cloud_coins >= 0),
    mana_crystals INTEGER NOT NULL DEFAULT 0 CHECK (mana_crystals >= 0),
    device_id TEXT,
    app_version TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_synced ON public.user_wallets (last_synced_at);

-- ==============================================================================
-- Batch 5G — live-table shape normalization: existing tables created by
-- older schema versions are never altered by CREATE TABLE IF NOT EXISTS,
-- so every column the rest of this file relies on is first ensured here.
-- ==============================================================================
-- This is the bug that killed the live schema run: the live user_wallets
-- is still the original coin-era table (user_id, display_name,
-- cloud_coins, total_earned, device_id, app_version, last_synced_at) —
-- it has NO mana_crystals / level / streak / total_reps / total_xp,
-- while the Batch 5E clamp immediately below, sync_hunter_profile_secure
-- and reconcile_wallets_admin all rely on those columns. The run died
-- with: ERROR 42703: column "level" does not exist.
--
-- Placement: this section sits BEFORE the earliest DO upgrade block in
-- the file (the Batch 5E clamp block directly below), before the Batch
-- 5D cpx upgrade block, and before every policy and function. The
-- CREATE TABLE statements for user_cloud_saves and the later tables sit
-- further down the file, so every statement here uses
-- ALTER TABLE IF EXISTS: on a fresh database those tables do not exist
-- yet at this point and are skipped (each is then created in full shape
-- by its CREATE TABLE below); on an existing database every table is
-- present and is normalized NOW, before anything reads its columns.
--
-- Per-column rules, mirroring the CREATE TABLE definitions:
--   * type and DEFAULT are copied from the definition;
--   * NOT NULL is kept only where the definition provides a DEFAULT
--     (existing rows backfill from it). A NOT NULL column with NO
--     default in the definition is added NULLABLE with a zero-value
--     default instead ('' / 0 / '{}') — adding it NOT NULL would fail
--     on a populated table;
--   * the serial id columns and any column carrying PRIMARY KEY or
--     UNIQUE in the definition are NOT added (user_wallets.user_id,
--     user_cloud_saves.email, crystal_leaderboard.user_id,
--     cpx_postback_log.trans_id): a table missing its key column
--     cannot be repaired by an ADD COLUMN, and keys cannot be
--     retrofitted this way;
--   * inline CHECK constraints are skipped — the named-constraint
--     upgrade blocks enforce them — EXCEPT user_wallets.mana_crystals:
--     its CHECK travels with the column add, because every backfilled
--     value is 0 and satisfies mana_crystals >= 0;
--   * nothing is dropped or renamed: legacy columns that exist only on
--     live tables (user_wallets.total_earned, ...) are left untouched.

-- 1. crystal_ledger (user_id/amount/type/source/source_id/description
--    are NOT NULL with no default in the definition -> zero defaults)
ALTER TABLE IF EXISTS public.crystal_ledger
    ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS source_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW());

-- 2. coin_ledger (source_id is nullable in the definition)
ALTER TABLE IF EXISTS public.coin_ledger
    ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS source_id TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW());

-- 3. user_wallets — the table that killed the live run. The five
--    columns the live coin-era table is missing come first; the named
--    CHECKs on level/streak/total_reps/total_xp/cloud_coins are added
--    by the Batch 5E upgrade block below, mana_crystals keeps its
--    CHECK inline (see rules above).
ALTER TABLE IF EXISTS public.user_wallets
    ADD COLUMN IF NOT EXISTS mana_crystals INTEGER NOT NULL DEFAULT 0 CHECK (mana_crystals >= 0),
    ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_reps INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Warrior',
    ADD COLUMN IF NOT EXISTS rank_code TEXT DEFAULT 'E',
    ADD COLUMN IF NOT EXISTS cloud_coins INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS device_id TEXT,
    ADD COLUMN IF NOT EXISTS app_version TEXT,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW());

-- 3b. user_cloud_saves (email is the PRIMARY KEY -> skipped).
--     user_id is not in the CREATE TABLE definition — it arrives via
--     the M17 ALTER below and is relied on by the uid RLS policy and
--     the Batch 5F backfill, so it is ensured here as well.
--     backup_data is NOT NULL with no default -> zero '{}' default.
ALTER TABLE IF EXISTS public.user_cloud_saves
    ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Warrior',
    ADD COLUMN IF NOT EXISTS avatar_icon TEXT DEFAULT 'img_pfp_01',
    ADD COLUMN IF NOT EXISTS backup_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 4. crystal_leaderboard (user_id is the PRIMARY KEY -> skipped).
--    The ad-hoc ALTER block after its CREATE TABLE below adds these
--    same columns; the duplication is deliberate and harmless.
ALTER TABLE IF EXISTS public.crystal_leaderboard
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

-- 5. crystal_redemptions (inline amount/method/status CHECKs skipped
--    per the rules above; request_id arrives via the ALTER below and
--    is relied on by its unique index, so it is ensured here too)
ALTER TABLE IF EXISTS public.crystal_redemptions
    ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS amount_inr INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS crystals_spent INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS method TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT,
    ADD COLUMN IF NOT EXISTS request_id TEXT;

-- 6. payout_requests (inline CHECKs skipped per the rules above)
ALTER TABLE IF EXISTS public.payout_requests
    ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT 'Warrior',
    ADD COLUMN IF NOT EXISTS amount_inr NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS coins_spent INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS upi_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS request_id TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 7. cpx_postback_log (trans_id carries UNIQUE -> skipped). The
--    Batch 5D columns are also added by the upgrade DO block below;
--    ensuring them here too means no statement can meet them missing.
ALTER TABLE IF EXISTS public.cpx_postback_log
    ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS amount_crystals INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'cpx',
    ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS callback_type TEXT,
    ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW());

-- End of Batch 5G shape normalization. Everything below may now rely
-- on the full column shape of every table above.

-- Batch 5E (#8, #9): constraint upgrades for databases created before
-- the CHECKs were added to the CREATE TABLE definitions above.
-- #9: legacy wallet rows that violate the new bounds are clamped FIRST,
-- so the CHECKs can actually be added on a live DB.
-- #8: the ledger sign CHECKs are added inside an exception guard — if
-- legacy ledger rows violate the sign rule, the constraint is skipped
-- with a NOTICE instead of aborting the whole schema run.
DO $$
BEGIN
    UPDATE public.user_wallets SET
        level = GREATEST(level, 1),
        streak = GREATEST(streak, 0),
        total_reps = GREATEST(total_reps, 0),
        total_xp = GREATEST(total_xp, 0),
        cloud_coins = GREATEST(cloud_coins, 0)
    WHERE level < 1 OR streak < 0 OR total_reps < 0 OR total_xp < 0 OR cloud_coins < 0;

    BEGIN
        ALTER TABLE public.user_wallets ADD CONSTRAINT ck_user_wallets_level CHECK (level >= 1);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.user_wallets ADD CONSTRAINT ck_user_wallets_streak CHECK (streak >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.user_wallets ADD CONSTRAINT ck_user_wallets_total_reps CHECK (total_reps >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.user_wallets ADD CONSTRAINT ck_user_wallets_total_xp CHECK (total_xp >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.user_wallets ADD CONSTRAINT ck_user_wallets_cloud_coins CHECK (cloud_coins >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.crystal_ledger ADD CONSTRAINT ck_crystal_ledger_amount_sign
            CHECK ((type = 'EARN' AND amount > 0) OR (type = 'SPEND' AND amount < 0));
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN check_violation THEN
        RAISE NOTICE '5E: ck_crystal_ledger_amount_sign skipped — existing crystal_ledger rows violate the amount-sign rule; clean them up and re-run';
    END;
    BEGIN
        ALTER TABLE public.coin_ledger ADD CONSTRAINT ck_coin_ledger_amount_sign
            CHECK ((type = 'EARN' AND amount > 0) OR (type = 'SPEND' AND amount < 0));
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN check_violation THEN
        RAISE NOTICE '5E: ck_coin_ledger_amount_sign skipped — existing coin_ledger rows violate the amount-sign rule; clean them up and re-run';
    END;
END $$;

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
-- PROFIT GATE (Batch 5D): a row here is NOT a client claim — it is a
-- server-recorded, provider-authenticated postback. Rows are written ONLY
-- by the `survey-postback` Edge Function (service_role). Clients have NO
-- INSERT/UPDATE/DELETE policy on this table (SELECT owner only, below).
--   CPX: the webhook accepts the postback only when the request carries
--     the CPX_POSTBACK_SECRET configured in the CPX dashboard postback
--     URL (CPX signs nothing; the secret URL param is the auth).
--   BitLabs: the webhook recomputes the HEX HMAC-SHA1 of the full callback
--     URL with the BitLabs App Secret and compares it timing-safely.
-- amount_usd = revenue the network says it owes the publisher (CPX
--   amount_usd / BitLabs RAW). amount_crystals = network-computed crystal
--   reward (CPX amount_local, already net of the publisher's commission via
--   the CPX dashboard currency factor / BitLabs VAL, floored).
-- A grant is possible ONLY from a row with status='approved',
-- signature_verified=true, claimed=false, amount_usd > 0. Zero-revenue
-- rows are recorded as 'rejected' and can never mint crystals.
CREATE TABLE IF NOT EXISTS public.cpx_postback_log (
    id BIGSERIAL PRIMARY KEY,
    trans_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    amount_crystals INTEGER NOT NULL DEFAULT 0,
    amount_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    status TEXT NOT NULL DEFAULT 'approved',
    provider TEXT NOT NULL DEFAULT 'cpx',
    signature_verified BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    callback_type TEXT,
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_cpx_postback_user ON public.cpx_postback_log (user_id);
CREATE INDEX IF NOT EXISTS idx_cpx_postback_trans ON public.cpx_postback_log (trans_id);
-- NOTE: idx_cpx_postback_claimable is created AFTER the upgrade DO block
-- below. It references the Batch 5D columns (provider, signature_verified,
-- claimed), which do not exist yet on databases created before 5D —
-- creating it here would fail with `column "provider" does not exist`
-- and abort the script before the columns are ever added.

-- Upgrade path for databases created before Batch 5D: add the new
-- columns, migrate legacy 'completed' rows to 'approved', enforce the
-- status allowlist, and scope the trans_id uniqueness per provider
-- (CPX trans_ids and BitLabs TX ids live in different namespaces and
-- could otherwise collide on a bare trans_id UNIQUE).
DO $$
BEGIN
    ALTER TABLE public.cpx_postback_log ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'cpx';
    ALTER TABLE public.cpx_postback_log ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.cpx_postback_log ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.cpx_postback_log ADD COLUMN IF NOT EXISTS callback_type TEXT;
    ALTER TABLE public.cpx_postback_log ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
    ALTER TABLE public.cpx_postback_log ALTER COLUMN status SET DEFAULT 'approved';
    -- Batch 5F (#14): the status allowlist gains 'legacy_completed'
    -- below, so an older copy of this CHECK (without it) must be
    -- dropped BEFORE the rename runs — on a re-run it would otherwise
    -- reject the new value. The constraint is re-added right after
    -- with the full list.
    ALTER TABLE public.cpx_postback_log DROP CONSTRAINT IF EXISTS cpx_postback_status_check;
    UPDATE public.cpx_postback_log SET status = 'approved' WHERE status = 'completed';
    -- Batch 5F (#14): rows still 'approved' here with no provider
    -- signature and never claimed are PRE-5D legacy rows. They were
    -- logged under the old flow where the grant was immediate — those
    -- crystals were already paid back then — and they carry no
    -- provider authentication, so they must NEVER become claimable
    -- (grant_crystals_secure requires status='approved' AND
    -- signature_verified=true). Renaming them to 'legacy_completed'
    -- makes the data honest instead of displaying them as approved,
    -- and hard-blocks them by status as well. Idempotent: a re-run
    -- matches nothing.
    UPDATE public.cpx_postback_log
    SET status = 'legacy_completed'
    WHERE status = 'approved'
      AND signature_verified IS FALSE
      AND claimed IS FALSE;
    BEGIN
        ALTER TABLE public.cpx_postback_log
            ADD CONSTRAINT cpx_postback_status_check CHECK (status IN ('approved', 'rejected', 'reversed', 'legacy_completed'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.cpx_postback_log
            ADD CONSTRAINT cpx_postback_provider_check CHECK (provider IN ('cpx', 'bitlabs'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- Replace the bare trans_id UNIQUE with (provider, trans_id).
    BEGIN
        ALTER TABLE public.cpx_postback_log DROP CONSTRAINT IF EXISTS cpx_postback_log_trans_id_key;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.cpx_postback_log
            ADD CONSTRAINT cpx_postback_provider_trans_unique UNIQUE (provider, trans_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Claimable-postback index: created here, AFTER the upgrade block above
-- has added the Batch 5D columns (see note above the other indexes).
CREATE INDEX IF NOT EXISTS idx_cpx_postback_claimable
    ON public.cpx_postback_log (user_id, provider, status, signature_verified, claimed);


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
-- M17: the email-keyed policy below was kept for backward compatibility
-- (existing rows are keyed by email), but email is a mutable claim.
-- New saves also carry auth.uid() in user_id, and the uid policy is the
-- stable owner identity going forward.
-- Batch 5F (#4): the email policy is retired — the 5F block below
-- backfills user_id from auth.users and then drops it, leaving
-- uid-only ownership.
CREATE POLICY "user_cloud_saves_owner_rw" ON public.user_cloud_saves
FOR ALL
USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

CREATE POLICY "user_cloud_saves_owner_uid" ON public.user_cloud_saves
FOR ALL
USING (user_id IS NOT NULL AND user_id = auth.uid()::text)
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid()::text);

-- Batch 5F (#4): user_cloud_saves ownership is uid-only.
-- The backfill runs FIRST: legacy rows saved before M17 recorded only
-- an email. Where that email is an auth account's email, the row gains
-- its owner's uid (auth.users.email is unique, so the match is
-- unambiguous). The client already always writes user_id = the
-- authenticated uid (cloudSyncService upsert), and the uid policy
-- above covers SELECT/INSERT/UPDATE/DELETE with USING + WITH CHECK,
-- so no write path depends on the email policy anymore.
-- Rows STILL user_id IS NULL after the backfill have no matching auth
-- user at all. Once the email policy is dropped they become
-- inaccessible — intended: an email claim alone no longer grants
-- access to a cloud save. The count is surfaced as a NOTICE.
UPDATE public.user_cloud_saves s
SET user_id = u.id::text
FROM auth.users u
WHERE s.user_id IS NULL
  AND u.email IS NOT NULL
  AND lower(u.email) = lower(s.email);

DO $$
DECLARE
    v_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphans
    FROM public.user_cloud_saves
    WHERE user_id IS NULL;
    IF v_orphans > 0 THEN
        RAISE NOTICE '5F: % user_cloud_saves rows still have user_id IS NULL after backfill (no matching auth user); they are inaccessible under uid-only RLS', v_orphans;
    END IF;
END $$;

DROP POLICY IF EXISTS "user_cloud_saves_owner_rw" ON public.user_cloud_saves;

-- Drop any obsolete legacy function overloads that cause duplicate warnings in Supabase Linter
DROP FUNCTION IF EXISTS public.sync_hunter_profile_secure(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.sync_hunter_profile_secure(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);


-- ==============================================================================
-- ATOMIC SECURITY DEFINER PROCEDURES (RPC)
-- ==============================================================================

-- 1. grant_crystals_secure: Grants crystals ONLY for server-verified events.
-- SECURITY (C2 + Batch 5D PROFIT GATE): the server NEVER mints crystals
-- from a client-asserted completion, and NEVER from a client-supplied
-- amount. Only 'cpx_survey' / 'bitlabs_survey' are grantable, and only
-- when a matching provider-authenticated postback row exists in
-- cpx_postback_log (written by the `survey-postback` Edge Function with
-- service_role, never by the client) with status='approved',
-- signature_verified=true, claimed=false, AND amount_usd > 0 (the network
-- confirmed it owes the publisher revenue). The crystal amount comes
-- from that row (network-computed, net of the publisher's commission) —
-- p_amount is IGNORED for survey grants. 'gate_recon' / 'red_gate'
-- completions happen on-device and have no server-side verifier, so they
-- are REJECTED here; the client falls back to local-only crystals.
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
    -- Batch 5D: the grant amount is server-derived from the verified
    -- postback row, never from the caller's p_amount.
    v_amount INTEGER := 0;
    v_provider TEXT := '';
    v_revenue_usd NUMERIC(10, 4) := 0;
    -- 5E (#7): the transaction id is normalized ONCE and used for the
    -- postback lookup, the claimed-flag update AND the ledger insert.
    -- The old code looked up trim(p_source_id) but stored the raw value
    -- in the ledger, so a whitespace-carrying id made the grant
    -- unfindable by the reversal function.
    v_trans_id TEXT;
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

    -- 3. Enforce Server-Side Verification (C2 + Batch 5D PROFIT GATE).
    -- The amount is NEVER taken on the caller's word: it must be backed
    -- by a provider-authenticated postback row that confirms revenue.
    IF p_source IS NULL OR p_source_id IS NULL OR length(trim(p_source_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reward source');
    END IF;

    -- On-device completions have no server-side verifier: reject, do not mint.
    IF p_source = 'gate_recon' OR p_source = 'red_gate' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SERVER_VERIFICATION_REQUIRED: gate/red_gate crystal grants require a server-verified event; client-asserted completions cannot mint server crystals');
    END IF;

    IF p_source = 'cpx_survey' THEN
        v_provider := 'cpx';
    ELSIF p_source = 'bitlabs_survey' THEN
        v_provider := 'bitlabs';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reward source');
    END IF;

    v_trans_id := trim(p_source_id);

    -- PROFIT GATE: the postback row must exist for THIS user + trans_id,
    -- be approved, be provider-authenticated (signature_verified), be
    -- unclaimed, and confirm revenue (amount_usd > 0). The row is
    -- written by the `survey-postback` Edge Function (service_role),
    -- never by the client. Callers pass the raw network trans_id as
    -- p_source_id. The row is locked so two concurrent claims for the
    -- same transaction serialize; the first marks it claimed.
    SELECT amount_crystals, amount_usd INTO v_postback_amount, v_revenue_usd
    FROM public.cpx_postback_log
    WHERE trans_id = v_trans_id
      AND user_id = v_user_id
      AND provider = v_provider
      AND status = 'approved'
      AND signature_verified = true
      AND claimed = false
      AND amount_usd > 0
      AND amount_crystals > 0
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No verified revenue-confirmed postback for this transaction');
    END IF;

    -- The grant amount is the network-computed reward from the verified
    -- row. p_amount is IGNORED: a caller must never be able to choose
    -- how many crystals a survey pays.
    v_amount := v_postback_amount;

    -- Daily cap (defense-in-depth): at most 5000 crystals/day/user.
    -- Checked BEFORE marking the row claimed, so a cap rejection leaves
    -- the transaction claimable again once the cap resets.
    SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
    FROM public.crystal_ledger
    WHERE user_id = v_user_id
      AND type = 'EARN'
      AND created_at >= date_trunc('day', TIMEZONE('utc'::text, NOW()));

    IF v_today_earned + v_amount > 5000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily crystal grant cap reached');
    END IF;

    UPDATE public.cpx_postback_log
    SET claimed = true
    WHERE trans_id = v_trans_id
      AND user_id = v_user_id
      AND provider = v_provider;

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
            v_amount,
            'EARN',
            p_source,
            v_trans_id,
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
        v_amount,
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = v_clean_name,
        rank_code = v_clean_rank,
        level = GREATEST(user_wallets.level, v_clean_level),
        streak = GREATEST(user_wallets.streak, v_clean_streak),
        total_reps = GREATEST(user_wallets.total_reps, v_clean_reps),
        total_xp = GREATEST(user_wallets.total_xp, v_clean_xp),
        -- L25: overflow-safe addition. Plain `mana_crystals + v_amount`
        -- raises an unhandled "integer out of range" if the wallet is
        -- near INT_MAX. Saturate at INT_MAX instead of erroring.
        mana_crystals = CASE
            WHEN user_wallets.mana_crystals > 2147483647 - v_amount THEN 2147483647
            ELSE user_wallets.mana_crystals + v_amount
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
        'amount_granted', v_amount,
        'revenue_usd', v_revenue_usd,
        'trans_id', v_trans_id,
        'new_balance', v_new_crystals,
        'user_id', v_user_id
    );
END;
$$;


-- 1b. reverse_survey_grant_secure: Claws back crystals when a survey
-- network reverses a previously approved payout (chargeback / quality
-- reversal). PROFIT GATE, second half: if the revenue is taken back,
-- the crystals go back too. Called ONLY by the `survey-postback`
-- Edge Function with the service_role key; authenticated users are
-- rejected. The ledger type CHECK allows only EARN/SPEND, so the
-- clawback is a SPEND row with a distinct source_id
-- ('<trans_id>:reversal') — the (source, source_id, user_id) UNIQUE
-- keeps a repeated reversal postback idempotent. The wallet is floored
-- at 0: crystals the user already spent cannot be un-spent.
CREATE OR REPLACE FUNCTION public.reverse_survey_grant_secure(
    p_provider TEXT,
    p_trans_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_postback RECORD;
    v_granted INTEGER := 0;
    v_current_crystals INTEGER := 0;
    v_new_crystals INTEGER := 0;
    v_source TEXT;
    -- 5E (#7): normalized once, used for every lookup/insert below.
    v_trans_id TEXT;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Service-role only');
    END IF;
    IF p_provider NOT IN ('cpx', 'bitlabs') OR p_trans_id IS NULL OR length(trim(p_trans_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid provider or transaction id');
    END IF;

    v_trans_id := trim(p_trans_id);

    SELECT * INTO v_postback
    FROM public.cpx_postback_log
    WHERE provider = p_provider AND trans_id = v_trans_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Postback not found');
    END IF;

    IF v_postback.status = 'reversed' THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'amount_reversed', 0);
    END IF;

    v_source := p_provider || '_survey';

    -- Only reverse if crystals were actually granted for this transaction.
    SELECT amount INTO v_granted
    FROM public.crystal_ledger
    WHERE source = v_source
      AND source_id = v_trans_id
      AND user_id = v_postback.user_id
      AND type = 'EARN';

    -- 5E (#7): no grant row means no crystals were ever minted for this
    -- transaction (never claimed, or already clawed back outside this
    -- path). Report that honestly and leave the postback un-marked —
    -- the old code marked it 'reversed' and returned success with
    -- amount_reversed 0, hiding the miss.
    IF NOT FOUND OR COALESCE(v_granted, 0) <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_processed', false,
            'amount_reversed', 0,
            'error', 'No crystal grant found for this transaction; nothing to reverse'
        );
    END IF;

    BEGIN
        INSERT INTO public.crystal_ledger (
            user_id, amount, type, source, source_id, description, created_at
        ) VALUES (
            v_postback.user_id,
            -v_granted,
            'SPEND',
            v_source,
            v_trans_id || ':reversal',
            'Survey grant reversed: partner clawback',
            TIMEZONE('utc'::text, NOW())
        );
    EXCEPTION WHEN unique_violation THEN
        -- Reversal already recorded; fall through to mark the row.
        NULL;
    END;

    UPDATE public.user_wallets
    SET mana_crystals = GREATEST(0, mana_crystals - v_granted),
        last_synced_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_postback.user_id
    RETURNING mana_crystals INTO v_new_crystals;

    IF FOUND THEN
        v_current_crystals := v_new_crystals;
        UPDATE public.crystal_leaderboard
        SET crystals_mined = v_new_crystals,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE user_id = v_postback.user_id;
    END IF;

    UPDATE public.cpx_postback_log
    SET status = 'reversed',
        reversed_at = TIMEZONE('utc'::text, NOW())
    WHERE id = v_postback.id;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'amount_reversed', v_granted,
        'new_balance', v_current_crystals
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
    -- 5E (#6): normalized once; every dedupe check and insert below uses
    -- this, never the raw parameter (whitespace variants of the same id
    -- previously bypassed idempotency and stored inconsistent keys).
    v_request_uuid TEXT;
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
    v_request_uuid := trim(p_request_uuid);

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
        WHERE source = 'redemption' AND source_id = v_request_uuid AND user_id = v_user_id
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
        v_request_uuid,
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
        v_request_uuid,
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
    -- 5E (#6): normalized once; every compare/insert below uses this,
    -- never the raw parameter (see request_redemption_secure).
    v_request_id TEXT;
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
    v_request_id := trim(p_request_id);

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
        WHERE user_id = v_user_id AND request_id = v_request_id
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
        v_request_id,
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
        v_request_id,
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
-- 5E (#15): entries no longer expose the raw auth user_id of every hunter;
-- each entry carries is_current_user instead so the client can still
-- highlight/locate its own row.
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
    -- 5E (#10): 'crystals' is a real category (the ELSE branch below) —
    -- without it in the allowlist it was coerced to 'streak' and the
    -- crystals branch was unreachable.
    IF p_category IS NULL OR p_category NOT IN ('streak', 'reps', 'power', 'crystals') THEN
        p_category := 'streak';
    END IF;

    SELECT COUNT(*) INTO v_total_count FROM public.crystal_leaderboard;

    IF p_category = 'streak' THEN
        SELECT jsonb_agg(sub) INTO v_entries FROM (
            SELECT 
                (user_id = auth.uid()::text) AS is_current_user,
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
                'is_current_user', true,
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
                (user_id = auth.uid()::text) AS is_current_user,
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
                'is_current_user', true,
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
                (user_id = auth.uid()::text) AS is_current_user,
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
                'is_current_user', true,
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
        -- Crystal mining category ('crystals')
        SELECT jsonb_agg(sub) INTO v_entries FROM (
            SELECT 
                (user_id = auth.uid()::text) AS is_current_user,
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
                'is_current_user', true,
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


-- 5. delete_account_secure: Deletes the CALLER's complete cloud account.
-- Batch 5E (#3): previously the Delete Account flow removed only the
-- user_cloud_saves row; the wallet, both ledgers, leaderboard row,
-- redemptions, payout requests, postback log and the Supabase login
-- itself all survived. This RPC deletes the caller's rows from every
-- user-scoped table and removes the auth.users record LAST, so the
-- login is gone too.
-- POLICY (documented): payout_requests that are still PENDING are
-- deleted with the account like everything else — deleting your
-- account forfeits any pending payout.
-- The client wipes local data ONLY after this RPC confirms success.
CREATE OR REPLACE FUNCTION public.delete_account_secure()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_user_id TEXT;
    v_email TEXT;
    v_saves INTEGER := 0;
    v_wallets INTEGER := 0;
    v_crystal_ledger INTEGER := 0;
    v_coin_ledger INTEGER := 0;
    v_leaderboard INTEGER := 0;
    v_redemptions INTEGER := 0;
    v_payouts INTEGER := 0;
    v_postbacks INTEGER := 0;
    v_auth INTEGER := 0;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated caller');
    END IF;
    v_user_id := v_uid::text;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    -- Cloud saves are keyed by email with a nullable user_id (M17):
    -- match the caller by uid OR by their auth email.
    DELETE FROM public.user_cloud_saves
    WHERE user_id = v_user_id
       OR (v_email IS NOT NULL AND lower(email) = lower(v_email));
    GET DIAGNOSTICS v_saves = ROW_COUNT;

    DELETE FROM public.user_wallets WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_wallets = ROW_COUNT;

    DELETE FROM public.crystal_ledger WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_crystal_ledger = ROW_COUNT;

    DELETE FROM public.coin_ledger WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_coin_ledger = ROW_COUNT;

    DELETE FROM public.crystal_leaderboard WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_leaderboard = ROW_COUNT;

    DELETE FROM public.crystal_redemptions WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_redemptions = ROW_COUNT;

    -- Pending payout_requests are deleted with the account (policy above).
    DELETE FROM public.payout_requests WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_payouts = ROW_COUNT;

    DELETE FROM public.cpx_postback_log WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_postbacks = ROW_COUNT;

    -- The login itself, deleted LAST.
    DELETE FROM auth.users WHERE id = v_uid;
    GET DIAGNOSTICS v_auth = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'auth_user_deleted', v_auth > 0,
        'deleted', jsonb_build_object(
            'user_cloud_saves', v_saves,
            'user_wallets', v_wallets,
            'crystal_ledger', v_crystal_ledger,
            'coin_ledger', v_coin_ledger,
            'crystal_leaderboard', v_leaderboard,
            'crystal_redemptions', v_redemptions,
            'payout_requests', v_payouts,
            'cpx_postback_log', v_postbacks
        )
    );
END;
$$;

-- 6. reconcile_wallets_admin: report-only wallet-vs-ledger diagnostic.
-- Batch 5F (#5): user_wallets caches balances while crystal_ledger /
-- coin_ledger are the transaction record, and nothing enforced that
-- the two agree. This RPC SURFACES the difference per user — it never
-- writes anything. A nonzero crystal diff can be legitimate: the 5D
-- survey reversal floors the wallet at 0 (crystals the user already
-- spent cannot be un-spent) while the ledger records the full
-- reversal. The report surfaces; a human decides. There is no
-- auto-fix. service_role ONLY (see grants section): the report
-- exposes every user's balances, so clients must never execute it.
CREATE OR REPLACE FUNCTION public.reconcile_wallets_admin(p_user_id TEXT DEFAULT NULL)
RETURNS TABLE (
    user_id TEXT,
    wallet_crystals INTEGER,
    ledger_crystals BIGINT,
    crystal_diff BIGINT,
    wallet_coins INTEGER,
    ledger_coins BIGINT,
    coin_diff BIGINT,
    last_crystal_entry TIMESTAMPTZ,
    last_coin_entry TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.user_id,
        w.mana_crystals,
        COALESCE(cl.balance, 0),
        w.mana_crystals::BIGINT - COALESCE(cl.balance, 0),
        w.cloud_coins,
        COALESCE(kl.balance, 0),
        w.cloud_coins::BIGINT - COALESCE(kl.balance, 0),
        cl.last_entry,
        kl.last_entry
    FROM public.user_wallets w
    LEFT JOIN (
        SELECT l.user_id AS uid, SUM(l.amount) AS balance, MAX(l.created_at) AS last_entry
        FROM public.crystal_ledger l
        GROUP BY l.user_id
    ) cl ON cl.uid = w.user_id
    LEFT JOIN (
        SELECT l.user_id AS uid, SUM(l.amount) AS balance, MAX(l.created_at) AS last_entry
        FROM public.coin_ledger l
        GROUP BY l.user_id
    ) kl ON kl.uid = w.user_id
    WHERE p_user_id IS NULL OR w.user_id = p_user_id
    ORDER BY w.user_id;
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
ALTER FUNCTION public.delete_account_secure()
    SET search_path = public;
ALTER FUNCTION public.reconcile_wallets_admin(TEXT)
    SET search_path = public;
ALTER FUNCTION public.reverse_survey_grant_secure(TEXT, TEXT)
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
REVOKE EXECUTE ON FUNCTION public.delete_account_secure()
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
-- Batch 5E (#3): account deletion is caller-only — authenticated users
-- can delete their OWN account (identity comes from auth.uid() inside);
-- anon can never execute it.
GRANT EXECUTE ON FUNCTION public.delete_account_secure()
    TO authenticated, service_role;
-- Batch 5D: reversal is service_role ONLY (the Edge Function). The
-- function itself also rejects non-service_role callers via auth.role().
REVOKE EXECUTE ON FUNCTION public.reverse_survey_grant_secure(TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_survey_grant_secure(TEXT, TEXT)
    TO service_role;
-- Batch 5F (#5): the reconciliation report exposes EVERY user's
-- balances — service_role only, exactly like the survey reversal.
REVOKE EXECUTE ON FUNCTION public.reconcile_wallets_admin(TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_wallets_admin(TEXT)
    TO service_role;
