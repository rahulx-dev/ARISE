import { userRepository } from '../database/repositories/userRepository';
import { notificationService } from './notificationService';

export const streakService = {
  /**
   * Called on startup or day rollover to detect if streak was broken yesterday.
   * Does NOT increment streak or set lastActiveDate without training.
   */
  checkAndUpdateStreak: async (): Promise<{ streak: number; isNewDay: boolean; streakBroken: boolean }> => {
    const res = await userRepository.checkDailyStreakLapse();
    return {
      streak: res.streak,
      isNewDay: false,
      streakBroken: res.broken,
    };
  },

  /**
   * Called upon completing a workout, quest, run, or focus session.
   * Advances streak by +1 if consecutive calendar day, and triggers milestone notification.
   */
  recordWorkoutStreak: async (): Promise<{ streak: number; increased: boolean }> => {
    const res = await userRepository.recordActivityAndIncrementStreak();
    if (res.increased) {
      try {
        const milestone = streakService.getStreakMilestone(res.streak);
        const title = milestone
          ? `👑 [STREAK MILESTONE // ${milestone.toUpperCase()}]`
          : `🔥 [STREAK PRESERVED // DAY ${res.streak}]`;
        const body = milestone
          ? `Incredible discipline, Hunter! You reached the "${milestone}" milestone (${res.streak} days)!`
          : `Daily training directive fulfilled. Hunter streak increased to ${res.streak} Days. Keep pushing!`;

        await notificationService.createNotification('STREAK', title, body);
      } catch (err) {
        console.warn('Streak notification error:', err);
      }
    }
    return res;
  },

  getStreakMilestone: (streak: number): string | null => {
    const milestones: Record<number, string> = {
      3: 'Three Day Spark',
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
