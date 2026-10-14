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
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';
import { Icon3D } from '../../src/components/ui/Icon3D';
import { fontFamilies } from '../../src/theme/typography';

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <NeumorphicCircleButton
          size={40}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#1A1A1A" weight="bold" />
        </NeumorphicCircleButton>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MONARCH HUB</Text>
          <Text style={styles.headerSub}>GLOBAL RANKINGS & ARENAS</Text>
        </View>

        <View style={styles.activeTag}>
          <Users size={12} color="#E53935" weight="bold" />
          <Text style={styles.activeTagText}>
            {totalHunters >= 1000 ? `${(totalHunters / 1000).toFixed(1)}k ACTIVE` : `${totalHunters} ACTIVE`}
          </Text>
        </View>
      </View>

      {/* Main Dual-Hub Segment Switcher */}
      <View style={styles.hubSegmentWrap}>
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
            size={14}
            color={activeHubTab === 'rankings' ? '#FFFFFF' : '#7A756D'}
            weight={activeHubTab === 'rankings' ? 'fill' : 'regular'}
          />
          <Text
            style={[
              styles.hubSegmentText,
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
            size={14}
            color={activeHubTab === 'tournaments' ? '#FFFFFF' : '#7A756D'}
            weight={activeHubTab === 'tournaments' ? 'fill' : 'regular'}
          />
          <Text
            style={[
              styles.hubSegmentText,
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
            {/* Category Filter Pills */}
            <View style={styles.categoryPillsRow}>
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  activeCategory === 'streak' && styles.categoryPillActive,
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveCategory('streak');
                }}
                activeOpacity={0.85}
              >
                <Icon3D name="flame_orange" size={16} />
                <Text
                  style={[
                    styles.categoryPillText,
                    activeCategory === 'streak' && styles.categoryPillTextActive,
                  ]}
                >
                  STREAK TITANS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  activeCategory === 'power' && styles.categoryPillActive,
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveCategory('power');
                }}
                activeOpacity={0.85}
              >
                <Icon3D name="lightning_gold" size={16} />
                <Text
                  style={[
                    styles.categoryPillText,
                    activeCategory === 'power' && styles.categoryPillTextActive,
                  ]}
                >
                  POWER LEVEL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  activeCategory === 'reps' && styles.categoryPillActive,
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveCategory('reps');
                }}
                activeOpacity={0.85}
              >
                <Icon3D name="dumbbell_white" size={16} />
                <Text
                  style={[
                    styles.categoryPillText,
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

                  <Text style={styles.podiumName} numberOfLines={1}>
                    {topThree[1].name}
                  </Text>
                  <View style={styles.podiumStreakBadgeSilver}>
                    {activeCategory === 'reps' ? (
                      <>
                        <Barbell size={11} color="#7A756D" weight="fill" />
                        <Text style={styles.podiumStreakTextSilver}>{topThree[1].totalReps.toLocaleString()} reps</Text>
                      </>
                    ) : activeCategory === 'power' ? (
                      <>
                        <Lightning size={11} color="#7A756D" weight="fill" />
                        <Text style={styles.podiumStreakTextSilver}>{topThree[1].totalXP.toLocaleString()} XP</Text>
                      </>
                    ) : (
                      <>
                        <AnimatedStreakFlame size={14} />
                        <Text style={styles.podiumStreakTextSilver}>{topThree[1].currentStreak}d STREAK</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.pedestalSilver}>
                    <Icon3D name="trophy_gold" size={20} />
                    <Text style={styles.pedestalSubSilver}>LVL {topThree[1].level}</Text>
                  </View>
                </View>

                {/* 1st Place - Gold (Center Sovereign) */}
                <View style={[styles.podiumColumn, styles.podiumFirst]}>
                  <Icon3D name="crown_gold" size={28} style={{ marginBottom: 4 }} />
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

                  <Text style={styles.podiumNameGold} numberOfLines={1}>
                    {topThree[0].name}
                  </Text>
                  <View style={styles.podiumStreakBadgeGold}>
                    {activeCategory === 'reps' ? (
                      <>
                        <Barbell size={11} color="#E53935" weight="fill" />
                        <Text style={styles.podiumStreakTextGold}>
                          {topThree[0].totalReps.toLocaleString()} REPS
                        </Text>
                      </>
                    ) : activeCategory === 'power' ? (
                      <>
                        <Lightning size={11} color="#E53935" weight="fill" />
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
                  <View style={styles.pedestalGold}>
                    <Icon3D name="trophy_gold" size={24} />
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

                  <Text style={styles.podiumName} numberOfLines={1}>
                    {topThree[2].name}
                  </Text>
                  <View style={styles.podiumStreakBadgeBronze}>
                    {activeCategory === 'reps' ? (
                      <>
                        <Barbell size={11} color="#7A756D" weight="fill" />
                        <Text style={styles.podiumStreakTextBronze}>{topThree[2].totalReps.toLocaleString()} reps</Text>
                      </>
                    ) : activeCategory === 'power' ? (
                      <>
                        <Lightning size={11} color="#7A756D" weight="fill" />
                        <Text style={styles.podiumStreakTextBronze}>{topThree[2].totalXP.toLocaleString()} XP</Text>
                      </>
                    ) : (
                      <>
                        <AnimatedStreakFlame size={14} />
                        <Text style={styles.podiumStreakTextBronze}>{topThree[2].currentStreak}d STREAK</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.pedestalBronze}>
                    <Icon3D name="trophy_gold" size={20} />
                    <Text style={styles.pedestalSubBronze}>LVL {topThree[2].level}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* REMAINDER LIST (#4 TO #50) */}
            <View style={styles.listSection}>
              <Text style={styles.listHeaderTitle}>RANKED CONTENDERS</Text>

              <NeumorphicCard style={styles.groupedHunterList} padding={0}>
                {remainder.map((hunter, idx) => {
                  const isMe = hunter.isCurrentUser;
                  return (
                    <View key={hunter.id}>
                      <View style={[styles.hunterRow, isMe && styles.hunterRowMe]}>
                        <View style={styles.rankNumCol}>
                          <Text style={[styles.rankNumText, isMe && { color: '#E53935' }]}>
                            #{hunter.rankPosition}
                          </Text>
                        </View>

                        <View style={styles.hunterAvatarWrap}>
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
                                isMe && { color: '#E53935' },
                              ]}
                              numberOfLines={1}
                            >
                              {hunter.name} {isMe ? '(YOU)' : ''}
                            </Text>
                            <View
                              style={[
                                styles.miniRankBadge,
                                { borderColor: hunter.rankColor || '#E53935' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.miniRankText,
                                  { color: hunter.rankColor || '#E53935' },
                                ]}
                              >
                                {hunter.rankCode}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.hunterTitleSub} numberOfLines={1}>
                            {hunter.title} • LVL {hunter.level}
                          </Text>
                        </View>

                        {/* Dynamic Category Pill */}
                        <View style={styles.rowStreakPill}>
                          {activeCategory === 'reps' ? (
                            <>
                              <Barbell size={13} color="#E53935" weight="fill" />
                              <Text style={[styles.rowStreakVal, { color: '#E53935' }]}>{hunter.totalReps.toLocaleString()}</Text>
                              <Text style={[styles.rowStreakDaysLabel, { color: '#E53935' }]}>REPS</Text>
                            </>
                          ) : activeCategory === 'power' ? (
                            <>
                              <Lightning size={13} color="#E53935" weight="fill" />
                              <Text style={[styles.rowStreakVal, { color: '#E53935' }]}>{hunter.totalXP.toLocaleString()}</Text>
                              <Text style={[styles.rowStreakDaysLabel, { color: '#E53935' }]}>XP</Text>
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
                      {idx < remainder.length - 1 && <View style={styles.rowDivider} />}
                    </View>
                  );
                })}
              </NeumorphicCard>
            </View>

            {/* Non-intrusive Sponsor Banner */}
            <AriseBannerAd style={{ marginVertical: 14 }} />

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* STICKY BOTTOM USER STANDING PIN */}
          {currentUser && (
            <View style={styles.stickyUserPin}>
              <View style={styles.stickyUserLeft}>
                <View style={styles.stickyRankCircle}>
                  <Text style={styles.stickyRankNum}>#{currentUser.rankPosition}</Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={styles.stickyUserName}>YOUR STANDING</Text>
                  <Text style={styles.stickyUserSub}>
                    {currentUser.rankCode}-Rank • Level {currentUser.level}
                  </Text>
                </View>
              </View>

              <View style={styles.stickyUserRight}>
                <View style={styles.stickyStreakPill}>
                  {activeCategory === 'reps' ? (
                    <>
                      <Barbell size={15} color="#E53935" weight="fill" />
                      <Text style={[styles.stickyStreakNum, { color: '#E53935' }]}>{currentUser.totalReps.toLocaleString()}</Text>
                      <Text style={[styles.stickyStreakText, { color: '#E53935' }]}>REPS</Text>
                    </>
                  ) : activeCategory === 'power' ? (
                    <>
                      <Lightning size={15} color="#E53935" weight="fill" />
                      <Text style={[styles.stickyStreakNum, { color: '#E53935' }]}>{currentUser.totalXP.toLocaleString()}</Text>
                      <Text style={[styles.stickyStreakText, { color: '#E53935' }]}>XP</Text>
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
            <NeumorphicCard key={t.id} style={styles.tournamentCard} padding={18}>
              <View style={styles.tournTopRow}>
                <View style={styles.tournStatusPill}>
                  <Icon3D name="swords_steel" size={16} />
                  <Text style={styles.tournStatusText}>ACTIVE RAID</Text>
                </View>
                <View style={styles.tournPrizePill}>
                  <Icon3D name="coin_gold" size={16} />
                  <Text style={styles.tournPrizeText}>{t.prizePoolCoins.toLocaleString()} COINS</Text>
                </View>
              </View>

              <Text style={styles.tournTitle}>{t.title}</Text>
              <Text style={styles.tournDesc}>{t.subtitle}</Text>

              <TouchableOpacity
                style={styles.tournJoinBtn}
                onPress={() => handleJoinTournament(t.id)}
                activeOpacity={0.88}
              >
                <Text style={styles.tournJoinBtnText}>
                  {t.userJoined ? 'ENTER COMBAT ARENA' : 'REGISTER HUNTER BRACKET'}
                </Text>
              </TouchableOpacity>
            </NeumorphicCard>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4EF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
    letterSpacing: 1,
    marginTop: 2,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activeTagText: {
    fontSize: 9.5,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 0.5,
  },

  // Dual Hub Segment
  hubSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  hubSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 100,
  },
  hubSegmentBtnActive: {
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  hubSegmentText: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 0.8,
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

  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
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
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryPillText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 0.5,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 14,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#E53935',
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  podiumAvatarImgGold: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  podiumRankBadgeGold: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankTextGold: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },

  podiumAvatarWrapSilver: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#B0BEC5',
    position: 'relative',
    overflow: 'visible',
  },
  podiumAvatarWrapBronze: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#D7CCC8',
    position: 'relative',
    overflow: 'visible',
  },
  podiumAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  podiumRankBadgeSilver: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#78909C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankTextSilver: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  podiumRankBadgeBronze: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8D6E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankTextBronze: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },

  podiumName: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  podiumNameGold: {
    fontSize: 13.5,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  podiumStreakBadgeGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: '#FFF0F0',
  },
  podiumStreakTextGold: {
    fontSize: 9.5,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
  },
  podiumStreakBadgeSilver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: '#F0F4F8',
  },
  podiumStreakTextSilver: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },
  podiumStreakBadgeBronze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: '#EFEBE9',
  },
  podiumStreakTextBronze: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },

  // Pedestals
  pedestalGold: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  pedestalSubGold: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 0.5,
  },
  pedestalSilver: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  pedestalSubSilver: {
    fontSize: 9.5,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },
  pedestalBronze: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  pedestalSubBronze: {
    fontSize: 9.5,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },

  // Remainder List
  listSection: {
    gap: 8,
    marginTop: 8,
  },
  listHeaderTitle: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  groupedHunterList: {
    width: '100%',
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E8E4DC',
    marginLeft: 74,
  },
  hunterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  hunterRowMe: {
    backgroundColor: '#FFF5F5',
  },
  rankNumCol: {
    width: 28,
    alignItems: 'center',
  },
  rankNumText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    fontVariant: ['tabular-nums'],
  },
  hunterAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  hunterAvatarImg: {
    width: '100%',
    height: '100%',
  },
  hunterName: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  miniRankBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniRankText: {
    fontSize: 8.5,
    fontFamily: fontFamilies.bold,
  },
  hunterTitleSub: {
    fontSize: 10.5,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
  },
  rowStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F6F4EF',
  },
  rowStreakVal: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
  },
  rowStreakDaysLabel: {
    fontSize: 8.5,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  stickyUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickyRankCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyRankNum: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  stickyUserName: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  stickyUserSub: {
    fontSize: 10,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
  },
  stickyUserRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  stickyStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF0F0',
  },
  stickyStreakNum: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
  },
  stickyStreakText: {
    fontSize: 8.5,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
  },
  gapInfoText: {
    fontSize: 9.5,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },

  // Tournaments
  tournamentCard: {
    width: '100%',
    gap: 12,
  },
  tournTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tournStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  tournStatusText: {
    fontSize: 9.5,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 0.5,
  },
  tournPrizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tournPrizeText: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#B45309',
  },
  tournTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  tournDesc: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
    lineHeight: 17,
  },
  tournJoinBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tournJoinBtnText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
