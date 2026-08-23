import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Dumbbell,
  Clock,
  Droplet,
  Footprints,
  BookOpen,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { colors } from '../../src/theme/colors';

export default function QuestsTab() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const quests = useQuestStore((s) => s.quests);
  const loadQuests = useQuestStore((s) => s.loadQuests);

  useEffect(() => {
    loadQuests();
  }, []);

  const questList = [
    {
      id: 'pushups',
      title: 'Push-ups',
      progress: '0 / 20 Reps',
      type: 'Tracked',
      xp: 50,
      coins: 25,
      icon: Dumbbell,
      action: () =>
        router.push({
          pathname: '/exercise/[type]',
          params: { type: 'PUSHUP' },
        }),
    },
    {
      id: 'focus',
      title: 'Focus Mode',
      progress: '25 / 25 Min',
      type: 'Timer',
      xp: 40,
      coins: 20,
      icon: Clock,
      action: () => router.push('/focus/session'),
    },
    {
      id: 'water',
      title: 'Drink Water',
      progress: '0 / 8 Glasses',
      type: 'Manual',
      xp: 20,
      coins: 10,
      icon: Droplet,
      action: () => {},
    },
    {
      id: 'steps',
      title: '10K Steps',
      progress: '0 / 10000 Steps',
      type: 'Tracked',
      xp: 40,
      coins: 20,
      icon: Footprints,
      action: () => {},
    },
    {
      id: 'read',
      title: 'Read for 20 Min',
      progress: '0 / 20 Min',
      type: 'Manual',
      xp: 30,
      coins: 15,
      icon: BookOpen,
      action: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quests</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Segmented Pill Toggle: [ Daily ] | [ Weekly ] */}
          <View style={styles.pillToggle}>
            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'daily' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('daily')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'daily' && styles.pillBtnTextActive,
                ]}
              >
                Daily
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'weekly' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('weekly')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'weekly' && styles.pillBtnTextActive,
                ]}
              >
                Weekly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quests List */}
          <View style={styles.questsList}>
            {questList.map((q) => {
              const IconComp = q.icon;
              return (
                <TouchableOpacity
                  key={q.id}
                  onPress={q.action}
                  activeOpacity={0.82}
                >
                  <MasterCard style={styles.questCard}>
                    <View style={styles.questIconCircle}>
                      <IconComp size={20} color={colors.primary} />
                    </View>

                    <View style={styles.questMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.questTitle}>{q.title}</Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{q.type}</Text>
                        </View>
                      </View>
                      <Text style={styles.questProgress}>{q.progress}</Text>
                    </View>

                    <View style={styles.rewardsCol}>
                      <Text style={styles.rewardXP}>{q.xp} XP</Text>
                      <Text style={styles.rewardCoins}>{q.coins} 🟡</Text>
                    </View>
                  </MasterCard>
                </TouchableOpacity>
              );
            })}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 16,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  pillBtnActive: {
    backgroundColor: '#1E2F22',
  },
  pillBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  pillBtnTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  questsList: {
    gap: 10,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  questIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questMeta: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  typeBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  questProgress: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rewardsCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rewardXP: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  rewardCoins: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentGold,
  },
});
