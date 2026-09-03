import { exerciseRepository } from '../database/repositories/exerciseRepository';
import { userRepository } from '../database/repositories/userRepository';

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
}

const WEEKLY_BOSS = {
  id: 'boss_igris_01',
  name: 'Blood-Red Commander Igris',
  gateRank: 'RED GATE // S-RANK',
  maxHp: 200,
  damagePerRep: 5,
  rewardCoins: 500,
  rewardXP: 600,
};

class BossService {
  async getCurrentBoss(): Promise<BossRaidInfo> {
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
      };
    }
  }

  async claimBossVictoryReward(): Promise<boolean> {
    try {
      await userRepository.addCoins(WEEKLY_BOSS.rewardCoins, 'Defeated Dungeon Boss Igris', 'boss_raid');
      await userRepository.addXP(WEEKLY_BOSS.rewardXP);
      return true;
    } catch {
      return false;
    }
  }
}

export const bossService = new BossService();
