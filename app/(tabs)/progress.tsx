import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { XPBarChart } from '../../src/components/master/XPBarChart';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { colors } from '../../src/theme/colors';

export default function ProgressTab() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'history'>('overview');

  useEffect(() => {
    loadProfile();
  }, []);

  const level = profile?.level || 1;
  const currentXP = profile?.currentXP || 0;
  const targetXP = level * 100;
  const xpPercent = Math.min(100, Math.round((currentXP / targetXP) * 100));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Segmented Toggle: [ Overview ] | [ Stats ] | [ History ] */}
          <View style={styles.pillToggle}>
            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'overview' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'overview' && styles.pillBtnTextActive,
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'stats' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('stats')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'stats' && styles.pillBtnTextActive,
                ]}
              >
                Stats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillBtn,
                activeTab === 'history' && styles.pillBtnActive,
              ]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  activeTab === 'history' && styles.pillBtnTextActive,
                ]}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card 1: Level Progress */}
          <MasterCard style={styles.levelProgressCard}>
            <Text style={styles.cardHeaderTitle}>Level Progress</Text>
            <Text style={styles.levelTitleText}>Level {level}</Text>

            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${Math.max(5, xpPercent)}%` }]} />
            </View>
            <Text style={styles.xpFractionText}>{currentXP} / {targetXP} XP</Text>
          </MasterCard>

          {/* Card 2: XP Overview */}
          <MasterCard style={styles.xpOverviewCard}>
            <View style={styles.xpCardHeader}>
              <Text style={styles.cardHeaderTitle}>XP Overview</Text>
              <View style={styles.thisWeekBadge}>
                <Text style={styles.thisWeekText}>This Week</Text>
              </View>
            </View>

            {/* 7-Day Vertical Bar Chart */}
            <XPBarChart />
          </MasterCard>

          {/* Card 3: Quests Completed */}
          <MasterCard style={styles.questsCompletedCard}>
            <View style={styles.questsCompletedMeta}>
              <Text style={styles.cardHeaderTitle}>Quests Completed</Text>
              <Text style={styles.questsBigNum}>7</Text>
              <Text style={styles.questsDeltaText}>+20% from last week</Text>
            </View>

            <View style={styles.questsIconCircle}>
              <TrendingUp size={24} color={colors.primary} strokeWidth={2.5} />
            </View>
          </MasterCard>

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
  levelProgressCard: {
    padding: 18,
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  levelTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  xpBarTrack: {
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
  xpFractionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
  xpOverviewCard: {
    padding: 18,
    gap: 12,
  },
  xpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thisWeekBadge: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  thisWeekText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  questsCompletedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  questsCompletedMeta: {
    gap: 4,
  },
  questsBigNum: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  questsDeltaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  questsIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1E2F22',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
