import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldAlert,
  Dumbbell,
  Zap,
} from 'lucide-react-native';
import { SerqBackdrop } from '../../src/components/serq/SerqBackdrop';
import { SerqCard } from '../../src/components/serq/SerqCard';
import { SerqButton } from '../../src/components/serq/SerqButton';
import { userRepository } from '../../src/database/repositories/userRepository';
import { screenTimerService } from '../../src/native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { colors } from '../../src/theme/colors';
import { temporaryUnlock } from '../../modules/app-blocker';

export default function EmergencyOverrideScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const targetReps = 20;
  const [currentReps, setCurrentReps] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const cadenceRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (cadenceRef.current) clearInterval(cadenceRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      cadenceRef.current = setInterval(() => {
        setCurrentReps((prev) => {
          const next = prev + 1;
          haptics.light();
          sound.play('rep_count');

          if (next >= targetReps) {
            handleUnlockPass();
          }
          return next;
        });
      }, 2300);
    } else {
      if (cadenceRef.current) clearInterval(cadenceRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (cadenceRef.current) clearInterval(cadenceRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleUnlockPass = async () => {
    setIsActive(false);
    haptics.heavy();
    sound.play('unlock');

    const durationMs = 5 * 60 * 1000;
    const now = new Date();
    const targetEpoch = Date.now() + durationMs;

    try {
      await userRepository.addCoins(10, 'Emergency Override Workout', 'exercise');
      await userRepository.addXP(40);
      await userRepository.updateStat('strength', 1);
      screenTimerService.startSessionTimer(durationMs, 'Emergency 5m Pass');
      try {
        temporaryUnlock(durationMs);
      } catch (err) {
        console.warn('Native temporaryUnlock error:', err);
      }
      await loadProfile();

      showIOSAlert(
        'Emergency Pass Unlocked!',
        'You completed 20 verified push-ups. 5 minutes of unrestricted screen time is now active!',
        [{ text: 'Return to Apps', style: 'primary', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e) {
      console.warn('Emergency unlock failed:', e);
    }
  };

  return (
    <View style={styles.container}>
      <SerqBackdrop />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Override</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Banner */}
          <SerqCard variant="elevated" glow style={styles.infoBanner}>
            <View style={styles.alertIconWrap}>
              <ShieldAlert size={24} color={colors.danger} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoTitle}>Zero Coins Remaining</Text>
              <Text style={styles.infoSubtitle}>
                Perform 20 verified push-ups on the spot to immediately unlock 5 minutes of phone time.
              </Text>
            </View>
          </SerqCard>

          {/* Large Reps Counter */}
          <View style={styles.counterContainer}>
            <View style={styles.outerGlowRing}>
              <View style={styles.innerCounterCircle}>
                <Text style={styles.counterBigNumber}>{currentReps}</Text>
                <Text style={styles.counterTargetFraction}>/{targetReps} REPS</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky Action Button */}
        <View style={styles.footer}>
          <SerqButton
            title={isActive ? 'PAUSE WORKOUT' : 'START EMERGENCY PROTOCOL'}
            onPress={() => setIsActive(!isActive)}
            variant={isActive ? 'subtle' : 'emerald'}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 32, 36, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: 'center',
    gap: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  alertIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextGroup: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.danger,
  },
  infoSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  counterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  outerGlowRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
  },
  innerCounterCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBigNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  counterTargetFraction: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: -4,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  coachText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
});
