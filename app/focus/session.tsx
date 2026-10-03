import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
  CaretLeft,
  Play,
  Pause,
  ArrowCounterClockwise,
  Headphones,
  Plus,
  CaretDown,
  X,
  SpeakerHigh,
  SpeakerSlash,
} from 'phosphor-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { audioService, AUDIO_TRACKS } from '../../src/services/audioService';
import { db } from '../../src/database/client';
import { focusSession } from '../../src/database/schema';
import { useKeepAwake } from 'expo-keep-awake';
import { historyService } from '../../src/services/historyService';
import { issueCompletionToken } from '../../src/services/completionGate';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

const DURATION_PRESETS = [15, 25, 45, 60];

export default function FocusModeScreen() {
  useKeepAwake();
  const router = useRouter();
  const params = useLocalSearchParams<{ questId?: string; targetMinutes?: string }>();
  const sound = useSound();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();
  const profile = usePlayerStore((s) => s.profile);

  const parsedInitialMinutes = params.targetMinutes
    ? Number.parseInt(params.targetMinutes, 10)
    : 25;
  const initialMinutes = Number.isFinite(parsedInitialMinutes)
    ? Math.max(1, Math.min(180, parsedInitialMinutes))
    : 25;
  const [targetMinutes, setTargetMinutes] = useState<number>(initialMinutes);
  const [remainingMs, setRemainingMs] = useState<number>(initialMinutes * 60 * 1000);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAudioSheetOpen, setIsAudioSheetOpen] = useState<boolean>(false);
  const [isPresetSheetOpen, setIsPresetSheetOpen] = useState<boolean>(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('deep_focus');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [todayStats, setTodayStats] = useState({ focusMinutes: 0, focusSessionsCount: 0 });

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // 120 FPS Siri Live Ring Animation Values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.25)).current;
  const rotateLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
      // 120 FPS Infinite smooth rotation for outer Siri halo
      rotateLoopRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoopRef.current.start();

      // 120 FPS 4-second deep-breathing cycle (inhale 2.5s, exhale 2.5s)
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.04,
              duration: 2500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.85,
              duration: 2500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 2500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.35,
              duration: 2500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (rotateLoopRef.current) rotateLoopRef.current.stop();
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      Animated.parallel([
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.15, duration: 400, useNativeDriver: true }),
      ]).start();
    }

    return () => {
      if (rotateLoopRef.current) rotateLoopRef.current.stop();
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
    };
  }, [isActive]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    let mounted = true;
    const loadFocusStats = async () => {
      try {
        const stats = await historyService.getTodayRealStats();
        if (!mounted) return;
        setTodayStats({
          focusMinutes: stats.focusMinutes,
          focusSessionsCount: stats.focusSessionsCount,
        });
      } catch {
        // Stats are supplemental; keep the last known values if loading fails.
      }
    };
    loadFocusStats();
    return () => {
      mounted = false;
    };
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.stop();
    };
  }, []);

  // Timer loop
  useEffect(() => {
    if (isActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        endTimeRef.current = Date.now() + remainingMs;
      }
      if (!isMuted) {
        audioService.play(selectedTrackId);
      } else {
        audioService.pause();
      }

      timerRef.current = setInterval(() => {
        const endTime = endTimeRef.current;
        if (!endTime) return;
        setRemainingMs((prev) => {
          const next = Math.max(0, endTime - Date.now());
          if (next <= 0) {
            clearInterval(timerRef.current);
            if (!completedRef.current) {
              completedRef.current = true;
              handleCompleteSession();
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.pause();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isMuted, selectedTrackId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isActive && endTimeRef.current) {
        const remaining = Math.max(0, endTimeRef.current - Date.now());
        setRemainingMs(remaining);
        if (remaining === 0 && !completedRef.current) {
          completedRef.current = true;
          handleCompleteSession();
        }
      }
    });
    return () => subscription.remove();
  }, [isActive]);

  const toggleMute = () => {
    haptics.light();
    if (isMuted) {
      setIsMuted(false);
      if (isActive) {
        audioService.play(selectedTrackId);
      }
    } else {
      setIsMuted(true);
      audioService.pause();
    }
  };

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
    startTimeRef.current = null;
    endTimeRef.current = null;
    completedRef.current = false;
  };

  const handleAddFiveMinutes = () => {
    haptics.light();
    const extraMs = 5 * 60 * 1000;
    setRemainingMs((prev) => prev + extraMs);
    if (endTimeRef.current) {
      endTimeRef.current += extraMs;
    }
  };

  const handleSelectPreset = (mins: number) => {
    if (isActive) return;
    haptics.light();
    setTargetMinutes(mins);
    setRemainingMs(mins * 60 * 1000);
    startTimeRef.current = null;
    endTimeRef.current = null;
    completedRef.current = false;
    setIsPresetSheetOpen(false);
  };

  const handleCompleteSession = async () => {
    if (!mountedRef.current) return;
    setIsActive(false);
    endTimeRef.current = null;
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

      await usePlayerStore.getState().loadProfile();
    } catch (e) {
      console.warn('Failed to record focus session:', e);
    }

    if (!mountedRef.current) return;
    router.replace({
      pathname: '/exercise/complete',
      params: {
        exerciseType: 'DEEP_FOCUS',
        completedReps: targetMinutes.toString(),
        target: targetMinutes.toString(),
        earnedCoins: coinsEarned.toString(),
        earnedXP: xpEarned.toString(),
        durationSeconds: (targetMinutes * 60).toString(),
        ...(params.questId ? { questId: params.questId } : {}),
        completionToken: issueCompletionToken(),
      },
    });
  };

  const totalMs = targetMinutes * 60 * 1000;
  const progressFraction = Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const ringRadius = 114;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressFraction);

  // Comet head tip coordinates along ring circumference (starts from -90 deg / 12 o'clock)
  const angleRad = (progressFraction * 2 * Math.PI) - Math.PI / 2;
  const headX = 135 + ringRadius * Math.cos(angleRad);
  const headY = 135 + ringRadius * Math.sin(angleRad);

  const currentTrack = AUDIO_TRACKS.find((t) => t.id === selectedTrackId) || AUDIO_TRACKS[0];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090A0F' : '#F8F9FA' }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <CaretLeft size={20} color={colors.textPrimary} weight="bold" />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Deep Focus</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Mute / Unmute Button */}
            <TouchableOpacity
              style={[
                styles.circleBtn,
                {
                  backgroundColor: isMuted
                    ? 'rgba(239, 68, 68, 0.12)'
                    : isDark
                    ? '#14151C'
                    : '#FFFFFF',
                  borderColor: isMuted ? 'rgba(239, 68, 68, 0.4)' : colors.border,
                },
              ]}
              onPress={toggleMute}
              activeOpacity={0.8}
            >
              {isMuted ? (
                <SpeakerSlash size={19} color="#EF4444" weight="bold" />
              ) : (
                <SpeakerHigh size={19} color={colors.primary} weight="duotone" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.circleBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
              onPress={() => setIsAudioSheetOpen(true)}
              activeOpacity={0.8}
            >
              <Headphones size={20} color={colors.secondary} weight="duotone" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Mode Dropdown Badge */}
          <TouchableOpacity
            style={[styles.modeBadge, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
            onPress={() => setIsPresetSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBadgeText, { color: colors.textPrimary }]}>
              Session Length ({targetMinutes}m)
            </Text>
            <CaretDown size={14} color={colors.textMuted} weight="bold" />
          </TouchableOpacity>

          {/* Sleek Minimalist Obsidian & Sapphire Focus Ring */}
          <View style={styles.timerWrap}>
            {/* Ambient Subtle Sapphire Backlight */}
            <View
              style={[
                styles.focusBacklight,
                {
                  opacity: isActive ? 0.35 : 0.15,
                  backgroundColor: '#0A84FF',
                },
              ]}
            />

            {/* Precision Native SVG Ring */}
            <View>
              <Svg width={270} height={270} viewBox="0 0 270 270">
                <Defs>
                  <SvgLinearGradient id="sapphireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#389BFF" />
                    <Stop offset="100%" stopColor="#0A84FF" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={isDark ? '#121522' : '#E5E5EA'} />
                    <Stop offset="100%" stopColor={isDark ? '#161928' : '#D1D1D6'} />
                  </SvgLinearGradient>
                </Defs>

                {/* Background Track */}
                <SvgCircle
                  cx="135"
                  cy="135"
                  r={ringRadius}
                  stroke="url(#trackGradient)"
                  strokeWidth="10"
                  fill="none"
                />

                {/* Sapphire Active Progress Ring */}
                {progressFraction > 0 && (
                  <SvgCircle
                    cx="135"
                    cy="135"
                    r={ringRadius}
                    stroke="url(#sapphireGradient)"
                    strokeWidth="10"
                    strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 135 135)"
                  />
                )}

                {/* Glowing Leading Comet Particle */}
                {isActive && progressFraction > 0.005 && progressFraction < 0.995 && (
                  <>
                    <SvgCircle
                      cx={headX}
                      cy={headY}
                      r={14}
                      fill="rgba(10, 132, 255, 0.35)"
                    />
                    <SvgCircle
                      cx={headX}
                      cy={headY}
                      r={9}
                      fill="rgba(0, 242, 254, 0.7)"
                    />
                    <SvgCircle
                      cx={headX}
                      cy={headY}
                      r={5}
                      fill="#FFFFFF"
                    />
                  </>
                )}
              </Svg>
            </View>

            {/* Layer 4: Center Digits & Status Pill */}
            <View style={styles.timerCenterContent} pointerEvents="none">
              <Text style={[styles.timerDigits, { color: colors.textPrimary }]}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Text>
              <View style={styles.statusPillWrap}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isActive ? '#10B981' : '#F59E0B' },
                  ]}
                />
                <Text style={[styles.timerSubLabel, { color: colors.textMuted }]}>
                  {isActive ? 'SHIELD ACTIVE' : 'PAUSED'}
                </Text>
              </View>
            </View>
          </View>

          {/* Controls Row */}
          <View style={styles.controlsRow}>
            {/* Reset */}
            <TouchableOpacity
              style={[styles.secondaryControlBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <ArrowCounterClockwise size={20} color={colors.textMuted} weight="bold" />
            </TouchableOpacity>

            {/* Play/Pause Button in Solid Titanium Azure */}
            <TouchableOpacity
              style={[styles.primaryPlayBtn, { backgroundColor: '#0A84FF' }]}
              onPress={handleStartPause}
              activeOpacity={0.85}
            >
              {isActive ? (
                <Pause size={28} color="#FFFFFF" weight="fill" />
              ) : (
                <Play size={28} color="#FFFFFF" weight="fill" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            {/* Add 5 Minutes */}
            <TouchableOpacity
              style={[styles.secondaryControlBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
              onPress={handleAddFiveMinutes}
              activeOpacity={0.8}
            >
              <Plus size={20} color={colors.textMuted} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Bottom Stats Row */}
          <GlassCard variant="default" style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                {todayStats.focusMinutes}m
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>TODAY</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.primary }]}>
                {todayStats.focusSessionsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>SESSIONS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.success }]}>
                {profile?.currentStreak || 0}d
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>STREAK</Text>
            </View>
          </GlassCard>
        </View>

        {/* Audio Track Selector Sheet Modal */}
        <Modal visible={isAudioSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Ambient Soundscapes</Text>
                <TouchableOpacity onPress={() => setIsAudioSheetOpen(false)} style={styles.circleBtn}>
                  <X size={18} color={colors.textSecondary} weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Quick Mute / Unmute Pill Banner */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                  borderWidth: 1,
                  borderColor: isMuted ? '#EF4444' : '#0284C7',
                  marginBottom: 8,
                }}
                onPress={toggleMute}
                activeOpacity={0.8}
              >
                {isMuted ? (
                  <>
                    <SpeakerSlash size={16} color="#EF4444" weight="bold" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444', letterSpacing: 0.5 }}>
                      AMBIENT AUDIO MUTED (TAP TO UNMUTE)
                    </Text>
                  </>
                ) : (
                  <>
                    <SpeakerHigh size={16} color="#0284C7" weight="bold" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284C7', letterSpacing: 0.5 }}>
                      AMBIENT AUDIO PLAYING (TAP TO MUTE)
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8 }}>
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
                          backgroundColor: isSelected
                            ? isDark
                              ? '#2E1065'
                              : '#EDE9FE'
                            : isDark
                            ? '#14151C'
                            : '#F9FAFB',
                          borderColor: isSelected ? colors.secondary : colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.trackName, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {t.name}
                        </Text>
                        <Text style={[styles.trackCategory, { color: isSelected ? '#C4B5FD' : colors.textSecondary }]}>
                          {t.category} • Offline WAV
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>

        {/* Duration Preset Selector Sheet */}
        <Modal visible={isPresetSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Duration</Text>
                <TouchableOpacity onPress={() => setIsPresetSheetOpen(false)} style={styles.circleBtn}>
                  <X size={18} color={colors.textSecondary} weight="bold" />
                </TouchableOpacity>
              </View>

              <View style={styles.presetsRow}>
                {DURATION_PRESETS.map((mins) => {
                  const isSelected = targetMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => handleSelectPreset(mins)}
                      style={[
                        styles.presetCard,
                        {
                          backgroundColor: isSelected ? '#0A84FF' : isDark ? '#14151C' : '#F3F4F6',
                          borderColor: isSelected ? '#0A84FF' : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.presetNumber, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                        {mins}
                      </Text>
                      <Text style={[styles.presetUnit, { color: isSelected ? '#FFFFFF' : colors.textMuted }]}>
                        min
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
  safeArea: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    fontSize: 13,
    fontWeight: '700',
  },
  timerWrap: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  focusBacklight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 36,
  },
  statusPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  timerDigits: {
    fontSize: 48,
    fontWeight: '600',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  timerSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 8,
  },
  secondaryControlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  statCol: {
    alignItems: 'center',
    gap: 3,
  },
  statVal: {
    fontSize: 17,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '700',
  },
  trackCategory: {
    fontSize: 11,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  presetCard: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  presetNumber: {
    fontSize: 22,
    fontWeight: '600',
  },
  presetUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
});
