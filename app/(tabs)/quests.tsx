import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Dumbbell,
  Clock,
  Droplet,
  Footprints,
  BookOpen,
  CheckCircle2,
  Gift,
  HelpCircle,
  Sparkles,
  Award,
  Flame,
  Activity,
} from 'lucide-react-native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { XPBar } from '../../src/components/design-system/XPBar';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { achievementService, AchievementItem } from '../../src/services/achievementService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { voiceCoach } from '../../src/services/voiceCoach';
import { colors } from '../../src/theme/colors';

export default function QuestsTab() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievement'>('daily');
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const haptics = useHaptics();
  const sound = useSound();
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const weeklyQuests = useQuestStore((s) => s.weeklyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const loadData = async () => {
    await loadQuests();
    await loadProfile();
    const ach = await achievementService.getAchievements();
    setAchievements(ach);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const completedDailyCount = dailyQuests.filter((q) => q.completed).length;
  const totalDailyCount = dailyQuests.length || 1;
  const dailyProgressPercent = Math.round((completedDailyCount / totalDailyCount) * 100);

  const handleQuestAction = async (q: any) => {
    if (q.completed) {
      haptics.light();
      Alert.alert('Quest Accomplished', `You already completed "${q.title}" and claimed your reward!`);
      return;
    }

    if (q.exerciseType || q.category === 'FITNESS') {
      haptics.medium();
      router.push({
        pathname: '/exercise/[type]',
        params: {
          type: q.exerciseType || 'PUSHUP',
          questId: q.id.toString(),
          target: (q.target || 20).toString(),
        },
      });
      return;
    }

    if (q.category === 'FOCUS') {
      haptics.medium();
      router.push('/focus/session');
      return;
    }

    // Manual completion
    haptics.success();
    sound.play('quest_complete');
    try {
      voiceCoach.speak(`Quest completed: ${q.title}! Reward claimed.`);
      await completeQuest(q.id);
      await loadData();
    } catch (e) {
      console.warn('Error completing quest:', e);
    }
  };

  const getQuestIcon = (category: string, exType?: string | null) => {
    if (exType === 'PUSHUP' || category === 'FITNESS') return Dumbbell;
    if (category === 'FOCUS') return Clock;
    if (category === 'HYDRATION') return Droplet;
    if (category === 'STEPS') return Footprints;
    return BookOpen;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Title & Help */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quests</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() =>
              Alert.alert(
                'Quests Protocol',
                'Complete daily physical exercise and focus sprints to unlock screen-time tokens and level up your discipline.'
              )
            }
            activeOpacity={0.8}
          >
            <HelpCircle size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Tabs Pill Switch: Daily | Weekly | Achievement */}
          <View style={styles.tabBar}>
            {(['daily', 'weekly', 'achievement'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => {
                    haptics.light();
                    setActiveTab(tab);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Daily Progress Hero Card */}
          {activeTab === 'daily' && (
            <GlowCard variant="default" style={styles.dailyProgressCard}>
              <View style={styles.progressCardLeft}>
                <Text style={styles.progressCardTitle}>Daily Progress</Text>
                <Text style={styles.progressCardSubtitle}>
                  {completedDailyCount}/{totalDailyCount} completed
                </Text>

                <View style={{ marginTop: 12 }}>
                  <XPBar progress={dailyProgressPercent} height={10} color={colors.primary} />
                </View>
              </View>

              <View style={styles.giftIconWrap}>
                <Gift size={36} color={colors.primary} />
              </View>
            </GlowCard>
          )}

          {/* Daily Quests List */}
          {activeTab === 'daily' && (
            <View style={styles.questList}>
              {dailyQuests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No daily quests available for today.</Text>
                </View>
              ) : (
                dailyQuests.map((q) => {
                  const IconComp = getQuestIcon(q.category, q.exerciseType);
                  const isDone = q.completed;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      onPress={() => handleQuestAction(q)}
                      activeOpacity={0.8}
                    >
                      <GlowCard
                        variant={isDone ? 'subtle' : 'default'}
                        style={styles.questCard}
                      >
                        <View style={styles.questCardLeft}>
                          <View
                            style={[
                              styles.questIconCircle,
                              isDone && styles.questIconCircleDone,
                            ]}
                          >
                            <IconComp
                              size={20}
                              color={isDone ? colors.primary : '#FFFFFF'}
                            />
                          </View>

                          <View style={{ flex: 1, gap: 3 }}>
                            <Text
                              style={[
                                styles.questTitle,
                                isDone && styles.questTitleDone,
                              ]}
                            >
                              {q.title}
                            </Text>
                            <Text style={styles.questMeta}>
                              {isDone ? 'Completed' : `${q.target} Target`}
                            </Text>
                          </View>
                        </View>

                        {/* Reward Badge */}
                        {isDone ? (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>+{q.rewardCoins}</Text>
                            <CheckCircle2 size={16} color={colors.primary} />
                          </View>
                        ) : (
                          <View style={styles.rewardChip}>
                            <Text style={styles.rewardChipText}>+{q.rewardCoins}</Text>
                            <View style={styles.rewardChipCoin} />
                          </View>
                        )}
                      </GlowCard>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* Weekly Quests List */}
          {activeTab === 'weekly' && (
            <View style={styles.questList}>
              {weeklyQuests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No weekly challenges active.</Text>
                </View>
              ) : (
                weeklyQuests.map((q) => {
                  const IconComp = getQuestIcon(q.category, q.exerciseType);
                  const isDone = q.completed;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      onPress={() => handleQuestAction(q)}
                      activeOpacity={0.8}
                    >
                      <GlowCard
                        variant={isDone ? 'subtle' : 'default'}
                        style={styles.questCard}
                      >
                        <View style={styles.questCardLeft}>
                          <View style={styles.questIconCircle}>
                            <IconComp size={20} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={[styles.questTitle, isDone && styles.questTitleDone]}>
                              {q.title}
                            </Text>
                            <Text style={styles.questMeta}>
                              {isDone ? 'Completed' : `${q.target} Weekly Target`}
                            </Text>
                          </View>
                        </View>

                        {isDone ? (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>+{q.rewardCoins}</Text>
                            <CheckCircle2 size={16} color={colors.primary} />
                          </View>
                        ) : (
                          <View style={styles.rewardChip}>
                            <Text style={styles.rewardChipText}>+{q.rewardCoins}</Text>
                            <View style={styles.rewardChipCoin} />
                          </View>
                        )}
                      </GlowCard>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* Achievement Quests List */}
          {activeTab === 'achievement' && (
            <View style={styles.questList}>
              {achievements
                .filter((a) => a.category === 'ACHIEVEMENT')
                .map((a) => (
                  <GlowCard
                    key={a.id}
                    variant={a.unlocked ? 'glow' : 'default'}
                    style={styles.questCard}
                  >
                    <View style={styles.questCardLeft}>
                      <View
                        style={[
                          styles.questIconCircle,
                          a.unlocked && styles.questIconCircleDone,
                        ]}
                      >
                        <Award
                          size={20}
                          color={a.unlocked ? colors.primary : '#888888'}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.questTitle}>{a.title}</Text>
                        <Text style={styles.questMeta}>
                          {a.unlocked
                            ? 'Milestone Unlocked ✓'
                            : `${a.progress}/${a.target} Progress`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rewardChip}>
                      <Text style={styles.rewardChipText}>+{a.rewardCoins}</Text>
                      <View style={styles.rewardChipCoin} />
                    </View>
                  </GlowCard>
                ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
    paddingBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabBtnActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -5,
    height: 2,
    width: '60%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  dailyProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 22,
  },
  progressCardLeft: {
    flex: 1,
    marginRight: 16,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  progressCardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  giftIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questList: {
    gap: 12,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  questCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  questIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questIconCircleDone: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  questTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  questMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#262626',
  },
  rewardChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  rewardChipCoin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.3)',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
