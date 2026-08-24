import React, { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import {
  Bell,
  Coins,
  Star,
  Dumbbell,
  Shield,
  Crosshair,
  Heart,
  BookOpen,
  Clock,
  ShoppingBag,
  Triangle,
  Flame,
  ChevronRight,
  X,
  Camera,
  Activity,
  ShieldAlert,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { streakService } from '../../src/services/streakService';
import { initializeDatabase } from '../../src/database/client';
import { appBlockerService } from '../../src/native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

const EXERCISE_OPTIONS = [
  { type: 'PUSHUP', name: 'Push-ups', target: '20 Reps', icon: Dumbbell, xp: '+50 XP', coins: '+25 🟡' },
  { type: 'SQUAT', name: 'Squats', target: '25 Reps', icon: Activity, xp: '+45 XP', coins: '+20 🟡' },
  { type: 'PLANK', name: 'Plank Hold', target: '45 Sec', icon: Shield, xp: '+40 XP', coins: '+20 🟡' },
  { type: 'SITUP', name: 'Sit-ups', target: '20 Reps', icon: Flame, xp: '+40 XP', coins: '+20 🟡' },
  { type: 'JUMPING_JACK', name: 'Jumping Jacks', target: '30 Reps', icon: Crosshair, xp: '+35 XP', coins: '+15 🟡' },
];

export default function HomeDashboard() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const quests = useQuestStore((s) => s.quests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const haptics = useHaptics();

  const [loading, setLoading] = useState(true);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isNotifSheetOpen, setIsNotifSheetOpen] = useState(false);
  const [hasAllPermissions, setHasAllPermissions] = useState(true);

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

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await loadProfile();
        await loadQuests();
        await streakService.checkAndUpdateStreak();
        await checkPermissions();
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
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const level = profile?.level || 1;
  const currentXP = profile?.currentXP || 0;
  const targetXP = level * 100;
  const coins = profile?.coins || 0;
  const streak = profile?.currentStreak || 0;
  const displayName = profile?.displayName || 'Warrior';
  const completedQuestsCount = quests.filter((q) => q.completed).length;
  const totalQuestsCount = quests.length || 5;

  const xpPercent = Math.min(100, Math.round((currentXP / targetXP) * 100));

  const attributes = [
    { name: 'Strength', val: profile?.strength || 0, icon: Dumbbell, color: colors.stats.strength },
    { name: 'Discipline', val: profile?.discipline || 0, icon: Shield, color: colors.stats.discipline },
    { name: 'Focus', val: profile?.focus || 0, icon: Crosshair, color: colors.stats.focus },
    { name: 'Health', val: profile?.health || 0, icon: Heart, color: colors.stats.health },
    { name: 'Knowledge', val: profile?.knowledge || 0, icon: BookOpen, color: colors.stats.knowledge },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header: Triangle Logo + Bell */}
        <View style={styles.topHeader}>
          <View style={styles.logoRow}>
            <Triangle size={18} color={colors.textPrimary} fill={colors.textPrimary} />
            <Text style={styles.logoText}>ARISE</Text>
          </View>

          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => {
              haptics.light();
              setIsNotifSheetOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Bell size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Permission Shield Alert Banner */}
          {!hasAllPermissions && (
            <TouchableOpacity
              style={styles.permAlertCard}
              onPress={() => {
                haptics.medium();
                router.push('/permissions' as any);
              }}
              activeOpacity={0.8}
            >
              <ShieldAlert size={22} color={colors.accentGold} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.permAlertTitle}>Phone Shield Inactive</Text>
                <Text style={styles.permAlertDesc}>
                  Tap to grant Usage Access & Overlay so ARISE can lock apps
                </Text>
              </View>
              <View style={styles.permAlertBadge}>
                <Text style={styles.permAlertBadgeText}>GRANT</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Hero Player Card */}
          <MasterCard style={styles.playerCard}>
            <View style={styles.avatarRow}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <PlayerAvatar size={64} glow={true} />
              </TouchableOpacity>

              <View style={styles.playerMeta}>
                <View style={styles.levelRow}>
                  <Text style={styles.levelText}>{displayName}</Text>
                  <View style={styles.noviceBadge}>
                    <Text style={styles.noviceBadgeText}>Level {level} Novice</Text>
                  </View>
                </View>

                {/* XP Progress Bar */}
                <View style={styles.xpBarContainer}>
                  <View style={[styles.xpBarFill, { width: `${Math.max(5, xpPercent)}%` }]} />
                </View>
                <Text style={styles.xpLabel}>{currentXP} / {targetXP} XP</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Coins & Streak Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Coins size={18} color={colors.accentGold} />
                <Text style={styles.statLabel}>Coins</Text>
                <Text style={styles.statValue}>{coins}</Text>
              </View>

              <View style={styles.statColDivider} />

              <View style={styles.statCol}>
                <Star size={18} color={colors.primary} />
                <Text style={styles.statLabel}>Streak</Text>
                <Text style={styles.statValue}>{streak} days</Text>
              </View>
            </View>
          </MasterCard>

          {/* Core Attributes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Core Attributes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/progress')} activeOpacity={0.8}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.attributesRow}>
            {attributes.map((attr) => {
              const IconComp = attr.icon;
              return (
                <View key={attr.name} style={styles.attributeItem}>
                  <View style={[styles.attributeCircle, { borderColor: `${attr.color}40` }]}>
                    <IconComp size={18} color={attr.color} />
                  </View>
                  <Text style={styles.attributeVal}>{attr.val}</Text>
                  <Text style={styles.attributeName}>{attr.name}</Text>
                </View>
              );
            })}
          </View>

          {/* Today's Quests Card */}
          <MasterCard style={styles.questsCard}>
            <View style={styles.questsCardHeader}>
              <View>
                <Text style={styles.questsCardTitle}>Today's Quests</Text>
                <Text style={styles.questsCardSubtitle}>
                  {completedQuestsCount} / {totalQuestsCount} Completed
                </Text>
              </View>
              <Flame size={22} color={colors.primary} />
            </View>

            <MasterButton
              title="VIEW QUESTS"
              onPress={() => router.push('/(tabs)/quests')}
              variant="green"
              showArrow
            />
          </MasterCard>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/focus/session')}
              activeOpacity={0.8}
            >
              <Clock size={20} color={colors.primary} />
              <Text style={styles.quickActionText}>Start Focus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                haptics.light();
                setIsExercisePickerOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Dumbbell size={20} color={colors.stats.strength} />
              <Text style={styles.quickActionText}>Exercise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/shop')}
              activeOpacity={0.8}
            >
              <ShoppingBag size={20} color={colors.accentGold} />
              <Text style={styles.quickActionText}>Time Shop</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Exercise Selection Modal */}
      <Modal
        visible={isExercisePickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExercisePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose AI Exercise</Text>
                <Text style={styles.modalSubtitle}>Real-time camera pose tracking</Text>
              </View>
              <TouchableOpacity onPress={() => setIsExercisePickerOpen(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.exerciseList}>
              {EXERCISE_OPTIONS.map((ex) => {
                const IconComp = ex.icon;
                return (
                  <TouchableOpacity
                    key={ex.type}
                    style={styles.exerciseRow}
                    onPress={() => {
                      haptics.medium();
                      setIsExercisePickerOpen(false);
                      router.push(`/exercise/${ex.type}` as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.exLeft}>
                      <View style={styles.exIconCircle}>
                        <IconComp size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.exName}>{ex.name}</Text>
                        <Text style={styles.exTarget}>{ex.target}</Text>
                      </View>
                    </View>

                    <View style={styles.exRight}>
                      <Text style={styles.exRewardsText}>{ex.xp} {ex.coins}</Text>
                      <Camera size={16} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications & Streak Sheet */}
      <Modal
        visible={isNotifSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotifSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alerts & Status</Text>
              <TouchableOpacity onPress={() => setIsNotifSheetOpen(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.notifBody}>
              <MasterCard style={styles.notifCard}>
                <Star size={24} color={colors.accentGold} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.notifTitle}>{streak} Day Active Streak</Text>
                  <Text style={styles.notifDesc}>Keep your streak alive by completing 1 quest today.</Text>
                </View>
              </MasterCard>

              <MasterCard style={styles.notifCard}>
                <Shield size={24} color={colors.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.notifTitle}>Permissions Active</Text>
                  <Text style={styles.notifDesc}>On-device protection protocol running.</Text>
                </View>
              </MasterCard>

              <MasterButton
                title="CLOSE"
                onPress={() => setIsNotifSheetOpen(false)}
                variant="green"
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 20,
    paddingTop: 8,
  },
  playerCard: {
    padding: 18,
    gap: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  playerMeta: {
    flex: 1,
    gap: 4,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  noviceBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  noviceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  xpBarContainer: {
    height: 6,
    backgroundColor: '#262626',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statColDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#262626',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  attributesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attributeItem: {
    alignItems: 'center',
    gap: 6,
  },
  attributeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attributeVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  attributeName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  questsCard: {
    padding: 18,
    gap: 14,
  },
  questsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questsCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  questsCardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  exerciseList: {
    gap: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181818',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
  },
  exLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#202020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  exTarget: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exRewardsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentGold,
  },
  notifBody: {
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  notifDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  permAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E190A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A3A10',
    padding: 14,
    marginBottom: 4,
  },
  permAlertTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accentGold,
  },
  permAlertDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  permAlertBadge: {
    backgroundColor: colors.accentGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permAlertBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A0A0A',
  },
});
