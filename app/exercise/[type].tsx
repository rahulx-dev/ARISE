import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Settings,
  Dumbbell,
  Clock,
  Mic,
  Play,
  Pause,
} from 'lucide-react-native';
import {
  EXERCISE_REGISTRY,
  ExerciseType,
  getExerciseConfig,
  isDurationBased,
  calculateRewards,
} from '../../src/exercise';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { voiceCoach } from '../../src/services/voiceCoach';
import { colors } from '../../src/theme/colors';

export default function ExerciseScreen() {
  const { type, questId } = useLocalSearchParams<{ type: string; questId?: string }>();
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();

  const validExerciseType: ExerciseType = (
    type && type.toUpperCase() in EXERCISE_REGISTRY
      ? type.toUpperCase()
      : 'PUSHUP'
  ) as ExerciseType;

  const config = getExerciseConfig(validExerciseType);
  const isPlank = isDurationBased(validExerciseType);

  const [target, setTarget] = useState<number>(config.defaultTarget || 20);
  const [currentReps, setCurrentReps] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [smartVoiceTracking, setSmartVoiceTracking] = useState<boolean>(true);

  const timerRef = useRef<any>(null);
  const cadenceRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearInterval(cadenceRef.current);
      voiceCoach.stop();
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      if (smartVoiceTracking) {
        voiceCoach.speak(`${config.displayName} session initiated. Target is ${target} reps. Let's do this!`);
      }

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // Automated cadence tracking loop
      cadenceRef.current = setInterval(() => {
        setCurrentReps((prev) => {
          const next = prev + 1;
          haptics.light();
          sound.play('rep_count');
          if (smartVoiceTracking) {
            voiceCoach.speakRep(next);
          }

          if (next === Math.floor(target / 2) && smartVoiceTracking) {
            voiceCoach.speakHalfway(target - next);
          }

          if (next >= target) {
            handleComplete(next);
          }
          return next;
        });
      }, 2400);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearInterval(cadenceRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearInterval(cadenceRef.current);
    };
  }, [isActive, target, smartVoiceTracking]);

  const handleStartWorkout = () => {
    haptics.medium();
    sound.play('quest_start');
    setIsActive(true);
  };

  const handlePauseWorkout = () => {
    haptics.light();
    setIsActive(false);
  };

  const handleComplete = (finalReps: number) => {
    setIsActive(false);
    haptics.heavy();
    sound.play('quest_complete');

    const rewards = calculateRewards(validExerciseType, finalReps, target);
    if (smartVoiceTracking) {
      voiceCoach.speakComplete(config.displayName, rewards.coins);
    }

    router.replace({
      pathname: '/exercise/complete',
      params: {
        exerciseType: validExerciseType,
        completedReps: finalReps.toString(),
        target: target.toString(),
        earnedCoins: rewards.coins.toString(),
        earnedXP: rewards.xp.toString(),
        durationSeconds: elapsedSeconds.toString(),
        questId: questId || '',
      },
    });
  };

  const progressPercent = Math.min(100, Math.round((currentReps / target) * 100));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const size = 250;
  const center = size / 2;
  const radius = size * 0.42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header: ← Exercise Name + Settings */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{config.displayName}</Text>
          <TouchableOpacity style={styles.circleBtn}>
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Reps Ring Gauge */}
          <View style={styles.gaugeContainer}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#1A1A1A"
                strokeWidth={10}
                fill="none"
              />

              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.primary}
                strokeWidth={10}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${center} ${center})`}
              />
            </Svg>

            {/* Center Content */}
            <View style={styles.centerTextGroup}>
              <Text style={styles.repCountBig}>{currentReps}</Text>
              <Text style={styles.repTargetText}>/ {target} {isPlank ? 'SECS' : 'REPS'}</Text>
              <View style={styles.rewardsPill}>
                <Text style={styles.rewardsPillText}>+50 XP</Text>
                <Text style={styles.rewardsPillCoins}>+25 🟡</Text>
              </View>
            </View>
          </View>

          {/* Session Data Card */}
          <MasterCard style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <Clock size={18} color={colors.textSecondary} />
                <Text style={styles.statTitle}>Elapsed Duration</Text>
              </View>
              <Text style={styles.statVal}>{timeFormatted}</Text>
            </View>

            <View style={styles.cardDivider} />

            <TouchableOpacity
              style={styles.statRow}
              onPress={() => setSmartVoiceTracking(!smartVoiceTracking)}
              activeOpacity={0.8}
            >
              <View style={styles.statLeft}>
                <Mic size={18} color={smartVoiceTracking ? colors.primary : colors.textMuted} />
                <Text style={styles.statTitle}>Female Voice Coach</Text>
              </View>
              <Text style={[styles.statVal, { color: smartVoiceTracking ? colors.primary : colors.textMuted }]}>
                {smartVoiceTracking ? 'Active' : 'Muted'}
              </Text>
            </TouchableOpacity>
          </MasterCard>

          {/* Action Button */}
          <MasterButton
            title={isActive ? 'PAUSE PROTOCOL' : 'START CALISTHENICS'}
            onPress={isActive ? handlePauseWorkout : handleStartWorkout}
            variant={isActive ? 'dark' : 'green'}
            style={{ width: '100%', marginTop: 8 }}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  circleBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 16,
    gap: 20,
  },
  gaugeContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextGroup: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  repCountBig: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  repTargetText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: -4,
  },
  rewardsPill: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 4,
  },
  rewardsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  rewardsPillCoins: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentGold,
  },
  statsCard: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#202020',
  },
});
