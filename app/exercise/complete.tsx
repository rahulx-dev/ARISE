import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share2 } from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { AriseIcon } from '../../src/components/ui/AriseIcon';
import { getExerciseConfig, ExerciseType, EXERCISE_REGISTRY } from '../../src/exercise';
import { exerciseRepository } from '../../src/database/repositories/exerciseRepository';
import { userRepository } from '../../src/database/repositories/userRepository';
import { adMobService } from '../../src/services/adMobService';
import { colors } from '../../src/theme/colors';

export default function QuestCompleteScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();

  const {
    exerciseType,
    completedReps,
    target,
    earnedCoins,
    earnedXP,
    durationSeconds,
    questId,
    alreadyAwarded,
  } = useLocalSearchParams<{
    exerciseType: string;
    completedReps: string;
    target: string;
    earnedCoins: string;
    earnedXP: string;
    durationSeconds: string;
    questId?: string;
    alreadyAwarded?: string;
  }>();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const coins = parseInt(earnedCoins || '0', 10);
  const xp = parseInt(earnedXP || '0', 10);
  const reps = parseInt(completedReps || '0', 10);
  const targetNum = parseInt(target || '0', 10);
  const duration = parseInt(durationSeconds || '0', 10);
  const normalizedType = exerciseType?.toUpperCase() || 'PUSHUP';
  const isTrackedExerciseType = normalizedType in EXERCISE_REGISTRY;
  const validExerciseType = (isTrackedExerciseType ? normalizedType : 'PUSHUP') as ExerciseType;
  const exerciseConfig = getExerciseConfig(validExerciseType);
  const fallbackDisplayName = normalizedType
    .toLowerCase()
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  const config = isTrackedExerciseType
    ? exerciseConfig
    : {
        displayName: fallbackDisplayName,
        statType: normalizedType === 'DEEP_FOCUS' ? 'focus' : 'discipline',
      };

  const hasAwarded = useRef(false);

  useEffect(() => {
    if (hasAwarded.current) return;
    hasAwarded.current = true;

    const grantRewards = async () => {
      try {
        const shouldGrantRewards = alreadyAwarded !== '1';
        let awarded = false;
        if (questId && parseInt(questId, 10)) {
          if (shouldGrantRewards) {
            // Atomic quest completion in SQLite
            awarded = await userRepository.completeQuestAndGrantRewards(
              parseInt(questId, 10),
              coins,
              xp,
              config.statType as any
            );
          }
        }

        // If not a quest or quest was already completed, grant workout coins & XP directly
        if (!awarded && shouldGrantRewards) {
          if (coins > 0) {
            await userRepository.addCoins(coins, `${config.displayName} Workout`, 'exercise');
          }
          if (xp > 0) {
            await userRepository.addXP(xp);
          }
          await userRepository.updateStat(config.statType as any, 1);
        }

        await userRepository.updateStreak();

        // Record tracked exercise sessions to SQLite (non-tracked flows are already persisted elsewhere)
        if (isTrackedExerciseType && alreadyAwarded !== '1') {
          await exerciseRepository.createSession({
            exerciseType: validExerciseType,
            target: targetNum,
            completedReps: reps,
            durationSeconds: duration,
            formScore: 95,
            timestamp: new Date().toISOString(),
            questId: questId ? parseInt(questId, 10) : undefined,
          });
        }

        await loadProfile();

        sound.play('quest_complete');
        haptics.heavy();
      } catch (e) {
        console.warn('Error awarding exercise rewards:', e);
      }
    };

    grantRewards();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Celebration Header */}
        <View style={styles.celebrationContainer}>
          <View style={styles.iconCircle}>
            <AriseIcon name="achievement" size={54} color={colors.accentGold} glowIntensity="strong" />
          </View>
          <Text style={styles.completedTitle}>PROTOCOL ACCOMPLISHED</Text>
          <Text style={styles.exerciseSubtitle}>{config.displayName.toUpperCase()}</Text>
          <Badge
            label={`${reps} / ${targetNum} COMPLETED`}
            color={colors.success}
            size="md"
            variant="filled"
          />
        </View>

        {/* Rewards Section */}
        <Card variant="glow" style={styles.rewardsCard}>
          <Text style={styles.rewardsHeader}>BOUNTY CLAIMED</Text>
          <View style={styles.rewardsRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardAmount}>+{coins}</Text>
              <View style={styles.rewardLabelRow}>
                <AriseIcon name="coin" size={16} color={colors.accentGold} glowIntensity="none" />
                <Text style={styles.rewardUnit}>Coins</Text>
              </View>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardAmount, { color: colors.primaryLight }]}>+{xp}</Text>
              <View style={styles.rewardLabelRow}>
                <AriseIcon name="xp" size={16} color={colors.primaryLight} glowIntensity="none" />
                <Text style={styles.rewardUnit}>XP</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Performance Metrics */}
        <Card variant="elevated" style={styles.metricsCard}>
          <Text style={styles.metricsHeader}>SESSION TELEMETRY</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={styles.metricValue}>
              {Math.floor(duration / 60)}m {duration % 60}s
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Form Accuracy</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>95% (Flawless)</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Attribute Buff</Text>
            <Text style={[styles.metricValue, { color: colors.secondary }]}>
              +1 {config.statType.toUpperCase()}
            </Text>
          </View>
        </Card>

        {/* Share Protocol Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={async () => {
            haptics.heavy();
            try {
              const name = profile?.displayName || 'Warrior';
              const lvl = profile?.level || 1;
              const text = `⚔️ ARISE PROTOCOL // SESSION CLEARED ⚔️\n\n` +
                `👤 Warrior: ${name} (Rank: LVL ${lvl})\n` +
                `🏋️ Workout: ${reps} ${config.displayName} Reps\n` +
                `⏱️ Duration: ${Math.floor(duration / 60)}m ${duration % 60}s\n` +
                `🪙 Rewards: +${coins} Coins • +${xp} XP\n` +
                `🎯 Form Accuracy: 95% Flawless\n\n` +
                `"Every physical rep earns my screen time."\n` +
                `ARISE Protocol.`;
              await Share.share({ message: text });
            } catch (err) {
              console.warn('Share error:', err);
            }
          }}
          activeOpacity={0.85}
        >
          <Share2 size={16} color="#0A84FF" />
          <Text style={styles.shareBtnText}>Share Warrior Protocol</Text>
        </TouchableOpacity>

        {/* Action Button */}
        <Button
          title="Return to Dashboard"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => {
            adMobService.showInterstitialAd();
            router.replace('/(tabs)');
          }}
          style={{ marginTop: 8 }}
        />

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, gap: 16 },
  celebrationContainer: { alignItems: 'center', gap: 8, marginTop: 16 },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentGold,
    marginBottom: 6,
  },
  completedTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1.5 },
  exerciseSubtitle: { fontSize: 13, fontWeight: '800', color: colors.secondary, letterSpacing: 1 },
  rewardsCard: { padding: 20, alignItems: 'center', gap: 12 },
  rewardsHeader: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.2 },
  rewardsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' },
  rewardItem: { alignItems: 'center', gap: 4 },
  rewardAmount: { fontSize: 32, fontWeight: '900', color: colors.accentGold, fontVariant: ['tabular-nums'] },
  rewardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardUnit: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  rewardDivider: { width: 1, height: 40, backgroundColor: colors.surfaceBorder },
  metricsCard: { padding: 16, gap: 10 },
  metricsHeader: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.2 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricLabel: { fontSize: 13, color: colors.textSecondary },
  metricValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
});
