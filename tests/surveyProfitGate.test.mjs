import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import {
  timingSafeEqual,
  verifyBitlabsHash,
  parseBitlabsCallback,
  parseCpxPostback,
} from '../supabase/functions/survey-postback/verify.ts';

// Batch 5D PROFIT GATE: crystals only from a provider-authenticated
// postback that confirms revenue. These tests exercise the EXACT
// verification code the Edge Function runs.

// --- BitLabs: provider's own published test vector ---
// Docs: URL "https://publisher.com/complete?uid=8cc877ee-af19-488d-b28d-216fb866b996&val=500"
// + secret "JLOIAUNMHFli7ZJOQVEzm98rzqnm9" -> hash "dbcd6bb8ca677344592842a52b4fca9bec36cd4b".
const BITLABS_SECRET = 'JLOIAUNMHFli7ZJOQVEzm98rzqnm9';
const BITLABS_VECTOR_URL =
  'https://publisher.com/complete?uid=8cc877ee-af19-488d-b28d-216fb866b996&val=500&hash=dbcd6bb8ca677344592842a52b4fca9bec36cd4b';

test('BitLabs: published hash vector verifies', async () => {
  assert.equal(await verifyBitlabsHash(BITLABS_VECTOR_URL, BITLABS_SECRET), true);
});

test('BitLabs: tampered value fails the hash', async () => {
  const tampered = BITLABS_VECTOR_URL.replace('val=500', 'val=50000');
  assert.equal(await verifyBitlabsHash(tampered, BITLABS_SECRET), false);
});

test('BitLabs: wrong secret fails the hash', async () => {
  assert.equal(await verifyBitlabsHash(BITLABS_VECTOR_URL, 'wrong-secret'), false);
});

function bitlabsUrl(params) {
  const base = 'https://example.supabase.co/functions/v1/survey-postback?provider=bitlabs';
  const qs = new URLSearchParams(params).toString();
  const withoutHash = `${base}&${qs}`;
  const hash = createHmac('sha1', BITLABS_SECRET).update(withoutHash).digest('hex');
  return `${withoutHash}&hash=${hash}`;
}

test('BitLabs: revenue-confirmed callback parses as approved', async () => {
  const url = bitlabsUrl({ uid: 'user-123', tx: '98765', val: '225', raw: '1.25', type: 'COMPLETE' });
  const res = await parseBitlabsCallback(url, new URL(url).searchParams, BITLABS_SECRET);
  assert.equal(res.ok, true);
  assert.equal(res.record.provider, 'bitlabs');
  assert.equal(res.record.trans_id, '98765');
  assert.equal(res.record.amount_crystals, 225);
  assert.equal(res.record.amount_usd, 1.25);
  assert.equal(res.record.status, 'approved');
});

test('BitLabs: zero-revenue callback is recorded as rejected, never approved', async () => {
  const url = bitlabsUrl({ uid: 'user-123', tx: '98766', val: '0', raw: '0', type: 'SCREENOUT' });
  const res = await parseBitlabsCallback(url, new URL(url).searchParams, BITLABS_SECRET);
  assert.equal(res.ok, true);
  assert.equal(res.record.status, 'rejected');
});

test('BitLabs: fractional VAL floors to integer crystals', async () => {
  const url = bitlabsUrl({ uid: 'user-123', tx: '98767', val: '225.9', raw: '1.25', type: 'COMPLETE' });
  const res = await parseBitlabsCallback(url, new URL(url).searchParams, BITLABS_SECRET);
  assert.equal(res.record.amount_crystals, 225);
});

test('BitLabs: callback with bad hash is rejected outright', async () => {
  const url = bitlabsUrl({ uid: 'user-123', tx: '98768', val: '225', raw: '1.25', type: 'COMPLETE' });
  const bad = url.replace(/hash=[0-9a-f]+$/, 'hash=0000000000000000000000000000000000000000');
  const res = await parseBitlabsCallback(bad, new URL(bad).searchParams, BITLABS_SECRET);
  assert.equal(res.ok, false);
});

// --- CPX: shared-secret key auth ---
const CPX_SECRET = 'test-cpx-secret';

function cpxParams(overrides = {}) {
  return new URLSearchParams({
    provider: 'cpx',
    key: CPX_SECRET,
    trans_id: 'cpx-tx-1',
    user_id: 'user-123',
    amount_local: '360',
    amount_usd: '2.00',
    ...overrides,
  });
}

test('CPX: correct key + revenue parses as approved', () => {
  const res = parseCpxPostback(cpxParams(), CPX_SECRET);
  assert.equal(res.ok, true);
  assert.equal(res.record.status, 'approved');
  assert.equal(res.record.amount_crystals, 360);
  assert.equal(res.record.amount_usd, 2);
});

test('CPX: wrong key is rejected — no row is ever written', () => {
  const res = parseCpxPostback(cpxParams({ key: 'attacker-key' }), CPX_SECRET);
  assert.equal(res.ok, false);
});

test('CPX: zero-revenue postback is rejected, never approved', () => {
  const res = parseCpxPostback(cpxParams({ amount_usd: '0', amount_local: '0' }), CPX_SECRET);
  assert.equal(res.ok, true);
  assert.equal(res.record.status, 'rejected');
});

test('CPX: reversal status routes to the clawback path', () => {
  const res = parseCpxPostback(cpxParams({ status: 'reversed' }), CPX_SECRET);
  assert.equal(res.ok, true);
  assert.equal(res.isReversal, true);
});

test('CPX: subid/ext_user_id aliases resolve to the user id', () => {
  const params = new URLSearchParams({
    provider: 'cpx',
    key: CPX_SECRET,
    transaction_id: 'cpx-tx-9',
    subid: 'user-999',
    amount_local: '180',
    amount_usd: '1.00',
  });
  const res = parseCpxPostback(params, CPX_SECRET);
  assert.equal(res.ok, true);
  assert.equal(res.record.trans_id, 'cpx-tx-9');
  assert.equal(res.record.user_id, 'user-999');
});

// --- timing-safe compare ---
test('timingSafeEqual: equal, length mismatch, content mismatch', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
});

// --- SQL guards: the profit gate must exist in the real schema file ---
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

test('SQL: grant requires approved + signature_verified + unclaimed + revenue', () => {
  for (const needle of [
    "status = 'approved'",
    'signature_verified = true',
    'claimed = false',
    'amount_usd > 0',
    'v_amount := v_postback_amount',
  ]) {
    assert.ok(schema.includes(needle), `schema.sql missing: ${needle}`);
  }
  // The old client-amount cap is gone: the caller can no longer pick an amount.
  assert.ok(!schema.includes('p_amount > v_postback_amount'));
});

test('SQL: reversal RPC exists and is service-role only', () => {
  assert.ok(schema.includes('reverse_survey_grant_secure'));
  assert.ok(schema.includes("auth.role() <> 'service_role'"));
});

test('SQL: clients have NO write policy on the postback log', () => {
  const policies = [...schema.matchAll(/CREATE POLICY "[^"]+" ON public\.cpx_postback_log/g)];
  assert.equal(policies.length, 1);
  assert.ok(schema.includes('cpx_postback_select_owner'));
});

// --- Client guards ---
const gateService = readFileSync(new URL('../src/services/gateSpawnService.ts', import.meta.url), 'utf8');
const crystalRepo = readFileSync(new URL('../src/database/repositories/crystalRepository.ts', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../src/components/surveys/InAppSurveyModal.tsx', import.meta.url), 'utf8');
const surveyConfig = readFileSync(new URL('../src/config/surveyConfig.ts', import.meta.url), 'utf8');
const webhook = readFileSync(
  new URL('../supabase/functions/survey-postback/index.ts', import.meta.url),
  'utf8',
);

test('Client: no client-side verified boolean, no invented payout math', () => {
  assert.ok(!gateService.includes('isPartnerVerified'));
  assert.ok(!gateService.includes('calculateHunterCrystals'));
  assert.ok(!gateService.includes('hunterCrystals'));
  assert.ok(!surveyConfig.includes('PROFIT_MODEL'));
  assert.ok(!modal.includes('api.cpx-research.com'));
  assert.ok(!modal.includes('get-user-history'));
});

test('Client: survey claims go through the claim RPC with amount 0', () => {
  assert.ok(gateService.includes('claimSurveyCrystals'));
  assert.ok(crystalRepo.includes('claimSurveyCrystals'));
  assert.ok(crystalRepo.includes('p_amount: 0'));
  // The claim path must state it never mints locally/offline.
  assert.ok(crystalRepo.includes('NO offline'));
});

test('Webhook: records only, never grants', () => {
  assert.ok(webhook.includes('reverse_survey_grant_secure'));
  assert.ok(webhook.includes('granted: false'));
  // The webhook must never CALL the grant RPC (comments may mention it).
  assert.ok(!webhook.includes("rpc('grant_crystals_secure'"));
});
