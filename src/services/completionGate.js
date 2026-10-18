/**
 * ARISE — Completion Token Gate
 *
 * Prevents completion replay attacks, arbitrary deep-link reward minting,
 * and zero-effort reward forging.
 * Tokens are bound to the FULL exercise context (type, quest, reps,
 * duration, target), single-use, and expire after 5 minutes.
 *
 * NOT cryptographic proof: the token is an in-memory anti-replay nonce.
 * An attacker with JS access can mint tokens, so the server must NEVER
 * treat a completion token as proof of effort — money paths require
 * server-verified events (see grant_crystals_secure in schema.sql).
 */

/**
 * @typedef {Object} CompletionContext
 * @property {string} exerciseType
 * @property {string} [questId]
 * @property {number} [reps]
 * @property {number} [duration]
 * @property {number} [target]
 */

/**
 * @typedef {Object} StoredTokenRecord
 * @property {CompletionContext} context
 * @property {number} expiresAt
 */

/** @type {Map<string, StoredTokenRecord>} */
const activeTokens = new Map();

const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Issues a single-use, context-bound completion token
 * @param {CompletionContext} [context]
 * @returns {string}
 */
export function issueCompletionToken(context = { exerciseType: 'UNKNOWN' }) {
  pruneExpiredTokens();
  const token = `arise_tok_${Date.now().toString(36)}_${randomTokenPart()}`;

  activeTokens.set(token, {
    context: {
      exerciseType: String(context.exerciseType || 'UNKNOWN'),
      questId: context.questId ? String(context.questId) : undefined,
      reps: Number.isFinite(context.reps) ? Number(context.reps) : undefined,
      duration: Number.isFinite(context.duration) ? Number(context.duration) : undefined,
      target: Number.isFinite(context.target) ? Number(context.target) : undefined,
    },
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  });

  return token;
}

/**
 * Validates a completion token WITHOUT consuming it.
 * Use this to gate entry into the grant flow; call consumeCompletionToken
 * only AFTER the grant succeeds, so a crash mid-grant does not destroy
 * a legitimate user's token (previously: consume-first meant a crash left
 * the user with 0 rewards and an unrecoverable token).
 * @param {string | undefined} token
 * @param {Partial<CompletionContext>} [expectedContext]
 * @returns {boolean}
 */
export function peekCompletionToken(token, expectedContext) {
  if (!token || typeof token !== 'string' || !activeTokens.has(token)) {
    return false;
  }
  const record = activeTokens.get(token);
  if (!record || Date.now() > record.expiresAt) {
    return false;
  }
  return matchesContext(record, expectedContext);
}

/**
 * Consumes and invalidates a completion token, optionally validating expected context
 * @param {string | undefined} token
 * @param {Partial<CompletionContext>} [expectedContext]
 * @returns {boolean}
 */
export function consumeCompletionToken(token, expectedContext) {
  if (!token || typeof token !== 'string' || !activeTokens.has(token)) {
    return false;
  }

  const record = activeTokens.get(token);
  // Atomic single-use invalidation
  activeTokens.delete(token);

  if (!record || Date.now() > record.expiresAt) {
    return false;
  }

  return matchesContext(record, expectedContext);
}

function matchesContext(record, expectedContext) {
  if (!expectedContext) {
    return true;
  }
  const ctx = record.context;
  if (expectedContext.exerciseType && expectedContext.exerciseType !== ctx.exerciseType) {
    return false;
  }
  if (expectedContext.questId && expectedContext.questId !== ctx.questId) {
    return false;
  }
  // Full binding (C1): the token is bound to the exact effort that was
  // issued. A tampered route param (reps/duration/target) must not match.
  // Fields the issuer did not set are skipped (e.g. focus has no reps).
  if (Number.isFinite(expectedContext.reps) && expectedContext.reps !== ctx.reps) {
    return false;
  }
  if (Number.isFinite(expectedContext.duration) && expectedContext.duration !== ctx.duration) {
    return false;
  }
  if (Number.isFinite(expectedContext.target) && expectedContext.target !== ctx.target) {
    return false;
  }
  return true;
}

// CSPRNG token entropy (C1). Previously Math.random() — predictable.
// Falls back to timestamp + counter + Math.random only where WebCrypto
// is unavailable, so the gate never crashes in exotic environments.
let tokenCounter = 0;
function randomTokenPart() {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  tokenCounter += 1;
  return `${Date.now().toString(36)}${tokenCounter.toString(36)}${Math.random().toString(36).slice(2)}`;
}

function pruneExpiredTokens() {
  const now = Date.now();
  for (const [token, record] of activeTokens.entries()) {
    if (now > record.expiresAt) {
      activeTokens.delete(token);
    }
  }
}
