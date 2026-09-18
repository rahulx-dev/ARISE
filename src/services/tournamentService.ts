import { userRepository } from '../database/repositories/userRepository';

export interface TournamentTier {
  name: string;
  range: string;
  badge: string;
  rewardCoins: number;
}

export interface TournamentParticipant {
  rank: number;
  name: string;
  rankCode: string;
  points: number;
  streak: number;
  isCurrentUser: boolean;
}

export interface HunterTournament {
  id: string;
  title: string;
  subtitle: string;
  type: 'REP_CLASH' | 'STREAK_SURVIVAL' | 'ENDURANCE_RAID';
  prizePoolCoins: number;
  firstPlacePrizeCoins: number;
  participantsCount: number;
  endsAt: string; // ISO string
  entryRequirement: string;
  userJoined: boolean;
  userPoints: number;
  userRank: number;
  userTier: string;
  bannerColor: string;
  rules: string[];
  tiers: TournamentTier[];
  leaderboard: TournamentParticipant[];
}

// In-memory persistent tournament state
let userJoinedTournaments: Record<string, boolean> = {};
let userTournamentPoints: Record<string, number> = {};

export const tournamentService = {
  getTournaments: async (): Promise<HunterTournament[]> => {
    const profile = await userRepository.getProfile();
    const userStreak = profile?.currentStreak || 0;
    const userDisplayName = profile?.displayName || 'Hunter';

    const endsIn3Days = new Date(Date.now() + 3 * 86400000 + 4 * 3600000).toISOString();
    const endsIn5Days = new Date(Date.now() + 5 * 86400000 + 8 * 3600000).toISOString();

    const isMonarchJoined = Boolean(userJoinedTournaments['monarch-clash-2026']);
    const monarchPoints = userTournamentPoints['monarch-clash-2026'] || 0;

    const monarchLeaderboard: TournamentParticipant[] = [];
    if (isMonarchJoined) {
      monarchLeaderboard.push({
        rank: 1,
        name: userDisplayName,
        rankCode: profile?.level ? (profile.level >= 50 ? 'A' : profile.level >= 25 ? 'B' : profile.level >= 10 ? 'C' : 'D') : 'E',
        points: monarchPoints,
        streak: userStreak,
        isCurrentUser: true,
      });
    }

    const isShadowJoined = Boolean(userJoinedTournaments['shadow-streak-raid']);
    const shadowPoints = userTournamentPoints['shadow-streak-raid'] || 0;

    const shadowLeaderboard: TournamentParticipant[] = [];
    if (isShadowJoined) {
      shadowLeaderboard.push({
        rank: 1,
        name: userDisplayName,
        rankCode: profile?.level ? (profile.level >= 50 ? 'A' : 'E') : 'E',
        points: shadowPoints,
        streak: userStreak,
        isCurrentUser: true,
      });
    }

    const tournaments: HunterTournament[] = [
      {
        id: 'monarch-clash-2026',
        title: "Monarch's 7-Day Championship",
        subtitle: 'Grand Push-Up & Squat Calisthenics Arena',
        type: 'REP_CLASH',
        prizePoolCoins: 50000,
        firstPlacePrizeCoins: 20000,
        participantsCount: isMonarchJoined ? 1 : 0,
        endsAt: endsIn3Days,
        entryRequirement: 'Open To All Hunters',
        userJoined: isMonarchJoined,
        userPoints: monarchPoints,
        userRank: isMonarchJoined ? 1 : 0,
        userTier: isMonarchJoined ? 'Contender' : 'Unranked',
        bannerColor: '#0A84FF',
        rules: [
          'All verified reps count directly towards tournament points.',
          'Form score > 80% awards a 1.2x tournament point multiplier.',
          'Top hunters win Grand Monarch Trophies & direct cashout coins.',
        ],
        tiers: [
          { name: 'Tier 1: Grand Monarchs', range: 'Top 1%', badge: 'Crown', rewardCoins: 20000 },
          { name: 'Tier 2: Elite Hunters', range: 'Top 10%', badge: 'Medal', rewardCoins: 5000 },
          { name: 'Tier 3: Contenders', range: 'Top 25%', badge: 'Shield', rewardCoins: 1500 },
          { name: 'Tier 4: Survivors', range: 'Top 50%', badge: 'Check', rewardCoins: 500 },
        ],
        leaderboard: monarchLeaderboard,
      },
      {
        id: 'shadow-streak-raid',
        title: 'Shadow Gauntlet: Streak Endurance Raid',
        subtitle: 'Unbroken Discipline Survival Trial',
        type: 'STREAK_SURVIVAL',
        prizePoolCoins: 25000,
        firstPlacePrizeCoins: 10000,
        participantsCount: isShadowJoined ? 1 : 0,
        endsAt: endsIn5Days,
        entryRequirement: 'Min 3-Day Streak Required',
        userJoined: isShadowJoined,
        userPoints: shadowPoints,
        userRank: isShadowJoined ? 1 : 0,
        userTier: isShadowJoined ? 'Contender' : 'Unranked',
        bannerColor: '#8B5CF6',
        rules: [
          'Maintain daily streak to accumulate survival multiplier.',
          '1 missed day resets tournament multiplier to 1.0x.',
        ],
        tiers: [
          { name: 'Tier 1: Sovereign Survivors', range: 'Top 1%', badge: 'Crown', rewardCoins: 10000 },
          { name: 'Tier 2: Unbroken Legion', range: 'Top 10%', badge: 'Medal', rewardCoins: 2500 },
        ],
        leaderboard: shadowLeaderboard,
      },
    ];

    return tournaments;
  },

  joinTournament: async (tournamentId: string): Promise<boolean> => {
    userJoinedTournaments[tournamentId] = true;
    if (!userTournamentPoints[tournamentId]) {
      userTournamentPoints[tournamentId] = 0;
    }
    return true;
  },

  addTournamentPoints: async (tournamentId: string, points: number): Promise<number> => {
    if (!userJoinedTournaments[tournamentId]) return 0;
    userTournamentPoints[tournamentId] = (userTournamentPoints[tournamentId] || 0) + points;
    return userTournamentPoints[tournamentId];
  },
};
