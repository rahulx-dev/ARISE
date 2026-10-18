/**
 * REAL tests for the completion token gate (src/services/completionGate.js).
 * Unlike the earlier mirror/fake tests, these import the REAL module and
 * prove the N1/N2 regression fixes:
 * - N2: a focus token issued with { exerciseType: 'FOCUS' } must be
 *   accepted when the consumer expects 'FOCUS' (previously the focus
 *   screen issued a bare token -> 'UNKNOWN', and complete.tsx expected
 *   'PUSHUP', so EVERY focus completion was rejected).
 * - N1: peek-then-consume — a crash mid-grant must not destroy the token.
 *   peek() validates WITHOUT consuming; consume() runs only after success.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  issueCompletionToken,
  consumeCompletionToken,
  peekCompletionToken,
} from '../src/services/completionGate.js';

test('focus token: issued with FOCUS is accepted for FOCUS, rejected for PUSHUP', () => {
  const token = issueCompletionToken({ exerciseType: 'FOCUS', duration: 1500, target: 25 });
  assert.equal(peekCompletionToken(token, { exerciseType: 'FOCUS' }), true);
  assert.equal(peekCompletionToken(token, { exerciseType: 'PUSHUP' }), false);
  // Peek must not consume: still valid afterwards.
  assert.equal(peekCompletionToken(token, { exerciseType: 'FOCUS' }), true);
  assert.equal(consumeCompletionToken(token, { exerciseType: 'FOCUS' }), true);
});

test('peek does not consume; consume is single-use', () => {
  const token = issueCompletionToken({ exerciseType: 'PUSHUP', reps: 20 });
  assert.equal(peekCompletionToken(token, { exerciseType: 'PUSHUP' }), true);
  assert.equal(peekCompletionToken(token, { exerciseType: 'PUSHUP' }), true);
  assert.equal(consumeCompletionToken(token, { exerciseType: 'PUSHUP' }), true);
  // Consumed: gone for good.
  assert.equal(peekCompletionToken(token, { exerciseType: 'PUSHUP' }), false);
  assert.equal(consumeCompletionToken(token, { exerciseType: 'PUSHUP' }), false);
});

test('wrong-type consume returns false (token still spent, as designed)', () => {
  const token = issueCompletionToken({ exerciseType: 'GYM_WORKOUT' });
  assert.equal(consumeCompletionToken(token, { exerciseType: 'PUSHUP' }), false);
  assert.equal(peekCompletionToken(token, { exerciseType: 'GYM_WORKOUT' }), false);
});

test('bare issue defaults to UNKNOWN and does not match FOCUS', () => {
  const token = issueCompletionToken();
  assert.equal(peekCompletionToken(token, { exerciseType: 'UNKNOWN' }), true);
  assert.equal(peekCompletionToken(token, { exerciseType: 'FOCUS' }), false);
});

test('invalid tokens are rejected by both peek and consume', () => {
  assert.equal(peekCompletionToken(undefined, { exerciseType: 'PUSHUP' }), false);
  assert.equal(peekCompletionToken('no-such-token', { exerciseType: 'PUSHUP' }), false);
  assert.equal(consumeCompletionToken('no-such-token', { exerciseType: 'PUSHUP' }), false);
});

test('C1: token is bound to full context — tampered reps/duration/target rejected', () => {
  const ctx = { exerciseType: 'PUSHUP', questId: '7', reps: 30, duration: 180, target: 30 };
  const token = issueCompletionToken(ctx);
  // Tampered reps must not match (previously only exerciseType was checked).
  assert.equal(peekCompletionToken(token, { ...ctx, reps: 999 }), false);
  assert.equal(peekCompletionToken(token, { ...ctx, duration: 1 }), false);
  assert.equal(peekCompletionToken(token, { ...ctx, target: 1 }), false);
  assert.equal(peekCompletionToken(token, { ...ctx, questId: '8' }), false);
  // Exact context matches, and the token survives the failed peeks.
  assert.equal(consumeCompletionToken(token, ctx), true);
});

test('C1: focus tokens have no reps — reps expectation is skipped, duration still bound', () => {
  const token = issueCompletionToken({ exerciseType: 'FOCUS', questId: '', duration: 1500, target: 25 });
  assert.equal(peekCompletionToken(token, { exerciseType: 'FOCUS', questId: undefined, duration: 1500, target: 25 }), true);
  assert.equal(peekCompletionToken(token, { exerciseType: 'FOCUS', duration: 60, target: 25 }), false);
  assert.equal(consumeCompletionToken(token, { exerciseType: 'FOCUS', duration: 1500, target: 25 }), true);
});

test('C1: issued tokens use CSPRNG entropy (32 hex chars, not Math.random base36)', () => {
  const token = issueCompletionToken({ exerciseType: 'PUSHUP' });
  const part = token.split('_').pop();
  // WebCrypto path: 16 bytes -> 32 lowercase hex chars.
  assert.match(part, /^[0-9a-f]{32}$/);
});
