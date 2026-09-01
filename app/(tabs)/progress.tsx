import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Dumbbell,
  Clock,
  Coins,
  Trophy,
  Play,
  Calendar,
  Flame,
  Brain,
  Shield,
  BookOpen,
  Sparkles,
  Sliders,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
} from 'lucide-react-native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { useGymStore } from '../../src/stores/useGymStore';
import { historyService, HistoryEntry } from '../../src/services/historyService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function GymAndTelemetryScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<'gym' | 'telemetry' | 'history'>('gym');
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const loadQuests = useQuestStore((s) => s.loadQuests);

  const preferences = useGymStore((s) => s.preferences);
  const activePlan = useGymStore((s) => s.activePlan);
  const todayWorkout = useGymStore((s) => s.todayWorkout);
  const personalRecords = useGymStore((s) => s.personalRecords);
  const workoutHistory = useGymStore((s) => s.workoutHistory);
  const loadGymData = useGymStore((s) => s.loadGymData);
  const savePreferences = useGymStore((s) => s.savePreferences);

  // Preference form state
  const [prefGoal, setPrefGoal] = useState<any>('strength');
  const [prefExp, setPrefExp] = useState<any>('beginner');
  const [prefEquip, setPrefEquip] = useState<any>('full_gym');
  const [prefDays, setPrefDays] = useState<number>(4);
  const [prefDuration, setPrefDuration] = useState<number>(45);

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  const loadAll = async () => {
    try {
      await loadProfile();
      await loadQuests();
      await loadGymData();
      const hist = await historyService.getActivityHistory(30);
      setHistoryEntries(hist);
    } catch (e) {
      console.warn('Error loading gym tab data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (preferences) {
      setPrefGoal(preferences.goal);
      setPrefExp(preferences.experience);
      setPrefEquip(preferences.equipment);
      setPrefDays(preferences.daysPerWeek);
      setPrefDuration(preferences.workoutDurationMinutes);
    }
  }, [preferences]);

  const handleSavePreferences = async () => {
    haptics.heavy();
    await savePreferences({
      goal: prefGoal,
      experience: prefExp,
      equipment: prefEquip,
      daysPerWeek: prefDays,
      workoutDurationMinutes: prefDuration,
    });
    setIsPrefModalOpen(false);
  };

  const handleStartWorkout = () => {
    haptics.heavy();
    router.push('/gym/session' as any);
  };

  const todayDayOfWeek = new Date().getDay();
  const strength = profile?.strength || 0;
  const discipline = profile?.discipline || 0;
  const focusAttr = profile?.focus || 0;
  const health = profile?.health || 0;
  const knowledge = profile?.knowledge || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>GYM & PROTOCOL</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Physical power, muscle hypertrophy & training logs
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.configIconBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              setIsPrefModalOpen(true);
            }}
          >
            <Sliders size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab Filters */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(['gym', 'telemetry', 'history'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => {
                  haptics.light();
                  setActiveTab(tab);
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? colors.primary : colors.textMuted },
                    isActive && { fontWeight: '900' },
                  ]}
                >
                  {tab === 'gym' ? 'WORKOUT PROTOCOL' : tab === 'telemetry' ? 'ATTRIBUTES' : 'LOGS'}
                </Text>
                {isActive && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ================= 1. GYM PROTOCOL TAB ================= */}
          {activeTab === 'gym' && (
            <View style={{ gap: 16 }}>
              {/* Today's Workout Hero Card */}
              <GlowCard variant="glow" style={styles.todayHeroCard}>
                <View style={styles.heroTopBadgeRow}>
                  <View style={styles.todayBadge}>
                    <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.todayBadgeText, { color: colors.primary }]}>TODAY'S MISSION</Text>
                  </View>
                  <Text style={[styles.heroPlanTitle, { color: colors.textSecondary }]}>
                    {activePlan?.splitType.toUpperCase() || 'PPL'} PROTOCOL
                  </Text>
                </View>

                <Text style={[styles.todayWorkoutName, { color: colors.textPrimary }]}>
                  {todayWorkout?.dayName || 'Rest & Restoration'}
                </Text>

                {todayWorkout?.isRestDay ? (
                  <View style={styles.restDayInfoBox}>
                    <Sparkles size={20} color={colors.secondary} />
                    <Text style={[styles.restDayText, { color: colors.textSecondary }]}>
                      Scheduled active recovery day. Focus on hydration, mobility, and recovery.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.targetMusclesText, { color: colors.secondary }]}>
                      Focus: {todayWorkout?.targetMuscleGroups.join(' • ') || 'Full Body'}
                    </Text>

                    {/* Quick Exercise Preview */}
                    <View style={styles.exercisesPreviewList}>
                      {todayWorkout?.exercises.slice(0, 4).map((ex, idx) => (
                        <View key={ex.id} style={styles.exPreviewRow}>
                          <Text style={[styles.exPreviewNum, { color: colors.textMuted }]}>0{idx + 1}</Text>
                          <Text style={[styles.exPreviewName, { color: colors.textPrimary }]}>{ex.exerciseName}</Text>
                          <Text style={[styles.exPreviewSets, { color: colors.primary }]}>
                            {ex.targetSets} × {ex.targetReps}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <GlowButton
                      title="START WORKOUT SESSION"
                      onPress={handleStartWorkout}
                      variant="primary"
                      size="lg"
                      icon={<Play size={18} color="#000" />}
                      style={{ marginTop: 6 }}
                    />
                  </>
                )}
              </GlowCard>

              {/* Weekly Split Capsule Timeline */}
              <View style={styles.weeklyTimelineSection}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>7-DAY PROTOCOL SCHEDULE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleRow}>
                  {activePlan?.days.map((d) => {
                    const isToday = d.dayOfWeek === todayDayOfWeek;
                    const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

                    return (
                      <View
                        key={d.id}
                        style={[
                          styles.dayCapsule,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isToday && { borderColor: colors.primary, backgroundColor: 'rgba(209, 255, 0, 0.1)' },
                        ]}
                      >
                        <Text style={[styles.dayCapsuleDay, { color: isToday ? colors.primary : colors.textMuted }]}>
                          {daysMap[d.dayOfWeek]}
                        </Text>
                        <Text style={[styles.dayCapsuleTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {d.isRestDay ? 'Rest' : d.dayName.split(' ')[0]}
                        </Text>
                        <View
                          style={[
                            styles.dayCapsuleIndicator,
                            { backgroundColor: d.isRestDay ? colors.textMuted : colors.primary },
                          ]}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Personal Records Showcase */}
              <View style={styles.prSection}>
                <View style={styles.prHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PERSONAL RECORDS (PRs)</Text>
                  <Trophy size={16} color={colors.accentGold} />
                </View>

                {personalRecords.length === 0 ? (
                  <GlowCard variant="default" style={styles.emptyPrCard}>
                    <Trophy size={28} color={colors.textMuted} />
                    <Text style={[styles.emptyPrTitle, { color: colors.textPrimary }]}>No Records Logged Yet</Text>
                    <Text style={[styles.emptyPrSub, { color: colors.textSecondary }]}>
                      Log sets with heavy weights to automatically establish your personal records.
                    </Text>
                  </GlowCard>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {personalRecords.map((pr) => (
                      <GlowCard key={pr.id} variant="default" style={styles.prCard}>
                        <View style={styles.prCardTop}>
                          <Trophy size={16} color={colors.accentGold} />
                          <Text style={[styles.prRecordVal, { color: colors.primary }]}>{pr.weightKg} KG</Text>
                        </View>
                        <Text style={[styles.prExName, { color: colors.textPrimary }]}>{pr.exerciseName}</Text>
                        <Text style={[styles.prDate, { color: colors.textMuted }]}>
                          {new Date(pr.achievedAt).toLocaleDateString()}
                        </Text>
                      </GlowCard>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Workout History */}
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  WORKOUT SESSIONS LOG ({workoutHistory.length})
                </Text>

                {workoutHistory.length === 0 ? (
                  <GlowCard variant="default" style={styles.emptyHistoryCard}>
                    <Dumbbell size={28} color={colors.textMuted} />
                    <Text style={[styles.emptyHistoryTitle, { color: colors.textPrimary }]}>
                      No Workouts Completed Yet
                    </Text>
                    <Text style={[styles.emptyHistorySub, { color: colors.textSecondary }]}>
                      Complete your first workout session to earn Coins, XP, and record your lifting volume.
                    </Text>
                  </GlowCard>
                ) : (
                  workoutHistory.map((s) => (
                    <GlowCard key={s.id} variant="default" style={styles.sessionHistoryCard}>
                      <View style={[styles.sessionIconCircle, { backgroundColor: colors.surfaceLight }]}>
                        <Dumbbell size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.sessionHistoryTitle, { color: colors.textPrimary }]}>{s.title}</Text>
                        <Text style={[styles.sessionHistoryMeta, { color: colors.textSecondary }]}>
                          {Math.round(s.durationSeconds / 60)} mins • {s.totalSets} sets • {Math.round(s.totalVolumeKg)}kg volume
                        </Text>
                        <Text style={[styles.sessionHistoryDate, { color: colors.textMuted }]}>
                          {new Date(s.startTime).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[styles.rewardPill, { backgroundColor: 'rgba(209, 255, 0, 0.15)' }]}>
                        <Text style={[styles.rewardPillText, { color: colors.primary }]}>+{s.rewardCoins} 🪙</Text>
                      </View>
                    </GlowCard>
                  ))
                )}
              </View>
            </View>
          )}

          {/* ================= 2. ATTRIBUTES TELEMETRY TAB ================= */}
          {activeTab === 'telemetry' && (
            <View style={{ gap: 14 }}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WARRIOR ATTRIBUTES MATRIX</Text>

              {[
                { name: 'Strength', desc: 'Workout volume, max load & calisthenics', lv: strength, icon: Dumbbell, color: colors.danger },
                { name: 'Discipline', desc: 'Daily quests, habits & consecutive streaks', lv: discipline, icon: Flame, color: colors.primary },
                { name: 'Focus', desc: 'Deep concentration sprints & app locking', lv: focusAttr, icon: Brain, color: colors.secondary },
                { name: 'Health', desc: 'Recovery, mobility & physical vitality', lv: health, icon: Shield, color: colors.danger },
                { name: 'Knowledge', desc: 'Mindful execution & technical discipline', lv: knowledge, icon: BookOpen, color: colors.accentGold },
              ].map((attr) => {
                const IconC = attr.icon;
                return (
                  <GlowCard key={attr.name} variant="default" style={styles.attrCard}>
                    <View style={[styles.attrIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                      <IconC size={20} color={attr.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.attrName, { color: colors.textPrimary }]}>{attr.name}</Text>
                      <Text style={[styles.attrDesc, { color: colors.textSecondary }]}>{attr.desc}</Text>
                    </View>
                    <Text style={[styles.attrLv, { color: attr.color }]}>Lv. {attr.lv}</Text>
                  </GlowCard>
                );
              })}
            </View>
          )}

          {/* ================= 3. LOGS TIMELINE TAB ================= */}
          {activeTab === 'history' && (
            <View style={{ gap: 12 }}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACTIVITY FEED</Text>

              {historyEntries.length === 0 ? (
                <GlowCard variant="default" style={styles.emptyHistoryCard}>
                  <Sparkles size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyHistoryTitle, { color: colors.textPrimary }]}>No Activity Logged</Text>
                  <Text style={[styles.emptyHistorySub, { color: colors.textSecondary }]}>
                    All workouts, focus sprints, and coin transactions will appear here chronologically.
                  </Text>
                </GlowCard>
              ) : (
                historyEntries.map((entry) => (
                  <GlowCard key={entry.id} variant="default" style={styles.sessionHistoryCard}>
                    <View style={[styles.sessionIconCircle, { backgroundColor: colors.surfaceLight }]}>
                      <Coins size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sessionHistoryTitle, { color: colors.textPrimary }]}>{entry.title}</Text>
                      <Text style={[styles.sessionHistoryMeta, { color: colors.textSecondary }]}>{entry.subtitle}</Text>
                    </View>
                    {entry.rewardCoins ? (
                      <View style={[styles.rewardPill, { backgroundColor: 'rgba(209, 255, 0, 0.1)' }]}>
                        <Text style={[styles.rewardPillText, { color: colors.primary }]}>
                          {entry.rewardCoins > 0 ? `+${entry.rewardCoins}` : `${entry.rewardCoins}`} 🪙
                        </Text>
                      </View>
                    ) : null}
                  </GlowCard>
                ))
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Workout Plan Preferences Modal */}
        <Modal visible={isPrefModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.prefModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.prefModalTitle, { color: colors.textPrimary }]}>CONFIG WORKOUT PROTOCOL</Text>

              {/* Goal */}
              <View style={styles.prefGroup}>
                <Text style={[styles.prefLabel, { color: colors.textMuted }]}>PRIMARY FITNESS GOAL</Text>
                <View style={styles.prefOptionsRow}>
                  {['strength', 'muscle_gain', 'fat_loss', 'general_fitness'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setPrefGoal(g)}
                      style={[
                        styles.prefOptionPill,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        prefGoal === g && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.prefOptionText,
                          { color: colors.textSecondary },
                          prefGoal === g && { color: '#000', fontWeight: '900' },
                        ]}
                      >
                        {g.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Equipment */}
              <View style={styles.prefGroup}>
                <Text style={[styles.prefLabel, { color: colors.textMuted }]}>EQUIPMENT AVAILABLE</Text>
                <View style={styles.prefOptionsRow}>
                  {['full_gym', 'dumbbells', 'home', 'bodyweight'].map((eq) => (
                    <TouchableOpacity
                      key={eq}
                      onPress={() => setPrefEquip(eq)}
                      style={[
                        styles.prefOptionPill,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        prefEquip === eq && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.prefOptionText,
                          { color: colors.textSecondary },
                          prefEquip === eq && { color: '#000', fontWeight: '900' },
                        ]}
                      >
                        {eq.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Days / Week */}
              <View style={styles.prefGroup}>
                <Text style={[styles.prefLabel, { color: colors.textMuted }]}>DAYS PER WEEK</Text>
                <View style={styles.prefOptionsRow}>
                  {[3, 4, 5, 6].map((days) => (
                    <TouchableOpacity
                      key={days}
                      onPress={() => setPrefDays(days)}
                      style={[
                        styles.prefOptionPill,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        prefDays === days && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.prefOptionText,
                          { color: colors.textSecondary },
                          prefDays === days && { color: '#000', fontWeight: '900' },
                        ]}
                      >
                        {days} DAYS
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActionsRow}>
                <GlowButton
                  title="CANCEL"
                  onPress={() => setIsPrefModalOpen(false)}
                  variant="outline"
                  size="md"
                  style={{ flex: 1 }}
                />
                <GlowButton
                  title="GENERATE PLAN"
                  onPress={handleSavePreferences}
                  variant="primary"
                  size="md"
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  configIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabBtnActive: {},
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '80%',
    borderRadius: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  todayHeroCard: {
    padding: 20,
    gap: 12,
    borderRadius: 22,
  },
  heroTopBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroPlanTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  todayWorkoutName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  targetMusclesText: {
    fontSize: 12,
    fontWeight: '800',
  },
  exercisesPreviewList: {
    gap: 6,
    paddingVertical: 4,
  },
  exPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exPreviewNum: {
    fontSize: 10,
    fontWeight: '800',
  },
  exPreviewName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  exPreviewSets: {
    fontSize: 11,
    fontWeight: '900',
  },
  restDayInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  restDayText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  weeklyTimelineSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scheduleRow: {
    gap: 8,
    paddingVertical: 4,
  },
  dayCapsule: {
    width: 72,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayCapsuleDay: {
    fontSize: 10,
    fontWeight: '900',
  },
  dayCapsuleTitle: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    height: 28,
  },
  dayCapsuleIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  prSection: {
    gap: 8,
  },
  prHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prCard: {
    width: 140,
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  prCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prRecordVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  prExName: {
    fontSize: 12,
    fontWeight: '800',
  },
  prDate: {
    fontSize: 9,
    fontWeight: '700',
  },
  emptyPrCard: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
  },
  emptyPrTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyPrSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  emptyHistoryCard: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyHistorySub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  sessionHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  sessionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionHistoryTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  sessionHistoryMeta: {
    fontSize: 11,
  },
  sessionHistoryDate: {
    fontSize: 9,
  },
  rewardPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  attrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 14,
  },
  attrIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attrName: {
    fontSize: 14,
    fontWeight: '900',
  },
  attrDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  attrLv: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  prefModalCard: {
    width: '100%',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    gap: 16,
  },
  prefModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  prefGroup: {
    gap: 8,
  },
  prefLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  prefOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  prefOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
