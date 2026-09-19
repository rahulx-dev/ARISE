import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Barbell,
  Brain,
  Footprints,
  Lightning,
  Flame,
  Check,
  ShieldWarning,
  Camera,
  Play,
  Clock,
  Sparkle,
  Target,
} from 'phosphor-react-native';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { APP_3D_ASSETS } from '../../src/constants/assets';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';

const { width } = Dimensions.get('window');

type QuestTabFilter = 'ALL' | 'DAILY' | 'WEEKLY' | 'SPECIAL';

interface RankConfig {
  label: string;
  bg: string;
  color: string;
}

const RANK_CONFIGS: Record<string, RankConfig> = {
  E: { label: 'E-RANK', bg: 'rgba(107, 114, 128, 0.15)', color: '#6B7280' },
  D: { label: 'D-RANK', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  C: { label: 'C-RANK', bg: 'rgba(10, 132, 255, 0.15)', color: '#0A84FF' },
  B: { label: 'B-RANK', bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' },
  A: { label: 'A-RANK', bg: 'rgba(229, 57, 53, 0.15)', color: '#E53935' },
  S: { label: 'S-RANK', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' },
};

export default function QuestsScreen() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();

  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const profile = usePlayerStore((s) => s.profile);

  const [activeTab, setActiveTab] = useState<QuestTabFilter>('ALL');
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState('04:12:30');
  const lastLoadRef = useRef<number>(0);

  useEffect(() => {
    loadQuests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > 10000) {
        lastLoadRef.current = now;
        loadQuests();
      }
    }, [])
  );

  // Countdown timer for Penalty Zone
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diffMs = endOfDay.getTime() - now.getTime();
      if (diffMs <= 0) {
        setPenaltyTimeLeft('00:00:00');
        return;
      }
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setPenaltyTimeLeft(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualComplete = async (questId: number) => {
    const q = dailyQuests.find((item) => item.id === questId);
    if (!q || q.completed) return;
    showIOSAlert('CONFIRM COMPLETION', `Did you execute "${q.title}"?`, [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'CONFIRM',
        style: 'primary',
        onPress: async () => {
          haptics.heavy();
          sound.play('quest_complete');
          const res = await completeQuest(questId);
          showIOSAlert('QUEST COMPLETE!', `+${res.coins} Coins, +${res.xp} XP added to your vault.`);
        },
      },
    ]);
  };

  const filteredQuests = dailyQuests.filter((q) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'DAILY') return q.questType !== 'WEEKLY';
    if (activeTab === 'WEEKLY') return q.questType === 'WEEKLY' || (q.target || 0) >= 30;
    if (activeTab === 'SPECIAL') return q.category === 'special' || (q.rewardCoins || 0) >= 30;
    return true;
  });

  const completedCount = dailyQuests.filter((q) => q.completed).length;
  const totalCount = dailyQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const filterTabs: { key: QuestTabFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'DAILY', label: 'Daily' },
    { key: 'WEEKLY', label: 'Weekly' },
    { key: 'SPECIAL', label: 'Special' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. TOP HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Quests</Text>
          <Text style={[styles.subTitle, { color: colors.textMuted }]}>
            Level {profile?.level || 1} • {completedCount}/{dailyQuests.length} Cleared
          </Text>
        </View>
        <View style={styles.headerProgressBox}>
          <Text style={[styles.progressPercentText, { color: colors.primary }]}>{progressPercent}%</Text>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>DONE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. PENALTY ZONE BANNER */}
        <View style={styles.penaltyBanner}>
          <View style={styles.penaltyHeaderRow}>
            <View style={styles.penaltyTag}>
              <ShieldWarning size={15} color="#FFFFFF" weight="fill" />
              <Text style={styles.penaltyTagText}>PENALTY ZONE</Text>
            </View>
            <View style={styles.countdownPill}>
              <Clock size={13} color="#E53935" weight="bold" />
              <Text style={styles.countdownText}>{penaltyTimeLeft}</Text>
            </View>
          </View>
          <Text style={styles.penaltyDesc}>
            Incomplete daily quests trigger mandatory survival punishment at midnight.
          </Text>
        </View>

        {/* 3. CATEGORY TABS (All / Daily / Weekly / Special) */}
        <View style={styles.tabsRow}>
          {filterTabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: isSelected ? colors.primary : colors.border },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. SHADOW SPRINT GPS TRIAL CARD */}
        {(activeTab === 'ALL' || activeTab === 'SPECIAL') && (
          <TouchableOpacity
            style={[styles.sprintCard, { backgroundColor: isDark ? '#0C1322' : '#F0F7FF', borderColor: '#0A84FF' }]}
            onPress={() => {
              haptics.heavy();
              router.push('/run' as any);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.sprintCardHeader}>
              <View style={styles.sprintTitleRow}>
                <Footprints size={20} color="#0A84FF" weight="fill" />
                <Text style={[styles.sprintTitle, { color: colors.textPrimary }]}>Shadow Sprint GPS Trial</Text>
              </View>
              <View style={[styles.rankBadge, { backgroundColor: RANK_CONFIGS.B.bg }]}>
                <Text style={[styles.rankBadgeText, { color: RANK_CONFIGS.B.color }]}>B-RANK</Text>
              </View>
            </View>
            <Text style={[styles.sprintDesc, { color: colors.textSecondary }]}>
              Live outdoor distance tracking with pace telemetry. Conquer 2.5 km to earn massive hunter coins.
            </Text>
            <View style={styles.sprintFooter}>
              <View style={styles.bountyRow}>
                <View style={styles.bountyPill}>
                  <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 14, height: 14 }} />
                  <Text style={styles.bountyCoinText}>+50</Text>
                </View>
                <View style={styles.bountyPill}>
                  <Sparkle size={12} color="#0A84FF" weight="fill" />
                  <Text style={styles.bountyXPText}>+200 XP</Text>
                </View>
              </View>
              <View style={[styles.startBtnSmall, { backgroundColor: '#0A84FF' }]}>
                <Text style={styles.startBtnSmallText}>START RUN</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 5. QUESTS LIST */}
        <View style={styles.questsList}>
          {filteredQuests.map((q, idx) => {
            const isDone = q.completed === true;
            const titleLower = q.title.toLowerCase();
            const cat = (q.category || '').toUpperCase();

            const isExercise =
              cat === 'STRENGTH' ||
              cat === 'FITNESS' ||
              titleLower.includes('push') ||
              titleLower.includes('squat') ||
              titleLower.includes('pull') ||
              titleLower.includes('plank') ||
              titleLower.includes('jack') ||
              titleLower.includes('lunge') ||
              titleLower.includes('crunch');

            const isFocus = cat === 'FOCUS' || titleLower.includes('focus') || titleLower.includes('study');

            let exerciseType = 'PUSHUP';
            if (titleLower.includes('squat')) exerciseType = 'SQUAT';
            else if (titleLower.includes('pull')) exerciseType = 'PULLUP';
            else if (titleLower.includes('plank')) exerciseType = 'PLANK';
            else if (titleLower.includes('jack')) exerciseType = 'JUMPING_JACK';

            const rankKey = idx === 0 ? 'D' : idx === 1 ? 'C' : idx === 2 ? 'E' : 'D';
            const rank = RANK_CONFIGS[rankKey];

            const handleQuestAction = () => {
              if (isDone) return;
              haptics.medium();
              if (isExercise) {
                router.push({
                  pathname: '/exercise/[type]',
                  params: {
                    type: exerciseType,
                    target: String(q.target || 20),
                    questId: String(q.id),
                    rewardCoins: String(q.rewardCoins || 20),
                    rewardXP: String(q.rewardXP || 100),
                  },
                } as any);
              } else if (isFocus) {
                router.push('/(tabs)/focus' as any);
              } else {
                handleManualComplete(q.id);
              }
            };

            return (
              <View
                key={q.id}
                style={[
                  styles.questCard,
                  { backgroundColor: colors.card, borderColor: isDone ? colors.border : colors.border },
                ]}
              >
                {/* Header Row: Rank Badge & Status */}
                <View style={styles.questCardTopRow}>
                  <View style={[styles.rankBadge, { backgroundColor: rank.bg }]}>
                    <Text style={[styles.rankBadgeText, { color: rank.color }]}>{rank.label}</Text>
                  </View>
                  <View style={styles.bountyRow}>
                    <View style={styles.bountyPill}>
                      <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 13, height: 13 }} />
                      <Text style={styles.bountyCoinText}>+{q.rewardCoins || 20}</Text>
                    </View>
                    <View style={styles.bountyPill}>
                      <Text style={styles.bountyXPText}>+{q.rewardXP || 100} XP</Text>
                    </View>
                  </View>
                </View>

                {/* Title & Description */}
                <View style={styles.questDetails}>
                  <Text
                    style={[
                      styles.questTitle,
                      { color: colors.textPrimary },
                      isDone && { textDecorationLine: 'line-through', opacity: 0.5 },
                    ]}
                  >
                    {q.title}
                  </Text>
                  <Text
                    style={[styles.questDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {q.description || 'Complete this objective to maintain your awakening rank.'}
                  </Text>
                </View>

                {/* Action Row */}
                <View style={styles.questActionRow}>
                  {isDone ? (
                    <View style={styles.completedBadge}>
                      <Check size={14} color="#10B981" weight="bold" />
                      <Text style={styles.completedBadgeText}>COMPLETED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.startQuestBtn,
                        { backgroundColor: isExercise || isFocus ? colors.primary : '#111827' },
                      ]}
                      onPress={handleQuestAction}
                      activeOpacity={0.85}
                    >
                      {isExercise ? (
                        <>
                          <Camera size={15} color="#FFFFFF" weight="bold" />
                          <Text style={styles.startQuestBtnText}>START AI WORKOUT</Text>
                        </>
                      ) : isFocus ? (
                        <>
                          <Brain size={15} color="#FFFFFF" weight="bold" />
                          <Text style={styles.startQuestBtnText}>START FOCUS SESSION</Text>
                        </>
                      ) : (
                        <>
                          <Check size={15} color="#FFFFFF" weight="bold" />
                          <Text style={styles.startQuestBtnText}>MARK COMPLETE</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Ad Banner */}
        <AriseBannerAd style={{ marginVertical: 8 }} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  headerProgressBox: {
    alignItems: 'flex-end',
  },
  progressPercentText: {
    fontSize: 20,
    fontWeight: '900',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  penaltyBanner: {
    backgroundColor: '#E53935',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  penaltyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  penaltyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  penaltyTagText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E53935',
    fontVariant: ['tabular-nums'],
  },
  penaltyDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 17,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sprintCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  sprintCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sprintTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sprintTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  sprintDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  sprintFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  startBtnSmall: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  startBtnSmallText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  questsList: {
    gap: 12,
  },
  questCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  questCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bountyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bountyCoinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  bountyXPText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A84FF',
  },
  questDetails: {
    gap: 4,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  questDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  questActionRow: {
    paddingTop: 4,
  },
  startQuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  startQuestBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
});
