import { userRepository } from '../database/repositories/userRepository';

export const streakService = {
  checkAndUpdateStreak: async (): Promise<{ streak: number; isNewDay: boolean; streakBroken: boolean }> => {
    const profile = await userRepository.getProfile();
    const today = new Date().toISOString().split('T')[0];

    if (!profile) return { streak: 0, isNewDay: false, streakBroken: false };

    const lastActive = profile.lastActiveDate ? profile.lastActiveDate.split('T')[0] : null;

    if (lastActive === today) {
      return { streak: profile.currentStreak, isNewDay: false, streakBroken: false };
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const streakBroken = !!lastActive && lastActive < yesterday;

    await userRepository.updateStreak();
    const updated = await userRepository.getProfile();

    return {
      streak: updated ? updated.currentStreak : profile.currentStreak,
      isNewDay: true,
      streakBroken,
    };
  },

  getStreakMilestone: (streak: number): string | null => {
    const milestones: Record<number, string> = {
      7: 'One Week Warrior',
      14: 'Two Week Titan',
      30: 'Monthly Master',
      60: 'Sixty Day Sentinel',
      100: 'Centurion',
      365: 'Yearly Legend',
    };
    return milestones[streak] || null;
  },
};
