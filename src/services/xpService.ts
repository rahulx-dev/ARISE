export interface LevelInfo {
  level: number;
  currentXP: number;
  requiredXP: number;
  progress: number;
}

export const getRequiredXP = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, Math.max(1, level) - 1));
};

export const xpService = {
  getRequiredXP,

  getLevelInfo: (currentXP: number, level: number): LevelInfo => {
    const requiredXP = getRequiredXP(level);
    const progress = Math.min(Math.max(currentXP / requiredXP, 0), 1);

    return {
      level,
      currentXP,
      requiredXP,
      progress,
    };
  },

  calculateLevelFromTotalXP: (totalXP: number): { level: number; remainingXP: number } => {
    let level = 1;
    let remainingXP = totalXP;

    while (true) {
      const required = getRequiredXP(level);
      if (remainingXP >= required) {
        remainingXP -= required;
        level++;
      } else {
        break;
      }
    }

    return { level, remainingXP };
  },

  getXPForNextLevel: (level: number): number => {
    return getRequiredXP(level);
  },
};
