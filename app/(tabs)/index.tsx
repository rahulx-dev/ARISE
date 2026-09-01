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
  Calendar,
  Plus,
  Trophy,
  Dumbbell,
  Shield,
  Crosshair,
  Flame,
  Activity,
  ChevronRight,
  X,
  Sparkles,
  ShieldAlert,
  Coins,
  Camera,
  ShoppingBag,
  Zap,
  Check,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { streakService } from '../../src/services/streakService';
import { notificationService, AppNotification } from '../../src/services/notificationService';
import { initializeDatabase } from '../../src/database/client';
import { appBlockerService } from '../../src/native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { CoinBalance } from '../../src/components/design-system/CoinBalance';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { AriseLogo } from '../../src/components/ui/AriseLogo';
import { XPBar } from '../../src/components/design-system/XPBar';
import { DigitalClockWidget } from '../../src/components/home/DigitalClockWidget';
import { WeatherWidget } from '../../src/components/home/WeatherWidget';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const EXERCISE_OPTIONS = [
  { type: 'PUSHUP', name: 'Push-ups', target: '20 Reps', icon: Dumbbell, xp: '+50 XP', coins: '+25' },
  { type: 'SQUAT', name: 'Squats', target: '25 Reps', icon: Activity, xp: '+45 XP', coins: '+20' },
  { type: 'PLANK', name: 'Plank Hold', target: '45 Sec', icon: Shield, xp: '+40 XP', coins: '+20' },
  { type: 'SITUP', name: 'Sit-ups', target: '20 Reps', icon: Flame, xp: '+40 XP', coins: '+20' },
  { type: 'JUMPING_JACK', name: 'Jumping Jacks', target: '30 Reps', icon: Crosshair, xp: '+35 XP', coins: '+15' },
];

export default function HomeDashboard() {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);

  const [loading, setLoading] = useState(true);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
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
  const avatarIcon = profile?.avatarIcon || 'user';
  const completedQuestsCount = dailyQuests.filter((q) => q.completed).length;
  const totalQuestsCount = dailyQuests.length || 1;
  const winRate = totalQuestsCount > 0 ? Math.round((completedQuestsCount / totalQuestsCount) * 100) : 0;

  // 7-day capsule calendar dates
  const today = new Date();
  const currentDayIndex = today.getDay();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const diff = i - (currentDayIndex === 0 ? 6 : currentDayIndex - 1);
    d.setDate(today.getDate() + diff);
    return {
      dayName: daysOfWeek[d.getDay()],
      dateNum: d.getDate(),
      isToday: diff === 0,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeftIcons}>
            <AriseLogo size={34} glow={true} />
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <SettingsIcon size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              onPress={() => {
                haptics.light();
                loadNotifications();
                setIsNotifSheetOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Bell size={18} color={colors.textPrimary} />
              {notifications.some((n) => !n.isRead) && <View style={[styles.bellDot, { backgroundColor: colors.primary }]} />}
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
              <ShieldAlert size={22} color={colors.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.permAlertTitle, { color: colors.textPrimary }]}>Phone Shield Inactive</Text>
                <Text style={[styles.permAlertDesc, { color: colors.textSecondary }]}>
                  Tap to grant Usage Access & Overlay permissions for app locking.
                </Text>
              </View>
              <View style={[styles.permAlertBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.permAlertBadgeText}>GRANT</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Digital Clock Widget */}
          <DigitalClockWidget />

          {/* Player Identity Hero Card */}
          <GlowCard variant="glow" style={styles.heroSection}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
                style={styles.avatarWrap}
              >
                <PlayerAvatar
                  iconId={avatarIcon}
                  size={72}
                  glow={true}
                  glowColor={colors.primary}
                />
              </TouchableOpacity>

              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={[styles.rankTag, { backgroundColor: 'rgba(209, 255, 0, 0.15)' }]}>
                    <Text style={[styles.rankTagText, { color: colors.primary }]}>LV. {level}</Text>
                  </View>
                </View>
                <Text style={[styles.playerBioText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {profile?.bio || 'Disciplined warrior in training.'}
                </Text>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={{ width: '100%', marginTop: 6 }}>
              <XPBar progress={Math.min(100, Math.round((currentXP / Math.max(1, level * 100)) * 100))} />
            </View>

            {/* 3 Metric Columns: Streak | Win Rate | Quests */}
            <View style={[styles.threeStatsRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <View style={styles.statColumn}>
                <Flame size={18} color={colors.danger} />
                <Text style={[styles.statColumnValue, { color: colors.textPrimary }]}>{streak} Days</Text>
                <Text style={[styles.statColumnLabel, { color: colors.textMuted }]}>STREAK</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statColumn}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={[styles.statColumnValue, { color: colors.textPrimary }]}>{winRate}%</Text>
                <Text style={[styles.statColumnLabel, { color: colors.textMuted }]}>COMPLETION</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statColumn}>
                <Award size={18} color={colors.secondary} />
                <Text style={[styles.statColumnValue, { color: colors.textPrimary }]}>{completedQuestsCount}</Text>
                <Text style={[styles.statColumnLabel, { color: colors.textMuted }]}>TASKS DONE</Text>
              </View>
            </View>
          </GlowCard>

          {/* Quick Actions Dock */}
          <View style={styles.quickActionsSection}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>QUICK DIRECTIVES</Text>
            <View style={styles.quickDockRow}>
              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/progress')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(209, 255, 0, 0.15)' }]}>
                  <Dumbbell size={20} color={colors.primary} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Gym</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/focus/session')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(0, 240, 255, 0.15)' }]}>
                  <Crosshair size={20} color={colors.secondary} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Focus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/photos')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                  <Camera size={20} color={colors.accentGold} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/shop')}
                activeOpacity={0.8}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <ShoppingBag size={20} color={colors.danger} />
                </View>
                <Text style={[styles.dockLabel, { color: colors.textPrimary }]}>Shop</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Weather Widget */}
          <WeatherWidget />

          {/* Today's Active Quests Section */}
          <View style={styles.questsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                TODAY'S QUESTS ({completedQuestsCount}/{dailyQuests.length})
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quests')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>

            {dailyQuests.length === 0 ? (
              <GlowCard variant="default" style={styles.emptyCard}>
                <Sparkles size={28} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All Quests Complete</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  New daily protocol quests regenerate tomorrow at 00:00.
                </Text>
              </GlowCard>
            ) : (
              dailyQuests.slice(0, 3).map((q) => (
                <GlowCard key={q.id} variant={q.completed ? 'default' : 'glow'} style={styles.questCard}>
                  <View style={styles.questCardLeft}>
                    <View
                      style={[
                        styles.questCheckCircle,
                        q.completed && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      {q.completed && <Check size={14} color="#000" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          styles.questTitleText,
                          { color: colors.textPrimary },
                          q.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
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
                    <View style={[styles.rewardTag, { backgroundColor: 'rgba(209, 255, 0, 0.1)' }]}>
                      <Text style={[styles.rewardTagText, { color: colors.primary }]}>+{q.rewardCoins} 🪙</Text>
                    </View>
                  </View>
                </GlowCard>
              ))
            )}
          </View>

          {/* Weekly 7-Day Capsule Panel */}
          <GlowCard variant="default" style={styles.weeklyPanel}>
            <View style={styles.weeklyRow}>
              {calendarDays.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dayItem,
                    item.isToday && { backgroundColor: 'rgba(209, 255, 0, 0.12)', borderColor: colors.primary, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.dayText, { color: item.isToday ? colors.primary : colors.textMuted }]}>
                    {item.dayName}
                  </Text>
                  <Text style={[styles.dateText, { color: item.isToday ? colors.textPrimary : colors.textSecondary }]}>
                    {item.dateNum}
                  </Text>
                </View>
              ))}
            </View>
          </GlowCard>

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
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>System Notifications</Text>
                <TouchableOpacity onPress={() => setIsNotifSheetOpen(false)} style={styles.iconBtn}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 350 }} contentContainerStyle={{ gap: 10 }}>
                {notifications.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center', gap: 8 }}>
                    <Sparkles size={28} color={colors.textMuted} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }}>
                      No notifications yet.
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                      Quest completions and achievements will appear here.
                    </Text>
                  </View>
                ) : (
                  notifications.map((n) => (
                    <GlowCard key={n.id} variant="default" style={styles.notifCard}>
                      <Sparkles size={20} color={colors.primary} />
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
                    </GlowCard>
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
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  permAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  permAlertTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  permAlertDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  permAlertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permAlertBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  heroSection: {
    padding: 18,
    borderRadius: 22,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    fontSize: 20,
    fontWeight: '900',
  },
  rankTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playerBioText: {
    fontSize: 12,
    lineHeight: 16,
  },
  threeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statColumn: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statColumnValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  statColumnLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 24,
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
    gap: 10,
  },
  dockItem: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  dockIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockLabel: {
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
  },
  questCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  questCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questTitleText: {
    fontSize: 13,
    fontWeight: '900',
  },
  questDescText: {
    fontSize: 11,
  },
  questCardRight: {
    marginLeft: 8,
  },
  rewardTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rewardTagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
  },
  weeklyPanel: {
    padding: 12,
    borderRadius: 18,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  dayText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  notifDesc: {
    fontSize: 11,
  },
});
