import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Trophy,
  Fire,
  Lightning,
  Crown,
  Medal,
  ArrowLeft,
  Clock,
  Sparkle,
  Coins,
  Users,
  Shield,
  Barbell,
  CheckCircle,
  Sword,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { HoloLoader } from '../../src/components/ui/HoloLoader';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import {
  leaderboardService,
  HunterLeaderboardEntry,
  LeaderboardCategory,
} from '../../src/services/leaderboardService';
import {
  tournamentService,
  HunterTournament,
} from '../../src/services/tournamentService';
import { AVATAR_IMAGES } from '../../src/components/profile/AvatarPicker';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { supabase, isSupabaseConfigured } from '../../src/services/supabaseClient';
import { AnimatedStreakFlame } from '../../src/components/ui/AnimatedStreakFlame';

const { width } = Dimensions.get('window');

type HubTab = 'rankings' | 'tournaments';

// Helper to resolve hunter portrait image
function getHunterAvatarSource(hunter: HunterLeaderboardEntry, currentUserAvatarId?: string) {
  if (hunter.isCurrentUser && currentUserAvatarId) {
    const found = AVATAR_IMAGES.find((img) => img.id === currentUserAvatarId);
    if (found?.source) return found.source;
  }

  // Pre-mapped community hunter avatars
  const SEED_MAP: Record<string, string> = {
    monarch: 'img_pfp_05',
    swordsaint: 'img_pfp_02',
    goliath: 'img_pfp_04',
    chairman: 'img_pfp_07',
    mage: 'img_pfp_08',
    whitetiger: 'img_pfp_09',
    surveillance: 'img_pfp_06',
    iron: 'img_pfp_03',
    blade: 'img_pfp_12',
    archer: 'img_pfp_14',
  };

  const targetId = SEED_MAP[hunter.avatarSeed] || hunter.avatarSeed || 'img_pfp_01';
  const match = AVATAR_IMAGES.find((img) => img.id === targetId);
  return match?.source || AVATAR_IMAGES[0].source;
}

export default function LeaderboardScreen() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const profile = usePlayerStore((s) => s.profile);

  const [activeHubTab, setActiveHubTab] = useState<HubTab>('rankings');
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('streak');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HunterLeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<HunterLeaderboardEntry | null>(null);
  const [totalHunters, setTotalHunters] = useState<number>(1);
  const [gapInfo, setGapInfo] = useState<{ targetName: string; gapAmount: number; metric: string } | null>(null);

  const [tournaments, setTournaments] = useState<HunterTournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<HunterTournament | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [lbData, tData] = await Promise.all([
        leaderboardService.getLeaderboard(activeCategory),
        tournamentService.getTournaments(),
      ]);
      setEntries(lbData.entries);
      setCurrentUser(lbData.currentUser);
      setTotalHunters(lbData.totalHuntersCount);
      setGapInfo(lbData.gapToNextRank);
      setTournaments(tData);
      if (tData.length > 0 && !selectedTournament) {
        setSelectedTournament(tData[0]);
      }
    } catch (err) {
      console.warn('Leaderboard loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Supabase Realtime live sync
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('public:crystal_leaderboard_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crystal_leaderboard' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  const topThree = entries.slice(0, 3);
  const remainder = entries.length >= 3 ? entries.slice(3) : entries;

  const handleJoinTournament = async (tId: string) => {
    haptics.heavy();
    await tournamentService.joinTournament(tId);
    const updated = await tournamentService.getTournaments();
    setTournaments(updated);
    const curr = updated.find((t) => t.id === tId);
    if (curr) setSelectedTournament(curr);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={19} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>HUNTER ASSOCIATION</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>GLOBAL RANKINGS & TOURNAMENTS</Text>
        </View>

        <View style={styles.activeTag}>
          <Users size={12} color="#0A84FF" weight="bold" />
          <Text style={styles.activeTagText}>
            {totalHunters >= 1000 ? `${(totalHunters / 1000).toFixed(1)}k ACTIVE` : `${totalHunters} ACTIVE`}
          </Text>
        </View>
      </View>

      {/* Main Dual-Hub Segment Switcher */}
      <View style={[styles.hubSegmentWrap, { backgroundColor: isDark ? '#0A0D15' : colors.surfaceLight, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.hubSegmentBtn,
            activeHubTab === 'rankings' && styles.hubSegmentBtnActive,
          ]}
          onPress={() => {
            haptics.light();
            setActiveHubTab('rankings');
          }}
          activeOpacity={0.85}
        >
          <Trophy
            size={15}
            color={activeHubTab === 'rankings' ? '#FFFFFF' : colors.textSecondary}
            weight={activeHubTab === 'rankings' ? 'fill' : 'regular'}
          />
          <Text
            style={[
              styles.hubSegmentText,
              { color: colors.textSecondary },
              activeHubTab === 'rankings' && styles.hubSegmentTextActive,
            ]}
          >
            GLOBAL RANKINGS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.hubSegmentBtn,
            activeHubTab === 'tournaments' && styles.hubSegmentBtnActive,
          ]}
          onPress={() => {
            haptics.light();
            setActiveHubTab('tournaments');
          }}
          activeOpacity={0.85}
        >
          <Sword
            size={15}
            color={activeHubTab === 'tournaments' ? '#FFFFFF' : colors.textSecondary}
            weight={activeHubTab === 'tournaments' ? 'fill' : 'regular'}
          />
          <Text
            style={[
              styles.hubSegmentText,
              { color: colors.textSecondary },
              activeHubTab === 'tournaments' && styles.hubSegmentTextActive,
            ]}
          >
            TOURNAMENTS
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <HoloLoader message="SYNCING SATELLITE HUNTER DATA" subMessage="CONNECTING GLOBAL LEADERBOARD..." />
        </View>
      ) : activeHubTab === 'rankings' ? (
        /* ==================== GLOBAL RANKINGS TAB ==================== */
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Category Filter Pills (Sleek Obsidian Capsules) */}
            <View style={styles.categoryPillsRow}>
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  { backgroundColor: isDark ? '#0A0D15' : colors.surfaceLight, borderColor: colors.border },
                  activeCategory === 'streak' && styles.categoryPillActiveStreak,
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveCategory('streak');
                }}
                activeOpacity={0.85}
              >
                <AnimatedStreakFlame size={16} />
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: colors.textSecondary },
                    activeCategory === 'streak' && styles.categoryPillTextActive,
                  ]}
                >
                  STREAK TITANS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  { backgroundColor: isDark ? '#0A0D15' : colors.surfaceLight, borderColor: colors.border },
                  activeCategory === 'power' && styles.categoryPillActivePower,
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveCategory('power');
                }}
                activeOpacity={0.85}
              >
                <Lightning
                  size={14}
                  color={activeCategory === 'power' ? '#FFFFFF' : '#0A84FF'}
                  weight="fill"
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: colors.textSecondary },
                    activeCategory === 'power' && styles.categoryPillTextActive,
                  ]}
                >
                  POWER LEVEL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  { backgroundColor: isDark ? '#0A0D15' : colors.surfaceLight, borderColor: colors.border },
                  activeCategory === 'reps' && styles.categoryPillActiveReps,
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveCategory('reps');
                }}
                activeOpacity={0.85}
              >
                <Barbell
                  size={14}
                  color={activeCategory === 'reps' ? '#FFFFFF' : '#F59E0B'}
                  weight="fill"
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: colors.textSecondary },
                    activeCategory === 'reps' && styles.categoryPillTextActive,
                  ]}
                >
                  REPS LOGGED
                </Text>
              </TouchableOpacity>
            </View>

            {/* MAJESTIC 3D MONARCH PODIUM */}
            {topThree.length >= 3 && (
              <View style={styles.podiumContainer}>
                {/* 2nd Place - Silver (Left) */}
                <View style={styles.podiumColumn}>
                  <View style={styles.podiumAvatarWrapSilver}>
                    <Image
                      source={getHunterAvatarSource(topThree[1], profile?.avatarIcon)}
                      style={styles.podiumAvatarImg}
                      resizeMode="cover"
                    />
                    <View style={styles.podiumRankBadgeSilver}>
                      <Text style={styles.podiumRankTextSilver}>2</Text>
                    </View>
                  </View>

                  <Text style={[styles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {topThree[1].name}
                  </Text>
                  <View style={styles.podiumStreakBadgeSilver}>
                    {activeCategory === 'reps' ? (
                      <>
                        <Barbell size={11} color="#94A3B8" weight="fill" />
                        <Text style={styles.podiumStreakTextSilver}>{topThree[1].totalReps.toLocaleString()} reps</Text>
                      </>
                    ) : activeCategory === 'power' ? (
                      <>
                        <Lightning size={11} color="#94A3B8" weight="fill" />
                        <Text style={styles.podiumStreakTextSilver}>{topThree[1].totalXP.toLocaleString()} XP</Text>
                      </>
                    ) : (
                      <>
                        <AnimatedStreakFlame size={14} />
                        <Text style={styles.podiumStreakTextSilver}>{topThree[1].currentStreak}d STREAK</Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.pedestalSilver, { backgroundColor: isDark ? '#0F1218' : colors.card, borderColor: colors.border }]}>
                    <Medal size={20} color="#94A3B8" weight="fill" />
                    <Text style={styles.pedestalSubSilver}>LVL {topThree[1].level}</Text>
                  </View>
                </View>

                {/* 1st Place - Gold (Center Sovereign) */}
                <View style={[styles.podiumColumn, styles.podiumFirst]}>
                  <Crown size={24} color="#F59E0B" weight="fill" style={{ marginBottom: 4 }} />
                  <View style={styles.podiumAvatarWrapGold}>
                    <Image
                      source={getHunterAvatarSource(topThree[0], profile?.avatarIcon)}
                      style={styles.podiumAvatarImgGold}
                      resizeMode="cover"
                    />
                    <View style={styles.podiumRankBadgeGold}>
                      <Text style={styles.podiumRankTextGold}>1</Text>
                    </View>
                  </View>

                  <Text style={[styles.podiumNameGold, { color: colors.textPrimary }]} numberOfLines={1}>
                    {topThree[0].name}
                  </Text>
                  <View style={styles.podiumStreakBadgeGold}>
                    {activeCategory === 'reps' ? (
                      <>
                        <Barbell size={11} color="#F59E0B" weight="fill" />
                        <Text style={styles.podiumStreakTextGold}>
                          {topThree[0].totalReps.toLocaleString()} REPS
                        </Text>
                      </>
                    ) : activeCategory === 'power' ? (
                      <>
                        <Lightning size={11} color="#F59E0B" weight="fill" />
                        <Text style={styles.podiumStreakTextGold}>
                          {topThree[0].totalXP.toLocaleString()} XP
                        </Text>
                      </>
                    ) : (
                      <>
                        <AnimatedStreakFlame size={16} />
                        <Text style={styles.podiumStreakTextGold}>
                          {topThree[0].currentStreak}d STREAK
                        </Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.pedestalGold, { backgroundColor: isDark ? '#161309' : colors.card, borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : colors.border }]}>
                    <Trophy size={24} color="#F59E0B" weight="fill" />
                    <Text style={styles.pedestalSubGold}>
                      LVL {topThree[0].level} • {topThree[0].rankCode}-RANK
                    </Text>
                  </View>
                </View>

                {/* 3rd Place - Bronze (Right) */}
                <View style={styles.podiumColumn}>
                  <View style={styles.podiumAvatarWrapBronze}>
                    <Image
                      source={getHunterAvatarSource(topThree[2], profile?.avatarIcon)}
                      style={styles.podiumAvatarImg}
                      resizeMode="cover"
                    />
                    <View style={styles.podiumRankBadgeBronze}>
                      <Text style={styles.podiumRankTextBronze}>3</Text>
                    </View>
                  </View>

                  <Text style={[styles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {topThree[2].name}
                  </Text>
                  <View style={styles.podiumStreakBadgeBronze}>
                    {activeCategory === 'reps' ? (
                      <>
                        <Barbell size={11} color="#D97706" weight="fill" />
                        <Text style={styles.podiumStreakTextBronze}>{topThree[2].totalReps.toLocaleString()} reps</Text>
                      </>
                    ) : activeCategory === 'power' ? (
                      <>
                        <Lightning size={11} color="#D97706" weight="fill" />
                        <Text style={styles.podiumStreakTextBronze}>{topThree[2].totalXP.toLocaleString()} XP</Text>
                      </>
                    ) : (
                      <>
                        <AnimatedStreakFlame size={14} />
                        <Text style={styles.podiumStreakTextBronze}>{topThree[2].currentStreak}d STREAK</Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.pedestalBronze, { backgroundColor: isDark ? '#120F0A' : colors.card, borderColor: colors.border }]}>
                    <Medal size={20} color="#D97706" weight="fill" />
                    <Text style={styles.pedestalSubBronze}>LVL {topThree[2].level}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* REMAINDER LIST (#4 TO #50) */}
            <View style={styles.listSection}>
              <Text style={[styles.listHeaderTitle, { color: colors.textSecondary }]}>RANKED CONTENDERS</Text>

              <View style={[styles.groupedHunterList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {remainder.map((hunter, idx) => {
                  const isMe = hunter.isCurrentUser;
                  return (
                    <View key={hunter.id}>
                      <View style={[styles.hunterRow, isMe && { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.08)' : 'rgba(10, 132, 255, 0.12)' }]}>
                        <View style={styles.rankNumCol}>
                          <Text style={[styles.rankNumText, { color: colors.textSecondary }, isMe && { color: '#0A84FF' }]}>
                            #{hunter.rankPosition}
                          </Text>
                        </View>

                        <View style={[styles.hunterAvatarWrap, { borderColor: colors.border }]}>
                          <Image
                            source={getHunterAvatarSource(hunter, profile?.avatarIcon)}
                            style={styles.hunterAvatarImg}
                            resizeMode="cover"
                          />
                        </View>

                        <View style={{ flex: 1, gap: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.hunterName,
                                { color: colors.textPrimary },
                                isMe && { color: '#0A84FF', fontWeight: '600' },
                              ]}
                              numberOfLines={1}
                            >
                              {hunter.name} {isMe ? '(YOU)' : ''}
                            </Text>
                            <View
                              style={[
                                styles.miniRankBadge,
                                { borderColor: hunter.rankColor || '#0A84FF' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.miniRankText,
                                  { color: hunter.rankColor || '#0A84FF' },
                                ]}
                              >
                                {hunter.rankCode}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.hunterTitleSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {hunter.title} • LVL {hunter.level}
                          </Text>
                        </View>

                        {/* Dynamic Category Pill */}
                        <View style={styles.rowStreakPill}>
                          {activeCategory === 'reps' ? (
                            <>
                              <Barbell size={13} color="#F59E0B" weight="fill" />
                              <Text style={[styles.rowStreakVal, { color: '#F59E0B' }]}>{hunter.totalReps.toLocaleString()}</Text>
                              <Text style={[styles.rowStreakDaysLabel, { color: '#F59E0B' }]}>REPS</Text>
                            </>
                          ) : activeCategory === 'power' ? (
                            <>
                              <Lightning size={13} color="#0A84FF" weight="fill" />
                              <Text style={[styles.rowStreakVal, { color: '#0A84FF' }]}>{hunter.totalXP.toLocaleString()}</Text>
                              <Text style={[styles.rowStreakDaysLabel, { color: '#0A84FF' }]}>XP</Text>
                            </>
                          ) : (
                            <>
                              <AnimatedStreakFlame size={14} />
                              <Text style={styles.rowStreakVal}>{hunter.currentStreak}</Text>
                              <Text style={styles.rowStreakDaysLabel}>DAYS</Text>
                            </>
                          )}
                        </View>
                      </View>
                      {idx < remainder.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Non-intrusive Sponsor Banner */}
            <AriseBannerAd style={{ marginVertical: 14 }} />

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* STICKY BOTTOM USER STANDING PIN */}
          {currentUser && (
            <View style={[styles.stickyUserPin, { backgroundColor: colors.card, borderTopColor: '#0A84FF' }]}>
              <View style={styles.stickyUserLeft}>
                <View style={styles.stickyRankCircle}>
                  <Text style={styles.stickyRankNum}>#{currentUser.rankPosition}</Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={[styles.stickyUserName, { color: colors.textPrimary }]}>YOUR STANDING</Text>
                  <Text style={[styles.stickyUserSub, { color: colors.textSecondary }]}>
                    {currentUser.rankCode}-Rank • Level {currentUser.level}
                  </Text>
                </View>
              </View>

              <View style={styles.stickyUserRight}>
                <View style={styles.stickyStreakPill}>
                  {activeCategory === 'reps' ? (
                    <>
                      <Barbell size={15} color="#F59E0B" weight="fill" />
                      <Text style={[styles.stickyStreakNum, { color: '#F59E0B' }]}>{currentUser.totalReps.toLocaleString()}</Text>
                      <Text style={[styles.stickyStreakText, { color: '#F59E0B' }]}>REPS</Text>
                    </>
                  ) : activeCategory === 'power' ? (
                    <>
                      <Lightning size={15} color="#0A84FF" weight="fill" />
                      <Text style={[styles.stickyStreakNum, { color: '#0A84FF' }]}>{currentUser.totalXP.toLocaleString()}</Text>
                      <Text style={[styles.stickyStreakText, { color: '#0A84FF' }]}>XP</Text>
                    </>
                  ) : (
                    <>
                      <AnimatedStreakFlame size={16} />
                      <Text style={styles.stickyStreakNum}>{currentUser.currentStreak}</Text>
                      <Text style={styles.stickyStreakText}>DAYS</Text>
                    </>
                  )}
                </View>

                {gapInfo && (
                  <Text style={styles.gapInfoText}>
                    +{gapInfo.gapAmount} {gapInfo.metric} to pass #{currentUser.rankPosition! - 1}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      ) : (
        /* ==================== TOURNAMENTS TAB ==================== */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tournaments.map((t) => (
            <View key={t.id} style={[styles.tournamentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.tournTopRow}>
                <View style={styles.tournStatusPill}>
                  <Lightning size={12} color="#0A84FF" weight="fill" />
                  <Text style={styles.tournStatusText}>ACTIVE RAID</Text>
                </View>
                <View style={styles.tournPrizePill}>
                  <Coins size={13} color="#F59E0B" weight="fill" />
                  <Text style={styles.tournPrizeText}>{t.prizePoolCoins.toLocaleString()} COINS</Text>
                </View>
              </View>

              <Text style={[styles.tournTitle, { color: colors.textPrimary }]}>{t.title}</Text>
              <Text style={[styles.tournDesc, { color: colors.textSecondary }]}>{t.subtitle}</Text>

              <TouchableOpacity
                style={styles.tournJoinBtn}
                onPress={() => handleJoinTournament(t.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.tournJoinBtnText}>
                  {t.userJoined ? 'ENTER COMBAT ARENA' : 'REGISTER HUNTER BRACKET'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#121722',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#101420',
    borderWidth: 1,
    borderColor: '#1C263B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },

  // Dual Hub Segment
  hubSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#0A0D15',
    borderRadius: 100,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#161E2E',
  },
  hubSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 100,
  },
  hubSegmentBtnActive: {
    backgroundColor: '#0A84FF',
  },
  hubSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  hubSegmentTextActive: {
    color: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1.0,
  },

  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    paddingTop: 4,
  },

  // Category Pills
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: '#0A0D15',
    borderWidth: 1,
    borderColor: '#161E2E',
  },
  categoryPillActiveStreak: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  categoryPillActivePower: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  categoryPillActiveReps: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E9BB0',
    letterSpacing: 0.3,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  podiumFirst: {
    marginBottom: 16,
  },

  // Podium Avatars
  podiumAvatarWrapGold: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  podiumAvatarImgGold: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  podiumRankBadgeGold: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankTextGold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },

  podiumAvatarWrapSilver: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#94A3B8',
    position: 'relative',
    overflow: 'visible',
  },
  podiumAvatarWrapBronze: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#D97706',
    position: 'relative',
    overflow: 'visible',
  },
  podiumAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  podiumRankBadgeSilver: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankTextSilver: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  podiumRankBadgeBronze: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankTextBronze: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  podiumNameGold: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  podiumStreakBadgeGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  podiumStreakTextGold: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#F59E0B',
  },
  podiumStreakBadgeSilver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  podiumStreakTextSilver: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  podiumStreakBadgeBronze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  podiumStreakTextBronze: {
    fontSize: 9,
    fontWeight: '600',
    color: '#D97706',
  },

  // Pedestals
  pedestalGold: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    backgroundColor: '#161309',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pedestalSubGold: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  pedestalSilver: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    backgroundColor: '#0F1218',
    borderWidth: 1,
    borderColor: '#1E2536',
  },
  pedestalSubSilver: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pedestalBronze: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    backgroundColor: '#120F0A',
    borderWidth: 1,
    borderColor: '#261C10',
  },
  pedestalSubBronze: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#D97706',
  },

  // Remainder List
  listSection: {
    gap: 8,
    marginTop: 6,
  },
  listHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E9BB0',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  groupedHunterList: {
    backgroundColor: '#0A0D15',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#161E2E',
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#121824',
    marginLeft: 74,
  },
  hunterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  hunterRowMe: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  rankNumCol: {
    width: 26,
    alignItems: 'center',
  },
  rankNumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },
  hunterAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E283C',
  },
  hunterAvatarImg: {
    width: '100%',
    height: '100%',
  },
  hunterName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  miniRankBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniRankText: {
    fontSize: 8.5,
    fontWeight: '600',
  },
  hunterTitleSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  rowStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
  },
  rowStreakVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EA580C',
  },
  rowStreakDaysLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#EA580C',
  },

  // Sticky Pin
  stickyUserPin: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#0B0F19',
    borderTopWidth: 1.5,
    borderTopColor: '#0A84FF',
  },
  stickyUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stickyRankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyRankNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stickyUserName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stickyUserSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  stickyUserRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  stickyStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
  },
  stickyStreakNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EA580C',
  },
  stickyStreakText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#EA580C',
  },
  gapInfoText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0A84FF',
  },

  // Tournaments
  tournamentCard: {
    backgroundColor: '#0A0D15',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#161E2E',
    padding: 16,
    gap: 10,
  },
  tournTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tournStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
  },
  tournStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  tournPrizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tournPrizeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  tournTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tournDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  tournJoinBtn: {
    backgroundColor: '#0A84FF',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  tournJoinBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
