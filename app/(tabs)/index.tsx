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
} from 'phosphor-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { streakService } from '../../src/services/streakService';
import { notificationService, AppNotification } from '../../src/services/notificationService';
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

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadQuests();
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
  const displayName = profile?.displayName || 'Alex';
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';
  const completedQuestsCount = dailyQuests.filter((q) => q.completed).length;
  const totalQuestsCount = dailyQuests.length || 1;
  const winRate = totalQuestsCount > 0 ? Math.round((completedQuestsCount / totalQuestsCount) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Stitch v2 Top App Bar */}
        <View style={[styles.topHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
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
              <Text style={[styles.greetingSub, { color: colors.textMuted }]}>Good morning,</Text>
              <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
                {displayName} <Text style={{ fontSize: 16 }}>👋</Text>
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <Gear size={20} color={colors.textPrimary} weight="regular" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
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
          {/* Missing Permissions Banner */}
          {!hasAllPermissions && (
            <TouchableOpacity
              style={[styles.permAlertCard, { backgroundColor: 'rgba(204, 255, 0, 0.08)', borderColor: colors.primary }]}
              onPress={() => {
                haptics.medium();
                router.push('/permissions' as any);
              }}
              activeOpacity={0.8}
            >
              <ShieldWarning size={22} color={colors.primary} weight="duotone" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.permAlertTitle, { color: colors.textPrimary }]}>Phone Shield Inactive</Text>
                <Text style={[styles.permAlertDesc, { color: colors.textSecondary }]}>
                  Grant Usage Access & Overlay permissions to lock distraction apps.
                </Text>
              </View>
              <View style={[styles.permAlertBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.permAlertBadgeText}>GRANT</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Stitch v2 Big Display Time & Date */}
          <View style={styles.timeHeroSection}>
            <Text style={[styles.timeHeroDisplay, { color: colors.textPrimary }]}>{timeStr}</Text>
            <Text style={[styles.dateHeroDisplay, { color: colors.textMuted }]}>{dateStr}</Text>
          </View>

          {/* Stitch v2 "Next Up" Card */}
          <GlassCard variant="glow" style={styles.nextUpCard}>
            <View style={styles.nextUpTopRow}>
              <Text style={[styles.nextUpLabel, { color: colors.textMuted }]}>NEXT UP</Text>
              <CaretRight size={18} color={colors.primary} weight="bold" />
            </View>

            <Text style={[styles.nextUpHeading, { color: colors.textPrimary }]}>Complete your</Text>
            <Text style={[styles.nextUpHighlight, { color: colors.primary }]}>25 min Focus Session</Text>

            <TouchableOpacity
              style={[styles.startPillBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                haptics.heavy();
                router.push('/focus/session');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.startPillBtnText}>Start</Text>
              <ArrowRight size={15} color="#000000" weight="bold" />
            </TouchableOpacity>
          </GlassCard>

          {/* Stitch v2 4-Column Quick Metrics Grid */}
          <View style={styles.metricsGridRow}>
            {/* Focus */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Timer size={14} color={colors.textMuted} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.textMuted }]}>FOCUS</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.textPrimary }]}>32m</Text>
            </GlassCard>

            {/* Workout */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Barbell size={14} color={colors.primary} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.textMuted }]}>WORKOUT</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.primary }]}>45m</Text>
            </GlassCard>

            {/* Quests */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Sparkle size={14} color={colors.textMuted} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.textMuted }]}>QUESTS</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.textPrimary }]}>
                {completedQuestsCount}/{dailyQuests.length}
              </Text>
            </GlassCard>

            {/* Coins */}
            <GlassCard variant="default" style={styles.metricGridItem}>
              <View style={styles.metricIconHeader}>
                <Coins size={14} color={colors.secondary} weight="duotone" />
                <Text style={[styles.metricGridLabel, { color: colors.secondary }]}>COINS</Text>
              </View>
              <Text style={[styles.metricGridVal, { color: colors.secondary }]}>
                {coins.toLocaleString()}
              </Text>
            </GlassCard>
          </View>

          {/* Apple Fitness 3-Ring Activity Component */}
          <GlassCard variant="elevated" style={styles.activityRingsCard}>
            <View style={styles.ringsHeaderRow}>
              <Text style={[styles.ringsCardTitle, { color: colors.textPrimary }]}>ACTIVITY RINGS</Text>
              <Text style={[styles.ringsCardDate, { color: colors.textMuted }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </Text>
            </View>
            <IOSActivityRings
              workoutProgress={Math.min(100, (completedQuestsCount / Math.max(1, totalQuestsCount)) * 100)}
              focusProgress={Math.min(100, Math.round(((profile?.dailyFocusGoal || 30) / 45) * 100))}
              questProgress={winRate}
              size={130}
            />
          </GlassCard>

          {/* Stitch v2 14-Day Discipline Heatmap */}
          <DisciplineHeatmap />

          {/* Weather Widget */}
          <WeatherWidget />

          {/* Today's Quests Section with AI Camera triggers */}
          <View style={styles.questsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Today's Quests</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quests')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {dailyQuests.length === 0 ? (
              <GlassCard variant="default" style={styles.emptyCard}>
                <Sparkle size={24} color={colors.textMuted} weight="duotone" />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All clear for today</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>New quests arrive at midnight</Text>
              </GlassCard>
            ) : (
              dailyQuests.slice(0, 3).map((q) => {
                const isExercise =
                  q.category === 'strength' ||
                  q.category === 'fitness' ||
                  q.title.toLowerCase().includes('push') ||
                  q.title.toLowerCase().includes('squat');

                return (
                  <GlassCard key={q.id} variant="default" style={styles.questPreviewCard}>
                    <TouchableOpacity
                      style={styles.questPreviewRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (isExercise) {
                          haptics.medium();
                          const type = q.title.toLowerCase().includes('squat') ? 'SQUAT' : 'PUSHUP';
                          router.push({
                            pathname: '/exercise/[type]',
                            params: { type, target: q.target || 20, questId: String(q.id) },
                          } as any);
                        } else {
                          router.push('/(tabs)/quests');
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.questIconBox,
                          {
                            backgroundColor: isExercise
                              ? isDark
                                ? 'rgba(204, 255, 0, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)'
                              : isDark
                              ? 'rgba(221, 183, 255, 0.12)'
                              : 'rgba(124, 58, 237, 0.1)',
                          },
                        ]}
                      >
                        {isExercise ? (
                          <Barbell size={18} color={colors.primary} weight="duotone" />
                        ) : (
                          <Brain size={18} color={colors.secondary} weight="duotone" />
                        )}
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.questTitleText, { color: colors.textPrimary }]}>{q.title}</Text>
                        <Text style={[styles.questSubText, { color: colors.textMuted }]}>
                          +{q.rewardCoins} coins • +{q.rewardXP} XP
                        </Text>
                      </View>

                      {isExercise ? (
                        <View style={[styles.aiTrackPill, { backgroundColor: isDark ? 'rgba(204, 255, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                          <Camera size={12} color={colors.primary} weight="bold" />
                          <Text style={[styles.aiTrackPillText, { color: colors.primary }]}>AI TRACK</Text>
                        </View>
                      ) : (
                        <CaretRight size={16} color={colors.textMuted} weight="bold" />
                      )}
                    </TouchableOpacity>
                  </GlassCard>
                );
              })
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Notifications Modal */}
        <Modal
          visible={isNotifSheetOpen}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setIsNotifSheetOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A141E' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Activity Alerts</Text>
                <TouchableOpacity onPress={() => setIsNotifSheetOpen(false)}>
                  <X size={20} color={colors.textSecondary} weight="bold" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <Text style={[styles.emptyNotifText, { color: colors.textMuted }]}>No recent notifications.</Text>
                ) : (
                  notifications.map((n) => (
                    <View key={n.id} style={[styles.notifRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{n.title}</Text>
                      <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{n.message}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
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
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 14,
    gap: 16,
  },
  permAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  permAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  permAlertDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  permAlertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permAlertBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  timeHeroSection: {
    paddingVertical: 6,
  },
  timeHeroDisplay: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  dateHeroDisplay: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  nextUpCard: {
    padding: 20,
    borderRadius: 22,
    gap: 6,
  },
  nextUpTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nextUpLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextUpHeading: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextUpHighlight: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  startPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  startPillBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.3,
  },
  metricsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricGridItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  metricIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricGridLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricGridVal: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  activityRingsCard: {
    padding: 18,
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
    fontWeight: '600',
  },
  questsSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
  },
  questPreviewCard: {
    borderRadius: 18,
  },
  questPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  questIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTitleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  questSubText: {
    fontSize: 11,
    fontWeight: '500',
  },
  aiTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  aiTrackPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyNotifText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 13,
  },
  notifRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 11,
    lineHeight: 16,
  },
});
