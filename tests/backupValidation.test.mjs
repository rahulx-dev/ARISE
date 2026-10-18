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
