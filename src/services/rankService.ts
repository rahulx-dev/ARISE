/**
 * ARISE — 6-Tier Cyberpunk Evolution Rank Progression Engine
 * 100% Offline calculation
 */

export interface EvolutionRank {
  tier: number;
  title: string;
  minLevel: number;
  subtitle: string;
  badgeIcon: string;
  badgeColor: string;
  perkDescription: string;
}

export const EVOLUTION_RANKS: EvolutionRank[] = [
  {
    tier: 1,
    title: 'Novice',
    minLevel: 1,
    subtitle: 'Protocol Initiate',
    badgeIcon: 'shield-outline',
    badgeColor: '#94A3B8',
    perkDescription: 'Standard baseline progression enabled.',
  },
  {
    tier: 2,
    title: 'Apprentice',
    minLevel: 5,
    subtitle: 'Adept Disciple',
    badgeIcon: 'shield-star-outline',
    badgeColor: '#00F0FF',
    perkDescription: '+5% bonus XP from all daily missions.',
  },
  {
    tier: 3,
    title: 'Shadow Operative',
    minLevel: 10,
    subtitle: 'Flow State Specialist',
    badgeIcon: 'sword-cross',
    badgeColor: '#8B5CF6',
    perkDescription: '+10% extra coins on calisthenics & focus sprints.',
  },
  {
    tier: 4,
    title: 'Cyber Centurion',
    minLevel: 20,
    subtitle: 'Iron Discipline Commander',
    badgeIcon: 'shield-crown-outline',
    badgeColor: '#F59E0B',
    perkDescription: '1 free Streak Freeze Shield automatically granted.',
  },
  {
    tier: 5,
    title: 'Iron Vanguard',
    minLevel: 35,
    subtitle: 'Ascended Master',
    badgeIcon: 'crown-outline',
    badgeColor: '#EF4444',
    perkDescription: '+20% bonus duration on all screen time passes.',
  },
  {
    tier: 6,
    title: 'Sovereign',
    minLevel: 50,
    subtitle: 'Unstoppable Force',
    badgeIcon: 'seal-variant',
    badgeColor: '#FFB800',
    perkDescription: 'Legendary aura. Complete mastery of self.',
  },
];

export const rankService = {
  getRankForLevel(level: number): EvolutionRank {
    for (let i = EVOLUTION_RANKS.length - 1; i >= 0; i--) {
      if (level >= EVOLUTION_RANKS[i].minLevel) {
        return EVOLUTION_RANKS[i];
      }
    }
    return EVOLUTION_RANKS[0];
  },

  getNextRank(level: number): EvolutionRank | null {
    const current = this.getRankForLevel(level);
    const nextIndex = EVOLUTION_RANKS.findIndex((r) => r.tier === current.tier + 1);
    return nextIndex !== -1 ? EVOLUTION_RANKS[nextIndex] : null;
  },

  getAllRanks(): EvolutionRank[] {
    return EVOLUTION_RANKS;
  },
};
