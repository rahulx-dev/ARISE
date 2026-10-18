import { exerciseRepository } from '../database/repositories/exerciseRepository';
import { userRepository } from '../database/repositories/userRepository';
import { db } from '../database/client';
import { coinTransaction } from '../database/schema';
import { and, eq, gte } from 'drizzle-orm';

export interface BossRaidInfo {
  id: string;
  name: string;
  gateRank: string;
  maxHp: number;
  currentHp: number;
  damageDealt: number;
  rewardCoins: number;
  rewardXP: number;
  isDefeated: boolean;
  isClaimed: boolean;
}

const WEEKLY_BOSS = {
  id: 'boss_ignis_01',
  name: 'Crimson Knight Ignis',
  gateRank: 'RED GATE // S-RANK',
  maxHp: 1000,
  damagePerRep: 2,
  rewardCoins: 20, // Calibrated unit economics: 20 Coins = ₹0.20 (20 paise)
  rewardXP: 500,
};

class BossService {
  private getStartOfWeekIso(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }

  async isWeeklyRewardClaimed(): Promise<boolean> {
    try {
      const startOfWeekIso = this.getStartOfWeekIso();
      const claims = await db
        .select()
        .from(coinTransaction)
        .where(
          and(
            eq(coinTransaction.source, 'boss_raid'),
            gte(coinTransaction.timestamp, startOfWeekIso)
          )
        );
      return claims.length > 0;
    } catch {
      return false;
    }
  }

  async getCurrentBoss(): Promise<BossRaidInfo> {
    const isClaimed = await this.isWeeklyRewardClaimed();
    try {
      const totalReps = await exerciseRepository.getWeeklyTotalReps();
      const damageDealt = totalReps * WEEKLY_BOSS.damagePerRep;
      const currentHp = Math.max(0, WEEKLY_BOSS.maxHp - damageDealt);
      const isDefeated = currentHp === 0;

      return {
        id: WEEKLY_BOSS.id,
        name: WEEKLY_BOSS.name,
        gateRank: WEEKLY_BOSS.gateRank,
        maxHp: WEEKLY_BOSS.maxHp,
        currentHp,
        damageDealt,
        rewardCoins: WEEKLY_BOSS.rewardCoins,
        rewardXP: WEEKLY_BOSS.rewardXP,
        isDefeated,
        isClaimed,
      };
    } catch {
      return {
        id: WEEKLY_BOSS.id,
        name: WEEKLY_BOSS.name,
        gateRank: WEEKLY_BOSS.gateRank,
        maxHp: WEEKLY_BOSS.maxHp,
        currentHp: WEEKLY_BOSS.maxHp,
        damageDealt: 0,
        rewardCoins: WEEKLY_BOSS.rewardCoins,
        rewardXP: WEEKLY_BOSS.rewardXP,
        isDefeated: false,
        isClaimed,
      };
    }
  }

  async claimBossVictoryReward(): Promise<boolean> {
    try {
      const boss = await this.getCurrentBoss();
      if (!boss.isDefeated) {
        return false;
      }

      const alreadyClaimed = await this.isWeeklyRewardClaimed();
      if (alreadyClaimed) {
        return false;
      }

      await userRepository.addCoins(
        WEEKLY_BOSS.rewardCoins,
        'Defeated Dungeon Boss Ignis (Weekly Raid)',
        'boss_raid'
      );
      await userRepository.addXP(WEEKLY_BOSS.rewardXP);
      return true;
    } catch {
      return false;
    }
  }
}

export const bossService = new BossService();
