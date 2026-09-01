import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  HelpCircle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
  Music,
} from 'lucide-react-native';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';
import { focusMusicService, FOCUS_MUSIC_TRACKS, FocusTrack } from '../../src/services/focusMusic';
import { db } from '../../src/database/client';
import { focusSession } from '../../src/database/schema';

const DURATION_PRESETS = [15, 25, 50];

export default function FocusModeScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [remainingMs, setRemainingMs] = useState<number>(25 * 60 * 1000);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAudioSheetOpen, setIsAudioSheetOpen] = useState<boolean>(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('rain');
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          const next = Math.max(0, prev - 1000);
          if (next <= 0) {
            handleSessionComplete();
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive]);

  const handleStart = () => {
    haptics.heavy();
    sound.play('quest_start');
    setIsActive(true);
    try {
      voiceCoach.speakFocusStart(targetMinutes);
    } catch {}
    if (!soundMuted && selectedTrackId !== 'silent') {
      focusMusicService.play(selectedTrackId);
    }
  };

  const handlePause = () => {
    haptics.medium();
    setIsActive(false);
    focusMusicService.stop();
  };

  const handleReset = (minutes: number) => {
    haptics.light();
    setIsActive(false);
    setTargetMinutes(minutes);
    setRemainingMs(minutes * 60 * 1000);
    focusMusicService.stop();
  };

  const handleSessionComplete = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsActive(false);
    focusMusicService.stop();
    sound.play('quest_complete');
    haptics.heavy();

    const coinsEarned = targetMinutes * 2;
    const xpEarned = targetMinutes * 4;

    try {
      voiceCoach.speak(`Focus session complete! You earned ${coinsEarned} coins.`);
      await db.insert(focusSession).values({
        targetMinutes,
        completedMinutes: targetMinutes,
        startTime: new Date(Date.now() - targetMinutes * 60000).toISOString(),
        endTime: new Date().toISOString(),
        status: 'COMPLETED',
        rewardCoins: coinsEarned,
        rewardXP: xpEarned,
      });
      await userRepository.addCoins(coinsEarned, `${targetMinutes}m Focus Session`, 'focus');
      await userRepository.addXP(xpEarned);
      await userRepository.updateStat('focus', 1);
      await userRepository.updateStreak();
      await loadProfile();
    } catch (e) {
      console.warn('Error completing focus session:', e);
    }

    Alert.alert(
      'Flow State Accomplished!',
      `You stayed focused for ${targetMinutes} minutes.\n+${coinsEarned} Coins 🪙\n+${xpEarned} XP ⚡`,
      [
        {
          text: 'CLAIM BOUNTY',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  const totalDurationMs = targetMinutes * 60 * 1000;
  const elapsedMs = totalDurationMs - remainingMs;
  const progressRatio = totalDurationMs > 0 ? (totalDurationMs - remainingMs) / totalDurationMs : 0;

  const minutesLeft = Math.floor(remainingMs / 60000);
  const secondsLeft = Math.floor((remainingMs % 60000) / 1000);
  const timeFormatted = `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;

  // SVG Gauge dimensions
  const circleSize = 270;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Focus</Text>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              Alert.alert(
                'Focus Flow State',
                'Activate silent immersion to block all app distractions and build discipline.'
              )
            }
            activeOpacity={0.8}
          >
            <HelpCircle size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Concentric Tachometer Chronometer */}
          <View style={styles.gaugeContainer}>
            <Svg width={circleSize} height={circleSize} style={styles.svgGauge}>
              {/* Outer Background Track */}
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="#1A1A1A"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Inner Glowing Track */}
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius - 16}
                stroke="#141414"
                strokeWidth={2}
                fill="none"
              />

              {/* Active Lime Progress Arc */}
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke={colors.primary}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
              />
            </Svg>

            <View style={styles.gaugeInnerContent}>
              <Text style={styles.gaugeLabel}>Focus Time</Text>
              <Text style={styles.gaugeTimeText}>{timeFormatted}</Text>
            </View>
          </View>

          <Text style={styles.gaugeSubtitle}>
            {isActive ? 'Deep immersion active. Zero distractions.' : 'Stay focused and achieve your goals!'}
          </Text>

          {/* Main Action Button */}
          {isActive ? (
            <GlowButton
              title="Pause Focus"
              onPress={handlePause}
              variant="secondary"
              size="lg"
              icon={<Pause size={18} color="#FFFFFF" />}
            />
          ) : (
            <GlowButton
              title="Start Focus"
              onPress={handleStart}
              variant="primary"
              size="lg"
              icon={<Play size={18} color="#050505" />}
            />
          )}

          {/* Select Duration Section */}
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Select Duration</Text>
            <View style={styles.presetRow}>
              {DURATION_PRESETS.map((mins) => {
                const isSelected = targetMinutes === mins && !isActive;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.durationPill,
                      isSelected && styles.durationPillActive,
                    ]}
                    onPress={() => handleReset(mins)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        isSelected && styles.durationPillTextActive,
                      ]}
                    >
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[
                  styles.durationPill,
                  targetMinutes === 60 && !isActive && styles.durationPillActive,
                ]}
                onPress={() => handleReset(60)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.durationPillText,
                    targetMinutes === 60 && !isActive && styles.durationPillTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Ambient BGM Card */}
          <GlowCard style={styles.bgmCard}>
            <View style={styles.bgmLeft}>
              <View style={styles.bgmIconCircle}>
                <Music size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.bgmTitle}>Ambient Soundscape</Text>
                <Text style={styles.bgmSubtitle}>
                  {FOCUS_MUSIC_TRACKS.find((t: FocusTrack) => t.id === selectedTrackId)?.name || 'Rain'} (100% Offline Audio)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.changeSoundBtn}
              onPress={() => setIsAudioSheetOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.changeSoundBtnText}>CHANGE</Text>
            </TouchableOpacity>
          </GlowCard>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Ambient Soundscape Picker Modal */}
        <Modal
          visible={isAudioSheetOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAudioSheetOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Ambient Soundscape</Text>
                <TouchableOpacity
                  onPress={() => setIsAudioSheetOpen(false)}
                  style={styles.iconBtn}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.trackList}>
                {FOCUS_MUSIC_TRACKS.map((t: FocusTrack) => {
                  const isSelected = selectedTrackId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.trackRow,
                        isSelected && styles.trackRowActive,
                      ]}
                      onPress={() => {
                        haptics.medium();
                        setSelectedTrackId(t.id);
                        if (isActive) {
                          focusMusicService.play(t.id);
                        }
                        setIsAudioSheetOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.trackInfo}>
                        <Text style={styles.trackName}>{t.name}</Text>
                        <Text style={styles.trackDesc}>{t.description}</Text>
                      </View>

                      {isSelected && (
                        <View style={styles.selectedDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    alignItems: 'center',
    paddingTop: 10,
  },
  gaugeContainer: {
    width: 270,
    height: 270,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  svgGauge: {
    position: 'absolute',
  },
  gaugeInnerContent: {
    alignItems: 'center',
    gap: 4,
  },
  gaugeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  gaugeTimeText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  gaugeSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  durationSection: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPillActive: {
    backgroundColor: '#1C2600',
    borderColor: colors.primary,
  },
  durationPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  durationPillTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  bgmCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  bgmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bgmIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgmTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  bgmSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  changeSoundBtn: {
    backgroundColor: '#222222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeSoundBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  trackList: {
    gap: 8,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
  },
  trackRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#1C2600',
  },
  trackInfo: {
    gap: 2,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  trackDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
