import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Batch 5F: #4 (cloud-save ownership uid-only), #5 (reconciliation
// report RPC), #12 (no local crystal mint fallback), #14 (legacy
// postback status rename). SQL assertions read the real
// supabase/schema.sql; client assertions read the real client sources
// (same pattern as tests/batch5e.test.mjs).
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const cloudSync = readFileSync(new URL('../src/services/cloudSyncService.ts', import.meta.url), 'utf8');
const crystalRepo = readFileSync(
  new URL('../src/database/repositories/crystalRepository.ts', import.meta.url),
  'utf8',
);

function region(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert.ok(start >= 0, `region start not found: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start);
  assert.ok(end > start, `region end not found: ${endNeedle}`);
  return text.slice(start, end);
}

const grantFn = () =>
  region(
    schema,
    'CREATE OR REPLACE FUNCTION public.grant_crystals_secure',
    'CREATE OR REPLACE FUNCTION public.reverse_survey_grant_secure',
  );
const reconcileFn = () =>
  region(
    schema,
    'CREATE OR REPLACE FUNCTION public.reconcile_wallets_admin',
    '-- Harden all SECURITY DEFINER RPCs',
  );
const addCrystalsFn = () => region(crystalRepo, 'async addCrystals(', 'async claimSurveyCrystals(');

// --- #4: backfill first, email policy dropped, uid policy owns the table ---
test('5F #4: user_id backfill runs BEFORE the email policy is dropped', () => {
  const backfillIdx = schema.indexOf('SET user_id = u.id::text');
  const dropIdx = schema.indexOf('DROP POLICY IF EXISTS "user_cloud_saves_owner_rw" ON public.user_cloud_saves');
  assert.ok(backfillIdx >= 0, 'backfill UPDATE missing');
  assert.ok(dropIdx >= 0, 'email policy DROP missing');
  assert.ok(backfillIdx < dropIdx, 'backfill must precede the policy drop');
  // The backfill only fills un-owned rows whose email is an auth email.
  assert.ok(schema.includes('WHERE s.user_id IS NULL'));
  assert.ok(schema.includes('AND u.email IS NOT NULL'));
  assert.ok(schema.includes('lower(u.email) = lower(s.email)'));
  // Rows with no matching auth user are surfaced, not silently dropped.
  assert.ok(schema.includes('user_id IS NULL after backfill'));
});

test('5F #4: uid policy covers ALL operations with USING + WITH CHECK', () => {
  const uid = region(
    schema,
    'CREATE POLICY "user_cloud_saves_owner_uid"',
    'DROP POLICY IF EXISTS "user_cloud_saves_owner_rw"',
  );
  assert.ok(uid.includes('FOR ALL'));
  assert.ok(uid.includes('USING (user_id IS NOT NULL AND user_id = auth.uid()::text)'));
  assert.ok(uid.includes('WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid()::text)'));
  // The client write path always records the authenticated uid, so no
  // legitimate write depends on the dropped email policy.
  assert.ok(cloudSync.includes('user_id: authUser.id'));
});

// --- #5: reconciliation report RPC, service_role only ---
test('5F #5: reconcile_wallets_admin reports wallet-vs-ledger diffs', () => {
  const fn = reconcileFn();
  assert.ok(fn.includes('RETURNS TABLE'));
  assert.ok(fn.includes('SECURITY DEFINER'));
  assert.ok(fn.includes('STABLE'));
  // Ledger balances come from SUM over the signed ledger amounts.
  assert.ok((fn.match(/SUM\(l\.amount\)/g) || []).length >= 2);
  assert.ok(fn.includes('crystal_diff BIGINT'));
  assert.ok(fn.includes('coin_diff BIGINT'));
  assert.ok(fn.includes('w.mana_crystals::BIGINT - COALESCE(cl.balance, 0)'));
  assert.ok(fn.includes('w.cloud_coins::BIGINT - COALESCE(kl.balance, 0)'));
  // Optional single-user filter; NULL means every wallet.
  assert.ok(fn.includes('WHERE p_user_id IS NULL OR w.user_id = p_user_id'));
});

test('5F #5: reconcile_wallets_admin is service_role only', () => {
  assert.ok(
    /REVOKE EXECUTE ON FUNCTION public\.reconcile_wallets_admin\(TEXT\)\s+FROM PUBLIC, anon, authenticated;/.test(
      schema,
    ),
  );
  assert.ok(
    /GRANT EXECUTE ON FUNCTION public\.reconcile_wallets_admin\(TEXT\)\s+TO service_role;/.test(schema),
  );
  assert.ok(
    !/GRANT EXECUTE ON FUNCTION public\.reconcile_wallets_admin\(TEXT\)\s+TO authenticated/.test(schema),
    'reconcile_wallets_admin must never be granted to authenticated',
  );
});

// --- #14: legacy postbacks renamed, grant gate unchanged ---
test("5F #14: unverified unclaimed 'approved' postbacks become 'legacy_completed'", () => {
  assert.ok(schema.includes("SET status = 'legacy_completed'"));
  const rename = region(schema, "SET status = 'legacy_completed'", 'ADD CONSTRAINT cpx_postback_status_check');
  assert.ok(rename.includes("WHERE status = 'approved'"));
  assert.ok(rename.includes('signature_verified IS FALSE'));
  assert.ok(rename.includes('claimed IS FALSE'));
  // Runs after the 5D 'completed' -> 'approved' normalization.
  assert.ok(
    schema.indexOf("SET status = 'approved' WHERE status = 'completed'") <
      schema.indexOf("SET status = 'legacy_completed'"),
  );
  // The old CHECK is dropped before the rename and re-added with the
  // new status admitted, so re-runs cannot reject 'legacy_completed'.
  assert.ok(
    schema.indexOf('DROP CONSTRAINT IF EXISTS cpx_postback_status_check') <
      schema.indexOf("SET status = 'legacy_completed'"),
  );
  assert.ok(schema.includes("CHECK (status IN ('approved', 'rejected', 'reversed', 'legacy_completed'))"));
});

test('5F #14: grant still only accepts verified approved postbacks', () => {
  const fn = grantFn();
  assert.ok(fn.includes("status = 'approved'"));
  assert.ok(fn.includes('signature_verified = true'));
});

// --- #12: addCrystals never mints locally on failure ---
test('5F #12: addCrystals has no local-mint fallback', () => {
  const fn = addCrystalsFn();
  // The old offline fallback block (local tx mint) is gone.
  assert.ok(!fn.includes('Offline Fallback'));
  assert.ok(!fn.includes('const next = current + amount'));
  assert.ok(!fn.includes('db.transaction'));
  // Transport failure / unconfigured now ends in an explicit failure
  // with the local balance returned unchanged — same shape as the H5
  // server-rejection return.
  assert.ok(fn.includes('NO local fallback mint'));
  assert.ok(fn.includes('return { success: false, newBalance: Number(profile.manaCrystals) || 0 };'));
  // The server-confirmed success path is untouched.
  assert.ok(fn.includes('authoritativeBalance'));
  assert.ok(fn.includes("supabase.rpc('grant_crystals_secure'"));
});
