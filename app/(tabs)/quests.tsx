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
  CheckCircle2,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { voiceCoach } from '../../src/services/voiceCoach';
import { colors } from '../../src/theme/colors';

export default function QuestsTab() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [waterCount, setWaterCount] = useState<number>(3);
  const [readMinutes, setReadMinutes] = useState<number>(0);
  const haptics = useHaptics();
  const sound = useSound();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

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
      progress: `${waterCount} / 8 Glasses`,
      type: 'Manual',
      xp: 20,
      coins: 10,
      icon: Droplet,
      action: async () => {
        haptics.medium();
        sound.play('rep_count');
        const next = Math.min(8, waterCount + 1);
        setWaterCount(next);
        if (next === 8) {
          sound.play('quest_complete');
          voiceCoach.speak('Hydration goal completed! Plus 10 Coins.');
          await userRepository.addCoins(10, 'Drink Water Quest', 'QUEST');
          await loadProfile();
        }
      },
    },
    {
      id: 'steps',
      title: '10K Steps',
      progress: '4,280 / 10,000 Steps',
      type: 'Tracked',
      xp: 40,
      coins: 20,
      icon: Footprints,
      action: () => {
        haptics.light();
        voiceCoach.speak('Step tracking active in background.');
      },
    },
    {
      id: 'read',
      title: 'Read for 20 Min',
      progress: `${readMinutes} / 20 Min`,
      type: 'Manual',
      xp: 30,
      coins: 15,
      icon: BookOpen,
      action: () => router.push('/focus/session'),
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
                  activeOpacity={0.8}
                >
                  <MasterCard style={styles.questCard}>
                    <View style={styles.questLeft}>
                      <View style={styles.questIconCircle}>
                        <IconComp size={22} color={colors.primary} />
                      </View>

                      <View style={styles.questMeta}>
                        <Text style={styles.questTitle}>{q.title}</Text>
                        <Text style={styles.questProgress}>{q.progress}</Text>
                      </View>
                    </View>

                    <View style={styles.questRight}>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{q.type}</Text>
                      </View>
                      <View style={styles.rewardsRow}>
                        <Text style={styles.xpText}>{q.xp} XP</Text>
                        <Text style={styles.coinsText}>{q.coins} 🟡</Text>
                      </View>
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
    paddingTop: 4,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pillBtnActive: {
    backgroundColor: colors.primary,
  },
  pillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pillBtnTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  questsList: {
    gap: 12,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  questLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  questIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  questMeta: {
    gap: 4,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  questProgress: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  questRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badgePill: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#282828',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  coinsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentGold,
  },
});
