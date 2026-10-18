import test from 'node:test';
import assert from 'node:assert/strict';

function validateBackupData(data) {
  if (!data || typeof data !== 'object') return null;
  const level = Number.isInteger(data.level) ? Math.max(1, Math.min(100, data.level)) : 1;
  const coins = Number.isInteger(data.coins) ? Math.max(0, Math.min(1000000, data.coins)) : 0;
  const totalXP = Number.isInteger(data.totalXP) ? Math.max(0, Math.min(10000000, data.totalXP)) : 0;
  const currentStreak = Number.isInteger(data.currentStreak) ? Math.max(0, Math.min(3650, data.currentStreak)) : 0;
  const longestStreak = Number.isInteger(data.longestStreak) ? Math.max(currentStreak, Math.min(3650, data.longestStreak)) : currentStreak;
  const displayName = typeof data.displayName === 'string' ? data.displayName.trim().slice(0, 50) || 'Warrior' : 'Warrior';
  const avatarIcon = typeof data.avatarIcon === 'string' && data.avatarIcon.startsWith('img_pfp_') ? data.avatarIcon : 'img_pfp_01';

  return {
    ...data,
    level,
    coins,
    totalXP,
    currentStreak,
    longestStreak,
    displayName,
    avatarIcon,
  };
}

test('validateBackupData rejects non-objects and null', () => {
  assert.equal(validateBackupData(null), null);
  assert.equal(validateBackupData(undefined), null);
  assert.equal(validateBackupData("malicious_string"), null);
  assert.equal(validateBackupData(12345), null);
});

test('validateBackupData clamps excessive levels and negative coins', () => {
  const tampered = {
    level: 99999,
    coins: -500,
    totalXP: 9999999999,
    currentStreak: -10,
    longestStreak: 50000,
    displayName: 'A'.repeat(200),
    avatarIcon: 'injected_script_or_path',
  };
  const validated = validateBackupData(tampered);
  assert.ok(validated);
  assert.equal(validated.level, 100);
  assert.equal(validated.coins, 0);
  assert.equal(validated.totalXP, 10000000);
  assert.equal(validated.currentStreak, 0);
  assert.equal(validated.longestStreak, 3650);
  assert.equal(validated.displayName.length, 50);
  assert.equal(validated.avatarIcon, 'img_pfp_01');
});

test('validateBackupData preserves authentic valid progression', () => {
  const authentic = {
    level: 15,
    coins: 3500,
    totalXP: 45000,
    currentStreak: 7,
    longestStreak: 14,
    displayName: 'Jinwoo',
    avatarIcon: 'img_pfp_05',
  };
  const validated = validateBackupData(authentic);
  assert.deepEqual(validated, authentic);
});
