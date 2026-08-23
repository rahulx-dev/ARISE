import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Bell,
  User,
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
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { streakService } from '../../src/services/streakService';
import { initializeDatabase } from '../../src/database/client';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { colors } from '../../src/theme/colors';

export default function HomeDashboard() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const quests = useQuestStore((s) => s.quests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await loadProfile();
        await loadQuests();
        await streakService.checkAndUpdateStreak();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
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
            onPress={() => router.push('/onboarding/profile' as any)}
            activeOpacity={0.8}
          >
            <Bell size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Player Card */}
          <MasterCard style={styles.playerCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarGlowCircle}>
                <View style={styles.avatarInner}>
                  <User size={32} color={colors.primary} />
                </View>
              </View>

              <View style={styles.playerMeta}>
                <View style={styles.levelRow}>
                  <Text style={styles.levelText}>Level {level}</Text>
                  <View style={styles.noviceBadge}>
                    <Text style={styles.noviceBadgeText}>Novice</Text>
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
                <Star size={18} color={colors.accentGold} />
                <Text style={styles.statLabel}>Streak</Text>
                <Text style={styles.statValue}>{streak} days</Text>
              </View>
            </View>
          </MasterCard>

          {/* Core Attributes */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Core Attributes</Text>
              <TouchableOpacity onPress={() => router.push('/progress')}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.attributesRow}>
              {attributes.map((attr) => {
                const IconComponent = attr.icon;
                return (
                  <View key={attr.name} style={styles.attrItem}>
                    <View style={[styles.attrCircle, { borderColor: attr.color }]}>
                      <IconComponent size={18} color={attr.color} />
                    </View>
                    <Text style={styles.attrName}>{attr.name}</Text>
                    <Text style={styles.attrVal}>{attr.val}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Today's Quests Card */}
          <MasterCard style={styles.questsCard}>
            <View style={styles.questsCardHeader}>
              <Text style={styles.questsCardTitle}>Today's Quests</Text>
              <Text style={styles.questsCardCount}>{completedQuestsCount} / {totalQuestsCount} Completed</Text>
            </View>

            <Text style={styles.questsCardSubtitle}>
              Complete quests to earn XP and Coins
            </Text>

            <MasterButton
              title="View Quests"
              onPress={() => router.push('/quests')}
              showArrow
              variant="green"
              style={{ marginTop: 6 }}
            />
          </MasterCard>

          {/* Quick Actions */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => router.push('/focus/session')}
                activeOpacity={0.8}
              >
                <Clock size={16} color={colors.primary} />
                <Text style={styles.quickActionText}>Start Focus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() =>
                  router.push({
                    pathname: '/exercise/[type]',
                    params: { type: 'PUSHUP' },
                  })
                }
                activeOpacity={0.8}
              >
                <Dumbbell size={16} color={colors.primary} />
                <Text style={styles.quickActionText}>Exercise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionPill}
                onPress={() => router.push('/shop')}
                activeOpacity={0.8}
              >
                <ShoppingBag size={16} color={colors.primary} />
                <Text style={styles.quickActionText}>Time Shop</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
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
    paddingVertical: 12,
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
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 18,
    paddingTop: 4,
  },
  playerCard: {
    padding: 18,
    gap: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarGlowCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#202020',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statColDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#202020',
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
  sectionBlock: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  attributesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attrItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  attrCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#181818',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attrName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  attrVal: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  questsCard: {
    padding: 18,
    gap: 10,
  },
  questsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questsCardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  questsCardCount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
  },
  questsCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
