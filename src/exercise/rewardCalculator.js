/**
 * ARISE — Authoritative Exercise Reward Calculator
 *
 * Enforces zero-effort rules (C14): 0 reps = 0 coins, 0 XP.
 * Pure logic module — used by app exercise engine and verified in tests.
 */

/**
 * @param {string} exerciseType
 * @param {number} completedReps
 * @param {number} target
 * @param {number} [xpPerRep=5]
 * @returns {{ coins: number, xp: number }}
 */
export function calculateRewards(exerciseType, completedReps, target, xpPerRep = 5) {
  const safeReps = Math.max(0, Math.floor(Number(completedReps) || 0));
  const safeTarget = Math.max(1, Math.floor(Number(target) || 1));

  // Zero reps completed: Strictly zero coins, zero XP (C14)
  if (safeReps === 0) {
    return { coins: 0, xp: 0 };
  }

  // Cap rewardable reps to target to prevent unbounded inflation
  const rewardableReps = Math.min(safeReps, safeTarget);

  // Unit economics: 1 coin per 5 completed reps, capped at 50 coins per workout session
  const earnedCoins = Math.max(1, Math.min(50, Math.floor(rewardableReps / 5)));
  const earnedXP = Math.min(500, rewardableReps * (Number(xpPerRep) || 5));

  return {
    coins: earnedCoins,
    xp: earnedXP,
  };
}
