import React, { useState, useEffect } from 'react';
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
  ClipboardList,
  CheckCircle2,
  Coins,
  Sparkles,
  Zap,
  Flame,
  Brain,
  Dumbbell,
  Shield,
  Check,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const CATEGORY_ICONS: Record<string, any> = {
  strength: Dumbbell,
  fitness: Dumbbell,
  focus: Brain,
  discipline: Flame,
  health: Shield,
  general: Zap,
};

export default function QuestsTab() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();

  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const profile = usePlayerStore((s) => s.profile);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DAILY' | 'STRENGTH' | 'FOCUS'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadQuests();
  }, []);

  const handleComplete = async (questId: number) => {
    haptics.heavy();
    sound.play('quest_complete');
    await completeQuest(questId);
  };

  const filteredQuests = dailyQuests.filter((q) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'DAILY') return true;
    if (activeFilter === 'STRENGTH') return q.category === 'strength' || q.category === 'fitness';
    if (activeFilter === 'FOCUS') return q.category === 'focus';
    return true;
  });

  const completedCount = dailyQuests.filter((q) => q.completed).length;
  const totalCount = dailyQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>MISSION DIRECTIVES</Text>
          <View style={[styles.completionBadge, { backgroundColor: isDark ? 'rgba(209, 255, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
            <Text style={[styles.completionBadgeText, { color: colors.primary }]}>
              {completedCount}/{dailyQuests.length} DONE
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Progress Overview Hero Card */}
          <GlassCard variant="glow" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeftCol}>
                <Text style={[styles.heroSubTitle, { color: colors.textSecondary }]}>DAILY PROTOCOL PROGRESS</Text>
                <Text style={[styles.heroMainTitle, { color: colors.textPrimary }]}>
                  {completedCount === dailyQuests.length && dailyQuests.length > 0
                    ? 'ALL MISSIONS COMPLETE'
                    : `${dailyQuests.length - completedCount} Missions Remaining`}
                </Text>
              </View>

              <View style={styles.heroRightCol}>
                <Text style={[styles.heroPercentText, { color: colors.primary }]}>{progressPercent}%</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
            </View>
          </GlassCard>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(['ALL', 'DAILY', 'STRENGTH', 'FOCUS'] as const).map((filter) => {
              const isSelected = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => {
                    haptics.light();
                    setActiveFilter(filter);
                  }}
                  style={[
                    styles.filterPill,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: colors.textSecondary },
                      isSelected && { color: '#000000', fontWeight: '900' },
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quests List */}
          <View style={styles.questsList}>
            {filteredQuests.length === 0 ? (
              <GlassCard variant="default" style={styles.emptyCard}>
                <Sparkles size={28} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Missions Found</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Check back tomorrow for newly calibrated daily missions.
                </Text>
              </GlassCard>
            ) : (
              filteredQuests.map((q) => {
                const IconComp = CATEGORY_ICONS[q.category] || Zap;
                const isDone = q.completed === true;

                return (
                  <GlassCard key={q.id} variant={isDone ? 'default' : 'elevated'} style={styles.questCard}>
                    <TouchableOpacity
                      onPress={() => !isDone && handleComplete(q.id)}
                      style={styles.questCardInner}
                      activeOpacity={0.8}
                    >
                      {/* Checkbox button */}
                      <View
                        style={[
                          styles.checkboxBtn,
                          { borderColor: isDone ? colors.primary : colors.border },
                          isDone && { backgroundColor: colors.primary },
                        ]}
                      >
                        {isDone && <Check size={14} color="#000" strokeWidth={3} />}
                      </View>

                      {/* Content */}
                      <View style={styles.questContentCol}>
                        <View style={styles.questCategoryRow}>
                          <IconComp size={12} color={colors.primary} />
                          <Text style={[styles.questCategoryText, { color: colors.primary }]}>
                            {q.category.toUpperCase()} PROTOCOL
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.questTitle,
                            { color: colors.textPrimary },
                            isDone && { textDecorationLine: 'line-through', opacity: 0.6 },
                          ]}
                        >
                          {q.title}
                        </Text>

                        <Text style={[styles.questDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {q.description}
                        </Text>
                      </View>

                      {/* Rewards Column */}
                      <View style={styles.rewardsCol}>
                        <View style={[styles.rewardBadge, { backgroundColor: isDark ? 'rgba(209, 255, 0, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}>
                          <Text style={[styles.rewardBadgeText, { color: colors.primary }]}>+{q.rewardCoins} 🪙</Text>
                        </View>
                        <Text style={[styles.xpRewardText, { color: colors.secondary }]}>+{q.rewardXP} XP</Text>
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                );
              })
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 18,
    gap: 14,
  },
  heroCard: {
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeftCol: {
    gap: 2,
    flex: 1,
  },
  heroSubTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroMainTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  heroRightCol: {
    alignItems: 'flex-end',
  },
  heroPercentText: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  questsList: {
    gap: 10,
  },
  questCard: {
    borderRadius: 18,
  },
  questCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  checkboxBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questContentCol: {
    flex: 1,
    gap: 3,
  },
  questCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questCategoryText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  questDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  rewardsCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  rewardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  xpRewardText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
  },
});
