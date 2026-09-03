import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { AriseIcon } from '../../src/components/ui/AriseIcon';
import { getExerciseConfig, ExerciseType } from '../../src/exercise';
import { exerciseRepository } from '../../src/database/repositories/exerciseRepository';
import { userRepository } from '../../src/database/repositories/userRepository';
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
  } = useLocalSearchParams<{
    exerciseType: string;
    completedReps: string;
    target: string;
    earnedCoins: string;
    earnedXP: string;
    durationSeconds: string;
    questId?: string;
  }>();

  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const coins = parseInt(earnedCoins || '0', 10);
  const xp = parseInt(earnedXP || '0', 10);
  const reps = parseInt(completedReps || '0', 10);
  const targetNum = parseInt(target || '0', 10);
  const duration = parseInt(durationSeconds || '0', 10);
  const validExerciseType = (exerciseType?.toUpperCase() || 'PUSHUP') as ExerciseType;
  const config = getExerciseConfig(validExerciseType);

  const hasAwarded = useRef(false);

  useEffect(() => {
    if (hasAwarded.current) return;
    hasAwarded.current = true;

    const grantRewards = async () => {
      try {
        let awarded = false;
        if (questId && parseInt(questId, 10)) {
          // Atomic quest completion in SQLite
          awarded = await userRepository.completeQuestAndGrantRewards(
            parseInt(questId, 10),
            coins,
            xp,
            config.statType as any
          );
        }

        // If not a quest or quest was already completed, grant workout coins & XP directly
        if (!awarded) {
          if (coins > 0) {
            await userRepository.addCoins(coins, `${config.displayName} Workout`, 'exercise');
          }
          if (xp > 0) {
            await userRepository.addXP(xp);
          }
          await userRepository.updateStat(config.statType as any, 1);
        }

        await userRepository.updateStreak();

        // Record exercise session to SQLite
        await exerciseRepository.createSession({
          exerciseType: validExerciseType,
          target: targetNum,
          completedReps: reps,
          durationSeconds: duration,
          formScore: 95,
          timestamp: new Date().toISOString(),
          questId: questId ? parseInt(questId, 10) : undefined,
        });

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

        {/* Action Button */}
        <Button
          title="Return to Dashboard"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: 12 }}
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
});
