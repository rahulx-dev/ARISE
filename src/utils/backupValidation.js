/**
 * ARISE — Authoritative Cloud Backup & Save File Validation
 *
 * Strict sanitization and bound-checking for local and cloud save data.
 * Pure logic module — imported by cloudSyncService and verified by Node tests.
 */

const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-.]{1,64}$/;

/**
 * @param {any} data
 * @returns {any | null}
 */
export function validateBackupData(data) {
  if (!data || typeof data !== 'object') return null;

  const level = Number.isInteger(data.level) ? Math.max(1, Math.min(100, data.level)) : 1;
  const coins = Number.isInteger(data.coins) ? Math.max(0, Math.min(1000000, data.coins)) : 0;
  const currentXP = Number.isInteger(data.currentXP) ? Math.max(0, Math.min(10000000, data.currentXP)) : 0;
  const totalXP = Number.isInteger(data.totalXP) ? Math.max(0, Math.min(10000000, data.totalXP)) : 0;
  const manaCrystals = Number.isInteger(data.manaCrystals) ? Math.max(0, Math.min(1000000, data.manaCrystals)) : 0;
  const currentStreak = Number.isInteger(data.currentStreak) ? Math.max(0, Math.min(3650, data.currentStreak)) : 0;
  const longestStreak = Number.isInteger(data.longestStreak) ? Math.max(currentStreak, Math.min(3650, data.longestStreak)) : currentStreak;

  const displayName = typeof data.displayName === 'string'
    ? data.displayName.trim().slice(0, 50) || 'Warrior'
    : 'Warrior';

  const avatarIcon = typeof data.avatarIcon === 'string' && (data.avatarIcon.startsWith('img_pfp_') || data.avatarIcon.startsWith('pfp_'))
    ? data.avatarIcon.slice(0, 32)
    : 'img_pfp_01';

  const profileImageUri = typeof data.profileImageUri === 'string' && data.profileImageUri.length <= 1024
    ? data.profileImageUri
    : null;

  const clampStat = (v) => (Number.isInteger(v) ? Math.max(0, Math.min(1000, v)) : 0);
  const strength = clampStat(data.strength);
  const discipline = clampStat(data.discipline);
  const focus = clampStat(data.focus);
  const health = clampStat(data.health);
  const knowledge = clampStat(data.knowledge);

  const now = new Date().toISOString();
  const lastSyncedAt = typeof data.lastSyncedAt === 'string' && !isNaN(Date.parse(data.lastSyncedAt))
    ? data.lastSyncedAt
    : now;

  // NEW-SYNC-3 & NEW-SYNC-4: Sanitize inventory and ensure at most 1 item is equipped per type
  const unlockedInventory = [];
  const equippedTypes = new Set();

  if (Array.isArray(data.unlockedInventory)) {
    for (const item of data.unlockedInventory) {
      if (!item || typeof item !== 'object') continue;
      const itemId = typeof item.itemId === 'string' && SAFE_ID_REGEX.test(item.itemId) ? item.itemId : null;
      if (!itemId) continue;
      const itemType = typeof item.itemType === 'string' && SAFE_ID_REGEX.test(item.itemType) ? item.itemType : 'AVATAR';
      let isEquipped = Boolean(item.isEquipped);
      if (isEquipped) {
        if (equippedTypes.has(itemType)) {
          isEquipped = false;
        } else {
          equippedTypes.add(itemType);
        }
      }
      unlockedInventory.push({
        itemId,
        itemType,
        unlockedAt: typeof item.unlockedAt === 'string' ? item.unlockedAt : now,
        isEquipped,
      });
    }
  }

  // Sanitize achievements
  const achievements = [];
  const seenAchIds = new Set();
  if (Array.isArray(data.achievements)) {
    for (const a of data.achievements) {
      if (!a || typeof a !== 'object') continue;
      const rawId = a.achievementId || a.id;
      if (typeof rawId !== 'string' || !SAFE_ID_REGEX.test(rawId) || seenAchIds.has(rawId)) continue;
      seenAchIds.add(rawId);
      achievements.push({
        achievementId: rawId,
        title: typeof a.title === 'string' ? a.title.slice(0, 100) : 'Achievement',
        description: typeof a.description === 'string' ? a.description.slice(0, 255) : '',
        icon: typeof a.icon === 'string' ? a.icon.slice(0, 50) : 'trophy',
        category: typeof a.category === 'string' ? a.category.slice(0, 50) : 'ACHIEVEMENT',
        unlockedAt: typeof a.unlockedAt === 'string' ? a.unlockedAt : now,
      });
    }
  }

  // Sanitize quests & clamp rewards
  const quests = [];
  if (Array.isArray(data.quests)) {
    for (const q of data.quests) {
      if (!q || typeof q !== 'object') continue;
      quests.push({
        id: Number.isInteger(q.id) ? q.id : undefined,
        title: typeof q.title === 'string' ? q.title.slice(0, 100) : 'Quest',
        description: typeof q.description === 'string' ? q.description.slice(0, 255) : '',
        category: typeof q.category === 'string' ? q.category.slice(0, 50) : 'FITNESS',
        exerciseType: typeof q.exerciseType === 'string' ? q.exerciseType.slice(0, 50) : null,
        target: Number.isInteger(q.target) ? Math.max(1, Math.min(1000, q.target)) : 10,
        rewardCoins: Number.isInteger(q.rewardCoins) ? Math.max(0, Math.min(100, q.rewardCoins)) : 15,
        rewardXP: Number.isInteger(q.rewardXP) ? Math.max(0, Math.min(500, q.rewardXP)) : 50,
        difficulty: typeof q.difficulty === 'string' ? q.difficulty.slice(0, 20) : 'easy',
        completed: q.completed ? 1 : 0,
        questType: typeof q.questType === 'string' ? q.questType.slice(0, 50) : 'TRACKED',
        frequency: typeof q.frequency === 'string' ? q.frequency.slice(0, 50) : 'DAILY',
        date: typeof q.date === 'string' ? q.date.slice(0, 50) : now.slice(0, 10),
      });
    }
  }

  // Sanitize exercise sessions
  const exerciseSessions = [];
  if (Array.isArray(data.exerciseSessions)) {
    for (const s of data.exerciseSessions) {
      if (!s || typeof s !== 'object') continue;
      exerciseSessions.push({
        exerciseType: typeof s.exerciseType === 'string' ? s.exerciseType.slice(0, 50) : 'PUSHUP',
        target: Number.isInteger(s.target) ? Math.max(1, Math.min(1000, s.target)) : 10,
        completedReps: Number.isInteger(s.completedReps) ? Math.max(0, Math.min(1000, s.completedReps)) : 0,
        durationSeconds: Number.isInteger(s.durationSeconds) ? Math.max(1, Math.min(86400, s.durationSeconds)) : 60,
        formScore: Number.isInteger(s.formScore) ? Math.max(0, Math.min(100, s.formScore)) : 100,
        timestamp: typeof s.timestamp === 'string' ? s.timestamp : now,
        questId: Number.isInteger(s.questId) ? s.questId : null,
      });
    }
  }

  // Sanitize focus sessions.
  // 5E (#1): the canonical shape is the DB shape used by the
  // focus_session table and the cloud restore path:
  // {targetMinutes, completedMinutes, startTime, endTime, status,
  // rewardCoins, rewardXP}. Older backups used the legacy shape
  // {durationMinutes, completed, timestamp}. The old sanitizer emitted
  // ONLY the legacy shape while gather/restore speak the DB shape, so
  // uploaded sessions were clobbered to defaults here and every restored
  // session came back 0 minutes / now / 'COMPLETED' / 0 rewards.
  // Accept BOTH shapes per session; always emit the canonical DB shape.
  const FOCUS_STATUSES = new Set(['ACTIVE', 'COMPLETED', 'ABANDONED']);
  const clampFocusMinutes = (v, fallback) =>
    Number.isInteger(v) ? Math.max(1, Math.min(1440, v)) : fallback;
  const clampDoneMinutes = (v) =>
    Number.isInteger(v) ? Math.max(0, Math.min(1440, v)) : 0;
  const validIso = (v) => typeof v === 'string' && !isNaN(Date.parse(v));
  const focusSessions = [];
  if (Array.isArray(data.focusSessions)) {
    for (const f of data.focusSessions) {
      if (!f || typeof f !== 'object') continue;
      const hasDbShape =
        Number.isInteger(f.targetMinutes) ||
        typeof f.startTime === 'string' ||
        typeof f.status === 'string';
      if (hasDbShape) {
        const targetMinutes = clampFocusMinutes(f.targetMinutes, 25);
        const completedMinutes = clampDoneMinutes(f.completedMinutes);
        const startTime = validIso(f.startTime) ? f.startTime : now;
        const status =
          typeof f.status === 'string' && FOCUS_STATUSES.has(f.status.toUpperCase())
            ? f.status.toUpperCase()
            : completedMinutes >= targetMinutes
              ? 'COMPLETED'
              : 'ABANDONED';
        let endTime = validIso(f.endTime) ? f.endTime : null;
        if (!endTime && status !== 'ACTIVE') {
          endTime = new Date(Date.parse(startTime) + targetMinutes * 60000).toISOString();
        }
        focusSessions.push({
          targetMinutes,
          completedMinutes,
          startTime,
          endTime,
          status,
          rewardCoins: Number.isInteger(f.rewardCoins) ? Math.max(0, Math.min(1000, f.rewardCoins)) : 0,
          rewardXP: Number.isInteger(f.rewardXP) ? Math.max(0, Math.min(5000, f.rewardXP)) : 0,
        });
      } else {
        // Legacy shape: {durationMinutes, completed, timestamp}.
        const targetMinutes = clampFocusMinutes(f.durationMinutes, 25);
        const wasCompleted = f.completed ? 1 : 0;
        const startTime = validIso(f.timestamp) ? f.timestamp : now;
        focusSessions.push({
          targetMinutes,
          completedMinutes: wasCompleted ? targetMinutes : 0,
          startTime,
          endTime: new Date(Date.parse(startTime) + targetMinutes * 60000).toISOString(),
          status: wasCompleted ? 'COMPLETED' : 'ABANDONED',
          rewardCoins: 0,
          rewardXP: 0,
        });
      }
    }
  }

  return {
    level,
    coins,
    currentXP,
    totalXP,
    manaCrystals,
    currentStreak,
    longestStreak,
    displayName,
    avatarIcon,
    profileImageUri,
    strength,
    discipline,
    focus,
    health,
    knowledge,
    unlockedInventory,
    achievements,
    quests,
    exerciseSessions,
    focusSessions,
    lastSyncedAt,
  };
}
