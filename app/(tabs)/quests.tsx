import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useProgressSpring } from '../../src/hooks/useMotion';
import { motion } from '../../src/theme/motion';
import { AnimatedPressable } from '../../src/components/motion/AnimatedPressable';
import {
  Barbell,
  Brain,
  Lightning,
  Check,
  ShieldWarning,
  Sparkle,
  Target,
  Footprints,
} from 'phosphor-react-native';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { APP_3D_ASSETS } from '../../src/constants/assets';
import { fontFamilies } from '../../src/theme/typography';
import { EXERCISE_REGISTRY, ExerciseType } from '../../src/exercise';
import { QuestData } from '../../src/services/questService';
import { useTranslation } from '../../src/services/i18n';
import { Icon3D } from '../../src/components/ui/Icon3D';

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

const getRankConfig = (difficulty?: string): RankConfig => {
  const d = (difficulty || '').toUpperCase();
  if (d === 'LEGENDARY' || d === 'S') return RANK_CONFIGS.S;
  if (d === 'EPIC' || d === 'A') return RANK_CONFIGS.A;
  if (d === 'HARD' || d === 'B') return RANK_CONFIGS.B;
  if (d === 'MEDIUM' || d === 'NORMAL' || d === 'C') return RANK_CONFIGS.C;
  if (d === 'EASY' || d === 'E') return RANK_CONFIGS.E;
  return RANK_CONFIGS.D;
};

const resolveExerciseType = (q: QuestData): ExerciseType | null => {
  const rawType = (q.exerciseType || '').toUpperCase();
  if (rawType in EXERCISE_REGISTRY) return rawType as ExerciseType;
  if (rawType === 'DIAMOND_PUSHUP') return 'PUSHUP';
  if (rawType === 'CRUNCH') return 'SITUP';

  const titleLower = (q.title || '').toLowerCase();
  if (titleLower.includes('squat')) return 'SQUAT';
  if (titleLower.includes('sit') || titleLower.includes('crunch')) return 'SITUP';
  if (titleLower.includes('plank')) return 'PLANK';
  if (titleLower.includes('jack')) return 'JUMPING_JACK';
  if (titleLower.includes('push')) return 'PUSHUP';
  return null;
};

function QuestCardRow({
  q,
  isDone,
  isCameraTracked,
  isFocus,
  isRunning,
  rank,
  buttonLabel,
  colors,
  isDark,
  onAction,
  getCategoryIcon,
}: {
  q: QuestData;
  isDone: boolean;
  isCameraTracked: boolean;
  isFocus: boolean;
  isRunning?: boolean;
  rank: RankConfig;
  buttonLabel: string;
  colors: any;
  isDark: boolean;
  onAction: () => void;
  getCategoryIcon: (q: QuestData, isCamera: boolean, isFocus: boolean, isRunning?: boolean) => React.ReactNode;
}) {
  const checkmarkScale = useSharedValue(isDone ? 1 : 0.6);

  useEffect(() => {
    if (isDone) {
      checkmarkScale.value = withSequence(
        withTiming(motion.scale.popCheckmark, { duration: motion.timing.quick }),
        withSpring(1, motion.spring.pop)
      );
    }
  }, [isDone, checkmarkScale]);

  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  return (
    <View
      style={[
        styles.horizontalQuestCard,
        { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' },
        isDone && { opacity: 0.72 },
      ]}
    >
      {/* Left: Category Icon Thumbnail */}
      <View
        style={[
          styles.questThumbBox,
          {
            backgroundColor: isRunning
              ? '#F0FDF4'
              : isCameraTracked
              ? '#FFF2F2'
              : isFocus
              ? '#EFF6FF'
              : '#FFFBEB',
          },
        ]}
      >
        {getCategoryIcon(q, isCameraTracked, isFocus, isRunning)}
      </View>

      {/* Middle: Title, Subtitle, Rewards */}
      <View style={styles.questMiddleCol}>
        <Text style={[styles.questRowTitle, { color: '#1A1A1A' }]} numberOfLines={1}>
          {q.title}
        </Text>
        <Text style={[styles.questRowDesc, { color: '#6B7280' }]} numberOfLines={1}>
          {q.description || (isRunning ? 'Outdoor GPS Run' : isCameraTracked ? `Target: ${q.target || 20} reps` : 'Daily protocol')}
        </Text>
        <View style={styles.rewardBadgesRow}>
          <View style={[styles.bountyMiniPill, { backgroundColor: '#FFFBEB' }]}>
            <Icon3D name="coin_gold" size={13} />
            <Text style={styles.bountyMiniCoinText}>+{q.rewardCoins || 18}</Text>
          </View>
          <View style={[styles.bountyMiniPill, { backgroundColor: '#F6F4EF' }]}>
            <Text style={[styles.bountyMiniXPText, { color: '#6B7280' }]}>
              +{q.rewardXP || 50} XP
            </Text>
          </View>
        </View>
      </View>

      {/* Right: Rank Tag & Action Button */}
      <View style={styles.questRightCol}>
        <View style={[styles.rankBadgeMini, { backgroundColor: rank.bg }]}>
          <Text style={[styles.rankBadgeMiniText, { color: rank.color }]}>{rank.label}</Text>
        </View>

        {isDone ? (
          <Animated.View
            style={[
              styles.completedPillMini,
              {
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
              },
              animatedCheckmarkStyle,
            ]}
          >
            <Icon3D name="checkmark_green" size={14} />
            <Text style={styles.completedPillMiniText}>DONE</Text>
          </Animated.View>
        ) : (
          <AnimatedPressable
            style={[
              styles.startQuestPillBtn,
              isRunning && { backgroundColor: '#2563EB' },
              !isCameraTracked && !isFocus && !isRunning && styles.manualClaimBtn,
            ]}
            onPress={onAction}
            scaleTo={motion.scale.pressedChip}
          >
            <Text style={styles.startQuestPillBtnText}>{buttonLabel}</Text>
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

export default function QuestsScreen() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();
  const { t } = useTranslation();

  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const weeklyQuests = useQuestStore((s) => s.weeklyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);

  const [activeTab, setActiveTab] = useState<QuestTabFilter>('ALL');
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState('00:00:00');

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Always refresh latest quest state when tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadQuests();
    }, [loadQuests])
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

  const displayedQuests = useMemo(() => {
    const daily = dailyQuests || [];
    const weekly = weeklyQuests || [];
    const combined = [...daily, ...weekly];

    if (activeTab === 'DAILY') {
      return daily.filter((q) => !q.frequency || q.frequency === 'DAILY');
    }
    if (activeTab === 'WEEKLY') {
      return weekly.length > 0
        ? weekly
        : daily.filter((q) => q.frequency === 'WEEKLY');
    }
    if (activeTab === 'SPECIAL') {
      return combined.filter(
        (q) =>
          q.difficulty === 'EPIC' ||
          q.difficulty === 'LEGENDARY' ||
          q.difficulty === 'HARD' ||
          q.category === 'SPECIAL'
      );
    }
    // 'ALL' shows all daily & weekly quests
    return combined.length > 0 ? combined : daily;
  }, [dailyQuests, weeklyQuests, activeTab]);

  const totalDailyCount = (dailyQuests || []).length;
  const completedDailyCount = (dailyQuests || []).filter((q) => Boolean(q.completed)).length;
  const dailyProgressRatio = totalDailyCount > 0 ? completedDailyCount / totalDailyCount : 0;
  const { animatedStyle: progressAnimatedStyle } = useProgressSpring(dailyProgressRatio);

  const handleManualComplete = async (q: QuestData) => {
    haptics.success();
    sound.play('quest_complete');
    try {
      const result = await completeQuest(q.id);
      showIOSAlert(
        'Protocol Cleared!',
        `You completed "${q.title}" and earned +${result.coins} Coins and +${result.xp} XP.`,
        [{ text: 'Awesome', style: 'default' }],
        { variant: 'quest', tag: 'QUEST CLEARED' }
      );
    } catch {
      showIOSAlert('Unable to complete quest', 'Your progress was not changed. Please try again.');
    }
  };

  const handleQuestAction = (q: QuestData) => {
    if (q.completed) return;
    haptics.medium();

    const cat = (q.category || '').toUpperCase();
    const titleLower = (q.title || '').toLowerCase();
    const isRunning =
      cat === 'RUNNING' ||
      titleLower.includes('run') ||
      titleLower.includes('sprint') ||
      titleLower.includes('jog');
    const isFocus = !isRunning && (cat === 'FOCUS' || q.questType === 'TIMER' || titleLower.includes('focus'));
    const cameraExercise = resolveExerciseType(q);
    const isCameraTracked = !isRunning && cameraExercise !== null && q.questType !== 'MANUAL';

    if (isRunning) {
      const targetKm = q.target && q.target >= 500 ? q.target / 1000 : 1.0;
      router.push({
        pathname: '/run',
        params: {
          questId: String(q.id),
          targetKm: String(targetKm),
        },
      } as any);
      return;
    }
    if (isCameraTracked) {
      router.push({
        pathname: '/exercise/[type]',
        params: {
          type: cameraExercise,
          target: String(q.target || 20),
          questId: String(q.id),
          rewardCoins: String(q.rewardCoins || 18),
          rewardXP: String(q.rewardXP || 50),
        },
      } as any);
    } else if (isFocus) {
      router.push({
        pathname: '/focus/session',
        params: {
          questId: String(q.id),
          targetMinutes: String(q.target || 25),
        },
      } as any);
    } else {
      handleManualComplete(q);
    }
  };

  const getCategoryIcon = (q: QuestData, isCamera: boolean, isFocus: boolean, isRunning?: boolean) => {
    const cat = (q.category || '').toUpperCase();
    if (isRunning) {
      return <Icon3D name="sneaker_blue" size={24} />;
    }
    if (isCamera) {
      return <Icon3D name="dumbbell_white" size={24} />;
    }
    if (isFocus) {
      return <Icon3D name="hourglass_amber" size={24} />;
    }
    if (cat === 'WELLNESS') {
      return <Icon3D name="crystal_cyan" size={24} />;
    }
    if (cat === 'DISCIPLINE') {
      return <Icon3D name="swords_steel" size={24} />;
    }
    return <Icon3D name="scroll_parchment" size={24} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F6F4EF' }]} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER */}
      <View style={[styles.header, { borderBottomColor: '#E8E4DC', backgroundColor: '#F6F4EF' }]}>
        <Text style={[styles.screenTitle, { color: '#1A1A1A' }]}>{t('tabQuests', 'Quests')}</Text>
        <View style={[styles.systemProtocolsPill, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
          <Icon3D name="lightning_yellow" size={15} />
          <Text style={styles.systemProtocolsText}>System Protocols</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. DAILY PROGRESS SUMMARY */}
        <View style={[styles.progressSummaryCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E4DC' }]}>
          <View style={styles.progressSummaryHeader}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.progressSummaryTitle, { color: '#1A1A1A' }]}>{t('dailySystemDirectives', 'Daily Objectives')}</Text>
              <Text style={[styles.progressSummarySub, { color: '#6B7280' }]}>
                {completedDailyCount} of {totalDailyCount} protocols completed
              </Text>
            </View>
            <View style={[styles.progressBadge, { backgroundColor: '#FFF2F2' }]}>
              <Text style={styles.progressBadgeText}>
                {totalDailyCount > 0 ? Math.round((completedDailyCount / totalDailyCount) * 100) : 0}%
              </Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: '#F0ECE1' }]}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>

        {/* 3. FILTER PILLS: All, Daily, Weekly, Special */}
        <View style={styles.filterRow}>
          {(['ALL', 'DAILY', 'WEEKLY', 'SPECIAL'] as const).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected
                      ? '#E53935'
                      : '#FFFFFF',
                    borderColor: isSelected ? '#E53935' : '#E8E4DC',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveTab(tab);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : '#6B7280',
                    },
                  ]}
                >
                  {tab === 'ALL'
                    ? t('filterAll', 'All')
                    : tab === 'DAILY'
                    ? t('filterDaily', 'Daily')
                    : tab === 'WEEKLY'
                    ? t('filterWeekly', 'Weekly')
                    : t('filterSpecial', 'Special')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. QUEST CARDS LIST */}
        <View style={styles.questCardsList}>
          {/* Shadow Sprint GPS Trial Card (All & Special tabs) */}
          {(activeTab === 'ALL' || activeTab === 'SPECIAL') && (
            <AnimatedPressable
              style={[
                styles.horizontalQuestCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.heavy();
                router.push('/run' as any);
              }}
              scaleTo={motion.scale.pressedCard}
            >
              {/* Left: Category Icon Thumbnail */}
              <View
                style={[
                  styles.questThumbBox,
                  { backgroundColor: '#F0FDF4' },
                ]}
              >
                <Icon3D name="sneaker_blue" size={24} />
              </View>

              {/* Middle: Title, Subtitle, Rewards */}
              <View style={styles.questMiddleCol}>
                <Text style={[styles.questRowTitle, { color: '#1A1A1A' }]} numberOfLines={1}>
                  {t('shadowSprint', 'Shadow Sprint GPS Trial')}
                </Text>
                <Text style={[styles.questRowDesc, { color: '#6B7280' }]} numberOfLines={1}>
                  {t('sprintDesc', 'Live outdoor distance tracking with pace telemetry.')}
                </Text>
                <View style={styles.rewardBadgesRow}>
                  <View style={[styles.bountyMiniPill, { backgroundColor: '#FFFBEB' }]}>
                    <Icon3D name="coin_gold" size={13} />
                    <Text style={styles.bountyMiniCoinText}>+50</Text>
                  </View>
                  <View style={[styles.bountyMiniPill, { backgroundColor: '#F6F4EF' }]}>
                    <Text style={[styles.bountyMiniXPText, { color: '#6B7280' }]}>
                      +200 XP
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right: Rank Tag & Action Button */}
              <View style={styles.questRightCol}>
                <View style={[styles.rankBadgeMini, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                  <Text style={[styles.rankBadgeMiniText, { color: '#2563EB' }]}>B-RANK</Text>
                </View>
                <View style={[styles.startQuestPillBtn, { backgroundColor: '#2563EB' }]}>
                  <Text style={styles.startQuestPillBtnText}>{t('startRun', 'START RUN')}</Text>
                </View>
              </View>
            </AnimatedPressable>
          )}

          {displayedQuests.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ShieldWarning size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {activeTab === 'SPECIAL' ? 'No Special Rank Protocols' : 'No Quests Available'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'SPECIAL'
                  ? 'High-rank S & A tier protocols unlock as your hunter level increases.'
                  : 'Check other tabs to view your active hunter protocols.'}
              </Text>
            </View>
          ) : (
            displayedQuests.map((q) => {
              const isDone = Boolean(q.completed);
              const cat = (q?.category || '').toUpperCase();
              const titleLower = (q?.title || '').toLowerCase();
              const isRunning =
                cat === 'RUNNING' ||
                titleLower.includes('run') ||
                titleLower.includes('sprint') ||
                titleLower.includes('jog');
              const isFocus = !isRunning && (cat === 'FOCUS' || q.questType === 'TIMER' || titleLower.includes('focus'));
              const cameraExercise = resolveExerciseType(q);
              const isCameraTracked = !isRunning && cameraExercise !== null && q.questType !== 'MANUAL';
              const rank = getRankConfig(q.difficulty);

              let buttonLabel = t('claimReward', 'COMPLETE');
              if (isRunning) {
                buttonLabel = t('startRun', 'START RUN');
              } else if (isCameraTracked) {
                buttonLabel = t('startAiWorkout', 'START TRACKER');
              } else if (isFocus) {
                buttonLabel = t('startFocus', 'START FOCUS');
              }

              return (
                <QuestCardRow
                  key={q.id}
                  q={q}
                  isDone={isDone}
                  isCameraTracked={isCameraTracked}
                  isFocus={isFocus}
                  isRunning={isRunning}
                  rank={rank}
                  buttonLabel={buttonLabel}
                  colors={colors}
                  isDark={isDark}
                  onAction={() => handleQuestAction(q)}
                  getCategoryIcon={getCategoryIcon}
                />
              );
            })
          )}
        </View>

        {/* 5. PENALTY ZONE AT THE BOTTOM */}
        <View style={styles.penaltyBannerBottom}>
          <View style={styles.penaltyHeaderRow}>
            <View style={styles.penaltyTag}>
              <Icon3D name="shield_blue" size={18} />
              <Text style={styles.penaltyTagText}>PENALTY ZONE</Text>
            </View>
            <Text style={styles.penaltyCountdownText}>Daily reset in {penaltyTimeLeft}</Text>
          </View>
          <Text style={styles.penaltyDesc}>
            Complete your daily protocols before midnight to protect your hunter streak!
          </Text>
        </View>

        <View style={{ height: 30 }} />
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
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  systemProtocolsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  systemProtocolsText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#E53935',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  progressSummaryCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  progressSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressSummaryTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
  },
  progressSummarySub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  progressBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#E53935',
  },
  progressTrack: {
    height: 6,
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E53935',
    borderRadius: 100,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
  },
  filterPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  questCardsList: {
    gap: 12,
  },
  horizontalQuestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  questThumbBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questMiddleCol: {
    flex: 1,
    gap: 3,
  },
  questRowTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  questRowDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
  },
  rewardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  bountyMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bountyMiniCoinText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  bountyMiniXPText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
  },
  questRightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rankBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankBadgeMiniText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  startQuestPillBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 100,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  manualClaimBtn: {
    backgroundColor: '#0A84FF',
    shadowColor: '#0A84FF',
  },
  startQuestPillBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  completedPillMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  completedPillMiniText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10.5,
    fontWeight: '500',
    color: '#10B981',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
  },
  penaltyBannerBottom: {
    backgroundColor: '#FFF2F2',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 6,
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
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 0.8,
  },
  penaltyCountdownText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#E53935',
    fontVariant: ['tabular-nums'],
  },
  penaltyDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
    lineHeight: 17,
  },
});
