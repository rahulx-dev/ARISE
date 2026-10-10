import { userRepository } from '../database/repositories/userRepository';
import { getRankForLevel } from '../constants/ranks';
import { supabase, isSupabaseConfigured, getCloudUserId } from './supabaseClient';

export type LeaderboardCategory = 'streak' | 'power' | 'reps';

export interface HunterLeaderboardEntry {
  id: string;
  name: string;
  title: string;
  rankCode: string;
  rankColor: string;
  level: number;
  currentStreak: number;
  totalReps: number;
  totalXP: number;
  avatarSeed: string;
  country: string;
  isCurrentUser: boolean;
  rankPosition?: number;
}

export const leaderboardService = {
  /**
   * Get authentic leaderboard entries containing real hunters from Supabase database
   */
  getLeaderboard: async (
    category: LeaderboardCategory = 'streak'
  ): Promise<{
    entries: HunterLeaderboardEntry[];
    currentUser: HunterLeaderboardEntry | null;
    totalHuntersCount: number;
    gapToNextRank: { targetName: string; gapAmount: number; metric: string } | null;
  }> => {
    const profile = await userRepository.getProfile();
    const rankInfo = getRankForLevel(profile?.level || 1);

    let cloudUserId = 'current_user';
    try {
      cloudUserId = await getCloudUserId();
    } catch {}

    const currentUserName = profile?.displayName || 'Hunter';
    const totalReps = ((profile?.strength || 0) * 15) + ((profile?.discipline || 0) * 20);
    const totalXP = profile?.totalXP || (profile?.currentXP || 0);

    // Build current real user entry
    const userEntry: HunterLeaderboardEntry = {
      id: cloudUserId,
      name: currentUserName,
      title: rankInfo.title,
      rankCode: rankInfo.rankCode,
      rankColor: rankInfo.auraColor,
      level: profile?.level || 1,
      currentStreak: profile?.currentStreak || 0,
      totalReps,
      totalXP,
      avatarSeed: profile?.avatarIcon || 'img_pfp_01',
      country: 'IN',
      isCurrentUser: true,
      rankPosition: 1,
    };

    // Deduplicate strictly by user_id
    const userMap = new Map<string, HunterLeaderboardEntry>();
    userMap.set(cloudUserId, userEntry);

    let totalRegisteredHunters = 1;

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('crystal_leaderboard').select('*');
        if (category === 'streak') {
          query = query.order('streak', { ascending: false });
        } else if (category === 'reps') {
          query = query.order('total_reps', { ascending: false });
        } else {
          query = query.order('total_xp', { ascending: false });
        }
        const { data: hunters, error: huntersErr } = await query.limit(100);

        if (!huntersErr && hunters && hunters.length > 0) {
          totalRegisteredHunters = Math.max(totalRegisteredHunters, hunters.length);

          for (const row of hunters) {
            const uid = row.user_id || 'unknown';
            if (uid === cloudUserId) continue;

            const rInfo = getRankForLevel(row.level || 1);
            const level = row.level || 1;
            const streak = typeof row.streak === 'number' ? row.streak : (row.current_streak || 0);
            const reps = typeof row.total_reps === 'number' ? row.total_reps : 0;
            const xp = typeof row.total_xp === 'number' ? row.total_xp : 0;

            userMap.set(uid, {
              id: uid,
              name: (row.name || 'Hunter').trim(),
              title: row.title || rInfo.title,
              rankCode: row.rank_code || rInfo.rankCode,
              rankColor: rInfo.auraColor,
              level,
              currentStreak: streak,
              totalReps: reps,
              totalXP: xp,
              avatarSeed: row.avatar_icon || 'img_pfp_01',
              country: 'IN',
              isCurrentUser: false,
            });
          }
        }
      } catch (e) {
        console.warn('[LeaderboardService] Supabase query error:', e);
      }
    }

    const list = Array.from(userMap.values());

    // Sort by active category
    if (category === 'streak') {
      list.sort((a, b) => b.currentStreak - a.currentStreak);
    } else if (category === 'reps') {
      list.sort((a, b) => b.totalReps - a.totalReps);
    } else {
      list.sort((a, b) => b.totalXP - a.totalXP);
    }

    // Assign rank positions
    list.forEach((item, idx) => {
      item.rankPosition = idx + 1;
    });

    const userIdx = list.findIndex((e) => e.isCurrentUser);
    const resolvedUser = userIdx >= 0 ? list[userIdx] : userEntry;

    let gapInfo = null;
    if (userIdx > 0) {
      const nextTarget = list[userIdx - 1];
      let gapAmount = 0;
      let metric = 'XP';
      if (category === 'streak') {
        gapAmount = Math.max(1, nextTarget.currentStreak - resolvedUser.currentStreak);
        metric = 'Days';
      } else if (category === 'reps') {
        gapAmount = Math.max(1, nextTarget.totalReps - resolvedUser.totalReps);
        metric = 'Reps';
      } else {
        gapAmount = Math.max(1, nextTarget.totalXP - resolvedUser.totalXP);
        metric = 'XP';
      }
      gapInfo = { targetName: nextTarget.name, gapAmount, metric };
    }

    totalRegisteredHunters = Math.max(totalRegisteredHunters, list.length);

    return {
      entries: list,
      currentUser: resolvedUser,
      totalHuntersCount: totalRegisteredHunters,
      gapToNextRank: gapInfo,
    };
  },
};
