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
