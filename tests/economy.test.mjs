import test from 'node:test';
import assert from 'node:assert/strict';

function calculateWorkoutReward({ reps, target, exerciseType, formScore = 100 }) {
  const safeReps = Math.max(0, Math.floor(Number(reps) || 0));
  const safeTarget = Math.max(1, Math.floor(Number(target) || 10));

  // Zero-effort completion grants nothing (C14)
  if (safeReps === 0) {
    return { coins: 0, xp: 0 };
  }

  // Base rewards per rep type
  const baseRewardPerRep = exerciseType === 'pushup' ? 2 : 1;
  const earnedCoins = Math.min(100, safeReps * baseRewardPerRep);
  const earnedXP = Math.min(250, safeReps * 5);

  return { coins: earnedCoins, xp: earnedXP };
}

test('calculateWorkoutReward: Zero reps grants ZERO coins and ZERO XP', () => {
  const zeroWork = calculateWorkoutReward({ reps: 0, target: 10, exerciseType: 'pushup' });
  assert.equal(zeroWork.coins, 0);
  assert.equal(zeroWork.xp, 0);
});

test('calculateWorkoutReward: Clamps rewards and ignores malicious inputs', () => {
  const maliciousExploit = calculateWorkoutReward({
    reps: 9999999,
    target: 10,
    exerciseType: 'pushup',
  });
  // Must be strictly capped at 100 coins and 250 XP
  assert.equal(maliciousExploit.coins, 100);
  assert.equal(maliciousExploit.xp, 250);

  const negativeReps = calculateWorkoutReward({
    reps: -50,
    target: 10,
    exerciseType: 'pushup',
  });
  assert.equal(negativeReps.coins, 0);
  assert.equal(negativeReps.xp, 0);
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
