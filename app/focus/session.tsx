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
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Settings,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
  Shield,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { MasterButton } from '../../src/components/master/MasterButton';
import { MasterCard } from '../../src/components/master/MasterCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';
import { focusMusicService, FOCUS_MUSIC_TRACKS } from '../../src/services/focusMusic';
import { Music, Music2 } from 'lucide-react-native';

export default function FocusModeScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [remainingMs, setRemainingMs] = useState<number>(25 * 60 * 1000);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [strictLock, setStrictLock] = useState<boolean>(true);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('rain');

  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (voiceEnabled) {
      voiceCoach.speakFocusStart(targetMinutes);
    }

    // Start ambient music
    focusMusicService.play(selectedTrackId);

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
      focusMusicService.stop();
    };
  }, []);

  const totalDurationMs = targetMinutes * 60 * 1000;
  const elapsedMs = totalDurationMs - remainingMs;
  const progressPercent = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

  const minutesLeft = Math.floor(remainingMs / (60 * 1000));
  const secondsLeft = Math.floor((remainingMs % (60 * 1000)) / 1000);
  const formattedTime = `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;

  const currentTrack = FOCUS_MUSIC_TRACKS.find((t) => t.id === selectedTrackId) || FOCUS_MUSIC_TRACKS[0];

  const handleSelectTrack = (trackId: string) => {
    haptics.light();
    setSelectedTrackId(trackId);
    if (isActive) {
      focusMusicService.play(trackId);
    }
  };

  const togglePlayPause = () => {
    haptics.medium();
    if (isActive) {
      setIsActive(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (voiceEnabled) voiceCoach.speak('Focus session paused.');
      focusMusicService.stop();
    } else {
      setIsActive(true);
      if (voiceEnabled) voiceCoach.speak('Resuming focus protocol.');
      focusMusicService.play(selectedTrackId);
      timerIntervalRef.current = setInterval(() => {
        setRemainingMs((prev) => {
          const next = Math.max(0, prev - 1000);
          if (next <= 0) {
            handleSessionComplete();
          }
          return next;
        });
      }, 1000);
    }
  };

  const handleEndSession = () => {
    haptics.heavy();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    voiceCoach.stop();
    focusMusicService.stop();
    router.back();
  };

  const handleSessionComplete = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    focusMusicService.stop();
    haptics.success();
    sound.play('quest_complete');

    if (voiceEnabled) {
      voiceCoach.speak('Outstanding discipline! Focus session complete. You earned 20 Coins and 50 XP.');
    }

    try {
      await userRepository.addCoins(20, 'Focus Session Completed', 'FOCUS');
      await userRepository.addXP(50);
      await loadProfile();
    } catch (e) {
      console.warn('Error rewarding focus session:', e);
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Focus Mode</Text>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setIsSettingsOpen(true)}
            activeOpacity={0.8}
          >
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Circular Countdown Gauge */}
          <View style={styles.gaugeCenterContainer}>
            <View style={styles.gaugeOuterWrapper}>
              <Svg width={260} height={260} viewBox="0 0 260 260">
                {/* Background Ring */}
                <Circle
                  cx={130}
                  cy={130}
                  r={105}
                  stroke="#1A1A1A"
                  strokeWidth={14}
                  fill="none"
                />
                {/* Neon Purple Arc */}
                <Circle
                  cx={130}
                  cy={130}
                  r={105}
                  stroke="#8A2BE2"
                  strokeWidth={14}
                  fill="none"
                  strokeDasharray={`${(2 * Math.PI * 105 * progressPercent) / 100} ${2 * Math.PI * 105}`}
                  strokeLinecap="round"
                  transform="rotate(-90 130 130)"
                />
              </Svg>

              <View style={styles.gaugeInnerContent}>
                <Text style={styles.gaugeTimeText}>{formattedTime}</Text>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillText}>+50 XP</Text>
                  <Text style={[styles.rewardPillText, { color: colors.accentGold }]}>+20 🟡</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Ambient Sound Pill */}
          <TouchableOpacity
            style={styles.ambientPill}
            onPress={() => setIsSettingsOpen(true)}
            activeOpacity={0.8}
          >
            <Music size={14} color={colors.primary} />
            <Text style={styles.ambientPillText}>
              {currentTrack.emoji} {currentTrack.name} Ambient
            </Text>
            <Text style={styles.ambientPillChange}>Change</Text>
          </TouchableOpacity>

          <Text style={styles.focusSubtitle}>
            Deep Work Session — Stay focused and get rewarded.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.pauseActionBtn}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              {isActive ? (
                <>
                  <Pause size={18} color={colors.textPrimary} />
                  <Text style={styles.pauseActionText}>Pause</Text>
                </>
              ) : (
                <>
                  <Play size={18} color={colors.primary} />
                  <Text style={[styles.pauseActionText, { color: colors.primary }]}>Resume</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endActionBtn}
              onPress={handleEndSession}
              activeOpacity={0.8}
            >
              <Square size={16} color={colors.textSecondary} />
              <Text style={styles.endActionText}>End Session</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Focus Settings Modal */}
      <Modal
        visible={isSettingsOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Focus Session Settings</Text>
              <TouchableOpacity onPress={() => setIsSettingsOpen(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                {/* 1. Duration */}
                <Text style={styles.settingLabel}>SESSION DURATION</Text>
                <View style={styles.durationRow}>
                  {[15, 25, 45, 60].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.durationBtn,
                        targetMinutes === mins && styles.durationBtnActive,
                      ]}
                      onPress={() => {
                        haptics.light();
                        setTargetMinutes(mins);
                        setRemainingMs(mins * 60 * 1000);
                      }}
                    >
                      <Text
                        style={[
                          styles.durationBtnText,
                          targetMinutes === mins && { color: '#000000', fontWeight: '900' },
                        ]}
                      >
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Ambient Soundscape Selection */}
                <Text style={styles.settingLabel}>AMBIENT SOUNDSCAPE</Text>
                <View style={styles.musicGrid}>
                  {FOCUS_MUSIC_TRACKS.map((track) => {
                    const isSelected = selectedTrackId === track.id;
                    return (
                      <TouchableOpacity
                        key={track.id}
                        style={[
                          styles.musicCard,
                          isSelected && styles.musicCardActive,
                        ]}
                        onPress={() => handleSelectTrack(track.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.musicEmoji}>{track.emoji}</Text>
                        <Text
                          style={[
                            styles.musicName,
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {track.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. AI Voice Coaching */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => {
                    haptics.light();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleLeft}>
                    {voiceEnabled ? (
                      <Volume2 size={20} color={colors.primary} />
                    ) : (
                      <VolumeX size={20} color={colors.textMuted} />
                    )}
                    <View>
                      <Text style={styles.toggleTitle}>AI Voice Coaching</Text>
                      <Text style={styles.toggleDesc}>Speech announcements during session</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleBadge, voiceEnabled && styles.toggleBadgeActive]}>
                    <Text style={[styles.toggleBadgeText, voiceEnabled && { color: colors.primary }]}>
                      {voiceEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 4. Strict Discipline Lock */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => {
                    haptics.light();
                    setStrictLock(!strictLock);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleLeft}>
                    <Shield size={20} color={strictLock ? '#8A2BE2' : colors.textMuted} />
                    <View>
                      <Text style={styles.toggleTitle}>Strict Discipline Lock</Text>
                      <Text style={styles.toggleDesc}>Block restricted apps until timer expires</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleBadge, strictLock && { borderColor: '#8A2BE2' }]}>
                    <Text style={[styles.toggleBadgeText, strictLock && { color: '#8A2BE2' }]}>
                      {strictLock ? 'ACTIVE' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <MasterButton
                  title="SAVE & CONTINUE"
                  onPress={() => setIsSettingsOpen(false)}
                  variant="green"
                  style={{ marginTop: 8 }}
                />
                <View style={{ height: 16 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
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
    alignItems: 'center',
    gap: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  gaugeCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  gaugeOuterWrapper: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    gap: 8,
  },
  gaugeTimeText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  rewardPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  focusSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  pauseActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#181818',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  pauseActionText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  endActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#141414',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  endActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
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
  modalBody: {
    gap: 16,
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  durationBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181818',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  toggleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  toggleBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 255, 106, 0.1)',
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  ambientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ambientPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ambientPillChange: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  musicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  musicCard: {
    width: '31%',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  musicCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 255, 106, 0.08)',
  },
  musicEmoji: {
    fontSize: 22,
  },
  musicName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
});
