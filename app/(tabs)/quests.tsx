import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Barbell,
  Brain,
  Footprints,
  Lightning,
  Flame,
  Check,
  ShieldWarning,
  Camera,
  Play,
  Clock,
  Sparkle,
  Target,
} from 'phosphor-react-native';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { APP_3D_ASSETS } from '../../src/constants/assets';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';

const { width } = Dimensions.get('window');

type QuestTabFilter = 'ALL' | 'DAILY' | 'WEEKLY' | 'SPECIAL';

interface RankConfig {
  label: string;
  bg: string;
  color: string;
}

const RANK_CONFIGS: Record<string, RankConfig> = {
  E: { label: 'E-RANK', bg: 'rgba(107, 114, 128, 0.15)', color: '#6B7280' },
  D: { label: 'D-RANK', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  C: { label: 'C-RANK', bg: 'rgba(10, 132, 255, 0.15)', color: '#0A84FF' },
  B: { label: 'B-RANK', bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' },
  A: { label: 'A-RANK', bg: 'rgba(229, 57, 53, 0.15)', color: '#E53935' },
  S: { label: 'S-RANK', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' },
};

export default function QuestsScreen() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();

  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const profile = usePlayerStore((s) => s.profile);

  const [activeTab, setActiveTab] = useState<QuestTabFilter>('ALL');
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState('04:12:30');
  const lastLoadRef = useRef<number>(0);

  useEffect(() => {
    loadQuests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > 10000) {
        lastLoadRef.current = now;
        loadQuests();
      }
    }, [])
  );

  // Countdown timer for Penalty Zone
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diffMs = endOfDay.getTime() - now.getTime();
      if (diffMs <= 0) {
        setPenaltyTimeLeft('00:00:00');
        return;
      }
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setPenaltyTimeLeft(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualComplete = async (questId: number) => {
    const q = dailyQuests.find((item) => item.id === questId);
    if (!q || q.completed) return;
    showIOSAlert('CONFIRM COMPLETION', `Did you execute "${q.title}"?`, [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'CONFIRM',
        style: 'primary',
        onPress: async () => {
          haptics.heavy();
          sound.play('quest_complete');
          const res = await completeQuest(questId);
          showIOSAlert('QUEST COMPLETE!', `+${res.coins} Coins, +${res.xp} XP added to your vault.`);
        },
      },
    ]);
  };

  const filteredQuests = dailyQuests.filter((q) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'DAILY') return q.questType !== 'WEEKLY';
    if (activeTab === 'WEEKLY') return q.questType === 'WEEKLY' || (q.target || 0) >= 30;
    if (activeTab === 'SPECIAL') return q.category === 'special' || (q.rewardCoins || 0) >= 30;
    return true;
  });

  const completedCount = dailyQuests.filter((q) => q.completed).length;
  const totalCount = dailyQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const filterTabs: { key: QuestTabFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'DAILY', label: 'Daily' },
    { key: 'WEEKLY', label: 'Weekly' },
    { key: 'SPECIAL', label: 'Special' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* 1. TOP HEADER (1:1 WITH MOCKUP) */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Quests</Text>
        <TouchableOpacity
          style={styles.systemProtocolsPill}
          onPress={() => {
            haptics.light();
            showIOSAlert('SYSTEM PROTOCOLS', 'Autonomous Daily Quests dynamically generated by ARISE AI. Execute to level up.');
          }}
          activeOpacity={0.8}
        >
          <Lightning size={13} color="#E53935" weight="fill" />
          <Text style={styles.systemProtocolsText}>System Protocols</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. CATEGORY TABS (All / Daily / Weekly / Special) */}
        <View style={styles.tabsRow}>
          {filterTabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  { backgroundColor: isSelected ? '#E53935' : '#F3F4F6', borderColor: isSelected ? '#E53935' : '#E5E7EB' },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isSelected ? '#FFFFFF' : '#6B7280' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. QUESTS LIST (HORIZONTAL 1:1 MATCH) */}
        <View style={styles.questsList}>
          {filteredQuests.map((q, idx) => {
            const isDone = q.completed === true;
            const titleLower = q.title.toLowerCase();
            const cat = (q.category || '').toUpperCase();

            const isExercise =
              cat === 'STRENGTH' ||
              cat === 'FITNESS' ||
              titleLower.includes('push') ||
              titleLower.includes('squat') ||
              titleLower.includes('pull') ||
              titleLower.includes('plank') ||
              titleLower.includes('jack') ||
              titleLower.includes('lunge') ||
              titleLower.includes('crunch');

            const isFocus = cat === 'FOCUS' || titleLower.includes('focus') || titleLower.includes('study') || titleLower.includes('social');

            let exerciseType = 'PUSHUP';
            if (titleLower.includes('squat')) exerciseType = 'SQUAT';
            else if (titleLower.includes('pull')) exerciseType = 'PULLUP';
            else if (titleLower.includes('plank')) exerciseType = 'PLANK';
            else if (titleLower.includes('jack')) exerciseType = 'JUMPING_JACK';

            const rankKey = idx === 0 ? 'D' : idx === 1 ? 'D' : idx === 2 ? 'C' : 'B';
            const rank = RANK_CONFIGS[rankKey];

            const handleQuestAction = () => {
              if (isDone) return;
              haptics.medium();
              if (isExercise) {
                router.push({
                  pathname: '/exercise/[type]',
                  params: {
                    type: exerciseType,
                    target: String(q.target || 25),
                    questId: String(q.id),
                    rewardCoins: String(q.rewardCoins || 20),
                    rewardXP: String(q.rewardXP || 100),
                  },
                } as any);
              } else if (isFocus) {
                router.push('/(tabs)/focus' as any);
              } else {
                handleManualComplete(q.id);
              }
            };

            return (
              <View
                key={q.id}
                style={[
                  styles.horizontalQuestCard,
                  isDone && { opacity: 0.6 },
                ]}
              >
                {/* Left: Exercise Thumbnail Box */}
                <View style={[
                  styles.questThumbBox,
                  { backgroundColor: idx % 2 === 0 ? '#FFF1F2' : idx === 1 ? '#FFF1F2' : idx === 2 ? '#FEF3C7' : '#EFF6FF' }
                ]}>
                  {isExercise ? (
                    <Barbell size={24} color={idx === 2 ? '#D97706' : '#E53935'} weight="fill" />
                  ) : (
                    <Target size={24} color="#0A84FF" weight="fill" />
                  )}
                </View>

                {/* Middle: Title, Subtitle, Rewards */}
                <View style={styles.questMiddleCol}>
                  <Text style={styles.questRowTitle} numberOfLines={1}>
                    {q.title}
                  </Text>
                  <Text style={styles.questRowDesc} numberOfLines={1}>
                    {q.description || (isExercise ? `Do ${q.target || 25} reps` : 'Stay focused')}
                  </Text>
                  <View style={styles.rewardBadgesRow}>
                    <View style={styles.bountyMiniPill}>
                      <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 12, height: 12 }} />
                      <Text style={styles.bountyMiniCoinText}>+{q.rewardCoins || 20}</Text>
                    </View>
                    <View style={styles.bountyMiniPill}>
                      <Text style={styles.bountyMiniXPText}>+{q.rewardXP || 100} XP</Text>
                    </View>
                  </View>
                </View>

                {/* Right: Rank Tag & Red Pill Button */}
                <View style={styles.questRightCol}>
                  <View style={[styles.rankBadgeMini, { backgroundColor: rank.bg }]}>
                    <Text style={[styles.rankBadgeMiniText, { color: rank.color }]}>{rank.label}</Text>
                  </View>

                  {isDone ? (
                    <View style={styles.completedPillMini}>
                      <Check size={12} color="#10B981" weight="bold" />
                      <Text style={styles.completedPillMiniText}>DONE</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.startQuestPillBtn}
                      onPress={handleQuestAction}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startQuestPillBtnText}>START QUEST</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* 4. PENALTY ZONE AT THE BOTTOM (EXACT MOCKUP) */}
        <View style={styles.penaltyBannerBottom}>
          <View style={styles.penaltyHeaderRow}>
            <View style={styles.penaltyTag}>
              <ShieldWarning size={16} color="#FFFFFF" weight="fill" />
              <Text style={styles.penaltyTagText}>PENALTY ZONE</Text>
            </View>
            <Text style={styles.penaltyCountdownText}>Daily reset in {penaltyTimeLeft}</Text>
          </View>
          <Text style={styles.penaltyDesc}>
            Complete your quests to protect your streak!
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  systemProtocolsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  systemProtocolsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E53935',
    letterSpacing: 0.2,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  questsList: {
    gap: 12,
  },
  horizontalQuestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 12,
  },
  questThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questMiddleCol: {
    flex: 1,
    gap: 3,
  },
  questRowTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  questRowDesc: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  rewardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  bountyMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  bountyMiniCoinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  bountyMiniXPText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A84FF',
  },
  questRightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rankBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankBadgeMiniText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  startQuestPillBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  startQuestPillBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  completedPillMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedPillMiniText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#10B981',
  },
  penaltyBannerBottom: {
    backgroundColor: '#E53935',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  penaltyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  penaltyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  penaltyTagText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  penaltyCountdownText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  penaltyDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
});
