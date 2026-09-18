import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  CheckSquare,
  CheckCircle,
  Coins,
  Sparkle,
  Lightning,
  Fire,
  Brain,
  Barbell,
  Shield,
  Check,
  Camera,
  Footprints,
  Target,
} from 'phosphor-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { IOSSegmentedControl } from '../../src/components/ios/IOSSegmentedControl';
import { SwipeableTabScreen } from '../../src/components/navigation/SwipeableTabScreen';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { HoloLoader } from '../../src/components/ui/HoloLoader';
import { useLanguageStore } from '../../src/services/i18n';

const CATEGORY_ICONS: Record<string, any> = {
  strength: Barbell,
  fitness: Barbell,
  focus: Brain,
  discipline: Fire,
  health: Shield,
  general: Lightning,
};

export default function QuestsTab() {
  const { colors, isDark } = useTheme();
  const sound = useSound();
  const haptics = useHaptics();
  const t = useLanguageStore((s) => s.t);

  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const profile = usePlayerStore((s) => s.profile);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DAILY' | 'STRENGTH' | 'FOCUS'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const lastFocusLoadRef = useRef<number>(0);

  const reloadQuestsIfStale = () => {
    const now = Date.now();
    if (now - lastFocusLoadRef.current > 10000) {
      lastFocusLoadRef.current = now;
      loadQuests();
    }
  };

  useFocusEffect(
    useCallback(() => {
      reloadQuestsIfStale();
    }, [])
  );

  useEffect(() => {
    loadQuests();
  }, []);

  const handleComplete = async (questId: number) => {
    const q = dailyQuests.find((item) => item.id === questId);
    if (!q || q.completed) return;
    showIOSAlert(
      t('confirmCompletion') || 'CONFIRM COMPLETION',
      `Did you execute "${q.title}"?`,
      [
        { text: t('cancel') || 'CANCEL', style: 'cancel' },
        {
          text: t('confirm') || 'CONFIRM',
          style: 'primary',
          onPress: async () => {
            haptics.heavy();
            sound.play('quest_complete');
            const res = await completeQuest(questId);
            showIOSAlert(t('questComplete') || 'QUEST COMPLETE!', `+${res.coins} Coins, +${res.xp} XP added to your vault.`);
          },
        },
      ]
    );
  };

  const filteredQuests = dailyQuests.filter((q) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'DAILY') return true;
    const cat = (q.category || '').toUpperCase();
    if (activeFilter === 'STRENGTH') return cat === 'STRENGTH' || cat === 'FITNESS';
    if (activeFilter === 'FOCUS') return cat === 'FOCUS';
    return true;
  });

  const completedCount = dailyQuests.filter((q) => q.completed).length;
  const totalCount = dailyQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <SwipeableTabScreen prevTab="/(tabs)" nextTab="/(tabs)/progress" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('dailyQuests')}</Text>
          <View style={[styles.completionBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.1)' }]}>
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
                <Text style={[styles.heroSubTitle, { color: colors.textMuted }]}>{t('todayProgress')}</Text>
                <Text style={[styles.heroMainTitle, { color: colors.textPrimary }]}>
                  {completedCount === dailyQuests.length && dailyQuests.length > 0
                    ? t('allQuestsCompleted')
                    : `${dailyQuests.length - completedCount} ${t('questsRemaining')}`}
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

          {/* Shadow Sprint Trial GPS Banner */}
          <TouchableOpacity
            onPress={() => {
              haptics.heavy();
              router.push('/run' as any);
            }}
            activeOpacity={0.85}
          >
            <GlassCard
              variant="glow"
              style={{
                padding: 16,
                borderColor: '#00D2EE',
                backgroundColor: isDark ? '#080C16' : '#F0F9FF',
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Footprints size={20} color="#00D2EE" weight="fill" />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>
                    SHADOW SPRINT TRIAL
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: 'rgba(0, 210, 238, 0.15)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: 'rgba(0, 210, 238, 0.4)',
                  }}
                >
                  <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#00D2EE', letterSpacing: 0.6 }}>
                    GPS LIVE RUN
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>
                Real-time distance tracking & pace counter. Set your distance goal to earn massive Hunter XP & Coins!
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Target size={14} color="#00D2EE" weight="bold" />
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#00D2EE' }}>
                    0.5k – 10.0k Distance Selector
                  </Text>
                </View>
                <View style={{ backgroundColor: '#00D2EE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#000000', letterSpacing: 0.5 }}>
                    START RUN
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Apple iOS Segmented Control Filter */}
          <View style={{ paddingVertical: 2 }}>
            <IOSSegmentedControl<'ALL' | 'DAILY' | 'STRENGTH' | 'FOCUS'>
              values={['ALL', 'DAILY', 'STRENGTH', 'FOCUS']}
              labels={{
                ALL: t('filterAll'),
                DAILY: t('filterDaily'),
                STRENGTH: t('filterStrength'),
                FOCUS: t('filterFocus'),
              }}
              selectedValue={activeFilter}
              onChange={(val) => setActiveFilter(val)}
            />
          </View>

          {/* Quests List */}
          <View style={styles.questsList}>
            {loading ? (
              <HoloLoader message="CALIBRATING DAILY QUESTS" subMessage="SYNCHRONIZING SYSTEM ARCHIVES..." />
            ) : filteredQuests.length === 0 ? (
              <GlassCard variant="default" style={styles.emptyCard}>
                <Sparkle size={28} color={colors.textMuted} weight="duotone" />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noMissions')}</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {t('noMissionsSub')}
                </Text>
              </GlassCard>
            ) : (
              filteredQuests.map((q) => {
                const isDone = q.completed === true;
                const titleLower = q.title.toLowerCase();
                const cat = (q.category || '').toUpperCase();
                const isRunningQuest =
                  cat === 'RUNNING' ||
                  titleLower.includes('run') ||
                  titleLower.includes('sprint') ||
                  titleLower.includes('jog');

                const isExercise =
                  !isRunningQuest &&
                  (cat === 'STRENGTH' ||
                    cat === 'FITNESS' ||
                    titleLower.includes('push') ||
                    titleLower.includes('squat') ||
                    titleLower.includes('pull') ||
                    titleLower.includes('plank') ||
                    titleLower.includes('jack') ||
                    titleLower.includes('lunge') ||
                    titleLower.includes('crunch'));

                const isFocus = cat === 'FOCUS' || titleLower.includes('focus') || titleLower.includes('study');

                let exerciseType = 'PUSHUP';
                if (titleLower.includes('squat')) exerciseType = 'SQUAT';
                else if (titleLower.includes('pull')) exerciseType = 'PULLUP';
                else if (titleLower.includes('plank')) exerciseType = 'PLANK';
                else if (titleLower.includes('jack')) exerciseType = 'JUMPING_JACK';
                else if (titleLower.includes('lunge')) exerciseType = 'LUNGE';
                else if (titleLower.includes('crunch')) exerciseType = 'CRUNCH';

                const IconComp = isRunningQuest ? Footprints : isExercise ? Barbell : isFocus ? Brain : (CATEGORY_ICONS[q.category] || Lightning);

                const handleCardPress = () => {
                  if (isDone) return;
                  haptics.medium();
                  if (isRunningQuest) {
                    router.push('/run' as any);
                  } else if (isExercise) {
                    router.push({
                      pathname: '/exercise/[type]',
                      params: {
                        type: exerciseType,
                        target: q.target || 20,
                        questId: String(q.id),
                      },
                    } as any);
                  } else if (isFocus) {
                    router.push('/focus/session');
                  } else {
                    handleComplete(q.id);
                  }
                };

                return (
                  <GlassCard key={q.id} variant={isDone ? 'default' : 'elevated'} style={styles.questCard}>
                    <TouchableOpacity
                      onPress={handleCardPress}
                      style={styles.questCardInner}
                      activeOpacity={0.8}
                    >
                      {/* Checkbox button */}
                      <TouchableOpacity
                        onPress={() => {
                          if (isDone) return;
                          if (isExercise || isFocus) {
                            handleCardPress();
                          } else if (q.questType === 'MANUAL' || q.category === 'productivity' || q.category === 'general') {
                            handleComplete(q.id);
                          } else {
                            handleCardPress();
                          }
                        }}
                        style={[
                          styles.checkboxBtn,
                          { borderColor: isDone ? colors.primary : colors.border },
                          isDone && { backgroundColor: colors.primary },
                        ]}
                        activeOpacity={0.7}
                      >
                        {isDone ? (
                          <Check size={13} color="#FFFFFF" weight="bold" />
                        ) : (isExercise || isFocus) ? (
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border }} />
                        ) : null}
                      </TouchableOpacity>

                      {/* Content */}
                      <View style={styles.questContentCol}>
                        <View style={styles.questCategoryRow}>
                          <IconComp size={12} color={colors.primary} weight="duotone" />
                          <Text style={[styles.questCategoryText, { color: colors.primary }]}>
                            {isExercise ? 'AI TRACKED PROTOCOL' : `${q.category.toUpperCase()} PROTOCOL`}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.questTitle,
                            { color: colors.textPrimary },
                            isDone && { textDecorationLine: 'line-through', opacity: 0.6 },
                          ]}
                          numberOfLines={1}
                        >
                          {q.title}
                        </Text>

                        <Text style={[styles.questDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {q.description}
                        </Text>

                        <View style={styles.questFooterRow}>
                          <View style={styles.rewardPill}>
                            <Coins size={12} color={colors.accentGold} weight="fill" />
                            <Text style={[styles.rewardText, { color: colors.textPrimary }]}>+{q.rewardCoins}</Text>
                          </View>

                          <View style={styles.rewardPill}>
                            <Sparkle size={12} color={colors.secondary} weight="fill" />
                            <Text style={[styles.rewardText, { color: colors.textPrimary }]}>+{q.rewardXP} XP</Text>
                          </View>

                          {isExercise && !isDone && (
                            <View style={[styles.aiBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(10, 132, 255, 0.08)', borderWidth: 1, borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(10, 132, 255, 0.2)' }]}>
                              <Camera size={11} color="#0A84FF" weight="bold" />
                              <Text style={[styles.aiBadgeText, { color: '#0A84FF' }]}>AI CAMERA</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                );
              })
            )}
          </View>

          {/* AdMob Non-Intrusive Adaptive Banner */}
          <AriseBannerAd style={{ marginVertical: 8 }} />

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  completionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  heroCard: {
    padding: 18,
    borderRadius: 22,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeftCol: {
    gap: 4,
  },
  heroSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroMainTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroRightCol: {
    alignItems: 'flex-end',
  },
  heroPercentText: {
    fontSize: 24,
    fontWeight: '900',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questsList: {
    gap: 12,
  },
  questCard: {
    borderRadius: 20,
  },
  questCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 14,
  },
  checkboxBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  questContentCol: {
    flex: 1,
    gap: 6,
  },
  questCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  questCategoryText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  questDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  questFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  rewardText: {
    fontSize: 10,
    fontWeight: '800',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
