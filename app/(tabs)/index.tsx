import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
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
  Camera,
  Check,
  Lightning,
  Barbell,
  Brain,
  Timer,
  Wallet,
  ShieldCheck,
} from 'phosphor-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { streakService } from '../../src/services/streakService';
import { notificationService, AppNotification } from '../../src/services/notificationService';
import { historyService } from '../../src/services/historyService';
import { initializeDatabase } from '../../src/database/client';
import { appBlockerService } from '../../src/native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { WeatherWidget } from '../../src/components/home/WeatherWidget';
import { DisciplineHeatmap } from '../../src/components/home/DisciplineHeatmap';
import { IOSActivityRings } from '../../src/components/ios/IOSActivityRings';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function HomeDashboard() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);

  const [loading, setLoading] = useState(true);
  const [isNotifSheetOpen, setIsNotifSheetOpen] = useState(false);
  const [hasAllPermissions, setHasAllPermissions] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [todayStats, setTodayStats] = useState({
    focusMinutes: 0,
    workoutMinutes: 0,
    workoutCount: 0,
    completedQuests: 0,
    totalQuests: 0,
    focusSessionsCount: 0,
  });

  // Live time ticker
  const [timeStr, setTimeStr] = useState('09:41');
  const [dateStr, setDateStr] = useState('Wednesday, 2 September');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}`);

      const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
      const day = now.getDate();
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      setDateStr(`${weekday}, ${day} ${month}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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
    const notifs = await notificationService.getNotifications(20);
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
      loadProfile();
      loadQuests();
      loadStats();
      checkPermissions();
      loadNotifications();
    }, [])
  );

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await loadProfile();
        await loadQuests();
        await loadStats();
        await streakService.checkAndUpdateStreak();
        await checkPermissions();
        await loadNotifications();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPermissions();
        loadProfile();
        loadQuests();
        loadStats();
        loadNotifications();
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const level = profile?.level || 1;
  const currentXP = profile?.currentXP || 0;
  const coins = profile?.coins || 0;
  const streak = profile?.currentStreak || 0;
  const displayName = profile?.displayName || 'Warrior';
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';
  const completedQuestsCount = dailyQuests.filter((q) => q.completed).length;
  const totalQuestsCount = dailyQuests.length || 1;
  const winRate = totalQuestsCount > 0 ? Math.round((completedQuestsCount / totalQuestsCount) * 100) : 0;

  // Find next pending quest
  const nextPendingQuest = dailyQuests.find((q) => !q.completed);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top App Bar */}
        <View style={[styles.topHeader, { borderBottomColor: isDark ? '#232532' : '#E5E7EB' }]}>
          <TouchableOpacity
            style={styles.headerLeftCol}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <PlayerAvatar
              iconId={avatarIcon}
              size={40}
              glow={true}
              glowColor={colors.primary}
            />
            <View style={{ gap: 1 }}>
              <Text style={[styles.greetingSub, { color: colors.textMuted }]}>Good day,</Text>
              <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
                {displayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <Gear size={20} color={colors.textPrimary} weight="regular" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
              onPress={() => {
                haptics.light();
                loadNotifications();
                setIsNotifSheetOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Bell size={20} color={colors.textPrimary} weight="regular" />
              {notifications.some((n) => !n.isRead) && (
                <View style={[styles.bellDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Permission Shield Alert (if missing) */}
          {!hasAllPermissions && (
            <TouchableOpacity
              style={[styles.permAlertCard, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: '#EF4444' }]}
              onPress={() => router.push('/permissions' as any)}
              activeOpacity={0.85}
            >
              <ShieldWarning size={20} color="#EF4444" weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.permAlertTitle, { color: '#FFFFFF' }]}>Shield Inactive</Text>
                <Text style={[styles.permAlertSub, { color: isDark ? '#FCA5A5' : '#7F1D1D' }]}>
                  App blocker requires system permissions to protect focus.
                </Text>
              </View>
              <View style={[styles.permAlertBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.permAlertBadgeText}>GRANT</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Big Display Time & Date */}
          <View style={styles.timeHeroSection}>
            <Text style={[styles.timeHeroDisplay, { color: colors.textPrimary }]}>{timeStr}</Text>
            <Text style={[styles.dateHeroDisplay, { color: colors.textMuted }]}>{dateStr}</Text>
          </View>

          {/* Next UPI Payout Goal Progress Banner */}
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              router.push('/shop' as any);
            }}
            activeOpacity={0.88}
          >
            <GlassCard variant="elevated" style={styles.cashoutGoalCard}>
              <View style={styles.cashoutGoalTopRow}>
                <View style={styles.cashoutGoalTag}>
                  <Wallet size={13} color="#F59E0B" weight="fill" />
                  <Text style={styles.cashoutGoalTagText}>NEXT CASHOUT: ₹50 UPI</Text>
                </View>
                <Text style={styles.cashoutGoalPercentText}>
                  {Math.min(100, Math.round((coins / 5000) * 100))}%
                </Text>
              </View>

              <View style={styles.cashoutGoalBarTrack}>
                <View
                  style={[
                    styles.cashoutGoalBarFill,
                    {
                      width: `${Math.max(4, Math.min(100, (coins / 5000) * 100))}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.cashoutGoalFooter}>
                <Text style={styles.cashoutGoalMeta}>
                  {coins.toLocaleString()} / 5,000 Coins
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.cashoutGoalAction}>REDEEM VAULT</Text>
                  <ArrowRight size={11} color="#F59E0B" weight="bold" />
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* 4 Big Command Center Quick Action Tiles */}
          <View style={styles.commandTilesGrid}>
            {/* 1. AI Workout */}
            <TouchableOpacity
              style={styles.commandTile}
              onPress={() => {
                haptics.heavy();
                router.push('/(tabs)/progress');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.commandIconCircle, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                <Barbell size={22} color="#0A84FF" weight="duotone" />
              </View>
              <Text style={styles.commandTileTitle}>AI Workout</Text>
              <Text style={styles.commandTileSub}>Pose Tracker</Text>
            </TouchableOpacity>

            {/* 2. Deep Focus */}
            <TouchableOpacity
              style={styles.commandTile}
              onPress={() => {
                haptics.heavy();
                router.push('/focus/session');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.commandIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Timer size={22} color="#6366F1" weight="duotone" />
              </View>
              <Text style={styles.commandTileTitle}>Deep Focus</Text>
              <Text style={styles.commandTileSub}>Siri Ring</Text>
            </TouchableOpacity>

            {/* 3. Lock Apps */}
            <TouchableOpacity
              style={styles.commandTile}
              onPress={() => {
                haptics.heavy();
                router.push('/settings/apps');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.commandIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ShieldCheck size={22} color="#10B981" weight="duotone" />
              </View>
              <Text style={styles.commandTileTitle}>Lock Apps</Text>
              <Text style={styles.commandTileSub}>Screen Time</Text>
            </TouchableOpacity>

            {/* 4. Redeem UPI */}
            <TouchableOpacity
              style={styles.commandTile}
              onPress={() => {
                haptics.heavy();
                router.push('/shop' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.commandIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Coins size={22} color="#F59E0B" weight="duotone" />
              </View>
              <Text style={styles.commandTileTitle}>Redeem UPI</Text>
              <Text style={styles.commandTileSub}>Cashout</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Next Up Card */}
          <GlassCard variant="glow" style={styles.nextUpCard}>
            <View style={styles.nextUpTopRow}>
              <Text style={[styles.nextUpLabel, { color: colors.textMuted }]}>NEXT UP</Text>
              <CaretRight size={18} color={colors.primary} weight="bold" />
            </View>

            {nextPendingQuest ? (
              <>
                <Text style={[styles.nextUpHeading, { color: colors.textPrimary }]}>Daily Mission</Text>
                <Text style={[styles.nextUpHighlight, { color: colors.primary }]}>{nextPendingQuest.title}</Text>

                <TouchableOpacity
                  style={[styles.startPillBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    haptics.heavy();
                    if (nextPendingQuest.category === 'FITNESS' || nextPendingQuest.category === 'strength') {
                      router.push('/(tabs)/progress');
                    } else if (nextPendingQuest.category === 'FOCUS' || nextPendingQuest.category === 'focus') {
                      router.push('/focus/session');
                    } else {
                      router.push('/(tabs)/quests');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startPillBtnText}>Start Mission</Text>
                  <ArrowRight size={15} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.nextUpHeading, { color: colors.textPrimary }]}>All Daily Quests</Text>
                <Text style={[styles.nextUpHighlight, { color: colors.success }]}>Completed! Great Discipline.</Text>

                <TouchableOpacity
                  style={[styles.startPillBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => {
                    haptics.heavy();
                    router.push('/focus/session');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startPillBtnText}>Deep Focus</Text>
                  <ArrowRight size={15} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </>
            )}
          </GlassCard>

          {/* 4-Column Live Real Metrics Grid from SQLite */}
          <View style={styles.metricsGridRow}>
            {/* Focus */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Timer size={14} color={colors.secondary} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.textMuted }]}>FOCUS</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.textPrimary }]}>
                {todayStats.focusMinutes}m
              </Text>
            </GlassCard>

            {/* Workout */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Barbell size={14} color={colors.primary} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.textMuted }]}>WORKOUT</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.primary }]}>
                {todayStats.workoutMinutes}m
              </Text>
            </GlassCard>

            {/* Quests */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Sparkle size={14} color={colors.success} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.textMuted }]}>QUESTS</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.textPrimary }]}>
                {completedQuestsCount}/{dailyQuests.length}
              </Text>
            </GlassCard>

            {/* Coins */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Coins size={14} color={colors.tertiary} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.tertiary }]}>COINS</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.tertiary }]}>
                {coins.toLocaleString()}
              </Text>
            </GlassCard>
          </View>

          {/* Quick Shop Access */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: '#111218', borderWidth: 1, borderColor: '#1C1E2A' }}
            onPress={() => { haptics.light(); router.push('/shop' as any); }}
            activeOpacity={0.8}
          >
            <Coins size={14} color="#F59E0B" weight="duotone" />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.3 }}>SHOP</Text>
          </TouchableOpacity>

          {/* Apple Fitness 3-Ring Activity Component with Live Data */}
          <GlassCard variant="elevated" style={styles.activityRingsCard}>
            <View style={styles.ringsHeaderRow}>
              <Text style={[styles.ringsCardTitle, { color: colors.textPrimary }]}>ACTIVITY RINGS</Text>
              <Text style={[styles.ringsCardDate, { color: colors.textMuted }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </Text>
            </View>
            <IOSActivityRings
              workoutProgress={Math.min(100, Math.round((todayStats.workoutMinutes / 30) * 100))}
              focusProgress={Math.min(100, Math.round((todayStats.focusMinutes / Math.max(1, profile?.dailyFocusGoal || 25)) * 100))}
              questProgress={winRate}
              size={130}
            />
          </GlassCard>

          {/* 14-Day Discipline Heatmap with Real SQLite Activity */}
          <DisciplineHeatmap />

          {/* Weather Widget */}
          <WeatherWidget />

          {/* Today's Quests Section */}
          <View style={styles.questsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Today's Quests</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quests')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {dailyQuests.slice(0, 3).map((quest) => {
              const isExercise = quest.category === 'FITNESS' || quest.category === 'strength';
              const isFocus = quest.category === 'FOCUS' || quest.category === 'focus';
              const exType = quest.title.toLowerCase().includes('squat')
                ? 'SQUAT'
                : quest.title.toLowerCase().includes('pull')
                ? 'PULLUP'
                : quest.title.toLowerCase().includes('plank')
                ? 'PLANK'
                : 'PUSHUP';

              const handleAction = () => {
                if (quest.completed) return;
                haptics.heavy();
                if (isExercise) {
                  router.push({
                    pathname: '/exercise/[type]',
                    params: { type: exType, target: 20, questId: String(quest.id) },
                  } as any);
                } else if (isFocus) {
                  router.push('/focus/session');
                } else {
                  haptics.success();
                  completeQuest(quest.id);
                }
              };

              return (
                <GlassCard key={quest.id} variant="default" style={styles.questCard}>
                  <TouchableOpacity
                    style={[styles.questCheckbox, quest.completed && { backgroundColor: colors.success, borderColor: colors.success }]}
                    onPress={handleAction}
                  >
                    {quest.completed && <Check size={14} color="#FFFFFF" weight="bold" />}
                  </TouchableOpacity>

                  <View style={styles.questTextCol}>
                    <Text
                      style={[
                        styles.questTitle,
                        { color: colors.textPrimary },
                        quest.completed && styles.questCompletedText,
                      ]}
                    >
                      {quest.title}
                    </Text>
                    <Text style={[styles.questSub, { color: colors.textSecondary }]}>
                      +{quest.rewardXP} XP • +{quest.rewardCoins} Coins
                    </Text>
                  </View>

                  {isExercise && !quest.completed && (
                    <TouchableOpacity
                      style={[styles.aiTrackBtn, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : '#EFF6FF', borderColor: '#0A84FF' }]}
                      onPress={() => {
                        haptics.heavy();
                        const exType = quest.title.toLowerCase().includes('squat')
                          ? 'SQUAT'
                          : quest.title.toLowerCase().includes('pull')
                          ? 'PULLUP'
                          : quest.title.toLowerCase().includes('plank')
                          ? 'PLANK'
                          : 'PUSHUP';
                        router.push({
                          pathname: '/exercise/[type]',
                          params: { type: exType, target: 20 },
                        } as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Camera size={13} color="#0A84FF" weight="bold" />
                      <Text style={[styles.aiTrackBtnText, { color: '#0A84FF' }]}>AI CAM</Text>
                    </TouchableOpacity>
                  )}
                </GlassCard>
              );
            })}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Notifications Sheet Modal */}
        <Modal visible={isNotifSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Notifications</Text>
                <TouchableOpacity onPress={() => setIsNotifSheetOpen(false)} style={styles.closeBtn}>
                  <X size={18} color={colors.textSecondary} weight="bold" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <Text style={[styles.emptyNotifText, { color: colors.textMuted }]}>
                    No notifications yet.
                  </Text>
                ) : (
                  notifications.map((n) => (
                    <View key={n.id} style={[styles.notifItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{n.title}</Text>
                      <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{n.message}</Text>
                      <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetingSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  permAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  permAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  permAlertSub: {
    fontSize: 11,
    lineHeight: 14,
  },
  permAlertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permAlertBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  timeHeroSection: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  timeHeroDisplay: {
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  dateHeroDisplay: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cashoutGoalCard: {
    padding: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: '#121118',
  },
  cashoutGoalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashoutGoalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  cashoutGoalTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  cashoutGoalPercentText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
  },
  cashoutGoalBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1C1E2A',
    overflow: 'hidden',
  },
  cashoutGoalBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  cashoutGoalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashoutGoalMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  cashoutGoalAction: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.6,
  },
  commandTilesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  commandTile: {
    flex: 1,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  commandIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  commandTileTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  commandTileSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  nextUpCard: {
    padding: 20,
    borderRadius: 22,
    gap: 8,
  },
  nextUpTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextUpLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  nextUpHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  nextUpHighlight: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  startPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  startPillBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  metricsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricGridItem: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    gap: 8,
  },
  metricIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricGridLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metricGridVal: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  activityRingsCard: {
    padding: 20,
    borderRadius: 22,
    gap: 14,
  },
  ringsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ringsCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ringsCardDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  questsSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 14,
  },
  questCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTextCol: {
    flex: 1,
    gap: 2,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  questCompletedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  questSub: {
    fontSize: 11,
  },
  aiTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiTrackBtnText: {
    fontSize: 10,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  notifItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    marginTop: 2,
  },
});
