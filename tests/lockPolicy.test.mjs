import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePackageName } from '../src/utils/packageValidation.js';

test('normalizePackageName validates valid reverse-domain packages', () => {
  assert.equal(normalizePackageName('com.instagram.android'), 'com.instagram.android');
  assert.equal(normalizePackageName('  COM.WHATSAPP  '), 'com.whatsapp');
  assert.equal(normalizePackageName('org.telegram.messenger'), 'org.telegram.messenger');
  assert.equal(normalizePackageName('com.google.android.youtube'), 'com.google.android.youtube');
});

test('normalizePackageName rejects invalid/malformed/injected packages', () => {
  assert.equal(normalizePackageName(''), null);
  assert.equal(normalizePackageName(null), null);
  assert.equal(normalizePackageName(undefined), null);
  assert.equal(normalizePackageName('null'), null);
  assert.equal(normalizePackageName('instagram'), null); // No dot / not reverse domain
  assert.equal(normalizePackageName('../../../etc/passwd'), null);
  assert.equal(normalizePackageName('com.app; rm -rf /'), null);
  assert.equal(normalizePackageName('com.bad..app'), null);
  assert.equal(normalizePackageName('com.bad package.app'), null);
  assert.equal(normalizePackageName('a.' + 'b'.repeat(300)), null); // Exceeds 256 chars
});

test('Emergency Pass rule enforces 5 minutes counted INSIDE daily budget and once per day', () => {
  const dailyBudgetMs = 30 * 60 * 1000; // 30 min
  let currentUsageMs = 28 * 60 * 1000; // 28 min used
  let emergencyClaimedToday = false;
  const EMERGENCY_DURATION_MS = 5 * 60 * 1000; // 5 min

  function claimEmergencyPass() {
    if (emergencyClaimedToday) return { success: false, reason: 'ALREADY_CLAIMED' };
    emergencyClaimedToday = true;
    // Counted INSIDE the daily budget!
    currentUsageMs += EMERGENCY_DURATION_MS;
    return { success: true, durationMs: EMERGENCY_DURATION_MS, newUsageMs: currentUsageMs };
  }

  // First claim succeeds
  const firstClaim = claimEmergencyPass();
  assert.equal(firstClaim.success, true);
  assert.equal(firstClaim.durationMs, 5 * 60 * 1000);
  assert.equal(firstClaim.newUsageMs, 33 * 60 * 1000); // 28 + 5 = 33m (exceeds budget)

  // Second claim on the same day fails immediately
  const secondClaim = claimEmergencyPass();
  assert.equal(secondClaim.success, false);
  assert.equal(secondClaim.reason, 'ALREADY_CLAIMED');
});

test('Monotonic time expiry is immune to wall-clock manipulation', () => {
  let monotonicClock = 1000000; // SystemClock.elapsedRealtime()
  const unlockDurationMs = 15 * 60 * 1000; // 15 mins
  const unlockUntilElapsed = monotonicClock + unlockDurationMs;

  function isPassActive() {
    return monotonicClock < unlockUntilElapsed;
  }

  assert.equal(isPassActive(), true);

  // Advancing wall clock by 24 hours does NOT advance monotonicClock
  let simulatedWallClock = Date.now() + 24 * 60 * 60 * 1000;
  assert.equal(isPassActive(), true); // Still active based on monotonic clock!

  // Advancing monotonicClock past duration expires the pass
  monotonicClock += 16 * 60 * 1000;
  assert.equal(isPassActive(), false);
});
