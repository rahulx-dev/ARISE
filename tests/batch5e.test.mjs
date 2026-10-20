import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Batch 5E: the 11 CONFIRMED audit fixes. SQL assertions read the real
// supabase/schema.sql (same pattern as tests/surveyProfitGate.test.mjs);
// client assertions read the real client sources.
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const cloudSync = readFileSync(new URL('../src/services/cloudSyncService.ts', import.meta.url), 'utf8');
const payoutRepo = readFileSync(
  new URL('../src/database/repositories/payoutRepository.ts', import.meta.url),
  'utf8',
);
const storageScreen = readFileSync(new URL('../app/settings/storage.tsx', import.meta.url), 'utf8');

function region(startNeedle, endNeedle) {
  const start = schema.indexOf(startNeedle);
  assert.ok(start >= 0, `region start not found: ${startNeedle}`);
  const end = schema.indexOf(endNeedle, start);
  assert.ok(end > start, `region end not found: ${endNeedle}`);
  return schema.slice(start, end);
}

const grantFn = () =>
  region(
    'CREATE OR REPLACE FUNCTION public.grant_crystals_secure',
    'CREATE OR REPLACE FUNCTION public.reverse_survey_grant_secure',
  );
const reversalFn = () =>
  region(
    'CREATE OR REPLACE FUNCTION public.reverse_survey_grant_secure',
    'CREATE OR REPLACE FUNCTION public.request_redemption_secure',
  );
const redemptionFn = () =>
  region(
    'CREATE OR REPLACE FUNCTION public.request_redemption_secure',
    'CREATE OR REPLACE FUNCTION public.request_payout_secure',
  );
const payoutFn = () =>
  region(
    'CREATE OR REPLACE FUNCTION public.request_payout_secure',
    'CREATE OR REPLACE FUNCTION public.sync_hunter_profile_secure',
  );
const leaderboardFn = () =>
  region(
    'CREATE OR REPLACE FUNCTION public.get_hunter_leaderboard',
    'CREATE OR REPLACE FUNCTION public.delete_account_secure',
  );
const deleteFn = () =>
  region('CREATE OR REPLACE FUNCTION public.delete_account_secure', '-- Harden all SECURITY DEFINER RPCs');

// --- #6/#7: request/transaction ids normalized once, used everywhere ---
test('5E #6: redemption normalizes the request id once and stores only the normalized value', () => {
  const fn = redemptionFn();
  assert.ok(fn.includes('v_request_uuid := trim(p_request_uuid)'));
  assert.ok(fn.includes('source_id = v_request_uuid'));
  assert.ok((fn.match(/v_request_uuid/g) || []).length >= 4);
  // The raw parameter may only appear in validation + the assignment.
  assert.ok(!fn.includes('source_id = p_request_uuid'));
});

test('5E #6: payout normalizes the request id once and stores only the normalized value', () => {
  const fn = payoutFn();
  assert.ok(fn.includes('v_request_id := trim(p_request_id)'));
  assert.ok(fn.includes('request_id = v_request_id'));
  assert.ok((fn.match(/v_request_id/g) || []).length >= 4);
  assert.ok(!fn.includes('request_id = p_request_id'));
});

test('5E #7: survey grant uses one normalized trans id for lookup, claim and ledger', () => {
  const fn = grantFn();
  assert.ok(fn.includes('v_trans_id := trim(p_source_id)'));
  assert.ok((fn.match(/trans_id = v_trans_id/g) || []).length >= 2);
  assert.ok(!fn.includes('trans_id = trim(p_source_id)'));
});

test('5E #7: reversal uses the normalized id and fails honestly when no grant exists', () => {
  const fn = reversalFn();
  assert.ok(fn.includes('v_trans_id := trim(p_trans_id)'));
  assert.ok(fn.includes('source_id = v_trans_id'));
  assert.ok(!fn.includes('source_id = trim(p_trans_id)'));
  // No grant row -> success=false with a clear reason, no 'reversed' marking.
  assert.ok(fn.includes('No crystal grant found for this transaction; nothing to reverse'));
  assert.ok(fn.includes('IF NOT FOUND OR COALESCE(v_granted, 0) <= 0 THEN'));
});

// --- #8/#9: ledger sign + wallet bound CHECKs, fresh and upgrade paths ---
test('5E #8: both ledgers enforce amount sign matching type', () => {
  assert.ok(schema.includes('ck_crystal_ledger_amount_sign'));
  assert.ok(schema.includes('ck_coin_ledger_amount_sign'));
  const rule = "CHECK ((type = 'EARN' AND amount > 0) OR (type = 'SPEND' AND amount < 0))";
  assert.ok((schema.match(new RegExp(rule.replace(/[()]/g, '\\$&'), 'g')) || []).length >= 2);
  // Upgrade path must not abort the schema run on dirty legacy rows.
  assert.ok(schema.includes('WHEN check_violation THEN'));
  assert.ok(schema.includes('RAISE NOTICE'));
});

test('5E #9: wallet stat columns are bounded, with a clamp-first upgrade', () => {
  for (const [name, rule] of [
    ['ck_user_wallets_level', 'CHECK (level >= 1)'],
    ['ck_user_wallets_streak', 'CHECK (streak >= 0)'],
    ['ck_user_wallets_total_reps', 'CHECK (total_reps >= 0)'],
    ['ck_user_wallets_total_xp', 'CHECK (total_xp >= 0)'],
    ['ck_user_wallets_cloud_coins', 'CHECK (cloud_coins >= 0)'],
  ]) {
    assert.ok(schema.includes(name), `missing constraint: ${name}`);
    assert.ok(schema.includes(rule), `missing rule: ${rule}`);
  }
  // Existing violating rows are clamped before the CHECKs are added.
  assert.ok(schema.includes('level = GREATEST(level, 1)'));
  assert.ok(schema.includes('cloud_coins = GREATEST(cloud_coins, 0)'));
});

// --- #10: 'crystals' is a reachable leaderboard category ---
test("5E #10: leaderboard accepts 'crystals' instead of coercing it to 'streak'", () => {
  assert.ok(schema.includes("p_category NOT IN ('streak', 'reps', 'power', 'crystals')"));
});

// --- #15: leaderboard RPC no longer exposes raw user_id ---
test('5E #15: leaderboard entries carry is_current_user, not raw user_id', () => {
  const fn = leaderboardFn();
  assert.ok(fn.includes('(user_id = auth.uid()::text) AS is_current_user'));
  assert.ok(fn.includes("'is_current_user', true"));
  assert.ok(!fn.includes("'user_id', user_id"));
  assert.ok(!/^\s+user_id,$/m.test(fn), 'entries still select raw user_id');
});

// --- #3: delete_account_secure removes everything, login last ---
test('5E #3: delete_account_secure deletes every user table and the auth user', () => {
  const fn = deleteFn();
  for (const table of [
    'public.user_cloud_saves',
    'public.user_wallets',
    'public.crystal_ledger',
    'public.coin_ledger',
    'public.crystal_leaderboard',
    'public.crystal_redemptions',
    'public.payout_requests',
    'public.cpx_postback_log',
  ]) {
    assert.ok(fn.includes(`DELETE FROM ${table}`), `delete_account_secure misses: ${table}`);
  }
  assert.ok(fn.includes('DELETE FROM auth.users'));
  // Auth user deletion must come AFTER the table deletes.
  assert.ok(fn.indexOf('DELETE FROM auth.users') > fn.indexOf('DELETE FROM public.cpx_postback_log'));
  assert.ok(fn.includes("'auth_user_deleted'"));
  assert.ok(fn.includes('v_uid := auth.uid()'));
});

test('5E #3: delete_account_secure is authenticated-only', () => {
  assert.ok(schema.includes('REVOKE EXECUTE ON FUNCTION public.delete_account_secure()'));
  assert.ok(
    /GRANT EXECUTE ON FUNCTION public\.delete_account_secure\(\)\s+TO authenticated, service_role;/.test(schema),
  );
});

// --- Client-side halves ---
test('5E #2: crystal-only wallets trigger cloud reconstruction', () => {
  assert.ok(cloudSync.includes('wallet.mana_crystals && wallet.mana_crystals > 0'));
});

test('5E #13: payout sync upserts server payouts missing locally', () => {
  assert.ok(payoutRepo.includes('the server has a payout with NO local mirror'));
  assert.ok(payoutRepo.includes('await db.insert(payoutRequest).values({'));
});

test('5E #3 client: storage screen uses the RPC and fails closed', () => {
  assert.ok(storageScreen.includes("supabase.rpc(\"delete_account_secure\")"));
  // The old direct cloud-save delete and the 30-days support copy are gone.
  assert.ok(!storageScreen.includes('removed via support within 30 days'));
  assert.ok(!storageScreen.includes('.from("user_cloud_saves")'));
});
