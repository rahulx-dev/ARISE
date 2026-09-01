import { db } from '../database/client';
import { coinTransaction, exerciseSession, focusSession } from '../database/schema';
import { desc } from 'drizzle-orm';

export interface HistoryEntry {
  id: string;
  type: 'EXERCISE' | 'FOCUS' | 'COIN_EARN' | 'COIN_SPEND';
  title: string;
  subtitle: string;
  timestamp: string;
  rewardCoins?: number;
  rewardXP?: number;
}

class HistoryService {
  /**
   * Get unified chronological activity history from real SQLite tables
   */
  async getActivityHistory(limit = 20): Promise<HistoryEntry[]> {
    try {
      const [exercises, focuses, coins] = await Promise.all([
        db.select().from(exerciseSession).orderBy(desc(exerciseSession.id)).limit(limit),
        db.select().from(focusSession).orderBy(desc(focusSession.id)).limit(limit),
        db.select().from(coinTransaction).orderBy(desc(coinTransaction.id)).limit(limit),
      ]);

      const entries: HistoryEntry[] = [];

      // Map exercises
      for (const ex of exercises) {
        entries.push({
          id: `ex_${ex.id}`,
          type: 'EXERCISE',
          title: `${ex.completedReps} ${ex.exerciseType}`,
          subtitle: `Duration: ${Math.floor(ex.durationSeconds / 60)}m ${ex.durationSeconds % 60}s`,
          timestamp: ex.timestamp,
          rewardCoins: ex.completedReps * 2,
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
        if (c.source !== 'exercise' && c.source !== 'focus') {
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
}

export const historyService = new HistoryService();
