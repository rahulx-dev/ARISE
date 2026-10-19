// Pure postback verification + parsing for the `survey-postback` Edge Function.
// Batch 5D PROFIT GATE: crystals are granted ONLY from a provider-
// authenticated postback that confirms revenue. This module has NO
// imports (Deno + Node compatible) so `node --test` can import it
// directly and exercise the exact code the webhook runs.
//
// Verified provider contracts:
// - BitLabs (https://bitlabs.ai/integrations/server-to-server-callback):
//   callback carries uid, tx, val (user reward in app currency), raw
//   (USD paid to the publisher), type (COMPLETE|SCREENOUT), and hash =
//   HEX HMAC-SHA1 of the FULL callback URL (minus &hash=...) keyed with
//   the App Secret. Callbacks fire for completions AND screenout rewards.
// - CPX Research: the publisher builds the postback URL in the CPX
//   dashboard from placeholders (subid, amount_local, amount_usd, ...).
//   CPX signs nothing, so authentication is a secret `key` query param
//   that must equal CPX_POSTBACK_SECRET. amount_usd = USD revenue CPX
//   owes the publisher; amount_local = crystal reward CPX computed with
//   the dashboard currency factor (already net of the publisher's cut).

export type Provider = 'cpx' | 'bitlabs';

export interface PostbackRecord {
  provider: Provider;
  trans_id: string;
  user_id: string;
  amount_crystals: number;
  amount_usd: number;
  status: 'approved' | 'rejected' | 'reversed';
  callback_type: string | null;
}

export interface ParseResult {
  ok: boolean;
  error?: string;
  record?: PostbackRecord;
  /** True when the postback is a reversal of a previously approved payout. */
  isReversal?: boolean;
}

/** Constant-time string comparison (avoids leaking match position). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha1Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * BitLabs hash check, following BitLabs' own Node example: split the full
 * callback URL on '&hash=' and HMAC-SHA1 the part before it.
 */
export async function verifyBitlabsHash(fullUrl: string, appSecret: string): Promise<boolean> {
  const idx = fullUrl.indexOf('&hash=');
  if (idx < 0 || !appSecret) return false;
  const received = fullUrl.slice(idx + '&hash='.length);
  if (!/^[0-9a-f]{40}$/i.test(received)) return false;
  const expected = await hmacSha1Hex(fullUrl.slice(0, idx), appSecret);
  return timingSafeEqual(received.toLowerCase(), expected.toLowerCase());
}

function parseNonNegativeNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function firstParam(params: URLSearchParams, names: string[]): string | null {
  for (const name of names) {
    const v = params.get(name);
    if (v !== null && v.trim() !== '') return v.trim();
  }
  return null;
}

/**
 * Parse + authenticate a BitLabs callback. The caller must have already
 * verified the hash (or pass verify=true to do it here). A callback is
 * grant-eligible ('approved') ONLY when raw (USD paid to publisher) > 0 —
 * a zero-revenue callback is recorded as 'rejected' and can never mint.
 */
export async function parseBitlabsCallback(
  fullUrl: string,
  params: URLSearchParams,
  appSecret: string,
): Promise<ParseResult> {
  if (!(await verifyBitlabsHash(fullUrl, appSecret))) {
    return { ok: false, error: 'Invalid BitLabs hash' };
  }
  const uid = firstParam(params, ['uid']);
  const tx = firstParam(params, ['tx']);
  const val = parseNonNegativeNumber(params.get('val'));
  const raw = parseNonNegativeNumber(params.get('raw'));
  const type = firstParam(params, ['type']);
  if (!uid || uid.length > 256) return { ok: false, error: 'Missing or invalid uid' };
  if (!tx || tx.length > 256) return { ok: false, error: 'Missing or invalid tx' };
  if (val === null || raw === null) return { ok: false, error: 'Missing or invalid val/raw' };
  return {
    ok: true,
    record: {
      provider: 'bitlabs',
      trans_id: tx,
      user_id: uid,
      // VAL is the reward in app currency as configured in the BitLabs
      // dashboard; crystals are integers, so floor fractional values.
      amount_crystals: Math.floor(val),
      amount_usd: raw,
      status: raw > 0 ? 'approved' : 'rejected',
      callback_type: type,
    },
  };
}

/**
 * Parse + authenticate a CPX postback. Authentication is the shared
 * secret `key` query param (CPX signs nothing). Param aliases are
 * accepted because CPX placeholder names are configured per-dashboard.
 * A postback is grant-eligible ('approved') ONLY when amount_usd > 0.
 * status=reversed (if CPX ever sends it) routes to the reversal RPC.
 */
export function parseCpxPostback(
  params: URLSearchParams,
  postbackSecret: string,
): ParseResult {
  const key = params.get('key');
  if (!postbackSecret || !key || !timingSafeEqual(key, postbackSecret)) {
    return { ok: false, error: 'Invalid CPX postback key' };
  }
  const transId = firstParam(params, ['trans_id', 'transaction_id', 'transid']);
  const userId = firstParam(params, ['user_id', 'subid', 'ext_user_id']);
  const amountLocal = parseNonNegativeNumber(params.get('amount_local'));
  const amountUsd = parseNonNegativeNumber(params.get('amount_usd'));
  const status = (params.get('status') || '').trim().toLowerCase();
  if (!transId || transId.length > 256) return { ok: false, error: 'Missing or invalid trans_id' };
  if (!userId || userId.length > 256) return { ok: false, error: 'Missing or invalid user_id' };
  if (amountLocal === null || amountUsd === null) {
    return { ok: false, error: 'Missing or invalid amount_local/amount_usd' };
  }
  if (status === 'reversed' || status === 'chargeback' || status === 'revoked') {
    return {
      ok: true,
      isReversal: true,
      record: {
        provider: 'cpx',
        trans_id: transId,
        user_id: userId,
        amount_crystals: 0,
        amount_usd: 0,
        status: 'reversed',
        callback_type: null,
      },
    };
  }
  return {
    ok: true,
    record: {
      provider: 'cpx',
      trans_id: transId,
      user_id: userId,
      amount_crystals: Math.floor(amountLocal),
      amount_usd: amountUsd,
      status: amountUsd > 0 ? 'approved' : 'rejected',
      callback_type: null,
    },
  };
}
