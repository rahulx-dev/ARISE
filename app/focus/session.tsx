import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Music,
  Plus,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { audioService, AUDIO_TRACKS } from '../../src/services/audioService';
import { db } from '../../src/database/client';
import { focusSession } from '../../src/database/schema';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const DURATION_PRESETS = [15, 25, 45, 60];

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
  const [isPresetSheetOpen, setIsPresetSheetOpen] = useState<boolean>(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('deep_focus');

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

  const handleAddFiveMinutes = () => {
    haptics.light();
    setRemainingMs((prev) => prev + 5 * 60 * 1000);
  };

  const handleSelectPreset = (mins: number) => {
    if (isActive) return;
    haptics.light();
    setTargetMinutes(mins);
    setRemainingMs(mins * 60 * 1000);
    setIsPresetSheetOpen(false);
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

  const ringRadius = 125;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressFraction);

  const currentTrack = AUDIO_TRACKS.find((t) => t.id === selectedTrackId) || AUDIO_TRACKS[0];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#051424' : '#F2F2F7' }]}>
      {/* Stitch v2 Ambient Glow */}
      <View style={[styles.ambientGlow, { backgroundColor: isDark ? 'rgba(111, 0, 190, 0.25)' : 'rgba(124, 58, 237, 0.08)' }]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Stitch v2 Mobile Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Focus</Text>

          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
            onPress={() => setIsAudioSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Music size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainContent}>
          {/* Deep Focus Mode Dropdown Badge */}
          <TouchableOpacity
            style={[styles.modeBadge, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(255, 255, 255, 0.9)', borderColor: colors.border }]}
            onPress={() => setIsPresetSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBadgeText, { color: colors.textPrimary }]}>
              Deep Focus ({targetMinutes}m)
            </Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Stitch v2 300px Circular Timer Display */}
          <View style={styles.timerWrap}>
            <Svg width={280} height={280} viewBox="0 0 280 280">
              <Defs>
                <SvgLinearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#CCFF00" />
                  <Stop offset="100%" stopColor="#6F00BE" />
                </SvgLinearGradient>
              </Defs>

              {/* Track */}
              <SvgCircle
                cx="140"
                cy="140"
                r={ringRadius}
                stroke={isDark ? 'rgba(204, 255, 0, 0.1)' : 'rgba(0, 0, 0, 0.06)'}
                strokeWidth="8"
                fill="none"
              />

              {/* Gradient Progress Ring */}
              <SvgCircle
                cx="140"
                cy="140"
                r={ringRadius}
                stroke="url(#focusGradient)"
                strokeWidth="8"
                strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 140 140)"
              />
            </Svg>

            <View style={styles.timerCenterContent}>
              <Text style={[styles.timerDigits, { color: colors.textPrimary }]}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Text>
              <Text style={[styles.timerSubLabel, { color: colors.textMuted }]}>
                {isActive ? 'Shield Active' : 'Time left'}
              </Text>
            </View>
          </View>

          {/* Stitch v2 Controls Row */}
          <View style={styles.controlsRow}>
            {/* Reset */}
            <TouchableOpacity
              style={[styles.secondaryControlBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <RotateCcw size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Play/Pause Button in Solid Electric Lime */}
            <TouchableOpacity
              style={[styles.primaryPlayBtn, { backgroundColor: colors.primary }]}
              onPress={handleStartPause}
              activeOpacity={0.85}
            >
              {isActive ? (
                <Pause size={28} color="#000000" fill="#000000" />
              ) : (
                <Play size={28} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            {/* Add 5 Minutes */}
            <TouchableOpacity
              style={[styles.secondaryControlBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
              onPress={handleAddFiveMinutes}
              activeOpacity={0.8}
            >
              <Plus size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Stitch v2 Bottom Stats Row */}
          <GlassCard variant="default" style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>32m</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>TODAY</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.primary }]}>2</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>SESSIONS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.secondary }]}>12d</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>STREAK</Text>
            </View>
          </GlassCard>
        </View>

        {/* Audio Track Selector Sheet Modal */}
        <Modal visible={isAudioSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Choose Ambient Soundscape</Text>
                <TouchableOpacity onPress={() => setIsAudioSheetOpen(false)} style={styles.circleBtn}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
                {AUDIO_TRACKS.map((t) => {
                  const isSelected = selectedTrackId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => {
                        haptics.light();
                        setSelectedTrackId(t.id);
                        if (isActive) audioService.play(t.id);
                        setIsAudioSheetOpen(false);
                      }}
                      style={[
                        styles.trackCard,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.trackName, { color: colors.textPrimary }]}>{t.name}</Text>
                        <Text style={[styles.trackCategory, { color: colors.textSecondary }]}>
                          {t.category} • Offline WAV
                        </Text>
                      </View>
                      {isSelected && <Text style={{ color: colors.primary, fontWeight: '800' }}>ACTIVE</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>

        {/* Duration Preset Selector Sheet Modal */}
        <Modal visible={isPresetSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Focus Duration</Text>
                <TouchableOpacity onPress={() => setIsPresetSheetOpen(false)} style={styles.circleBtn}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.presetOptionsGrid}>
                {DURATION_PRESETS.map((mins) => {
                  const isSelected = targetMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => handleSelectPreset(mins)}
                      style={[
                        styles.presetOptionBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetOptionText,
                          { color: colors.textPrimary },
                          isSelected && { color: '#000000', fontWeight: '900' },
                        ]}
                      >
                        {mins} min
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 24 },
  ambientGlow: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.6,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timerWrap: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  timerDigits: {
    fontSize: 54,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  timerSubLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  secondaryControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    width: '100%',
    maxWidth: 320,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  trackName: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackCategory: {
    fontSize: 10,
  },
  presetOptionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  presetOptionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
