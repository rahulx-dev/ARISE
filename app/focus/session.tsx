import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Music,
  Volume2,
  VolumeX,
  X,
  Shield,
  Sparkles,
  Zap,
  Disc,
  Trees,
  CloudRain,
  Sun,
  Brain,
  SkipForward,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { audioService, AUDIO_TRACKS, AudioTrackInfo } from '../../src/services/audioService';
import { db } from '../../src/database/client';
import { focusSession } from '../../src/database/schema';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const DURATION_PRESETS = [15, 25, 45, 60];

const TRACK_ICONS: Record<string, any> = {
  deep_focus: Brain,
  productivity_sprint: Zap,
  brown_noise: Disc,
  rain_window: CloudRain,
  forest_wind: Trees,
  lofi_beats: Music,
  calm_ambient: Sun,
};

export default function FocusModeScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [remainingMs, setRemainingMs] = useState<number>(25 * 60 * 1000);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAudioSheetOpen, setIsAudioSheetOpen] = useState<boolean>(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('deep_focus');
  const [volume, setVolume] = useState<number>(0.7);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.stop();
    };
  }, []);

  // Timer loop
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      audioService.play(selectedTrackId);

      timerRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          if (prev <= 1000) {
            clearInterval(timerRef.current);
            handleCompleteSession();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.pause();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleStartPause = () => {
    haptics.heavy();
    if (!isActive) {
      sound.play('quest_start');
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  };

  const handleReset = () => {
    haptics.medium();
    setIsActive(false);
    audioService.stop();
    setRemainingMs(targetMinutes * 60 * 1000);
  };

  const handleSelectPreset = (mins: number) => {
    if (isActive) return;
    haptics.light();
    setTargetMinutes(mins);
    setRemainingMs(mins * 60 * 1000);
  };

  const handleCompleteSession = async () => {
    setIsActive(false);
    audioService.stop();
    sound.play('quest_complete');
    haptics.success();

    const coinsEarned = Math.round(targetMinutes * 1.5);
    const xpEarned = targetMinutes * 3;

    try {
      await db.insert(focusSession).values({
        targetMinutes,
        completedMinutes: targetMinutes,
        status: 'COMPLETED',
        startTime: new Date(Date.now() - targetMinutes * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        rewardCoins: coinsEarned,
        rewardXP: xpEarned,
      });

      await loadProfile();
    } catch (e) {
      console.warn('Failed to record focus session:', e);
    }

    router.replace({
      pathname: '/exercise/complete',
      params: {
        exerciseType: 'DEEP_FOCUS',
        completedReps: targetMinutes.toString(),
        target: targetMinutes.toString(),
        earnedCoins: coinsEarned.toString(),
        earnedXP: xpEarned.toString(),
        durationSeconds: (targetMinutes * 60).toString(),
      },
    });
  };

  const totalMs = targetMinutes * 60 * 1000;
  const progressFraction = Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const currentTrack = AUDIO_TRACKS.find((t) => t.id === selectedTrackId) || AUDIO_TRACKS[0];
  const CurrentIcon = TRACK_ICONS[currentTrack.id] || Music;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>DEEP FOCUS SANCTUARY</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Circular Countdown Hero */}
          <GlassCard variant="glow" style={styles.timerHeroCard}>
            <View style={styles.timerCircleWrap}>
              {/* Outer decorative ring */}
              <View style={[styles.outerGlowRing, { borderColor: isActive ? colors.primary : colors.border }]}>
                <View style={[styles.innerCircle, { backgroundColor: isDark ? '#0D0E12' : '#FFFFFF' }]}>
                  <Text style={[styles.timerDigits, { color: colors.textPrimary }]}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.timerStatusLabel, { color: isActive ? colors.primary : colors.textMuted }]}>
                    {isActive ? 'SHIELD PROTOCOL ACTIVE' : 'READY TO SPRINT'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressFraction * 100}%`, backgroundColor: colors.primary }]} />
            </View>

            {/* Duration Presets */}
            <View style={styles.presetsRow}>
              {DURATION_PRESETS.map((mins) => {
                const isSelected = targetMinutes === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => handleSelectPreset(mins)}
                    disabled={isActive}
                    style={[
                      styles.presetPill,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        { color: colors.textSecondary },
                        isSelected && { color: '#000000', fontWeight: '900' },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Real Audio Soundscape Controller Card */}
          <GlassCard variant="default" style={styles.soundscapeCard}>
            <View style={styles.soundscapeLeft}>
              <View style={[styles.soundscapeIconCircle, { backgroundColor: isDark ? 'rgba(209, 255, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                <CurrentIcon size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.soundscapeTitle, { color: colors.textPrimary }]}>{currentTrack.name}</Text>
                <Text style={[styles.soundscapeDesc, { color: colors.textSecondary }]}>{currentTrack.category} • 100% Offline Synthesis</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsAudioSheetOpen(true)}
              style={[styles.changeTrackBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
            >
              <Text style={[styles.changeTrackBtnText, { color: colors.primary }]}>CHANGE</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Primary Action Controls */}
          <View style={styles.actionControlsRow}>
            <GlassButton
              title={isActive ? 'PAUSE SPRINT' : 'START FOCUS SPRINT'}
              onPress={handleStartPause}
              variant="primary"
              size="lg"
              style={{ flex: 2 }}
              icon={isActive ? <Pause size={18} color="#000" /> : <Play size={18} color="#000" />}
            />

            <TouchableOpacity
              onPress={handleReset}
              style={[styles.resetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <RotateCcw size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Audio Track Selector Sheet Modal */}
        <Modal visible={isAudioSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Choose Ambient Soundscape</Text>
                <TouchableOpacity onPress={() => setIsAudioSheetOpen(false)} style={styles.iconBtn}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }}>
                {AUDIO_TRACKS.map((t) => {
                  const isSelected = selectedTrackId === t.id;
                  const IconC = TRACK_ICONS[t.id] || Music;

                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => {
                        haptics.medium();
                        setSelectedTrackId(t.id);
                        if (isActive) {
                          audioService.play(t.id);
                        }
                        setIsAudioSheetOpen(false);
                      }}
                      style={[
                        styles.trackRow,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(209, 255, 0, 0.1)' },
                      ]}
                    >
                      <View style={[styles.trackIconWrap, { backgroundColor: isSelected ? colors.primary : 'rgba(255,255,255,0.06)' }]}>
                        <IconC size={18} color={isSelected ? '#000000' : colors.textPrimary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.trackRowName, { color: colors.textPrimary }, isSelected && { color: colors.primary }]}>
                          {t.name}
                        </Text>
                        <Text style={[styles.trackRowDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                          {t.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </GlassCard>
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
  },
  timerHeroCard: {
    padding: 24,
    alignItems: 'center',
    gap: 20,
    borderRadius: 24,
  },
  timerCircleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  outerGlowRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 182,
    height: 182,
    borderRadius: 91,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  timerDigits: {
    fontSize: 40,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerStatusLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  soundscapeCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
  },
  soundscapeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  soundscapeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundscapeTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  soundscapeDesc: {
    fontSize: 10,
  },
  changeTrackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  changeTrackBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionControlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  trackIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRowName: {
    fontSize: 13,
    fontWeight: '900',
  },
  trackRowDesc: {
    fontSize: 11,
  },
});
