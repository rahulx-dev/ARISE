import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  Settings,
  Flame,
  ChevronRight,
  Shield,
  Crown,
  BarChart2,
  Clock,
  Coins,
  Circle,
  CheckCircle2,
  Dumbbell,
  BookOpen,
  Ban,
  ShoppingBag,
  Sparkles,
  Footprints,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { getAvatarSource } from '../../src/constants/avatars';
import { AnimatedStreakFlame } from '../../src/components/ui/AnimatedStreakFlame';
import { getRankForLevel } from '../../src/constants/ranks';
import { getDailyQuote } from '../../src/constants/quotes';
import { NotificationSheet } from '../../src/components/notifications/NotificationSheet';
import { fontFamilies } from '../../src/theme/typography';
import { useTranslation } from '../../src/services/i18n';
import { getRequiredXP } from '../../src/services/xpService';
import { Icon3D } from '../../src/components/ui/Icon3D';

const { width } = Dimensions.get('window');

export default function HomeDashboard() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const { t } = useTranslation();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);

  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const lastFocusRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadQuests();
    }, [loadProfile, loadQuests])
  );

  useEffect(() => {
    const init = async () => {
      try {
        await loadProfile();
        await loadQuests();
      } catch (e) {
        console.warn('Dashboard init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const displayName = profile?.displayName || 'Warrior';
  const level = profile?.level ?? 1;
  const currentXP = profile?.currentXP ?? 0;
  const streak = profile?.currentStreak ?? 0;
  const coins = profile?.coins ?? 0;
  const avatarIcon = profile?.avatarIcon || 'pfp_01';
  const profileImageUri = profile?.profileImageUri;

  const rank = getRankForLevel(level);
  const xpNeeded = Math.max(1, getRequiredXP(level));
  const xpPercent = Math.min(
    100,
    Math.round((currentXP / Math.max(1, xpNeeded)) * 100)
  );

  const completedQuests = (dailyQuests || []).filter((q) => q.completed).length;
  const totalQuests = dailyQuests?.length ?? 0;

  const quote = getDailyQuote();
  const avatarSrc = getAvatarSource(avatarIcon, profileImageUri);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: isDark ? '#000000' : colors.background },
        ]}
      >
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: '#F6F4EF' },
      ]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TOP HEADER */}
        <View style={styles.topHeader}>
          {/* Left: Avatar + Name */}
          <TouchableOpacity
            style={styles.headerLeftCol}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.avatarBox,
                { borderColor: '#E8E4DC', backgroundColor: '#FFFFFF' },
              ]}
            >
              <Image source={avatarSrc} style={styles.avatarImg} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={[
                  styles.userNameText,
                  { color: '#1A1A1A' },
                ]}
              >
                {displayName}
              </Text>
              <AnimatedStreakFlame size={20} />
            </View>
          </TouchableOpacity>

          {/* Right: Notifications & Settings */}
          <View style={styles.headerRightCol}>
            <TouchableOpacity
              style={[
                styles.circleIconBtn,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.light();
                setIsNotifOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Bell
                size={19}
                color="#1A1A1A"
                strokeWidth={2.2}
              />
              <View style={styles.redBadgeDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.circleIconBtn,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/settings');
              }}
              activeOpacity={0.8}
            >
              <Settings
                size={19}
                color="#1A1A1A"
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. LEVEL & IDENTITY CARD */}
        <View
          style={[
            styles.levelCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E4DC',
            },
          ]}
        >
          <View style={styles.levelCardTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={[
                  styles.shieldCrownBox,
                  {
                    backgroundColor: '#FFF8F0',
                    borderColor: '#FBE8D0',
                  },
                ]}
              >
                <Icon3D name="crown_gold" size={26} />
              </View>
              <View>
                <Text
                  style={[
                    styles.levelTitle,
                    { color: '#1A1A1A' },
                  ]}
                >
                  {t('level', 'Level')} {level}
                </Text>
                <Text
                  style={[
                    styles.rankSubText,
                    { color: '#6B7280' },
                  ]}
                >
                  {rank.rankCode}-{t('rankHunter', 'Rank Hunter').replace('{0}-', '')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text
                style={[
                  styles.xpFractionText,
                  { color: '#6B7280' },
                ]}
              >
                {currentXP} / {xpNeeded} XP
              </Text>
              <Text style={styles.xpPercentText}>{xpPercent}%</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View
            style={[
              styles.xpTrack,
              { backgroundColor: '#F0ECE1' },
            ]}
          >
            <View
              style={[
                styles.xpFill,
                { width: `${Math.max(5, xpPercent)}%`, backgroundColor: '#E53935' },
              ]}
            />
          </View>
        </View>

        {/* 3. 4-METRIC GRID ROW (1:1 with reference mockup) */}
        <View style={styles.metricsGridRow}>
          {/* 1. Day Streak */}
          <View
            style={[
              styles.metricGridCard,
              {
                backgroundColor: '#FFFFFF',
                borderColor: '#E8E4DC',
              },
            ]}
          >
            <View
              style={[
                styles.metricCircleBadge,
                { backgroundColor: '#FFF8F0' },
              ]}
            >
              <Icon3D name="flame_orange" size={24} />
            </View>
            <Text
              style={[
                styles.metricBigNum,
                { color: '#1A1A1A' },
              ]}
            >
              {streak}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: '#6B7280' },
                ]}
              >
                {t('dayStreak', 'Day Streak')}
              </Text>
              <ChevronRight size={11} color="#6B7280" />
            </View>
          </View>

          {/* 2. Reps Today */}
          <TouchableOpacity
            style={[
              styles.metricGridCard,
              {
                backgroundColor: '#FFFFFF',
                borderColor: '#E8E4DC',
              },
            ]}
            onPress={() => router.push('/tracking')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.metricCircleBadge,
                { backgroundColor: '#F0F9FF' },
              ]}
            >
              <Icon3D name="trophy_gold" size={24} />
            </View>
            <Text
              style={[
                styles.metricBigNum,
                { color: '#1A1A1A' },
              ]}
            >
              125
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: '#6B7280' },
                ]}
              >
                {t('repsToday', 'Reps Today')}
              </Text>
              <ChevronRight size={11} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {/* 3. Focus Time */}
          <TouchableOpacity
            style={[
              styles.metricGridCard,
              {
                backgroundColor: '#FFFFFF',
                borderColor: '#E8E4DC',
              },
            ]}
            onPress={() => router.push('/(tabs)/focus')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.metricCircleBadge,
                { backgroundColor: '#FFFBF0' },
              ]}
            >
              <Icon3D name="hourglass_amber" size={24} />
            </View>
            <Text
              style={[
                styles.metricBigNum,
                { color: '#1A1A1A', fontSize: 16 },
              ]}
            >
              2h 30m
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: '#6B7280' },
                ]}
              >
                {t('focusTime', 'Focus Time')}
              </Text>
              <ChevronRight size={11} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {/* 4. Coins */}
          <TouchableOpacity
            style={[
              styles.metricGridCard,
              {
                backgroundColor: '#FFFFFF',
                borderColor: '#E8E4DC',
              },
            ]}
            onPress={() => {
              haptics.light();
              router.push('/shop' as any);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.metricCircleBadge,
                { backgroundColor: '#FFFBEB' },
              ]}
            >
              <Icon3D name="coin_gold" size={24} />
            </View>
            <Text
              style={[
                styles.metricBigNum,
                { color: '#1A1A1A' },
              ]}
            >
              {coins.toLocaleString()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: '#6B7280' },
                ]}
              >
                {t('coins', 'Coins')}
              </Text>
              <ChevronRight size={11} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. TODAY'S QUESTS SECTION (1:1 with reference mockup) */}
        <View
          style={[
            styles.todayQuestsCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E4DC',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.todayQuestsHeader}>
            <Text
              style={[
                styles.todayQuestsTitle,
                { color: '#1A1A1A' },
              ]}
            >
              {t('todaysQuests', "Today's Quests")}
            </Text>
            <Text
              style={[
                styles.todayQuestsCount,
                { color: '#6B7280' },
              ]}
            >
              {(dailyQuests || []).length > 0
                ? `${(dailyQuests || []).filter((q) => Boolean(q.completed)).length} / ${(dailyQuests || []).length}`
                : '0 / 5'}
            </Text>
          </View>

          {/* Quests List */}
          <View style={styles.todayQuestsList}>
            {(dailyQuests && dailyQuests.length > 0 ? dailyQuests.slice(0, 4) : []).map((q) => {
              const isDone = Boolean(q.completed);
              const cat = (q.category || '').toUpperCase();
              const titleLower = (q.title || '').toLowerCase();
              const isFitness = cat === 'FITNESS' || cat === 'STRENGTH';
              const isFocus = cat === 'FOCUS' || q.questType === 'TIMER' || titleLower.includes('focus');

              const handleHomeQuestPress = () => {
                haptics.light();
                if (isDone) {
                  router.push('/(tabs)/quests');
                  return;
                }
                if (isFitness) {
                  let exType = 'PUSHUP';
                  if (titleLower.includes('squat')) exType = 'SQUAT';
                  else if (titleLower.includes('sit') || titleLower.includes('crunch')) exType = 'SITUP';
                  else if (titleLower.includes('plank')) exType = 'PLANK';
                  else if (titleLower.includes('jack')) exType = 'JUMPING_JACK';

                  router.push({
                    pathname: '/exercise/[type]',
                    params: {
                      type: exType,
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
                  router.push('/(tabs)/quests');
                }
              };

              return (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.questItemRow, isDone && { opacity: 0.6 }]}
                  onPress={handleHomeQuestPress}
                  activeOpacity={0.75}
                >
                  {isDone ? (
                    <Icon3D name="checkmark_green" size={20} />
                  ) : (
                    <Circle
                      size={20}
                      color="#D1D5DB"
                      strokeWidth={2}
                    />
                  )}
                  {isFitness ? (
                    <Icon3D
                      name="dumbbell_white"
                      size={18}
                      style={{ marginLeft: 4 }}
                    />
                  ) : isFocus ? (
                    <Icon3D
                      name="hourglass_amber"
                      size={18}
                      style={{ marginLeft: 4 }}
                    />
                  ) : (
                    <Icon3D
                      name="scroll_parchment"
                      size={18}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.questItemTitle,
                      {
                        color: isDone
                          ? '#9CA3AF'
                          : '#1A1A1A',
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {q.title}
                  </Text>
                  <View style={[styles.questBountyTag, isDone && { opacity: 0.7 }]}>
                    <Icon3D name="coin_gold" size={14} />
                    <Text style={styles.questBountyText}>+{q.rewardCoins || 18}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* View All Quests Button */}
          <TouchableOpacity
            style={[
              styles.viewAllQuestsBtn,
              {
                backgroundColor: '#F6F4EF',
                borderColor: '#E8E4DC',
              },
            ]}
            onPress={() => {
              haptics.light();
              router.push('/(tabs)/quests');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewAllQuestsBtnText,
                { color: '#1A1A1A' },
              ]}
            >
              {t('viewAllQuests', 'View All Quests')}
            </Text>
            <ChevronRight
              size={15}
              color="#1A1A1A"
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>

        {/* 5. QUICK ACTIONS SECTION (1:1 with reference mockup) */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsHeader}>
            <Text
              style={[
                styles.quickActionsTitle,
                { color: '#1A1A1A' },
              ]}
            >
              {t('quickActions', 'Quick Actions')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/quests')}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text
                style={[
                  styles.seeAllText,
                  { color: '#6B7280' },
                ]}
              >
                {t('seeAll', 'See All')}
              </Text>
              <ChevronRight
                size={13}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsCardsRow}
          >
            {/* Action 1: Workout */}
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/exercise/pushup' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.quickActionIconWrap,
                  {
                    backgroundColor: '#FFF2F2',
                  },
                ]}
              >
                <Icon3D name="dumbbell_white" size={24} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[
                    styles.quickActionCardTitle,
                    { color: '#1A1A1A' },
                  ]}
                >
                  {t('workout', 'Workout')}
                </Text>
                <ChevronRight
                  size={14}
                  color="#6B7280"
                />
              </View>
              <Text
                style={[
                  styles.quickActionCardSub,
                  { color: '#6B7280' },
                ]}
              >
                {t('startSession', 'Start session')}
              </Text>
            </TouchableOpacity>

            {/* Action 2: Run (Outdoor GPS) */}
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/run' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.quickActionIconWrap,
                  {
                    backgroundColor: '#F0FDF4',
                  },
                ]}
              >
                <Icon3D name="sneaker_blue" size={24} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[
                    styles.quickActionCardTitle,
                    { color: '#1A1A1A' },
                  ]}
                >
                  {t('run', 'Run')}
                </Text>
                <ChevronRight
                  size={14}
                  color="#6B7280"
                />
              </View>
              <Text
                style={[
                  styles.quickActionCardSub,
                  { color: '#6B7280' },
                ]}
              >
                {t('runSub', 'Outdoor GPS')}
              </Text>
            </TouchableOpacity>

            {/* Action 3: Focus */}
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/(tabs)/focus' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.quickActionIconWrap,
                  {
                    backgroundColor: '#EFF6FF',
                  },
                ]}
              >
                <Icon3D name="hourglass_amber" size={24} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[
                    styles.quickActionCardTitle,
                    { color: '#1A1A1A' },
                  ]}
                >
                  {t('focus', 'Focus')}
                </Text>
                <ChevronRight
                  size={14}
                  color="#6B7280"
                />
              </View>
              <Text
                style={[
                  styles.quickActionCardSub,
                  { color: '#6B7280' },
                ]}
              >
                {t('stayInZone', 'Stay in zone')}
              </Text>
            </TouchableOpacity>

            {/* Action 4: Shop */}
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E4DC',
                },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/shop' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.quickActionIconWrap,
                  {
                    backgroundColor: '#FDF4FF',
                  },
                ]}
              >
                <Icon3D name="cart_purple" size={24} />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[
                    styles.quickActionCardTitle,
                    { color: '#1A1A1A' },
                  ]}
                >
                  {t('shop', 'Shop')}
                </Text>
                <ChevronRight
                  size={14}
                  color="#6B7280"
                />
              </View>
              <Text
                style={[
                  styles.quickActionCardSub,
                  { color: '#6B7280' },
                ]}
              >
                {t('upgradeUnlock', 'Spend coins')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Notifications Modal */}
      <NotificationSheet
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 40,
  },

  // 1. Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  greetingCol: {
    gap: 1,
  },
  greetingSubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
  },
  userNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  redBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  mottoSubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 12.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: -4,
  },

  // 2. Level & XP Hero Card
  levelCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  levelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shieldCrownBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rankSubText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  xpFractionText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
  },
  xpPercentText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelQuoteBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  levelQuoteText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },

  // 3. 4-Metric Grid Row
  metricsGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricGridCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricCircleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricBigNum: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // 4. Today's Quests Card
  todayQuestsCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  todayQuestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayQuestsTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  todayQuestsCount: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: '500',
  },
  todayQuestsList: {
    gap: 12,
  },
  questItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questItemTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  questBountyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questBountyText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F59E0B',
  },
  viewAllQuestsBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  viewAllQuestsBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    fontWeight: '500',
  },

  // 5. Quick Actions Section
  quickActionsContainer: {
    gap: 12,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  quickActionsTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    width: 124,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionCardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionCardSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 10.5,
    fontWeight: '400',
  },
});
