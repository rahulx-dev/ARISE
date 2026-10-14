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
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';
import { Icon3D } from '../../src/components/ui/Icon3D';
import { fontFamilies } from '../../src/theme/typography';
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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <NeumorphicCircleButton
            size={40}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <CaretLeft size={18} color="#1A1A1A" weight="bold" />
          </NeumorphicCircleButton>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>FOCUS MODE</Text>
            <Text style={styles.headerSubtitle}>DISCIPLINE TODAY</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Mute / Unmute Button */}
            <NeumorphicCircleButton
              size={40}
              onPress={toggleMute}
              accessibilityLabel="Mute toggle"
            >
              {isMuted ? (
                <SpeakerSlash size={18} color="#E53935" weight="bold" />
              ) : (
                <SpeakerHigh size={18} color="#1A1A1A" weight="duotone" />
              )}
            </NeumorphicCircleButton>

            <NeumorphicCircleButton
              size={40}
              onPress={() => setIsAudioSheetOpen(true)}
              accessibilityLabel="Ambient sounds"
            >
              <Headphones size={18} color="#1A1A1A" weight="duotone" />
            </NeumorphicCircleButton>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Mode Dropdown Badge */}
          <TouchableOpacity
            style={styles.modeBadge}
            onPress={() => setIsPresetSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeBadgeText}>
              SESSION LENGTH ({targetMinutes}M)
            </Text>
            <CaretDown size={14} color="#7A756D" weight="bold" />
          </TouchableOpacity>

          {/* Neumorphic Focus Ring Composition */}
          <View style={styles.timerWrap}>
            {/* Ambient Red Backlight */}
            <View
              style={[
                styles.focusBacklight,
                {
                  opacity: isActive ? 0.25 : 0.08,
                },
              ]}
            />

            {/* Precision Native SVG Ring */}
            <View>
              <Svg width={270} height={270} viewBox="0 0 270 270">
                <Defs>
                  <SvgLinearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FF4B4B" />
                    <Stop offset="100%" stopColor="#E53935" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#E8E4DC" />
                    <Stop offset="100%" stopColor="#EDE9E1" />
                  </SvgLinearGradient>
                </Defs>

                {/* Outer Neumorphic Border */}
                <SvgCircle
                  cx="135"
                  cy="135"
                  r={ringRadius + 14}
                  stroke="#E8E4DC"
                  strokeWidth="1.5"
                  fill="none"
                />

                {/* Background Track */}
                <SvgCircle
                  cx="135"
                  cy="135"
                  r={ringRadius}
                  stroke="url(#trackGradient)"
                  strokeWidth="10"
                  fill="none"
                />

                {/* Red Active Progress Arc */}
                {progressFraction > 0 && (
                  <SvgCircle
                    cx="135"
                    cy="135"
                    r={ringRadius}
                    stroke="url(#redGradient)"
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
                      fill="rgba(229, 57, 53, 0.3)"
                    />
                    <SvgCircle
                      cx={headX}
                      cy={headY}
                      r={9}
                      fill="rgba(255, 75, 75, 0.7)"
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

            {/* Center Digits & Status Pill */}
            <View style={styles.timerCenterContent} pointerEvents="none">
              <Text style={styles.timerDigits}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Text>
              <View style={styles.statusPillWrap}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isActive ? '#E53935' : '#D97706' },
                  ]}
                />
                <Text style={styles.timerSubLabel}>
                  {isActive ? 'SHIELD ACTIVE' : 'PAUSED'}
                </Text>
              </View>
            </View>
          </View>

          {/* Controls Row */}
          <View style={styles.controlsRow}>
            {/* Reset */}
            <NeumorphicCircleButton
              size={54}
              onPress={handleReset}
              accessibilityLabel="Reset timer"
            >
              <ArrowCounterClockwise size={20} color="#7A756D" weight="bold" />
            </NeumorphicCircleButton>

            {/* Play/Pause Button in Solid ARISE Red */}
            <TouchableOpacity
              style={styles.primaryPlayBtn}
              onPress={handleStartPause}
              activeOpacity={0.88}
            >
              {isActive ? (
                <Pause size={28} color="#FFFFFF" weight="fill" />
              ) : (
                <Play size={28} color="#FFFFFF" weight="fill" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            {/* Add 5 Minutes */}
            <NeumorphicCircleButton
              size={54}
              onPress={handleAddFiveMinutes}
              accessibilityLabel="Add 5 minutes"
            >
              <Plus size={20} color="#7A756D" weight="bold" />
            </NeumorphicCircleButton>
          </View>

          {/* Bottom Stats Row */}
          <NeumorphicCard style={styles.statsCard} padding={14}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>
                {todayStats.focusMinutes}m
              </Text>
              <Text style={styles.statLabel}>TODAY</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: '#E53935' }]}>
                {todayStats.focusSessionsCount}
              </Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>
                {profile?.currentStreak || 0}d
              </Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
          </NeumorphicCard>
        </View>

        {/* Audio Track Selector Sheet Modal */}
        <Modal visible={isAudioSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ambient Soundscapes</Text>
                <TouchableOpacity onPress={() => setIsAudioSheetOpen(false)} style={styles.modalCloseBtn}>
                  <X size={18} color="#1A1A1A" weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Quick Mute / Unmute Pill Banner */}
              <TouchableOpacity
                style={[
                  styles.audioBanner,
                  {
                    backgroundColor: isMuted ? '#FFF0F0' : '#F6F4EF',
                    borderColor: isMuted ? '#E53935' : '#E8E4DC',
                  },
                ]}
                onPress={toggleMute}
                activeOpacity={0.8}
              >
                {isMuted ? (
                  <>
                    <SpeakerSlash size={16} color="#E53935" weight="bold" />
                    <Text style={[styles.audioBannerText, { color: '#E53935' }]}>
                      AMBIENT AUDIO MUTED (TAP TO UNMUTE)
                    </Text>
                  </>
                ) : (
                  <>
                    <SpeakerHigh size={16} color="#1A1A1A" weight="bold" />
                    <Text style={[styles.audioBannerText, { color: '#1A1A1A' }]}>
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
                          backgroundColor: isSelected ? '#FFF5F5' : '#FFFFFF',
                          borderColor: isSelected ? '#E53935' : '#E8E4DC',
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.trackName, { color: isSelected ? '#E53935' : '#1A1A1A' }]}>
                          {t.name}
                        </Text>
                        <Text style={styles.trackCategory}>
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
            </View>
          </View>
        </Modal>

        {/* Duration Preset Selector Sheet */}
        <Modal visible={isPresetSheetOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Duration</Text>
                <TouchableOpacity onPress={() => setIsPresetSheetOpen(false)} style={styles.modalCloseBtn}>
                  <X size={18} color="#1A1A1A" weight="bold" />
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
                          backgroundColor: isSelected ? '#E53935' : '#FFFFFF',
                          borderColor: isSelected ? '#E53935' : '#E8E4DC',
                        },
                      ]}
                    >
                      <Text style={[styles.presetNumber, { color: isSelected ? '#FFFFFF' : '#1A1A1A' }]}>
                        {mins}
                      </Text>
                      <Text style={[styles.presetUnit, { color: isSelected ? '#FFFFFF' : '#7A756D' }]}>
                        min
                      </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F6F4EF',
  },
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
    letterSpacing: 1,
    marginTop: 2,
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
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modeBadgeText: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 0.8,
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
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 36,
  },
  statusPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  timerDigits: {
    fontSize: 48,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  timerSubLabel: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 1.2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginVertical: 8,
  },
  primaryPlayBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 7,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statCol: {
    alignItems: 'center',
    gap: 3,
  },
  statVal: {
    fontSize: 17,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E8E4DC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    padding: 22,
    gap: 16,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  audioBannerText: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.5,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  trackName: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
  trackCategory: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E53935',
  },
  activeBadgeText: {
    fontSize: 9,
    fontFamily: fontFamilies.bold,
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
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  presetNumber: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
  },
  presetUnit: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
  },
});
