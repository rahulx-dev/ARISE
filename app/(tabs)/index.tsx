import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  AppState,
  ImageBackground,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Gear,
  Bell,
  CaretRight,
  ArrowRight,
  Fire,
  X,
  Sparkle,
  ShieldWarning,
  Coins,
  Lightning,
  Barbell,
  Timer,
  ShieldCheck,
  Trophy,
  Gift,
  Check,
  Camera,
  Play,
  Crown,
  ClipboardText,
  CheckCircle,
  Brain,
  Star,
  Sword,
} from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { streakService } from '../../src/services/streakService';
import { notificationService, AppNotification } from '../../src/services/notificationService';
import { historyService } from '../../src/services/historyService';
import { initializeDatabase } from '../../src/database/client';
import { appBlockerService } from '../../src/native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { SwipeableTabScreen } from '../../src/components/navigation/SwipeableTabScreen';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { useTheme } from '../../src/hooks/useTheme';
import { HoloLoader } from '../../src/components/ui/HoloLoader';
import { useLanguageStore } from '../../src/services/i18n';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getRankForLevel } from '../../src/constants/ranks';
import { adMobService } from '../../src/services/adMobService';
import { userRepository } from '../../src/database/repositories/userRepository';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { SoloLevelingWindow } from '../../src/components/ui/SoloLevelingWindow';
import { getDailyQuote } from '../../src/constants/quotes';
import { AnimatedStreakFlame } from '../../src/components/ui/AnimatedStreakFlame';
import {
  shouldShowDailyWelcome,
  markDailyWelcomeShown,
} from '../../src/services/dailyWelcomeService';

const SUNSET_BANNER = require('../../assets/img/sunset_warrior_banner.jpg');
const MOONLIT_BANNER = require('../../assets/img/moonlit_warrior_banner.jpg');

export default function HomeDashboard() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const t = useLanguageStore((s) => s.t);

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);

  const [loading, setLoading] = useState(true);
  const [isNotifSheetOpen, setIsNotifSheetOpen] = useState(false);
  const [hasAllPermissions, setHasAllPermissions] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'DIRECTIVES' | 'MOTIVATION'>('ALL');

  const handleTriggerMotivationalAlert = async () => {
    haptics.heavy();
    sound.play('unlock');
    await notificationService.sendMotivationalNotification();
    const notifs = await notificationService.getNotifications(30);
    setNotifications(notifs);
  };

  const handleTriggerTestAlert = async () => {
    haptics.heavy();
    sound.play('quest_complete');
    await notificationService.sendTestNotification();
    const notifs = await notificationService.getNotifications(30);
    setNotifications(notifs);
  };

  const handleClearAllNotifs = async () => {
    haptics.light();
    await notificationService.clearAllNotifications();
    setNotifications([]);
  };

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'DIRECTIVES') {
      return notifications.filter((n) => n.type === 'QUEST' || n.type === 'SYSTEM' || n.type === 'STREAK');
    }
    if (notifFilter === 'MOTIVATION') {
      return notifications.filter((n) => n.type === 'MOTIVATION');
    }
    return notifications;
  }, [notifications, notifFilter]);

  const [todayStats, setTodayStats] = useState({
    focusMinutes: 0,
    workoutMinutes: 0,
    workoutCount: 0,
    completedQuests: 0,
    totalQuests: 0,
    focusSessionsCount: 0,
  });

  const lastFocusLoadRef = useRef<number>(0);
  const [remainingTimeToMidnight, setRemainingTimeToMidnight] = useState('07h 37m');

  useEffect(() => {
    const updateMidnightCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setRemainingTimeToMidnight(`${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`);
    };
    updateMidnightCountdown();
    const interval = setInterval(updateMidnightCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const sound = useSound();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeType, setWelcomeType] = useState<'awakening' | 'daily'>('awakening');
  const todayQuote = useMemo(() => getDailyQuote(), []);

  useEffect(() => {
    (async () => {
      if (welcome === 'true') {
        sound.play('quest_complete');
        haptics.heavy();
        setWelcomeType('awakening');
        setShowWelcomeModal(true);
        markDailyWelcomeShown();
      } else {
        const shouldShow = await shouldShowDailyWelcome();
        if (shouldShow) {
          setWelcomeType('daily');
          setShowWelcomeModal(true);
          markDailyWelcomeShown();
        }
      }
    })();
  }, [welcome]);

  const handleDismissWelcome = () => {
    haptics.light();
    markDailyWelcomeShown();
    setShowWelcomeModal(false);
  };

  const flameScale = useSharedValue(1);
  const flameOpacity = useSharedValue(1);

  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    flameOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 600 }),
        withTiming(1.0, { duration: 500 }),
        withTiming(0.9, { duration: 700 })
      ),
      -1,
      true
    );
  }, []);

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
    opacity: flameOpacity.value,
  }));

  const checkPermissions = async () => {
    try {
      const [usage, overlay] = await Promise.all([
        appBlockerService.hasUsagePermission(),
        appBlockerService.hasOverlayPermission(),
      ]);
      setHasAllPermissions(usage && overlay);
    } catch {
      setHasAllPermissions(true);
    }
  };

  const loadNotifications = async () => {
    const notifs = await notificationService.getNotifications(30);
    setNotifications(notifs);
  };

  const loadStats = async () => {
    try {
      const stats = await historyService.getTodayRealStats();
      setTodayStats(stats);
    } catch (e) {
      console.warn('Error loading real today stats:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusLoadRef.current > 15000) {
        lastFocusLoadRef.current = now;
        loadProfile();
        loadQuests();
        loadStats();
        checkPermissions();
        loadNotifications();
      }
    }, [])
  );

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await loadProfile();
        await loadQuests();
        await loadStats();
        await checkPermissions();
        await notificationService.seedDefaultNotificationsIfEmpty();
        await notificationService.scheduleDailyTimelyReminders();
        await loadNotifications();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        checkPermissions();
        await loadProfile();
        await loadQuests();
        await loadStats();
        await loadNotifications();
      }
    });
    return () => sub.remove();
  }, []);

  const handleWatchAdQuick = () => {
    haptics.medium();
    const onReward = async () => {
      const reward = 25; // Strictly 25 coins confirmed per user requirement
      await userRepository.addCoins(reward, 'Watched Rewarded Video Ad', 'ad');
      await loadProfile();
      haptics.success();
      showIOSAlert(
        'VAULT REWARD CLAIMED!',
        `+${reward} Gold Coins added to your vault!`,
        [{ text: 'AWESOME', style: 'primary' }]
      );
    };

    const shown = adMobService.showRewardedAd(onReward);
    if (!shown) {
      showIOSAlert(
        'CONNECTING STREAM...',
        'Buffering AdMob video reward. Tap again in 3 seconds to watch!',
        [{ text: 'PROCEED', style: 'primary' }]
      );
      adMobService.preloadRewarded();
    }
  };

  const level = profile?.level ?? 1;
  const currentXP = profile?.currentXP ?? 0;
  const coins = profile?.coins ?? 0;
  const streak = profile?.currentStreak ?? 0;
  const displayName = profile?.displayName || 'Hunter';
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';
  const completedQuestsCount = dailyQuests.filter((q) => q.completed).length;
  const totalQuestsCount = dailyQuests.length || 3;

  const rank = getRankForLevel(level);
  const xpNeeded = Math.round(500 * Math.pow(1.25, Math.max(0, level - 1)));
  const xpPercent = Math.min(100, Math.round((currentXP / Math.max(1, xpNeeded)) * 100));

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <HoloLoader message="SYNCHRONIZING HUNTER MATRIX" subMessage="ACCESSING SHADOW REALM ARCHIVES..." size="large" />
      </View>
    );
  }

  return (
    <SwipeableTabScreen nextTab="/(tabs)/quests" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* 1. TOP STATUS BAR (EXACT MOCKUP) */}
        <View style={styles.topHeader}>
          {/* Left: Avatar & Sovereign Title */}
          <TouchableOpacity
            style={styles.headerLeftCol}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <PlayerAvatar
              iconId={avatarIcon}
              size={44}
              glow={true}
              glowColor="#F59E0B"
            />
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.hunterCallsignText, { color: colors.textPrimary }]}>
                  {displayName.toUpperCase()}
                </Text>
                <View style={styles.nationalTag}>
                  <Text style={styles.nationalTagText}>{rank.rankCode}-RANK</Text>
                </View>
              </View>
              <Text style={styles.sovereignSubText}>
                {rank.title} • LVL {level}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right: Coins, Bell, Settings & Rank Pill */}
          <View style={styles.headerRightCol}>
            {/* Top Action Row */}
            <View style={styles.headerTopActionRow}>
              {/* Gold Coin Capsule */}
              <TouchableOpacity
                style={[styles.headerCoinsCapsule, { backgroundColor: isDark ? '#1C1608' : '#FEF3C7', borderColor: isDark ? '#F59E0B' : '#D97706' }]}
                onPress={() => {
                  haptics.light();
                  router.push('/shop' as any);
                }}
                activeOpacity={0.8}
              >
                <Coins size={14} color="#F59E0B" weight="fill" />
                <Text style={styles.headerCoinsAmount}>{coins.toLocaleString()}</Text>
                <View style={styles.headerPlusCircle}>
                  <Text style={styles.headerPlusText}>+</Text>
                </View>
              </TouchableOpacity>

              {/* Notification Bell */}
              <TouchableOpacity
                style={[styles.headerCircleBtn, { backgroundColor: isDark ? '#11141E' : colors.surfaceLight, borderColor: isDark ? '#1F2536' : colors.border }]}
                onPress={() => {
                  haptics.light();
                  loadNotifications();
                  setIsNotifSheetOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Bell size={18} color={colors.textPrimary} weight="bold" />
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>1</Text>
                </View>
              </TouchableOpacity>

              {/* Settings Gear */}
              <TouchableOpacity
                style={[styles.headerCircleBtn, { backgroundColor: isDark ? '#11141E' : colors.surfaceLight, borderColor: isDark ? '#1F2536' : colors.border }]}
                onPress={() => router.push('/settings')}
                activeOpacity={0.8}
              >
                <Gear size={18} color={colors.textPrimary} weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Rank Capsule */}
            <TouchableOpacity
              style={[styles.headerRankPill, { backgroundColor: isDark ? '#11141E' : colors.surfaceLight, borderColor: isDark ? '#1F2536' : colors.border }]}
              onPress={() => {
                haptics.light();
                router.push('/leaderboard' as any);
              }}
              activeOpacity={0.8}
            >
              <Crown size={12} color="#F59E0B" weight="fill" />
              <Text style={styles.headerRankLabel}>
                Rank <Text style={[styles.headerRankVal, { color: colors.textPrimary }]}>#{rank.rankCode}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Permission Shield Alert (if missing) */}
          {!hasAllPermissions && (
            <TouchableOpacity
              style={styles.permAlertCard}
              onPress={() => router.push('/permissions' as any)}
              activeOpacity={0.85}
            >
              <ShieldWarning size={20} color="#EF4444" weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.permAlertTitle}>SHIELD INACTIVE</Text>
                <Text style={styles.permAlertSub}>
                  App blocker requires system overlay & usage access to lock distractions.
                </Text>
              </View>
              <View style={styles.permAlertBadge}>
                <Text style={styles.permAlertBadgeText}>ACTIVATE</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* 2. DISCIPLINE AT RISK // SUNSET ANIME HERO BANNER */}
          <View style={styles.heroBannerWrap}>
            <ImageBackground
              source={SUNSET_BANNER}
              style={styles.heroBannerBg}
              imageStyle={{ borderRadius: 24 }}
            >
              <LinearGradient
                colors={['rgba(8, 10, 15, 0.88)', 'rgba(8, 10, 15, 0.55)', 'rgba(6, 8, 14, 0.95)']}
                style={styles.heroBannerOverlay}
              >
                {/* Top Status Row */}
                <View style={styles.heroBannerTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <AnimatedStreakFlame size={20} color="#FF5500" />
                    <Text style={styles.disciplineRiskTitle}>DISCIPLINE AT RISK</Text>
                  </View>

                  <View style={styles.countdownPill}>
                    <Timer size={13} color="#F59E0B" weight="bold" />
                    <Text style={styles.countdownText}>{remainingTimeToMidnight}</Text>
                  </View>
                </View>

                {/* Big Days Counter & Milestones */}
                <View style={styles.heroDaysRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.daysHugeText}>
                      {streak}{' '}
                      <Text style={styles.daysLabelText}>DAYS</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.milestonesBtn}
                    onPress={() => {
                      haptics.light();
                      router.push('/rewards/streak-milestones' as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <Gift size={14} color="#F59E0B" weight="fill" />
                    <Text style={styles.milestonesBtnText}>MILESTONES</Text>
                    <ArrowRight size={12} color="#F59E0B" weight="bold" />
                  </TouchableOpacity>
                </View>

                {/* Rank Ascension XP Section */}
                <View style={styles.rankXpSection}>
                  <View style={styles.rankXpTextRow}>
                    <Text style={styles.rankXpLabel}>RANK ASCENSION XP</Text>
                    <Text style={styles.rankXpAmount}>
                      {currentXP} / {xpNeeded} XP ({xpPercent}%)
                    </Text>
                  </View>
                  <View style={styles.rankXpTrack}>
                    <View
                      style={[
                        styles.rankXpFill,
                        { width: `${Math.max(3, Math.min(100, xpPercent || 4))}%` },
                      ]}
                    />
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* 3. TRIO METRIC CARDS */}
          <View style={styles.trioMetricsRow}>
            {/* Workout */}
            <View style={[styles.trioMetricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.trioIconSquircle, { backgroundColor: 'rgba(0, 242, 254, 0.12)' }]}>
                <Barbell size={18} color="#00F2FE" weight="duotone" />
              </View>
              <Text style={[styles.trioMetricVal, { color: colors.textPrimary }]}>{todayStats.workoutMinutes}m</Text>
              <Text style={styles.trioMetricLabel}>{t('workout')}</Text>
              <Text style={[styles.trioMetricSub, { color: colors.textMuted }]}>Today</Text>
            </View>

            {/* Focus */}
            <View style={[styles.trioMetricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.trioIconSquircle, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                <Timer size={18} color="#A855F7" weight="duotone" />
              </View>
              <Text style={[styles.trioMetricVal, { color: colors.textPrimary }]}>{todayStats.focusMinutes}m</Text>
              <Text style={styles.trioMetricLabel}>{t('focus')}</Text>
              <Text style={[styles.trioMetricSub, { color: colors.textMuted }]}>Today</Text>
            </View>

            {/* Tasks Cleared */}
            <View style={[styles.trioMetricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.trioIconSquircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <CheckCircle size={18} color="#10B981" weight="fill" />
              </View>
              <Text style={[styles.trioMetricVal, { color: colors.textPrimary }]}>
                {completedQuestsCount}/{totalQuestsCount}
              </Text>
              <Text style={styles.trioMetricLabel}>{t('cleared')}</Text>
              <Text style={[styles.trioMetricSub, { color: colors.textMuted }]}>Daily Goals</Text>
            </View>
          </View>

          {/* 4. PRIMARY CTA: FULL-WIDTH START AI WORKOUT */}
          <View style={styles.ctaRowContainer}>
            <TouchableOpacity
              style={styles.primaryWorkoutBtnFull}
              onPress={() => {
                haptics.heavy();
                router.push('/(tabs)/progress');
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#007AFF', '#0055FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryWorkoutBtnGradient}
              >
                <Lightning size={20} color="#FFFFFF" weight="fill" />
                <Text style={styles.primaryWorkoutBtnText}>{t('startWorkout')}</Text>
                <ArrowRight size={18} color="#FFFFFF" weight="bold" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 5. FOUR QUICK ACTION TACTICAL SQUIRCLE BUTTONS */}
          <View style={styles.tacticalGrid}>
            <TouchableOpacity
              style={[styles.tacticalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.heavy();
                router.push('/focus/session');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.tacticalIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Brain size={18} color="#A855F7" weight="fill" />
              </View>
              <Text style={[styles.tacticalTitle, { color: colors.textPrimary }]}>{t('deepFocus')}</Text>
              <Text style={styles.tacticalSub}>Block Distractions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tacticalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.heavy();
                router.push('/settings/apps');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.tacticalIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ShieldCheck size={18} color="#10B981" weight="fill" />
              </View>
              <Text style={[styles.tacticalTitle, { color: colors.textPrimary }]}>{t('lockApps')}</Text>
              <Text style={styles.tacticalSub}>Stay Focused</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tacticalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.heavy();
                router.push('/leaderboard' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.tacticalIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Trophy size={18} color="#F59E0B" weight="fill" />
              </View>
              <Text style={[styles.tacticalTitle, { color: colors.textPrimary }]}>{t('arena')}</Text>
              <Text style={styles.tacticalSub}>Compete & Grow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tacticalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                haptics.heavy();
                router.push('/photos' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.tacticalIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <MaterialCommunityIcons name="arm-flex" size={18} color="#EC4899" />
              </View>
              <Text style={[styles.tacticalTitle, { color: colors.textPrimary }]}>{t('physique')}</Text>
              <Text style={styles.tacticalSub}>Track Progress</Text>
            </TouchableOpacity>
          </View>

          {/* GUILD SYNDICATE & RED GATE CARD */}
          <TouchableOpacity
            style={{
              marginHorizontal: 0,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? '#EF444455' : colors.border,
              backgroundColor: colors.card,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => {
              haptics.heavy();
              router.push('/guild' as any);
            }}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                <Sword size={20} color="#EF4444" weight="fill" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>HUNTER GUILD HALL</Text>
                  <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>RAID ACTIVE</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
                  Enlist in top syndicates & strike Red Gate bosses
                </Text>
              </View>
            </View>
            <CaretRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* 6. DAILY QUESTS SECTION (BLUE BORDER CONTAINER) */}
          <View style={[styles.dailyQuestsContainer, { backgroundColor: colors.card, borderColor: isDark ? '#0A84FF' : colors.primary }]}>
            {/* Header */}
            <View style={styles.questsHeader}>
              <View style={styles.questsHeaderLeft}>
                <ClipboardText size={20} color="#0A84FF" weight="fill" />
                <View style={{ gap: 2 }}>
                  <Text style={[styles.questsMainTitle, { color: colors.textPrimary }]}>{t('dailyQuests')}</Text>
                  <Text style={[styles.questsSubTitle, { color: colors.textSecondary }]}>Complete tasks. Earn XP. Level up.</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/quests')}
                activeOpacity={0.8}
              >
                <Text style={styles.questsViewAllText}>{t('viewAll')} →</Text>
              </TouchableOpacity>
            </View>

            {/* Quest Item Rows (Distinct items, anti-cheat enforcement) */}
            <View style={styles.questsList}>
              {dailyQuests.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D14', borderRadius: 16, borderWidth: 1, borderColor: '#1F2438' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0A84FF', letterSpacing: 0.8, marginBottom: 4 }}>
                    [ SYSTEM: ALL PROTOCOLS CLEARED ]
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textAlign: 'center' }}>
                    No pending daily quests. Tap below to inspect your Hunter Quest Log.
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: 'rgba(10, 132, 255, 0.15)', borderWidth: 1, borderColor: '#0A84FF' }}
                    onPress={() => { haptics.light(); router.push('/(tabs)/quests'); }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0A84FF', letterSpacing: 0.5 }}>OPEN QUEST LOG</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                dailyQuests.slice(0, 5).map((q) => {
                const isFitness = q.exerciseType === 'PUSHUP' || q.exerciseType === 'SQUAT' || q.category === 'FITNESS';
                const isFocus = q.category === 'FOCUS';

                const handleLaunch = () => {
                  if (q.completed) return;
                  if (isFitness) {
                    haptics.heavy();
                    router.push({
                      pathname: '/exercise/[type]',
                      params: {
                        type: q.exerciseType || 'PUSHUP',
                        target: q.target || 20,
                        questId: String(q.id),
                      },
                    } as any);
                  } else if (isFocus) {
                    haptics.heavy();
                    router.push('/focus/session');
                  } else {
                    // Manual habit verification dialog
                    haptics.medium();
                    showIOSAlert(
                      t('confirmCompletion') || 'CONFIRM COMPLETION',
                      `Did you execute "${q.title}"?`,
                      [
                        { text: t('cancel') || 'CANCEL', style: 'cancel' },
                        {
                          text: t('confirm') || 'CONFIRM',
                          style: 'primary',
                          onPress: async () => {
                            haptics.success();
                            const res = await completeQuest(q.id);
                            showIOSAlert(
                              t('questComplete') || 'QUEST COMPLETE!',
                              `Protocol "${q.title}" verified! +${res.coins} Coins, +${res.xp} XP added to your vault.`,
                              [{ text: 'PROCEED', style: 'primary' }]
                            );
                          },
                        },
                      ]
                    );
                  }
                };

                return (
                  <View key={q.id} style={[styles.questItemRow, { backgroundColor: isDark ? '#0D121F' : colors.surfaceLight, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.questCheckboxRing, q.completed && styles.questCheckboxRingCompleted]}
                      onPress={() => {
                        if (q.completed) return;
                        if (isFitness) {
                          haptics.warning();
                          showIOSAlert(
                            t('aiMotionProtocol') || 'AI MOTION PROTOCOL',
                            `To complete "${q.title}", you must execute ${q.target} repetitions using the AI Motion Tracker camera.`,
                            [
                              { text: t('cancel') || 'CANCEL', style: 'cancel' },
                              {
                                text: t('startAiCam') || 'START AI CAM',
                                style: 'primary',
                                onPress: () => {
                                  router.push({
                                    pathname: '/exercise/[type]',
                                    params: {
                                      type: q.exerciseType || 'PUSHUP',
                                      target: q.target || 20,
                                      questId: String(q.id),
                                    },
                                  } as any);
                                },
                              },
                            ]
                          );
                        } else if (isFocus) {
                          haptics.medium();
                          router.push('/focus/session');
                        } else {
                          handleLaunch();
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {q.completed && <Check size={12} color="#FFFFFF" weight="bold" />}
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.questCategorySquircle,
                        {
                          backgroundColor:
                            q.category === 'FOCUS'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : q.exerciseType === 'SQUAT'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'rgba(255, 107, 0, 0.15)',
                        },
                      ]}
                    >
                      {q.category === 'FOCUS' ? (
                        <Timer size={18} color="#A855F7" weight="bold" />
                      ) : q.exerciseType === 'SQUAT' ? (
                        <MaterialCommunityIcons name="human-handsdown" size={19} color="#A855F7" />
                      ) : (
                        <MaterialCommunityIcons name="arm-flex" size={18} color="#FF6B00" />
                      )}
                    </View>

                    <TouchableOpacity
                      style={{ flex: 1, gap: 3 }}
                      onPress={handleLaunch}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.questTitleText, { color: colors.textPrimary }, q.completed && styles.questCompletedTitle]} numberOfLines={1}>
                        {q.title}
                      </Text>
                      <Text style={[styles.questRewardText, { color: colors.textSecondary }]}>
                        +{q.rewardXP} XP • +{q.rewardCoins} Coins
                      </Text>
                    </TouchableOpacity>

                    {q.completed ? (
                      <View style={[styles.aiCamBtn, { borderColor: '#10B981', backgroundColor: '#06281E' }]}>
                        <Check size={13} color="#10B981" weight="bold" />
                        <Text style={[styles.aiCamBtnText, { color: '#10B981' }]}>DONE</Text>
                      </View>
                    ) : isFitness ? (
                      <TouchableOpacity
                        style={styles.aiCamBtn}
                        onPress={handleLaunch}
                        activeOpacity={0.8}
                      >
                        <Camera size={13} color="#0A84FF" weight="bold" />
                        <Text style={styles.aiCamBtnText}>AI CAM</Text>
                      </TouchableOpacity>
                    ) : isFocus ? (
                      <TouchableOpacity
                        style={[styles.aiCamBtn, { borderColor: '#A855F7', backgroundColor: '#180D28' }]}
                        onPress={handleLaunch}
                        activeOpacity={0.8}
                      >
                        <Play size={12} color="#A855F7" weight="fill" />
                        <Text style={[styles.aiCamBtnText, { color: '#A855F7' }]}>START</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.aiCamBtn, { borderColor: '#06B6D4', backgroundColor: '#082630' }]}
                        onPress={handleLaunch}
                        activeOpacity={0.8}
                      >
                        <Check size={13} color="#06B6D4" weight="bold" />
                        <Text style={[styles.aiCamBtnText, { color: '#06B6D4' }]}>LOG</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }))}
            </View>
          </View>

          {/* 8. DAILY MOTIVATIONAL BANNER (ROTATING DAILY) */}
          <View style={styles.motivationBannerWrap}>
            <ImageBackground
              source={new Date().getDate() % 2 === 0 ? MOONLIT_BANNER : SUNSET_BANNER}
              style={styles.motivationBannerBg}
              imageStyle={{ borderRadius: 18 }}
            >
              <LinearGradient
                colors={['rgba(4, 6, 12, 0.92)', 'rgba(4, 6, 12, 0.60)', 'rgba(4, 6, 12, 0.95)']}
                style={styles.motivationBannerOverlay}
              >
                <View style={styles.quoteTagPill}>
                  <Text style={styles.quoteTagText}>[ {todayQuote.tag} ]</Text>
                </View>
                <Text style={styles.motivationQuote}>
                  “{todayQuote.quote.toUpperCase()}”
                </Text>
                <Text style={styles.motivationAuthor}>— {todayQuote.author}</Text>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Non-intrusive AdMob Banner */}
          <AriseBannerAd style={{ marginVertical: 6 }} />

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Solo Leveling Notifications Modal */}
        <Modal
          visible={isNotifSheetOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIsNotifSheetOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsNotifSheetOpen(false)}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', maxWidth: 360, alignItems: 'center' }}>
              <SoloLevelingWindow
                variant="default"
                tag="SYSTEM CONDUIT // NOTIFICATION LOG"
                subtag="TIMELY REMINDERS & MONARCH MOTIVATION"
                title="HUNTER NOTIFICATIONS"
                buttons={[
                  {
                    text: 'CLOSE LOG',
                    style: 'primary',
                    onPress: () => setIsNotifSheetOpen(false),
                  },
                ]}
                onClose={() => setIsNotifSheetOpen(false)}
              >
                {/* Category Filter Pills */}
                <View style={styles.notifFilterRow}>
                  {(['ALL', 'DIRECTIVES', 'MOTIVATION'] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[styles.notifFilterPill, notifFilter === filter && styles.notifFilterPillActive]}
                      onPress={() => {
                        haptics.light();
                        setNotifFilter(filter);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.notifFilterPillText, notifFilter === filter && styles.notifFilterPillTextActive]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Actions Row */}
                <View style={styles.notifActionRow}>
                  <TouchableOpacity
                    style={[styles.notifActionBtn, { flex: 1 }]}
                    onPress={handleTriggerMotivationalAlert}
                    activeOpacity={0.8}
                  >
                    <Sparkle size={12} color="#A855F7" weight="fill" />
                    <Text style={[styles.notifActionBtnText, { color: '#A855F7' }]}>MOTIVATE ME</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.notifActionBtn, { borderColor: '#EF444430', paddingHorizontal: 16 }]}
                    onPress={handleClearAllNotifs}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.notifActionBtnText, { color: '#EF4444' }]}>CLEAR LOG</Text>
                  </TouchableOpacity>
                </View>

                {/* Notifications Scroll */}
                <ScrollView style={{ maxHeight: 310, width: '100%' }} showsVerticalScrollIndicator={false}>
                  {filteredNotifications.length === 0 ? (
                    <View style={styles.emptyNotifBox}>
                      <Bell size={22} color="#64748B" />
                      <Text style={[styles.emptyNotifText, { color: colors.textMuted }]}>
                        No notifications in this category.
                      </Text>
                    </View>
                  ) : (
                    filteredNotifications.map((n) => {
                      const isMotiv = n.type === 'MOTIVATION';
                      const isQuest = n.type === 'QUEST';
                      const isStreak = n.type === 'STREAK';
                      const dotColor = isMotiv ? '#A855F7' : isQuest ? '#F59E0B' : isStreak ? '#EA580C' : '#00D2EE';

                      return (
                        <View key={n.id} style={styles.soloNotifItem}>
                          <View style={styles.notifHeaderRow}>
                            <View style={[styles.notifCyanDot, { backgroundColor: dotColor }]} />
                            <Text style={[styles.soloNotifTitle, isMotiv && { color: '#E9D5FF' }]} numberOfLines={1}>
                              {n.title}
                            </Text>
                          </View>
                          <Text style={styles.soloNotifBody}>{n.message}</Text>
                          <Text style={[styles.soloNotifTime, { color: dotColor }]}>
                            [ {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ]
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </SoloLevelingWindow>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Solo Leveling Unified Welcome Modal (Single Instance) */}
        <Modal
          visible={showWelcomeModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={handleDismissWelcome}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleDismissWelcome}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: '100%', maxWidth: 350, alignItems: 'center' }}>
              <SoloLevelingWindow
                variant={welcomeType === 'awakening' ? 'default' : 'quest'}
                accentColor="#0284C7"
                tag="SYSTEM NOTIFICATION"
                subtag={welcomeType === 'awakening' ? 'ARISE OS // MONARCH AWAKENING' : 'DAILY LOG // PROTOCOL'}
                title={welcomeType === 'awakening' ? 'WELCOME, HUNTER' : 'WELCOME BACK, HUNTER'}
                message={
                  welcomeType === 'awakening'
                    ? 'The Monarch System has recognized your vessel. Complete your daily directives to grow stronger and conquer dimensional gates.'
                    : 'The System has re-calibrated your parameters. Your daily quests have arrived. Forge your discipline today, Sovereign.'
                }
                buttons={[
                  {
                    text: welcomeType === 'awakening' ? 'CONTINUE' : 'ACCEPT QUESTS',
                    style: 'primary',
                    onPress: () => {
                      haptics.heavy();
                      sound.play('quest_complete');
                      handleDismissWelcome();
                    },
                  },
                ]}
                onClose={handleDismissWelcome}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Top Bar (Exact Match)
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  hunterCallsignText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nationalTag: {
    backgroundColor: '#1E1B10',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nationalTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  sovereignSubText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 1,
  },
  headerQuoteText: {
    fontSize: 10.5,
    fontStyle: 'italic',
    color: '#8E9BB0',
    marginTop: 2,
  },
  headerRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  headerTopActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerCoinsCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C1608',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerCoinsAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  headerPlusCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPlusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 11,
  },
  headerCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#11141E',
    borderWidth: 1,
    borderColor: '#1F2536',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerRankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#11141E',
    borderWidth: 1,
    borderColor: '#1F2536',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  headerRankLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  headerRankVal: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },

  // Missing Permission Alert
  permAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#2A0D0D',
  },
  permAlertTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  permAlertSub: {
    fontSize: 11,
    color: '#FCA5A5',
    lineHeight: 15,
  },
  permAlertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  permAlertBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 2. Hero Banner Wrap
  heroBannerWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  heroBannerBg: {
    width: '100%',
  },
  heroBannerOverlay: {
    padding: 18,
    gap: 12,
  },
  heroBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disciplineRiskTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FF5500',
    letterSpacing: 0.8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(28, 20, 10, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  heroDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  daysHugeText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  daysLabelText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.5,
  },
  flameProtectSub: {
    fontSize: 11.5,
    color: '#CBD5E1',
    maxWidth: '85%',
    lineHeight: 16,
    marginTop: 2,
  },
  milestonesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E1B10',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  milestonesBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  watermarkWrap: {
    position: 'absolute',
    right: 18,
    bottom: 40,
    alignItems: 'flex-end',
    opacity: 0.85,
  },
  watermarkScript: {
    fontSize: 18,
    fontStyle: 'italic',
    fontWeight: '800',
    color: '#FDE68A',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
  },
  watermarkScriptSub: {
    fontSize: 14.5,
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
  },
  rankXpSection: {
    gap: 6,
    marginTop: 8,
  },
  rankXpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankXpLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7E8B9B',
    letterSpacing: 0.8,
  },
  rankXpAmount: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  rankXpTrack: {
    height: 4,
    backgroundColor: '#181E2B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  rankXpFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },

  // 3. Trio Metrics
  trioMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trioMetricCard: {
    flex: 1,
    backgroundColor: '#090D17',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#161D2E',
    padding: 12,
    gap: 3,
  },
  trioIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trioMetricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  trioMetricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7E8B9B',
    letterSpacing: 0.5,
  },
  trioMetricSub: {
    fontSize: 9,
    color: '#556070',
  },

  // 4. Primary Workout CTA Row
  ctaRowContainer: {
    width: '100%',
  },
  primaryWorkoutBtnFull: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryWorkoutBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryWorkoutBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  primaryWorkoutBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // 5. Tactical 4 Quick Actions
  tacticalGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tacticalCard: {
    flex: 1,
    backgroundColor: '#090D17',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#161D2E',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  tacticalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tacticalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tacticalSub: {
    fontSize: 8.5,
    color: '#64748B',
    textAlign: 'center',
  },

  // 6. Daily Quests Container (Blue Border)
  dailyQuestsContainer: {
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  questsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  questsMainTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  questsSubTitle: {
    fontSize: 10.5,
    color: '#7E8B9B',
  },
  questsViewAllText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0A84FF',
    letterSpacing: 0.3,
  },
  questsList: {
    gap: 9,
  },
  questItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D121F',
    borderWidth: 1,
    borderColor: '#172238',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  questCheckboxRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCheckboxRingCompleted: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  questCategorySquircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  questCompletedTitle: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  questRewardText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  aiCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#07162C',
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  aiCamBtnText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },

  // 8. Motivation Banner
  motivationBannerWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  motivationBannerBg: {
    width: '100%',
  },
  motivationBannerOverlay: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 4,
  },
  quoteTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    marginBottom: 4,
  },
  quoteTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#00F2FE',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  motivationQuote: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  motivationAuthor: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Notifications Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notifFilterRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  notifFilterPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifFilterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#00D2EE',
  },
  notifFilterPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  notifFilterPillTextActive: {
    color: '#FFFFFF',
  },
  notifActionRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 12,
  },
  notifActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111218',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  notifActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyNotifBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyNotifText: {
    textAlign: 'center',
    fontSize: 12,
  },
  soloNotifItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 242, 254, 0.15)',
    gap: 4,
    width: '100%',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifCyanDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F2FE',
  },
  soloNotifTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
  },
  soloNotifBody: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#94A3B8',
  },
  soloNotifTime: {
    fontSize: 9.5,
    color: '#00F2FE',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
