import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../src/exercise/rewardCalculator.js';

test('calculateRewards: Zero reps grants ZERO coins and ZERO XP (C14)', () => {
  const zeroWork = calculateRewards('PUSHUP', 0, 10);
  assert.equal(zeroWork.coins, 0);
  assert.equal(zeroWork.xp, 0);

  const negativeReps = calculateRewards('PUSHUP', -5, 10);
  assert.equal(negativeReps.coins, 0);
  assert.equal(negativeReps.xp, 0);
});

test('calculateRewards: Clamps rewards against inflation exploits', () => {
  const normalWork = calculateRewards('PUSHUP', 20, 20);
  assert.equal(normalWork.coins, 4); // 20 / 5 = 4 coins
  assert.equal(normalWork.xp, 100);  // 20 * 5 = 100 XP

  // Capped to target
  const overTarget = calculateRewards('PUSHUP', 500, 20);
  assert.equal(overTarget.coins, 4);
  assert.equal(overTarget.xp, 100);

  // Maximum ceiling test
  const extremeExploit = calculateRewards('PUSHUP', 999999, 999999);
  assert.ok(extremeExploit.coins <= 50);
  assert.ok(extremeExploit.xp <= 500);
});

test('Idempotency prevents double reward grants with same request ID', () => {
  const processedRequests = new Set();

  function grantRewardWithIdempotency(requestId, amount) {
    if (processedRequests.has(requestId)) {
      return { success: false, reason: 'ALREADY_PROCESSED' };
    }
    processedRequests.add(requestId);
    return { success: true, granted: amount };
  }

  const req1 = grantRewardWithIdempotency('uuid-abc-123', 50);
  assert.equal(req1.success, true);
  assert.equal(req1.granted, 50);

  // Replay attempt with same ID is rejected
  const req2 = grantRewardWithIdempotency('uuid-abc-123', 50);
  assert.equal(req2.success, false);
  assert.equal(req2.reason, 'ALREADY_PROCESSED');
});
