import { db } from '../database/client';
import {
  coinTransaction,
  exerciseSession,
  focusSession,
  quest,
  workoutSessions,
} from '../database/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

export interface HistoryEntry {
  id: string;
  type: 'EXERCISE' | 'FOCUS' | 'COIN_EARN' | 'COIN_SPEND' | 'WORKOUT' | 'QUEST';
  title: string;
  subtitle: string;
  timestamp: string;
  rewardCoins?: number;
  rewardXP?: number;
}

export interface DayActivitySummary {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0..6
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = empty, 1 = low, 2 = med, 3 = high, 4 = very high
  questsCount: number;
  focusMinutes: number;
  workoutCount: number;
  xpEarned: number;
  coinsEarned: number;
}

class HistoryService {
  /**
   * Get unified chronological activity history from real SQLite tables
   */
  async getActivityHistory(limit = 30): Promise<HistoryEntry[]> {
    try {
      const [exercises, focuses, coins, workouts] = await Promise.all([
        db.select().from(exerciseSession).orderBy(desc(exerciseSession.id)).limit(limit),
        db.select().from(focusSession).orderBy(desc(focusSession.id)).limit(limit),
        db.select().from(coinTransaction).orderBy(desc(coinTransaction.id)).limit(limit),
        db.select().from(workoutSessions).orderBy(desc(workoutSessions.id)).limit(limit),
      ]);

      const entries: HistoryEntry[] = [];

      // Map workouts
      for (const w of workouts) {
        if (w.status === 'COMPLETED') {
          entries.push({
            id: `w_${w.id}`,
            type: 'WORKOUT',
            title: w.title || 'Gym Workout',
            subtitle: `${Math.round((w.durationSeconds || 0) / 60)}m • ${w.totalSets || 0} sets • ${Math.round(w.totalVolumeKg || 0)}kg`,
            timestamp: w.startTime,
            rewardCoins: w.rewardCoins || 0,
            rewardXP: w.rewardXP || 0,
          });
        }
      }

      // Map exercises
      for (const ex of exercises) {
        entries.push({
          id: `ex_${ex.id}`,
          type: 'EXERCISE',
          title: `${ex.completedReps} ${ex.exerciseType}`,
          subtitle: `Duration: ${Math.floor(ex.durationSeconds / 60)}m ${ex.durationSeconds % 60}s`,
          timestamp: ex.timestamp,
          rewardCoins: Math.max(1, Math.floor(ex.completedReps / 5)),
          rewardXP: ex.completedReps * 5,
        });
      }

      // Map focus sessions
      for (const f of focuses) {
        entries.push({
          id: `f_${f.id}`,
          type: 'FOCUS',
          title: `${f.targetMinutes}m Deep Focus`,
          subtitle: `Completed: ${f.completedMinutes}m (${f.status})`,
          timestamp: f.startTime,
          rewardCoins: f.rewardCoins,
          rewardXP: f.rewardXP,
        });
      }

      // Map non-exercise/focus coin transactions
      for (const c of coins) {
        if (c.source !== 'exercise' && c.source !== 'focus' && c.source !== 'gym_workout') {
          entries.push({
            id: `c_${c.id}`,
            type: c.type === 'earn' ? 'COIN_EARN' : 'COIN_SPEND',
            title: c.description,
            subtitle: `Source: ${c.source}`,
            timestamp: c.timestamp,
            rewardCoins: c.amount,
          });
        }
      }

      // Sort in reverse chronological order
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return entries.slice(0, limit);
    } catch (e) {
      console.warn('Error fetching history:', e);
      return [];
    }
  }

  /**
   * Generates a 12-week (84-day) activity matrix from real SQLite records
   */
  async get12WeekHeatmapData(): Promise<DayActivitySummary[]> {
    try {
      const [exercises, focuses, coins, workouts, quests] = await Promise.all([
        db.select().from(exerciseSession),
        db.select().from(focusSession),
        db.select().from(coinTransaction),
        db.select().from(workoutSessions),
        db.select().from(quest),
      ]);

      const mapByDate: Record<string, DayActivitySummary> = {};

      // Initialize 84 days (12 weeks) backwards from today
      const today = new Date();
      for (let i = 83; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        mapByDate[dateKey] = {
          date: dateKey,
          dayOfWeek: d.getDay(),
          intensity: 0,
          questsCount: 0,
          focusMinutes: 0,
          workoutCount: 0,
          xpEarned: 0,
          coinsEarned: 0,
        };
      }

      // Populate exercises
      for (const ex of exercises) {
        const key = ex.timestamp ? ex.timestamp.split('T')[0] : '';
        if (mapByDate[key]) {
          mapByDate[key].workoutCount += 1;
          mapByDate[key].xpEarned += (ex.completedReps || 0) * 5;
          mapByDate[key].coinsEarned += (ex.completedReps || 0) * 2;
        }
      }

      // Populate workouts
      for (const w of workouts) {
        if (w.status === 'COMPLETED' && w.startTime) {
          const key = w.startTime.split('T')[0];
          if (mapByDate[key]) {
            mapByDate[key].workoutCount += 1;
            mapByDate[key].xpEarned += w.rewardXP || 40;
            mapByDate[key].coinsEarned += w.rewardCoins || 20;
          }
        }
      }

      // Populate focus sessions
      for (const f of focuses) {
        const key = f.startTime ? f.startTime.split('T')[0] : '';
        if (mapByDate[key]) {
          mapByDate[key].focusMinutes += f.completedMinutes || 0;
          mapByDate[key].xpEarned += f.rewardXP || 0;
          mapByDate[key].coinsEarned += f.rewardCoins || 0;
        }
      }

      // Populate completed quests
      for (const q of quests) {
        if (q.completed === 1 && q.date) {
          const key = q.date.split('T')[0];
          if (mapByDate[key]) {
            mapByDate[key].questsCount += 1;
            mapByDate[key].xpEarned += q.rewardXP || 25;
            mapByDate[key].coinsEarned += q.rewardCoins || 10;
          }
        }
      }

      // Compute intensities based on total score
      const result: DayActivitySummary[] = Object.values(mapByDate).map((day) => {
        const totalScore =
          day.questsCount * 30 +
          day.focusMinutes * 2 +
          day.workoutCount * 50 +
          day.xpEarned;

        let intensity: 0 | 1 | 2 | 3 | 4 = 0;
        if (totalScore > 200) intensity = 4;
        else if (totalScore > 100) intensity = 3;
        else if (totalScore > 40) intensity = 2;
        else if (totalScore > 0) intensity = 1;

        return {
          ...day,
          intensity,
        };
      });

      return result;
    } catch (e) {
      console.warn('Error computing heatmap:', e);
      return [];
    }
  }

  /**
   * Get real live statistics for Today from SQLite tables (no mock data)
   */
  async getTodayRealStats(): Promise<{
    focusMinutes: number;
    focusSessionsCount: number;
    workoutMinutes: number;
    workoutCount: number;
    completedQuests: number;
    totalQuests: number;
  }> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      const [exercises, focuses, workouts, quests] = await Promise.all([
        db.select().from(exerciseSession),
        db.select().from(focusSession),
        db.select().from(workoutSessions),
        db.select().from(quest),
      ]);

      let focusMinutes = 0;
      let focusSessionsCount = 0;
      for (const f of focuses) {
        if (f.startTime && f.startTime.startsWith(todayIso)) {
          focusMinutes += f.completedMinutes || 0;
          focusSessionsCount += 1;
        }
      }

      let workoutMinutes = 0;
      let workoutCount = 0;
      for (const w of workouts) {
        if (w.status === 'COMPLETED' && w.startTime && w.startTime.startsWith(todayIso)) {
          workoutMinutes += Math.round((w.durationSeconds || 0) / 60);
          workoutCount += 1;
        }
      }
      for (const ex of exercises) {
        if (ex.timestamp && ex.timestamp.startsWith(todayIso)) {
          workoutMinutes += Math.max(1, Math.round(ex.durationSeconds / 60));
          workoutCount += 1;
        }
      }

      let completedQuests = 0;
      const totalQuests = quests.length;
      for (const q of quests) {
        if (q.completed === 1) {
          completedQuests += 1;
        }
      }

      return {
        focusMinutes,
        focusSessionsCount,
        workoutMinutes,
        workoutCount,
        completedQuests,
        totalQuests,
      };
    } catch (e) {
      console.warn('Error fetching today real stats:', e);
      return {
        focusMinutes: 0,
        focusSessionsCount: 0,
        workoutMinutes: 0,
        workoutCount: 0,
        completedQuests: 0,
        totalQuests: 0,
      };
    }
  }
}

export const historyService = new HistoryService();
