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
import { useQuestStore } from '../../src/stores/useQuestStore';
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
import { consumeCompletionToken } from '../../src/services/completionGate';
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';
import { Icon3D } from '../../src/components/ui/Icon3D';
import { fontFamilies } from '../../src/theme/typography';

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
    completionToken,
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
    completionToken?: string;
  }>();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [redGateVictory, setRedGateVictory] = useState<{
    coins: number;
    xp: number;
    title: string;
  } | null>(null);

  const [multiplierClaimed, setMultiplierClaimed] = useState(false);

  const parseNonNegativeInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  };
  const coins = parseNonNegativeInt(earnedCoins, 20);
  const xp = parseNonNegativeInt(earnedXP, 100);
  const reps = parseNonNegativeInt(completedReps, 20);
  const targetNum = Math.max(1, parseNonNegativeInt(target, 20));
  const duration = parseNonNegativeInt(durationSeconds, 60);

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
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (hasAwarded.current) return;
    hasAwarded.current = true;

    const grantRewards = async () => {
      try {
        if (!consumeCompletionToken(completionToken)) {
          showIOSAlert('Invalid Completion', 'This completion session is no longer valid.');
          router.replace('/(tabs)');
          return;
        }

        // Unlock focus shield / screen time for 20 minutes
        try {
          appBlockerService.temporaryUnlock?.(20 * 60 * 1000);
        } catch (_: any) {}

        let awarded = false;

        // Emergency Red Gate Victory Check
        if (isRedGate === 'true') {
          const res = await redGateService.claimVictory('exercise');
          if (res.success && mountedRef.current) {
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
        } else {
          // Auto-reconcile with any matching active daily quests!
          const { questService } = await import('../../src/services/questService');
          const reconciled = await questService.reconcileCompletedActivity(
            isFocusCompletion ? 'FOCUS' : validExerciseType,
            reps || targetNum
          );
          if (reconciled.completedCount > 0) {
            awarded = true;
          }
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

        const { streakService } = await import('../../src/services/streakService');
        await streakService.recordWorkoutStreak();

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
        await useQuestStore.getState().loadQuests();
        if (mountedRef.current) {
          sound.play('quest_complete');
          haptics.heavy();
        }
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
        if (mountedRef.current) {
          setMultiplierClaimed(true);
          sound.play('level_up');
          haptics.success();
          showIOSAlert(
            '3X REWARD CLAIMED!',
            `+${bonusCoins} Bonus Gold Coins transferred to your Vault!`,
            [{ text: 'CLAIM REWARD', style: 'primary' }]
          );
        }
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. CELEBRATION 3D TROPHY & TITLE */}
        <View style={styles.celebrationSection}>
          <View style={styles.trophyWrapper}>
            <Icon3D name="trophy_gold" size={88} />
          </View>
          <Text style={styles.victoryTitle}>PROTOCOL CLEARED</Text>
          <Text style={styles.victorySubtitle}>
            {config.displayName.toUpperCase()} COMPLETE
          </Text>
          <View style={styles.completionPill}>
            <Icon3D name="checkmark_green" size={15} />
            <Text style={styles.completionPillText}>
              {reps} / {targetNum} Reps Verified • 95% Form Accuracy
            </Text>
          </View>
        </View>

        {/* 2. RED GATE BANNER (IF ACTIVE) */}
        {redGateVictory && (
          <NeumorphicCard style={styles.redGateBanner} padding={16}>
            <View style={styles.redGateBadge}>
              <Icon3D name="padlock_red" size={18} />
              <Text style={styles.redGateBadgeText}>EMERGENCY GATE CONQUERED</Text>
            </View>
            <Text style={styles.redGateTitle}>{redGateVictory.title}</Text>
            <Text style={styles.redGateDesc}>Rank successfully synced to global leaderboards!</Text>
          </NeumorphicCard>
        )}

        {/* 3. REWARDS CLAIMED CARD */}
        <NeumorphicCard style={styles.rewardsCard} padding={20}>
          <Text style={styles.cardHeaderLabel}>BOUNTY TRANSFERRED</Text>
          <View style={styles.rewardsRow}>
            {/* Coins */}
            <View style={styles.rewardItemBox}>
              <Icon3D name="coin_gold" size={44} />
              <Text style={styles.rewardNumber}>+{multiplierClaimed ? coins * 3 : coins}</Text>
              <Text style={styles.rewardUnit}>Gold Coins</Text>
            </View>

            <View style={styles.dividerLine} />

            {/* XP */}
            <View style={styles.rewardItemBox}>
              <Icon3D name="lightning_gold" size={44} />
              <Text style={[styles.rewardNumber, { color: '#E53935' }]}>+{xp}</Text>
              <Text style={styles.rewardUnit}>Hunter XP</Text>
            </View>
          </View>
        </NeumorphicCard>

        {/* 4. TELEMETRY STATS */}
        <NeumorphicCard style={styles.telemetryCard} padding={18}>
          <Text style={styles.cardHeaderLabel}>SESSION TELEMETRY</Text>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>Duration</Text>
            <Text style={styles.telemetryVal}>
              {Math.floor(duration / 60)}m {duration % 60}s
            </Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>Form Accuracy</Text>
            <Text style={[styles.telemetryVal, { color: '#10B981' }]}>95% Flawless</Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>Discipline Level</Text>
            <Text style={[styles.telemetryVal, { color: '#E53935' }]}>+1 {config.statType.toUpperCase()}</Text>
          </View>
        </NeumorphicCard>

        {/* 5. 3X BOOST BANNER */}
        {!multiplierClaimed && coins > 0 && (
          <TouchableOpacity
            style={styles.boostBanner}
            onPress={handleClaimMultiplier}
            activeOpacity={0.88}
          >
            <View style={styles.boostLeft}>
              <View style={styles.boostIconBox}>
                <Icon3D name="play_amber" size={28} />
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
          style={styles.shareBtn}
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
          activeOpacity={0.85}
        >
          <Share2 size={16} color="#1A1A1A" />
          <Text style={styles.shareBtnText}>Share Protocol Victory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => {
            haptics.light();
            adMobService.showInterstitialAd();
            router.replace('/(tabs)');
          }}
          activeOpacity={0.88}
        >
          <Text style={styles.returnBtnText}>Return to Dashboard</Text>
          <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4EF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 16,
    alignItems: 'center',
  },
  celebrationSection: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trophyWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E4DC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
    marginBottom: 6,
  },
  victoryTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 1.5,
  },
  victorySubtitle: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 1.5,
  },
  completionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    marginTop: 6,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  completionPillText: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
    color: '#1A1A1A',
  },
  redGateBanner: {
    width: '100%',
    backgroundColor: '#FFF5F5',
    borderColor: '#E53935',
    alignItems: 'center',
    gap: 6,
  },
  redGateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  redGateBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 0.8,
  },
  redGateTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  redGateDesc: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
  },
  rewardsCard: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  cardHeaderLabel: {
    fontSize: 10.5,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 1.2,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 4,
  },
  rewardItemBox: {
    alignItems: 'center',
    gap: 6,
  },
  rewardNumber: {
    fontSize: 26,
    fontFamily: fontFamilies.bold,
    color: '#B45309',
  },
  rewardUnit: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
  },
  dividerLine: {
    width: 1,
    height: 48,
    backgroundColor: '#E8E4DC',
  },
  telemetryCard: {
    width: '100%',
    gap: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  telemetryKey: {
    fontSize: 12.5,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
  },
  telemetryVal: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  boostBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    padding: 16,
    gap: 12,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  boostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  boostIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostTitle: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 0.6,
  },
  boostSubtitle: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
  },
  boostTag: {
    backgroundColor: '#E53935',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  boostTagText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  returnBtn: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 22,
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  returnBtnText: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
