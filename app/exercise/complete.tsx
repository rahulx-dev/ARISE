import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share2, Zap, ShieldAlert } from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { redGateService } from '../../src/services/redGateService';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { AriseIcon } from '../../src/components/ui/AriseIcon';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { getExerciseConfig, ExerciseType } from '../../src/exercise';
import { exerciseRepository } from '../../src/database/repositories/exerciseRepository';
import { userRepository } from '../../src/database/repositories/userRepository';
import { adMobService } from '../../src/services/adMobService';
import { appBlockerService } from '../../src/native';
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
    isRedGate,
    source,
  } = useLocalSearchParams<{
    exerciseType: string;
    completedReps: string;
    target: string;
    earnedCoins: string;
    earnedXP: string;
    durationSeconds: string;
    questId?: string;
    isRedGate?: string;
    source?: string;
  }>();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [redGateVictory, setRedGateVictory] = useState<{
    crystals: number;
    xp: number;
    title: string;
  } | null>(null);

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

        // Unlock focus shield / screen time for 20 minutes upon completing trial
        try {
          appBlockerService.temporaryUnlock?.(20 * 60 * 1000);
        } catch (_: any) {}

        // Emergency Red Gate Trial Victory Check
        if (isRedGate === 'true') {
          const res = await redGateService.claimVictory('exercise');
          if (res.success) {
            setRedGateVictory({
              crystals: res.crystalsAwarded,
              xp: res.rewardXP,
              title: res.title,
            });
          }
        }

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

  const [multiplierClaimed, setMultiplierClaimed] = useState(false);

  const handleClaimMultiplier = () => {
    haptics.heavy();
    const bonusCoins = coins * 2; // +2x makes it 3x total
    const shown = adMobService.showRewardedAd(async () => {
      try {
        await userRepository.addCoins(bonusCoins, '3X Workout Ad Multiplier', 'ad');
        await loadProfile();
        setMultiplierClaimed(true);
        sound.play('level_up');
        haptics.success();
        showIOSAlert(
          '3X REWARD CLAIMED!',
          `+${bonusCoins} Bonus Gold Coins transferred to your Vault!`,
          [{ text: 'CLAIM REWARD', style: 'primary' }]
        );
      } catch (err) {
        console.warn('Ad multiplier error:', err);
      }
    });

    if (!shown) {
      showIOSAlert(
        'STREAM BUFFERING',
        'Sponsor stream is preparing. Tap again in 3 seconds!',
        [{ text: 'PROCEED', style: 'primary' }]
      );
      adMobService.preloadRewarded();
    }
  };

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

        {/* Special Red Gate Victory Banner */}
        {redGateVictory && (
          <View style={styles.redGateVictoryBanner}>
            <View style={styles.redGateTagRow}>
              <ShieldAlert size={15} color="#FF1E44" />
              <Text style={styles.redGateTagText}>[ EMERGENCY RED GATE CONQUERED ]</Text>
            </View>
            <Text style={styles.redGateTitleText}>SOVEREIGN MONARCH SLAIN</Text>
            <View style={styles.redGateRewardRow}>
              <View style={styles.redGateRewardPill}>
                <ManaCrystalIcon size={16} color="#00D2EE" secondaryColor="#0284C7" />
                <Text style={styles.redGateRewardVal}>
                  +{redGateVictory.crystals} Crystals (₹{Math.floor(redGateVictory.crystals / 10)})
                </Text>
              </View>
              <View style={[styles.redGateRewardPill, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Zap size={14} color="#F59E0B" />
                <Text style={[styles.redGateRewardVal, { color: '#F59E0B' }]}>+{redGateVictory.xp} XP</Text>
              </View>
            </View>
            <Text style={styles.redGateRankClimbText}>
              Title Unlocked: {redGateVictory.title} • Synced to Cloud Leaderboard!
            </Text>
          </View>
        )}

        {/* Rewards Section */}
        <Card variant="glow" style={styles.rewardsCard}>
          <Text style={styles.rewardsHeader}>BOUNTY CLAIMED</Text>
          <View style={styles.rewardsRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardAmount}>+{multiplierClaimed ? coins * 3 : coins}</Text>
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

        {/* 3X AD MULTIPLIER BUTTON */}
        {!multiplierClaimed && coins > 0 && (
          <TouchableOpacity
            style={styles.multiplierBtn}
            onPress={handleClaimMultiplier}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={styles.multiplierIconBox}>
                <Zap size={22} color="#000000" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.multiplierTitle}>CLAIM 3X COINS BOOST</Text>
                <Text style={styles.multiplierSub}>
                  Watch sponsor video to get +{coins * 2} bonus coins
                </Text>
              </View>
            </View>
            <View style={styles.multiplierBadge}>
              <Text style={styles.multiplierBadgeText}>3X BOOST</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Share Protocol Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={async () => {
            haptics.heavy();
            try {
              const name = profile?.displayName || 'Warrior';
              const lvl = profile?.level || 1;
              const text = `[ARISE PROTOCOL // SESSION CLEARED]\n\n` +
                `Hunter: ${name} (Rank: LVL ${lvl})\n` +
                `Workout: ${reps} ${config.displayName} Reps\n` +
                `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s\n` +
                `Rewards: +${multiplierClaimed ? coins * 3 : coins} Coins • +${xp} XP\n` +
                `Form Accuracy: 95% Flawless\n\n` +
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

        {/* Non-intrusive Sponsor Banner */}
        <AriseBannerAd style={{ marginVertical: 8 }} />

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
  multiplierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161922',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  multiplierIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiplierTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  multiplierSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  multiplierBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  multiplierBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  redGateVictoryBanner: {
    backgroundColor: '#0F0306',
    borderWidth: 1.5,
    borderColor: '#FF1E44',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  redGateTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 30, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF1E44',
  },
  redGateTagText: {
    color: '#FF1E44',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  redGateTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  redGateRewardRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  redGateRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  redGateRewardVal: {
    color: '#00D2EE',
    fontSize: 12,
    fontWeight: '900',
  },
  redGateRankClimbText: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },
});
