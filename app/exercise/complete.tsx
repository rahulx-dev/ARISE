import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share2, Zap, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { redGateService } from '../../src/services/redGateService';
import { APP_ANIMATIONS, APP_3D_ASSETS } from '../../src/constants/assets';
import { getExerciseConfig, ExerciseType, EXERCISE_REGISTRY } from '../../src/exercise';
import { exerciseRepository } from '../../src/database/repositories/exerciseRepository';
import { userRepository } from '../../src/database/repositories/userRepository';
import { adMobService } from '../../src/services/adMobService';
import { appBlockerService } from '../../src/native';

const { width } = Dimensions.get('window');

export default function QuestCompleteScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

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
    coins: number;
    xp: number;
    title: string;
  } | null>(null);

  const [multiplierClaimed, setMultiplierClaimed] = useState(false);

  const coins = parseInt(earnedCoins || '20', 10);
  const xp = parseInt(earnedXP || '100', 10);
  const reps = parseInt(completedReps || '20', 10);
  const targetNum = parseInt(target || '20', 10);
  const duration = parseInt(durationSeconds || '60', 10);

  const rawType = exerciseType?.toUpperCase() || 'PUSHUP';
  const isFocusCompletion = rawType === 'DEEP_FOCUS' || rawType === 'FOCUS';
  const isGymCompletion = rawType === 'GYM_WORKOUT' || rawType === 'GYM';
  const validExerciseType: ExerciseType =
    !isFocusCompletion && !isGymCompletion && rawType in EXERCISE_REGISTRY
      ? (rawType as ExerciseType)
      : 'PUSHUP';

  const config =
    !isFocusCompletion && !isGymCompletion
      ? getExerciseConfig(validExerciseType)
      : {
          id: isFocusCompletion ? 'focus' : 'gym',
          type: validExerciseType,
          displayName: isFocusCompletion ? 'Deep Focus Sprint' : 'Gym Workout',
          targetReps: targetNum,
          xpPerRep: 5,
          statType: isFocusCompletion ? 'focus' : 'strength',
        };

  const hasAwarded = useRef(false);

  useEffect(() => {
    if (hasAwarded.current) return;
    hasAwarded.current = true;

    const grantRewards = async () => {
      try {
        let awarded = false;

        // Unlock focus shield / screen time for 20 minutes
        try {
          appBlockerService.temporaryUnlock?.(20 * 60 * 1000);
        } catch (_: any) {}

        // Emergency Red Gate Victory Check
        if (isRedGate === 'true') {
          const res = await redGateService.claimVictory('exercise');
          if (res.success) {
            setRedGateVictory({
              coins: res.coinsAwarded,
              xp: res.rewardXP,
              title: res.title,
            });
          }
        }

        if (questId && parseInt(questId, 10)) {
          awarded = await userRepository.completeQuestAndGrantRewards(
            parseInt(questId, 10),
            coins,
            xp,
            config.statType as any
          );
        }

        if (!awarded) {
          if (coins > 0) {
            await userRepository.addCoins(
              coins,
              `${config.displayName} Session`,
              isFocusCompletion ? 'focus' : isGymCompletion ? 'gym_workout' : 'exercise'
            );
          }
          if (xp > 0) {
            await userRepository.addXP(xp);
          }
          await userRepository.updateStat(config.statType as any, 1);
        }

        await userRepository.updateStreak();

        if (!isFocusCompletion && !isGymCompletion) {
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
        console.warn('Error awarding rewards:', e);
      }
    };

    grantRewards();
  }, []);

  const handleClaimMultiplier = () => {
    haptics.heavy();
    const bonusCoins = coins * 2;
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. CELEBRATION LOTTIE & TITLE */}
        <View style={styles.celebrationSection}>
          <LottieView
            source={APP_ANIMATIONS.trophy}
            autoPlay
            loop={false}
            style={styles.trophyLottie}
          />
          <Text style={[styles.victoryTitle, { color: colors.textPrimary }]}>VICTORY!</Text>
          <Text style={[styles.victorySubtitle, { color: colors.primary }]}>
            {config.displayName.toUpperCase()} CLEARED
          </Text>
          <View style={styles.completionPill}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={styles.completionPillText}>
              {reps} / {targetNum} Reps Completed (95% Accuracy)
            </Text>
          </View>
        </View>

        {/* 2. RED GATE BANNER (IF ACTIVE) */}
        {redGateVictory && (
          <View style={styles.redGateBanner}>
            <View style={styles.redGateBadge}>
              <ShieldAlert size={14} color="#FFFFFF" />
              <Text style={styles.redGateBadgeText}>EMERGENCY GATE CONQUERED</Text>
            </View>
            <Text style={styles.redGateTitle}>{redGateVictory.title}</Text>
            <Text style={styles.redGateDesc}>Rank successfully synced to global leaderboards!</Text>
          </View>
        )}

        {/* 3. REWARDS CLAIMED CARD */}
        <View style={[styles.rewardsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderLabel, { color: colors.textSecondary }]}>BOUNTY TRANSFERRED</Text>
          <View style={styles.rewardsRow}>
            {/* Coins */}
            <View style={styles.rewardItemBox}>
              <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 44, height: 44 }} />
              <Text style={styles.rewardNumber}>+{multiplierClaimed ? coins * 3 : coins}</Text>
              <Text style={[styles.rewardUnit, { color: colors.textSecondary }]}>Gold Coins</Text>
            </View>

            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            {/* XP */}
            <View style={styles.rewardItemBox}>
              <View style={styles.xpCircleBox}>
                <Zap size={24} color="#0A84FF" />
              </View>
              <Text style={[styles.rewardNumber, { color: '#0A84FF' }]}>+{xp}</Text>
              <Text style={[styles.rewardUnit, { color: colors.textSecondary }]}>Hunter XP</Text>
            </View>
          </View>
        </View>

        {/* 4. TELEMETRY STATS */}
        <View style={[styles.telemetryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderLabel, { color: colors.textSecondary }]}>SESSION TELEMETRY</Text>
          <View style={styles.telemetryRow}>
            <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
              {Math.floor(duration / 60)}m {duration % 60}s
            </Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>Form Accuracy</Text>
            <Text style={[styles.telemetryVal, { color: '#10B981' }]}>95% Flawless</Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>Discipline Level</Text>
            <Text style={[styles.telemetryVal, { color: colors.primary }]}>+1 {config.statType.toUpperCase()}</Text>
          </View>
        </View>

        {/* 5. 3X BOOST BANNER */}
        {!multiplierClaimed && coins > 0 && (
          <TouchableOpacity
            style={styles.boostBanner}
            onPress={handleClaimMultiplier}
            activeOpacity={0.85}
          >
            <View style={styles.boostLeft}>
              <View style={styles.boostIconBox}>
                <Zap size={22} color="#FFFFFF" />
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.boostTitle}>CLAIM 3X COINS MULTIPLIER</Text>
                <Text style={styles.boostSubtitle}>Watch a quick video to unlock +{coins * 2} extra coins!</Text>
              </View>
            </View>
            <View style={styles.boostTag}>
              <Text style={styles.boostTagText}>3X BOOST</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 6. SHARE & RETURN BUTTONS */}
        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={async () => {
            haptics.heavy();
            try {
              const name = profile?.displayName || 'Hunter';
              const lvl = profile?.level || 1;
              const text = `[ARISE PROTOCOL // SESSION CLEARED]\n\n` +
                `Hunter: ${name} (Rank: LVL ${lvl})\n` +
                `Workout: ${reps} ${config.displayName} Reps\n` +
                `Rewards: +${multiplierClaimed ? coins * 3 : coins} Coins • +${xp} XP\n` +
                `ARISE Protocol.`;
              await Share.share({ message: text });
            } catch (err) {}
          }}
          activeOpacity={0.8}
        >
          <Share2 size={16} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.textPrimary }]}>Share Protocol Victory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.returnBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            haptics.light();
            adMobService.showInterstitialAd();
            router.replace('/(tabs)');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.returnBtnText}>Return to Dashboard</Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  celebrationSection: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  trophyLottie: {
    width: 150,
    height: 150,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  victorySubtitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  completionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginTop: 4,
  },
  completionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  redGateBanner: {
    width: '100%',
    backgroundColor: '#E53935',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  redGateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  redGateBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  redGateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  redGateDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  rewardsCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  rewardItemBox: {
    alignItems: 'center',
    gap: 6,
  },
  rewardNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F59E0B',
  },
  rewardUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  dividerLine: {
    width: 1,
    height: 50,
  },
  xpCircleBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryCard: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  telemetryKey: {
    fontSize: 13,
    fontWeight: '600',
  },
  telemetryVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  boostBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F59E0B',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  boostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  boostIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  boostSubtitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.75)',
  },
  boostTag: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boostTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  returnBtn: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  returnBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
