import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  Smartphone,
  Volume2,
  Vibrate,
  Bell,
  Trash2,
  ChevronRight,
  X,
  AlertTriangle,
  User,
  Camera,
  Moon,
  Music,
  Sliders,
  Banknote,
} from 'lucide-react-native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors } = useTheme();

  const {
    sfxEnabled,
    hapticsEnabled,
    notificationsEnabled,
    bgMusicEnabled,
    toggleSfx,
    toggleHaptics,
    toggleNotifications,
    setBgMusic,
  } = useSettingsStore();

  const resetProfile = usePlayerStore((s) => s.resetProfile);

  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');

  const handleResetData = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ARISE') {
      haptics.warning();
      return;
    }

    await resetProfile();
    setShowResetModal(false);
    setConfirmInput('');
    haptics.heavy();
    router.replace('/(onboarding)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>SYSTEM SETTINGS</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section 1: Profile & Identity */}
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>IDENTITY & CUSTOMIZATION</Text>
          <GlowCard variant="default" style={styles.cardBlock}>
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/profile-edit' as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(209, 255, 0, 0.15)' }]}>
                <User size={20} color={colors.primary} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Edit Profile & Avatar</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Callsign, bio, goals & custom PFP</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/photos' as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                <Camera size={20} color={colors.accentGold} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Physique Progress Photos</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Daily transformation gallery timeline</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/payouts' as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Banknote size={20} color={colors.accentGold} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Admin Payout Manager</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>View and transfer pending UPI user cashouts</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </GlowCard>

          {/* Section 2: Permissions & Restrictions */}
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PERMISSIONS & APP BLOCKING</Text>
          <GlowCard variant="default" style={styles.cardBlock}>
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/permissions' as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 240, 255, 0.15)' }]}>
                <Shield size={20} color={colors.secondary} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Permissions Hub</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Usage access, overlay & camera status</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/apps')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(138, 43, 226, 0.15)' }]}>
                <Smartphone size={20} color={'#A855F7'} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Locked Distraction Apps</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Select real installed apps to lock behind workouts</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </GlowCard>

          {/* Section 3: Audio & Haptics */}
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>AUDIO & FEEDBACK</Text>
          <GlowCard variant="default" style={styles.cardBlock}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Volume2 size={20} color={sfxEnabled ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Sound Effects (SFX)</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Rep counters & quest completions</Text>
                </View>
              </View>
              <Switch
                value={sfxEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleSfx();
                }}
                trackColor={{ false: '#262626', true: colors.primary }}
                thumbColor={sfxEnabled ? '#000000' : '#888888'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Vibrate size={20} color={hapticsEnabled ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Vibration Haptics</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Tactile pulses on button taps & reps</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleHaptics();
                }}
                trackColor={{ false: '#262626', true: colors.primary }}
                thumbColor={hapticsEnabled ? '#000000' : '#888888'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Music size={20} color={bgMusicEnabled ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Background Ambient Music</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Subtle ambient atmospheric soundtrack</Text>
                </View>
              </View>
              <Switch
                value={bgMusicEnabled}
                onValueChange={() => {
                  haptics.light();
                  setBgMusic(!bgMusicEnabled);
                }}
                trackColor={{ false: '#262626', true: colors.primary }}
                thumbColor={bgMusicEnabled ? '#000000' : '#888888'}
              />
            </View>
          </GlowCard>

          {/* Section 4: Development / Danger Zone */}
          <Text style={[styles.sectionHeader, { color: colors.danger }]}>DEVELOPMENT PROTOCOL RESET</Text>
          <GlowCard variant="default" style={[styles.cardBlock, { borderColor: `${colors.danger}40` }]}>
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => setShowResetModal(true)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Trash2 size={20} color={colors.danger} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.danger }]}>Reset All Local Data (Dev Reset)</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Wipe database to clean first-install state
                </Text>
              </View>
              <ChevronRight size={18} color={colors.danger} />
            </TouchableOpacity>
          </GlowCard>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.resetModalSheet, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={24} color={colors.danger} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Clean Protocol Reset</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              This will permanently delete all Coins, XP, Level, workout history, and photo timelines, returning ARISE to the initial first-launch state.
            </Text>

            <Text style={[styles.inputPrompt, { color: colors.textSecondary }]}>
              Type <Text style={{ color: colors.primary, fontWeight: '900' }}>ARISE</Text> to confirm:
            </Text>
            <TextInput
              style={[styles.resetInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="ARISE"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <GlowButton
              title="PERMANENTLY RESET ALL DATA"
              onPress={handleResetData}
              variant="danger"
              size="md"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 6,
  },
  cardBlock: {
    padding: 6,
    borderRadius: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextGroup: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  settingDesc: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetModalSheet: {
    width: '100%',
    padding: 22,
    gap: 14,
    borderRadius: 22,
    borderWidth: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputPrompt: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
  },
});
