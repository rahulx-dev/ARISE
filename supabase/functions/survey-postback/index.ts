// `survey-postback` Edge Function — the ONLY writer of cpx_postback_log.
// Batch 5D PROFIT GATE: this function RECORDS provider-authenticated
// postbacks. It NEVER grants crystals. Grants happen only when the app
// claims a recorded transaction through `grant_crystals_secure`, which
// re-checks the row (approved + signature_verified + unclaimed +
// amount_usd > 0) and derives the crystal amount from the row.
//
// Deploy (Lucky runs this; secrets are set in the Supabase dashboard,
// never in code or chat):
//   supabase functions deploy survey-postback
//   supabase secrets set CPX_POSTBACK_SECRET=<secret> BITLABS_APP_SECRET=<secret>
//
// Dashboard wiring:
// - CPX Postback Settings -> postback URL:
//   https://<project-ref>.supabase.co/functions/v1/survey-postback
//     ?provider=cpx&key=<CPX_POSTBACK_SECRET>
//     &trans_id={trans_id}&user_id={subid}
//     &amount_local={amount_local}&amount_usd={amount_usd}
//   (Confirm the exact placeholder names on the right side of the CPX
//   Postback Settings page; the function also accepts transaction_id /
//   ext_user_id aliases. Set the CPX currency factor so amount_local is
//   the crystal reward AFTER your commission — e.g. 180 = 1 USD -> 180
//   crystals to the user.)
// - BitLabs Dashboard -> callback URL:
//   https://<project-ref>.supabase.co/functions/v1/survey-postback
//     ?provider=bitlabs&uid=[%UID%]&tx=[%TX%]&val=[%VAL%]&raw=[%RAW%]&type=[%TYPE%]
//   (BitLabs appends &hash=... itself. Configure the BitLabs reward
//   conversion so VAL is the crystal reward AFTER your commission.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseBitlabsCallback, parseCpxPostback } from './verify.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed' });
    }
    const url = new URL(req.url);
    const params = url.searchParams;
    const provider = params.get('provider');

    if (provider !== 'cpx' && provider !== 'bitlabs') {
      return json(400, { ok: false, error: 'Missing or invalid provider (cpx|bitlabs)' });
    }

    // Authenticate + parse with the provider's own scheme. Anything that
    // fails auth or validation is dropped WITHOUT writing a row.
    let parsed;
    if (provider === 'bitlabs') {
      const secret = Deno.env.get('BITLABS_APP_SECRET') ?? '';
      if (!secret) return json(500, { ok: false, error: 'BitLabs secret not configured' });
      parsed = await parseBitlabsCallback(req.url, params, secret);
    } else {
      const secret = Deno.env.get('CPX_POSTBACK_SECRET') ?? '';
      if (!secret) return json(500, { ok: false, error: 'CPX secret not configured' });
      parsed = parseCpxPostback(params, secret);
    }
    if (!parsed.ok || !parsed.record) {
      // 401 for authentication failures, 400 for malformed payloads.
      const authError =
        parsed.error === 'Invalid CPX postback key' || parsed.error === 'Invalid BitLabs hash';
      return json(authError ? 401 : 400, { ok: false, error: parsed.error ?? 'Invalid postback' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return json(500, { ok: false, error: 'Supabase service credentials not configured' });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Reversal: a previously approved payout was taken back. Claw the
    // crystals back through the service-role-only RPC (never by hand).
    if (parsed.isReversal) {
      const { data, error } = await supabase.rpc('reverse_survey_grant_secure', {
        p_provider: parsed.record.provider,
        p_trans_id: parsed.record.trans_id,
      });
      if (error) return json(500, { ok: false, error: 'Reversal failed' });
      return json(200, { ok: true, reversed: true, result: data });
    }

    // Record the verified postback. ignoreDuplicates: a network retry of
    // the same (provider, trans_id) must not double-record or re-grant —
    // the grant RPC's claimed flag is the second guard.
    const { error } = await supabase.from('cpx_postback_log').upsert(
      {
        provider: parsed.record.provider,
        trans_id: parsed.record.trans_id,
        user_id: parsed.record.user_id,
        amount_crystals: parsed.record.amount_crystals,
        amount_usd: parsed.record.amount_usd,
        status: parsed.record.status,
        signature_verified: true,
        claimed: false,
        callback_type: parsed.record.callback_type,
      },
      { onConflict: 'provider,trans_id', ignoreDuplicates: true },
    );
    if (error) return json(500, { ok: false, error: 'Failed to record postback' });

    return json(200, {
      ok: true,
      recorded: true,
      provider: parsed.record.provider,
      trans_id: parsed.record.trans_id,
      status: parsed.record.status,
      // The webhook never mints. The app claims via grant_crystals_secure.
      granted: false,
    });
  } catch (e) {
    console.error('[survey-postback] unexpected error:', e instanceof Error ? e.message : String(e));
    return json(500, { ok: false, error: 'Internal error' });
  }
});
