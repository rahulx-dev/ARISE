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
  Gear,
  Bell,
  CaretRight,
  ArrowRight,
  Fire,
  Check,
  Barbell,
  Timer,
  ShoppingBag,
  Sparkle,
  Crown,
  Lock,
} from 'phosphor-react-native';
import LottieView from 'lottie-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { getAvatarSource } from '../../src/constants/avatars';
import { APP_ANIMATIONS, APP_3D_ASSETS } from '../../src/constants/assets';
import { getRankForLevel } from '../../src/constants/ranks';
import { getDailyQuote } from '../../src/constants/quotes';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { NotificationSheet } from '../../src/components/notifications/NotificationSheet';

const { width } = Dimensions.get('window');

export default function HomeDashboard() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();

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
      const now = Date.now();
      if (now - lastFocusRef.current > 6000) {
        lastFocusRef.current = now;
        loadProfile();
        loadQuests();
      }
    }, [])
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

  const displayName = profile?.displayName || 'Arjun';
  const level = profile?.level || 12;
  const currentXP = profile?.currentXP || 380;
  const streak = profile?.currentStreak || 7;
  const coins = profile?.coins || 1245;
  const avatarIcon = profile?.avatarIcon || 'pfp_01';
  const dailyFocusGoal = profile?.dailyFocusGoal || 30;

  const rank = getRankForLevel(level);
  const xpNeeded = Math.round(500 * Math.pow(1.2, Math.max(0, level - 1))) || 500;
  const xpPercent = Math.min(100, Math.round((currentXP / Math.max(1, xpNeeded)) * 100)) || 76;

  const completedQuests = dailyQuests.filter((q) => q.completed).length;
  const totalQuests = dailyQuests.length || 3;

  const quote = getDailyQuote();

  const avatarSrc = getAvatarSource(avatarIcon);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. TOP HEADER (EXACT MOCKUP) */}
      <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
        {/* Left: Avatar + Greeting */}
        <TouchableOpacity
          style={styles.headerLeftCol}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <View style={[styles.avatarBox, { borderColor: colors.primary }]}>
            <Image source={avatarSrc} style={styles.avatarImg} />
          </View>
          <View style={styles.greetingCol}>
            <Text style={[styles.greetingSubtext, { color: colors.textSecondary }]}>Good morning,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{displayName}</Text>
              <Fire size={16} color="#FF5722" weight="fill" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: Notifications & Settings */}
        <View style={styles.headerRightCol}>
          <TouchableOpacity
            style={[styles.circleIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              setIsNotifOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Bell size={18} color={colors.textPrimary} weight="bold" />
            <View style={styles.redBadgeDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              router.push('/settings');
            }}
            activeOpacity={0.8}
          >
            <Gear size={18} color={colors.textPrimary} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Subtitle Banner */}
        <Text style={[styles.mottoSubtext, { color: colors.textMuted }]}>
          "Discipline Today. A Better You Tomorrow."
        </Text>

        {/* 2. LEVEL & IDENTITY CARD */}
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelCardTop}>
            <View style={[styles.levelBadge, { backgroundColor: 'rgba(229, 57, 53, 0.12)' }]}>
              <Crown size={16} color={colors.primary} weight="fill" />
              <View>
                <Text style={[styles.levelNumberText, { color: colors.primary }]}>Level {level}</Text>
                <Text style={[styles.rankTagText, { color: colors.textSecondary }]}>{rank.rankCode}-Rank Hunter</Text>
              </View>
            </View>

            <Text style={[styles.xpCounterText, { color: colors.textSecondary }]}>
              {currentXP} / {xpNeeded} XP  <Text style={{ color: colors.primary, fontWeight: '900' }}>{xpPercent}%</Text>
            </Text>
          </View>

          {/* XP Progress Bar */}
          <View style={[styles.xpTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6' }]}>
            <View style={[styles.xpFill, { width: `${xpPercent}%`, backgroundColor: colors.primary }]} />
          </View>

          {/* Quote Block */}
          <View style={[styles.quoteBlock, { backgroundColor: isDark ? '#161824' : '#F9FAFB', borderColor: colors.border }]}>
            <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
              “Small steps today, big changes tomorrow.”
            </Text>
          </View>
        </View>

        {/* 3. 4-METRIC GRID (EXACT MOCKUP) */}
        <View style={styles.metricsGrid}>
          {/* Metric 1: Day Streak */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metricIconWrap}>
              <LottieView
                source={APP_ANIMATIONS.streak}
                autoPlay
                loop
                style={styles.metricLottie}
              />
            </View>
            <Text style={[styles.metricValueText, { color: colors.textPrimary }]}>{streak}</Text>
            <Text style={[styles.metricLabelText, { color: colors.textSecondary }]}>Day Streak</Text>
          </View>

          {/* Metric 2: Reps Today */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Barbell size={20} color="#10B981" weight="fill" />
            </View>
            <Text style={[styles.metricValueText, { color: colors.textPrimary }]}>125</Text>
            <Text style={[styles.metricLabelText, { color: colors.textSecondary }]}>Reps Today</Text>
          </View>

          {/* Metric 3: Focus Time */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricCircle, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
              <Timer size={20} color="#0A84FF" weight="fill" />
            </View>
            <Text style={[styles.metricValueText, { color: colors.textPrimary }]}>2h 30m</Text>
            <Text style={[styles.metricLabelText, { color: colors.textSecondary }]}>Focus Time</Text>
          </View>

          {/* Metric 4: Coins */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              router.push('/shop' as any);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconWrap}>
              <Image source={APP_3D_ASSETS.goldCoin} style={styles.coinImg} />
            </View>
            <Text style={[styles.metricValueText, { color: colors.textPrimary }]}>{coins.toLocaleString()}</Text>
            <Text style={[styles.metricLabelText, { color: colors.textSecondary }]}>Coins</Text>
          </TouchableOpacity>
        </View>

        {/* 4. TODAY'S QUESTS SECTION */}
        <View style={[styles.questsSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>Today's Quests</Text>
            <Text style={[styles.sectionBadgeText, { color: colors.textSecondary }]}>
              {completedQuests} / {totalQuests}
            </Text>
          </View>

          <View style={styles.questsList}>
            {/* Quest 1 */}
            <View style={styles.questRow}>
              <View style={[styles.questCheckCircle, { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                <Check size={13} color="#FFFFFF" weight="bold" />
              </View>
              <Text style={[styles.questTitleText, { color: colors.textPrimary }]}>Complete morning workout</Text>
              <View style={styles.questBountyTag}>
                <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 14, height: 14 }} />
                <Text style={styles.questBountyVal}>+20</Text>
              </View>
            </View>

            {/* Quest 2 */}
            <View style={styles.questRow}>
              <View style={[styles.questCheckCircle, { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                <Check size={13} color="#FFFFFF" weight="bold" />
              </View>
              <Text style={[styles.questTitleText, { color: colors.textPrimary }]}>Read 10 pages</Text>
              <View style={styles.questBountyTag}>
                <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 14, height: 14 }} />
                <Text style={styles.questBountyVal}>+20</Text>
              </View>
            </View>

            {/* Quest 3 */}
            <View style={styles.questRow}>
              <View style={[styles.questCheckCircle, { borderColor: colors.border }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
              </View>
              <Text style={[styles.questTitleText, { color: colors.textPrimary }]}>No social media (2h)</Text>
              <View style={styles.questBountyTag}>
                <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 14, height: 14 }} />
                <Text style={styles.questBountyVal}>+20</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewAllQuestsLink}
            onPress={() => {
              haptics.light();
              router.push('/(tabs)/quests');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllQuestsText, { color: colors.primary }]}>View All Quests</Text>
            <ArrowRight size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 5. QUICK ACTIONS */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.quickActionsLabel, { color: colors.textSecondary }]}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {/* Action 1: Workout */}
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.light();
                router.push('/exercise/pushup' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: 'rgba(229, 57, 53, 0.12)' }]}>
                <Barbell size={20} color={colors.primary} weight="fill" />
              </View>
              <Text style={[styles.quickActionBtnText, { color: colors.textPrimary }]}>Workout</Text>
            </TouchableOpacity>

            {/* Action 2: Focus */}
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.light();
                router.push('/(tabs)/focus' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
                <Timer size={20} color="#0A84FF" weight="fill" />
              </View>
              <Text style={[styles.quickActionBtnText, { color: colors.textPrimary }]}>Focus</Text>
            </TouchableOpacity>

            {/* Action 3: Shop */}
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.light();
                router.push('/shop' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <ShoppingBag size={20} color="#F59E0B" weight="fill" />
              </View>
              <Text style={[styles.quickActionBtnText, { color: colors.textPrimary }]}>Shop</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Notifications Modal */}
      <NotificationSheet isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
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
    fontSize: 11,
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  redBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E53935',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  mottoSubtext: {
    fontSize: 11.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: -4,
  },
  levelCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  levelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  levelNumberText: {
    fontSize: 16,
    fontWeight: '900',
  },
  rankTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  xpCounterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  quoteBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLottie: {
    width: 32,
    height: 32,
  },
  coinImg: {
    width: 28,
    height: 28,
  },
  metricCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValueText: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricLabelText: {
    fontSize: 11,
    fontWeight: '800',
  },
  questsSectionCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '900',
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  questsList: {
    gap: 12,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questTitleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  questBountyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questBountyVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
  },
  viewAllQuestsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
  },
  viewAllQuestsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickActionsSection: {
    gap: 12,
  },
  quickActionsLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
