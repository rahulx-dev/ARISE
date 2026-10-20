import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupData } from '../src/utils/backupValidation.js';

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

test('validateBackupData enforces single equipped item per type (NEW-SYNC-3)', () => {
  const multiEquip = {
    level: 5,
    coins: 100,
    displayName: 'Hunter',
    unlockedInventory: [
      { itemId: 'avatar_1', itemType: 'AVATAR', isEquipped: true },
      { itemId: 'avatar_2', itemType: 'AVATAR', isEquipped: true },
      { itemId: 'title_1', itemType: 'TITLE', isEquipped: true },
    ],
  };
  const validated = validateBackupData(multiEquip);
  assert.ok(validated);
  const equippedAvatars = validated.unlockedInventory.filter(i => i.itemType === 'AVATAR' && i.isEquipped);
  assert.equal(equippedAvatars.length, 1);
  assert.equal(equippedAvatars[0].itemId, 'avatar_1');
});

test('validateBackupData sanitizes unvalidated arrays and clamps quest rewards (NEW-SYNC-4)', () => {
  const craftedBlob = {
    quests: [
      {
        id: 1,
        title: 'Exploit Quest',
        rewardCoins: 999999,
        rewardXP: 999999,
      },
    ],
  };
  const validated = validateBackupData(craftedBlob);
  assert.ok(validated);
  assert.equal(validated.quests[0].rewardCoins, 100);
  assert.equal(validated.quests[0].rewardXP, 500);
});

// --- Batch 5E (#1): focus-session backup/restore round-trip ---
// The canonical validated shape is the DB shape the cloud restore path
// reads. Before 5E the sanitizer emitted {durationMinutes, completed,
// timestamp} while upload/restore speak the DB shape, so every restored
// focus session came back 0 minutes / now / 'COMPLETED' / 0 rewards.
const RESTORE_FIELDS = [
  'targetMinutes',
  'completedMinutes',
  'startTime',
  'endTime',
  'status',
  'rewardCoins',
  'rewardXP',
];

test('5E #1: DB-shaped focus session survives validation intact', () => {
  const input = {
    focusSessions: [
      {
        targetMinutes: 45,
        completedMinutes: 45,
        startTime: '2026-01-01T10:00:00.000Z',
        endTime: '2026-01-01T10:45:00.000Z',
        status: 'COMPLETED',
        rewardCoins: 30,
        rewardXP: 120,
      },
    ],
  };
  const validated = validateBackupData(input);
  assert.ok(validated);
  assert.deepEqual(validated.focusSessions[0], {
    targetMinutes: 45,
    completedMinutes: 45,
    startTime: '2026-01-01T10:00:00.000Z',
    endTime: '2026-01-01T10:45:00.000Z',
    status: 'COMPLETED',
    rewardCoins: 30,
    rewardXP: 120,
  });
});

test('5E #1: legacy focus session maps onto the DB shape', () => {
  const input = {
    focusSessions: [
      { durationMinutes: 30, completed: 1, timestamp: '2026-01-02T09:00:00.000Z' },
      { durationMinutes: 20, completed: 0, timestamp: '2026-01-03T09:00:00.000Z' },
    ],
  };
  const validated = validateBackupData(input);
  assert.ok(validated);
  assert.deepEqual(validated.focusSessions[0], {
    targetMinutes: 30,
    completedMinutes: 30,
    startTime: '2026-01-02T09:00:00.000Z',
    endTime: '2026-01-02T09:30:00.000Z',
    status: 'COMPLETED',
    rewardCoins: 0,
    rewardXP: 0,
  });
  assert.deepEqual(validated.focusSessions[1], {
    targetMinutes: 20,
    completedMinutes: 0,
    startTime: '2026-01-03T09:00:00.000Z',
    endTime: '2026-01-03T09:20:00.000Z',
    status: 'ABANDONED',
    rewardCoins: 0,
    rewardXP: 0,
  });
});

test('5E #1: validated focus sessions expose every field the restore reads', () => {
  const input = {
    focusSessions: [
      { targetMinutes: 15, completedMinutes: 15, startTime: '2026-01-01T08:00:00.000Z', status: 'COMPLETED' },
      { durationMinutes: 15, completed: 1, timestamp: '2026-01-01T08:00:00.000Z' },
      { targetMinutes: 99999, completedMinutes: -5, startTime: 'not-a-date', status: 'BOGUS', rewardCoins: 999999 },
    ],
  };
  const validated = validateBackupData(input);
  assert.ok(validated);
  assert.equal(validated.focusSessions.length, 3);
  for (const s of validated.focusSessions) {
    for (const field of RESTORE_FIELDS) {
      assert.ok(field in s, `validated focus session missing restore field: ${field}`);
    }
    assert.ok(!('durationMinutes' in s), 'legacy field leaked into canonical output');
  }
  // Sanitization still applies to the DB shape.
  const clamped = validated.focusSessions[2];
  assert.equal(clamped.targetMinutes, 1440);
  assert.equal(clamped.completedMinutes, 0);
  assert.equal(clamped.rewardCoins, 1000);
  assert.equal(clamped.status, 'ABANDONED');
});
