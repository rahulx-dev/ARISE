export interface HunterRank {
  minLevel: number;
  maxLevel: number;
  rankCode: 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'NATIONAL';
  title: string;
  transformationName: string;
  auraColor: string;
  badge: string;
  quote: string;
  perks: string[];
}

export const HUNTER_RANKS: HunterRank[] = [
  {
    minLevel: 1,
    maxLevel: 4,
    rankCode: 'E',
    title: 'E-Rank Hunter',
    transformationName: 'AWAKENED INITIATE',
    auraColor: '#6B7280',
    badge: 'E',
    quote: 'The system has noticed your awakening. The path of discipline begins.',
    perks: ['Basic Workout CV Tracking', 'Focus Timer', 'App Blocker Shield'],
  },
  {
    minLevel: 5,
    maxLevel: 9,
    rankCode: 'D',
    title: 'D-Rank Striker',
    transformationName: 'IRON DISCIPLE',
    auraColor: '#10B981',
    badge: 'D',
    quote: 'Your muscles harden, your willpower solidifies. You no longer bow to cheap dopamine.',
    perks: ['+10% Coin Bonus on Workouts', 'D-Rank Dungeon Boss Raids'],
  },
  {
    minLevel: 10,
    maxLevel: 14,
    rankCode: 'C',
    title: 'C-Rank Vanguard',
    transformationName: 'SHADOW SCOUT',
    auraColor: '#0A84FF',
    badge: 'C',
    quote: 'You move through temptation like a phantom. The physical form transforms.',
    perks: ['+15% Coin Bonus', 'C-Rank Dungeon Boss Raids', 'Advanced Stat Multiplier'],
  },
  {
    minLevel: 15,
    maxLevel: 19,
    rankCode: 'B',
    title: 'B-Rank Knight',
    transformationName: 'ARCANE BERSERKER',
    auraColor: '#8B5CF6',
    badge: 'B',
    quote: 'Discipline is no longer effort—it is your permanent nature.',
    perks: ['+25% Coin Bonus', 'B-Rank Red Gate Raids', 'Elite Aura Visuals'],
  },
  {
    minLevel: 20,
    maxLevel: 29,
    rankCode: 'A',
    title: 'A-Rank Sovereign Knight',
    transformationName: 'PHANTOM SLAYER',
    auraColor: '#F59E0B',
    badge: 'A',
    quote: 'A commander of your own mind. You bend reality to your intense focus.',
    perks: ['+40% Coin Bonus', 'A-Rank Monarch Raids', 'Gold Nameplate'],
  },
  {
    minLevel: 30,
    maxLevel: 49,
    rankCode: 'S',
    title: 'S-Rank Monarch',
    transformationName: 'SHADOW MONARCH',
    auraColor: '#EC4899',
    badge: 'S',
    quote: 'ARISE! From the ashes of weakness, the supreme ruler stands unchallenged.',
    perks: ['+75% Coin Bonus', 'S-Rank Dungeon Domination', 'Monarch Aura Effect'],
  },
  {
    minLevel: 50,
    maxLevel: 999,
    rankCode: 'NATIONAL',
    title: 'National-Level Sovereign',
    transformationName: 'TRANSCENDENT CELESTIAL DEITY',
    auraColor: '#FFD700',
    badge: 'NAT',
    quote: 'Beyond human limits. The entire world bows to your unbroken discipline.',
    perks: ['+100% Coin Multiplier', 'Infinite Ascension', 'Legendary Sovereign Frame'],
  },
];

export function getRankForLevel(level: number): HunterRank {
  for (let i = HUNTER_RANKS.length - 1; i >= 0; i--) {
    if (level >= HUNTER_RANKS[i].minLevel) {
      return HUNTER_RANKS[i];
    }
  }
  return HUNTER_RANKS[0];
}
