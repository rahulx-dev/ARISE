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
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Settings,
  Pause,
  Play,
  Square,
} from 'lucide-react-native';
import { MasterButton } from '../../src/components/master/MasterButton';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

export default function FocusModeScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const initialMinutes = 25;
  const initialDurationMs = initialMinutes * 60 * 1000;

  const [isActive, setIsActive] = useState<boolean>(true);
  const [remainingMs, setRemainingMs] = useState<number>(initialDurationMs);

  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    voiceCoach.speakFocusStart(initialMinutes);

    timerIntervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(0, prev - 1000);
        if (next <= 0) {
          handleSessionComplete();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      voiceCoach.stop();
    };
  }, []);

  const handleTogglePlayPause = () => {
    haptics.light();
    if (isActive) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsActive(false);
    } else {
      timerIntervalRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          const next = Math.max(0, prev - 1000);
          if (next <= 0) {
            handleSessionComplete();
          }
          return next;
        });
      }, 1000);
      setIsActive(true);
    }
  };

  const handleEndSession = () => {
    haptics.warning();
    Alert.alert(
      'End Session Early?',
      'Are you sure you want to end this focus sprint? Incomplete sessions do not earn full rewards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            router.back();
          },
        },
      ]
    );
  };

  const handleSessionComplete = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    haptics.heavy();
    sound.play('quest_complete');
    voiceCoach.speak(`Focus session complete! 20 coins and 50 XP awarded. Superb discipline.`);

    try {
      await userRepository.addCoins(20, 'Focus Sprint Complete', 'focus');
      await userRepository.addXP(50);
      await userRepository.updateStat('focus', 1);
      await loadProfile();

      Alert.alert(
        'Deep Work Complete!',
        'You maintained deep focus for 25 minutes. +50 XP and +20 Coins added to your vault!',
        [{ text: 'Great', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e) {
      console.error('Focus save error:', e);
    }
  };

  const elapsedMs = initialDurationMs - remainingMs;
  const progressFraction = elapsedMs / initialDurationMs;

  const totalSecs = Math.ceil(remainingMs / 1000);
  const displayMins = Math.floor(totalSecs / 60);
  const displaySecs = totalSecs % 60;
  const timeFormatted = `${displayMins < 10 ? '0' : ''}${displayMins}:${displaySecs < 10 ? '0' : ''}${displaySecs}`;

  const size = 260;
  const center = size / 2;
  const radius = size * 0.42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressFraction * circumference;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header: ← Focus Mode + Settings */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Focus Mode</Text>
          <TouchableOpacity style={styles.circleBtn}>
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Focus Ring Gauge */}
          <View style={styles.gaugeContainer}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Background Track */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#1A1A1A"
                strokeWidth={10}
                fill="none"
              />

              {/* Progress Arc (Neon Purple to Green) */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.primaryPurple}
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
              <Text style={styles.focusLabel}>Focus</Text>
              <Text style={styles.timerText}>{timeFormatted}</Text>
              <View style={styles.rewardsPill}>
                <Text style={styles.rewardsPillText}>+50 XP</Text>
                <Text style={styles.rewardsPillCoins}>+20 🟡</Text>
              </View>
            </View>
          </View>

          {/* Subtitle */}
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionTitle}>Deep Work Session</Text>
            <Text style={styles.sessionSubtitle}>Stay focused and get rewarded.</Text>
          </View>

          {/* Action Buttons Row: [ || Pause ] | [ ⏹ End Session ] */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.pauseBtn}
              onPress={handleTogglePlayPause}
              activeOpacity={0.8}
            >
              {isActive ? (
                <Pause size={18} color={colors.textPrimary} />
              ) : (
                <Play size={18} color={colors.primary} />
              )}
              <Text style={styles.btnText}>{isActive ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endBtn}
              onPress={handleEndSession}
              activeOpacity={0.8}
            >
              <Square size={16} color={colors.danger} fill={colors.danger} />
              <Text style={styles.endBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>

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
    justifyContent: 'space-between',
    paddingTop: 24,
    gap: 28,
  },
  gaugeContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextGroup: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  focusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  rewardsPill: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
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
  sessionMeta: {
    alignItems: 'center',
    gap: 4,
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  sessionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#262626',
    paddingVertical: 14,
    borderRadius: 24,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  endBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 14,
    borderRadius: 24,
  },
  endBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
  },
});
