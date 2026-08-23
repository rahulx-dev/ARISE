import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Star,
  Brain,
  Flame,
  Trophy,
  Shield,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { colors } from '../../src/theme/colors';

export default function RewardsTab() {
  const [activeTab, setActiveTab] = useState<'achievements' | 'badges'>('achievements');

  const achievements = [
    {
      id: 'first_steps',
      title: 'First Steps',
      desc: 'Complete your first quest',
      icon: Star,
      completed: true,
      progress: '1 / 1',
    },
    {
      id: 'focused_mind',
      title: 'Focused Mind',
      desc: 'Complete 5 focus sessions',
      icon: Brain,
      completed: false,
      progress: '0 / 5',
    },
    {
      id: 'consistency',
      title: 'Consistency',
      desc: 'Maintain a 3-day streak',
      icon: Flame,
      completed: false,
      progress: '0 / 3',
    },
    {
      id: 'rise_above',
      title: 'Rise Above',
      desc: 'Reach Level 5',
      icon: Trophy,
      completed: false,
      progress: '1 / 5',
    },
    {
      id: 'unstoppable',
      title: 'Unstoppable',
      desc: 'Complete 50 quests',
      icon: Shield,
      completed: false,
      progress: '0 / 50',
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Segmented Toggle: [ Achievements ] | [ Badges ] */}
          <View style={styles.pillToggle}>
            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'achievements' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('achievements')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'achievements' && styles.pillBtnTextActive,
                ]}
              >
                Achievements
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'badges' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('badges')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'badges' && styles.pillBtnTextActive,
                ]}
              >
                Badges
              </Text>
            </TouchableOpacity>
          </View>

          {/* Achievements List */}
          <View style={styles.achievementsList}>
            {achievements.map((item) => {
              const IconComp = item.icon;
              return (
                <MasterCard key={item.id} style={styles.itemCard}>
                  <View style={[styles.iconCircle, item.completed && styles.iconCircleActive]}>
                    <IconComp
                      size={20}
                      color={item.completed ? colors.primaryPurple : colors.textMuted}
                    />
                  </View>

                  <View style={styles.itemMeta}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                    {!item.completed && (
                      <Text style={styles.progressText}>{item.progress}</Text>
                    )}
                  </View>

                  <View style={styles.statusWrap}>
                    {item.completed ? (
                      <CheckCircle2 size={20} color={colors.primary} strokeWidth={2.5} />
                    ) : (
                      <Lock size={18} color={colors.textMuted} />
                    )}
                  </View>
                </MasterCard>
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
  achievementsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.12)',
    borderColor: 'rgba(138, 43, 226, 0.35)',
  },
  itemMeta: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
  statusWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
