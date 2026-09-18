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
import { useFocusEffect } from 'expo-router';
import {
  Star,
  Brain,
  Flame,
  Trophy,
  Shield,
  CheckCircle2,
  Lock,
  Award,
  Zap,
  HelpCircle,
  Sparkles,
  Dumbbell,
  Coins,
} from 'lucide-react-native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { XPBar } from '../../src/components/design-system/XPBar';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { achievementService, AchievementItem } from '../../src/services/achievementService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';

export default function RewardsTab() {
  const [activeTab, setActiveTab] = useState<'achievements' | 'badges'>('achievements');
  const [items, setItems] = useState<AchievementItem[]>([]);
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const haptics = useHaptics();

  const loadData = async () => {
    await loadProfile();
    const list = await achievementService.getAchievements();
    setItems(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dumbbell':
        return Dumbbell;
      case 'brain':
        return Brain;
      case 'flame':
        return Flame;
      case 'trophy':
        return Trophy;
      case 'coins':
        return Coins;
      case 'sparkles':
        return Sparkles;
      case 'zap':
        return Zap;
      case 'award':
        return Award;
      default:
        return Star;
    }
  };

  const achievementsList = items.filter((i) => i.category === 'ACHIEVEMENT');
  const badgesList = items.filter((i) => i.category === 'BADGE');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards & Trophies</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() =>
              showIOSAlert(
                'Honors & Badges',
                'Unlock trophies and medals by executing daily physical and cognitive disciplines.',
                [{ text: 'Got It', style: 'primary' }]
              )
            }
            activeOpacity={0.8}
          >
            <HelpCircle size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Tabs Filter: Achievements | Badges */}
          <View style={styles.tabBar}>
            {(['achievements', 'badges'] as const).map((tab) => {
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

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <View style={styles.achievementsList}>
              {achievementsList.map((item) => {
                const IconComp = getIcon(item.icon);
                const progressPct = Math.min(100, Math.round((item.progress / item.target) * 100));

                return (
                  <GlowCard
                    key={item.id}
                    variant={item.unlocked ? 'glow' : 'default'}
                    style={styles.achievementCard}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.iconCircle,
                            item.unlocked && styles.iconCircleCompleted,
                          ]}
                        >
                          <IconComp
                            size={20}
                            color={item.unlocked ? colors.primary : colors.textMuted}
                          />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.achievementTitle}>{item.title}</Text>
                          <Text style={styles.achievementDesc}>{item.description}</Text>
                        </View>
                      </View>

                      {item.unlocked ? (
                        <View style={styles.completedBadge}>
                          <CheckCircle2 size={16} color={colors.primary} />
                          <Text style={styles.completedBadgeText}>UNLOCKED</Text>
                        </View>
                      ) : (
                        <View style={styles.rewardChip}>
                          <Coins size={11} color="#F59E0B" />
                          <Text style={styles.rewardChipText}>+{item.rewardCoins}</Text>
                        </View>
                      )}
                    </View>

                    {/* Progress bar */}
                    {!item.unlocked && (
                      <View style={styles.progressWrap}>
                        <XPBar progress={progressPct} height={6} />
                      </View>
                    )}
                  </GlowCard>
                );
              })}
            </View>
          )}

          {/* Badges Tab */}
          {activeTab === 'badges' && (
            <View style={styles.badgesGrid}>
              {badgesList.map((b) => {
                const IconComp = getIcon(b.icon);
                return (
                  <GlowCard
                    key={b.id}
                    variant={b.unlocked ? 'glow' : 'subtle'}
                    style={styles.badgeCard}
                  >
                    <View
                      style={[
                        styles.badgeIconCircle,
                        b.unlocked && styles.badgeIconCircleUnlocked,
                      ]}
                    >
                      {b.unlocked ? (
                        <IconComp size={28} color={colors.primary} />
                      ) : (
                        <Lock size={24} color={colors.textMuted} />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.badgeName,
                        !b.unlocked && styles.badgeNameLocked,
                      ]}
                    >
                      {b.title}
                    </Text>
                    <Text style={styles.badgeDesc}>{b.description}</Text>

                    <View
                      style={[
                        styles.badgeStatusPill,
                        b.unlocked && styles.badgeStatusPillUnlocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeStatusText,
                          b.unlocked && styles.badgeStatusTextUnlocked,
                        ]}
                      >
                        {b.unlocked ? 'UNLOCKED' : 'LOCKED'}
                      </Text>
                    </View>
                  </GlowCard>
                );
              })}
            </View>
          )}

          <View style={{ height: 60 }} />
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
    gap: 18,
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
    fontSize: 13,
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
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleCompleted: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  achievementDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  rewardChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },
  progressWrap: {
    marginTop: 2,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
  },
  badgeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  badgeIconCircleUnlocked: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: colors.textSecondary,
  },
  badgeDesc: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeStatusPill: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 4,
  },
  badgeStatusPillUnlocked: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
  },
  badgeStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textMuted,
  },
  badgeStatusTextUnlocked: {
    color: colors.primary,
  },
});
