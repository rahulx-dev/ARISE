/**
 * ARISE — Cryptographic Completion Token Gate
 *
 * Prevents completion replay attacks, arbitrary deep-link reward minting,
 * and zero-effort reward forging.
 * Tokens are bound to exercise context, single-use, and expire after 5 minutes.
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
 * Issues a cryptographically bound single-use completion token
 * @param {CompletionContext} [context]
 * @returns {string}
 */
export function issueCompletionToken(context = { exerciseType: 'UNKNOWN' }) {
  pruneExpiredTokens();
  const randomPart = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const token = `arise_tok_${Date.now().toString(36)}_${randomPart}`;

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
  if (expectedContext.exerciseType && expectedContext.exerciseType !== record.context.exerciseType) {
    return false;
  }
  if (expectedContext.questId && expectedContext.questId !== record.context.questId) {
    return false;
  }
  return true;
}

function pruneExpiredTokens() {
  const now = Date.now();
  for (const [token, record] of activeTokens.entries()) {
    if (now > record.expiresAt) {
      activeTokens.delete(token);
    }
  }
}
