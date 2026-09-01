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
  Settings as SettingsIcon,
  Bell,
  TrendingUp,
  Award,
  Dumbbell,
  Crosshair,
  Flame,
  X,
  Sparkles,
  ShieldAlert,
  Coins,
  Camera,
  ShoppingBag,
  Check,
  Zap,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { streakService } from '../../src/services/streakService';
import { notificationService, AppNotification } from '../../src/services/notificationService';
import { initializeDatabase } from '../../src/database/client';
import { appBlockerService } from '../../src/native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { CoinBalance } from '../../src/components/design-system/CoinBalance';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { AriseLogo } from '../../src/components/ui/AriseLogo';
import { XPBar } from '../../src/components/design-system/XPBar';
import { WatchClockWidget } from '../../src/components/ios/WatchClockWidget';
import { WeatherWidget } from '../../src/components/home/WeatherWidget';
import { StreakHeatmap } from '../../src/components/home/StreakHeatmap';
import { ActivityMetricGraph } from '../../src/components/home/ActivityMetricGraph';
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
  const displayName = profile?.displayName || 'Warrior';
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';
  const completedQuestsCount = dailyQuests.filter((q) => q.completed).length;
  const totalQuestsCount = dailyQuests.length || 1;
  const winRate = totalQuestsCount > 0 ? Math.round((completedQuestsCount / totalQuestsCount) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeftIcons}>
            <AriseLogo size={32} glow={true} />
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <SettingsIcon size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}
              onPress={() => {
                haptics.light();
                loadNotifications();
                setIsNotifSheetOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Bell size={18} color={colors.textPrimary} />
              {notifications.some((n) => !n.isRead) && (
                <View style={[styles.bellDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          </View>

          <CoinBalance
            amount={coins}
            onPressAdd={() => router.push('/shop')}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Permission Shield Alert Banner if missing */}
          {!hasAllPermissions && (
            <TouchableOpacity
              style={[styles.permAlertCard, { backgroundColor: 'rgba(209, 255, 0, 0.08)', borderColor: colors.primary }]}
              onPress={() => {
                haptics.medium();
                router.push('/permissions' as any);
              }}
              activeOpacity={0.8}
            >
              <ShieldAlert size={20} color={colors.primary} />
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

          {/* Watch-Style Chronometer Widget */}
          <WatchClockWidget />

          {/* Player Identity Hero Card */}
          <GlassCard variant="glow" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
                style={styles.avatarWrap}
              >
                <PlayerAvatar
                  iconId={avatarIcon}
                  size={68}
                  glow={true}
                  glowColor={colors.primary}
                />
              </TouchableOpacity>

              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={[styles.rankTag, { backgroundColor: isDark ? 'rgba(209, 255, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.rankTagText, { color: colors.primary }]}>LV. {level}</Text>
                  </View>
                </View>
                <Text style={[styles.playerBioText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {profile?.bio || 'Disciplined warrior in training.'}
                </Text>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={{ width: '100%', marginTop: 2 }}>
              <XPBar progress={Math.min(100, Math.round((currentXP / Math.max(1, level * 100)) * 100))} />
            </View>

            {/* 3 Metric Columns: Streak | Win Rate | Quests */}
            <View style={[styles.threeStatsRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.border }]}>
              <View style={styles.statColumn}>
                <Flame size={16} color={colors.danger} />
                <Text style={[styles.statColumnValue, { color: colors.textPrimary }]}>{streak} Days</Text>
                <Text style={[styles.statColumnLabel, { color: colors.textMuted }]}>STREAK</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statColumn}>
                <TrendingUp size={16} color={colors.primary} />
                <Text style={[styles.statColumnValue, { color: colors.textPrimary }]}>{winRate}%</Text>
                <Text style={[styles.statColumnLabel, { color: colors.textMuted }]}>WIN RATE</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statColumn}>
                <Award size={16} color={colors.secondary} />
                <Text style={[styles.statColumnValue, { color: colors.textPrimary }]}>{completedQuestsCount}</Text>
                <Text style={[styles.statColumnLabel, { color: colors.textMuted }]}>TASKS DONE</Text>
              </View>
            </View>
          </GlassCard>

          {/* Apple Fitness Activity Rings Card */}
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

          {/* Quick Actions Dock */}
          <View style={styles.quickActionsSection}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>QUICK DIRECTIVES</Text>
            <View style={styles.quickDockRow}>
              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: isDark ? 'rgba(22, 22, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/progress')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(209, 255, 0, 0.15)' }]}>
                  <Dumbbell size={18} color={colors.primary} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Gym</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: isDark ? 'rgba(22, 22, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.border }]}
                onPress={() => router.push('/focus/session')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(0, 240, 255, 0.15)' }]}>
                  <Crosshair size={18} color={colors.secondary} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Focus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: isDark ? 'rgba(22, 22, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.border }]}
                onPress={() => router.push('/photos')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                  <Camera size={18} color={colors.accentGold} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: isDark ? 'rgba(22, 22, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.border }]}
                onPress={() => router.push('/shop')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <ShoppingBag size={18} color={colors.danger} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Shop</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GitHub-Style 12-Week Streak Heatmap */}
          <StreakHeatmap />

          {/* 7-Day Switchable Activity Metric Graph */}
          <ActivityMetricGraph />

          {/* Real/Cached Weather Card */}
          <WeatherWidget />

          {/* Today's Active Quests Section */}
          <View style={styles.questsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                TODAY'S MISSION ({completedQuestsCount}/{dailyQuests.length})
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quests')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>

            {dailyQuests.length === 0 ? (
              <GlassCard variant="default" style={styles.emptyCard}>
                <Sparkles size={24} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All Quests Completed</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  New daily protocol quests regenerate tomorrow at 00:00.
                </Text>
              </GlassCard>
            ) : (
              dailyQuests.slice(0, 3).map((q) => {
                const isDone = q.completed === true;
                const titleLower = q.title.toLowerCase();
                const isExercise =
                  q.category === 'strength' ||
                  q.category === 'fitness' ||
                  titleLower.includes('push') ||
                  titleLower.includes('squat') ||
                  titleLower.includes('pull') ||
                  titleLower.includes('plank') ||
                  titleLower.includes('jack') ||
                  titleLower.includes('lunge') ||
                  titleLower.includes('crunch');

                let exerciseType = 'PUSHUP';
                if (titleLower.includes('squat')) exerciseType = 'SQUAT';
                else if (titleLower.includes('pull')) exerciseType = 'PULLUP';
                else if (titleLower.includes('plank')) exerciseType = 'PLANK';
                else if (titleLower.includes('jack')) exerciseType = 'JUMPING_JACK';

                const handlePress = () => {
                  if (isDone) return;
                  haptics.medium();
                  if (isExercise) {
                    router.push({
                      pathname: '/exercise/[type]',
                      params: {
                        type: exerciseType,
                        target: q.target || 20,
                        questId: String(q.id),
                      },
                    } as any);
                  } else if (q.category === 'focus') {
                    router.push('/focus/session');
                  } else {
                    completeQuest(q.id);
                  }
                };

                return (
                  <TouchableOpacity key={q.id} onPress={handlePress} activeOpacity={0.8}>
                    <GlassCard variant={isDone ? 'default' : 'glow'} style={styles.questCard}>
                      <View style={styles.questCardLeft}>
                        <TouchableOpacity
                          onPress={() => !isDone && completeQuest(q.id)}
                          style={[
                            styles.questCheckCircle,
                            isDone && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          activeOpacity={0.7}
                        >
                          {isDone && <Check size={12} color="#000" strokeWidth={3} />}
                        </TouchableOpacity>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={[
                              styles.questTitleText,
                              { color: colors.textPrimary },
                              isDone && { textDecorationLine: 'line-through', opacity: 0.6 },
                            ]}
                          >
                            {q.title}
                          </Text>
                          <Text style={[styles.questDescText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {q.description}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.questCardRight}>
                        <View style={[styles.rewardTag, { backgroundColor: isDark ? 'rgba(209, 255, 0, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                          <Text style={[styles.rewardTagText, { color: colors.primary }]}>+{q.rewardCoins} 🪙</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Notifications Sheet Modal */}
        <Modal
          visible={isNotifSheetOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsNotifSheetOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>System Notifications</Text>
                <TouchableOpacity onPress={() => setIsNotifSheetOpen(false)} style={styles.iconBtn}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 10 }}>
                {notifications.length === 0 ? (
                  <View style={{ padding: 28, alignItems: 'center', gap: 8 }}>
                    <Sparkles size={24} color={colors.textMuted} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 13 }}>
                      No notifications yet.
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>
                      Quest completions and achievements will appear here.
                    </Text>
                  </View>
                ) : (
                  notifications.map((n) => (
                    <View
                      key={n.id}
                      style={[styles.notifCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                    >
                      <Sparkles size={18} color={colors.primary} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{n.title}</Text>
                        <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>{n.message}</Text>
                        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                          {new Date(n.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
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
  center: { justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  permAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  permAlertTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  permAlertDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  permAlertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  permAlertBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  heroCard: {
    padding: 16,
    borderRadius: 22,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '900',
  },
  rankTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playerBioText: {
    fontSize: 11,
    lineHeight: 14,
  },
  threeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  statColumn: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statColumnValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  statColumnLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 20,
  },
  quickActionsSection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  quickDockRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dockItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 5,
  },
  dockIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  questsSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
  },
  questCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  questCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questTitleText: {
    fontSize: 12,
    fontWeight: '900',
  },
  questDescText: {
    fontSize: 10,
  },
  questCardRight: {
    marginLeft: 6,
  },
  rewardTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rewardTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  notifDesc: {
    fontSize: 10,
  },
  activityRingsCard: {
    padding: 16,
    borderRadius: 22,
    gap: 12,
  },
  ringsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  ringsCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ringsCardDate: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
