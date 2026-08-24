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
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const {
    sfxEnabled,
    hapticsEnabled,
    notificationsEnabled,
    toggleSfx,
    toggleHaptics,
    toggleNotifications,
  } = useSettingsStore();

  const resetProfile = usePlayerStore((s) => s.resetProfile);

  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [resetDone, setResetDone] = useState<boolean>(false);

  const handleResetData = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ARISE') {
      haptics.warning();
      return;
    }

    await resetProfile();
    setShowResetModal(false);
    setConfirmInput('');
    haptics.heavy();
    setResetDone(true);
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

          <Text style={styles.headerTitle}>System Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section 1: Permissions & Restrictions */}
          <Text style={styles.sectionHeader}>PERMISSIONS & RESTRICTIONS</Text>
          <MasterCard style={styles.cardBlock}>
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/permissions' as any)}
            >
              <View style={styles.iconCircle}>
                <Shield size={20} color={colors.primary} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Permissions Hub</Text>
                <Text style={styles.settingDesc}>Usage access, overlay lock & camera</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/apps')}
            >
              <View style={styles.iconCircle}>
                <Smartphone size={20} color={'#8A2BE2'} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Blocked Apps</Text>
                <Text style={styles.settingDesc}>Configure apps locked by screen timer</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </MasterCard>

          {/* Section 2: Audio & Haptics */}
          <Text style={styles.sectionHeader}>AUDIO & FEEDBACK</Text>
          <MasterCard style={styles.cardBlock}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Volume2 size={20} color={sfxEnabled ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={styles.settingTitle}>Sound Effects</Text>
                  <Text style={styles.settingDesc}>Synthesizer chimes and workout cues</Text>
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

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Vibrate size={20} color={hapticsEnabled ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={styles.settingTitle}>Vibration Haptics</Text>
                  <Text style={styles.settingDesc}>Tactile pulse on button taps & reps</Text>
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

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Bell size={20} color={notificationsEnabled ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={styles.settingTitle}>Daily Streak Reminders</Text>
                  <Text style={styles.settingDesc}>100% on-device local alerts</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleNotifications();
                }}
                trackColor={{ false: '#262626', true: colors.primary }}
                thumbColor={notificationsEnabled ? '#000000' : '#888888'}
              />
            </View>
          </MasterCard>

          {/* Section 3: Danger Zone */}
          <Text style={[styles.sectionHeader, { color: colors.danger }]}>DANGER ZONE</Text>
          <MasterCard style={[styles.cardBlock, { borderColor: `${colors.danger}40` }]}>
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => setShowResetModal(true)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Trash2 size={20} color={colors.danger} />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.danger }]}>Reset All Player Data</Text>
                <Text style={styles.settingDesc}>Clear coins, levels & restart protocol</Text>
              </View>
              <ChevronRight size={18} color={colors.danger} />
            </TouchableOpacity>
          </MasterCard>

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
          <MasterCard style={styles.resetModalSheet}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={24} color={colors.danger} />
              <Text style={styles.modalTitle}>Confirm Data Reset</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              This will permanently delete all earned Coins, Level progress, and Streak history from your offline database.
            </Text>

            <Text style={styles.inputPrompt}>Type <Text style={{ color: colors.primary, fontWeight: '900' }}>ARISE</Text> to confirm:</Text>
            <TextInput
              style={styles.resetInput}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="ARISE"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <MasterButton
              title="PERMANENTLY RESET DATA"
              onPress={handleResetData}
              variant="dark"
              style={{ backgroundColor: colors.danger, marginTop: 8 }}
            />
          </MasterCard>
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
    gap: 14,
    paddingTop: 8,
    paddingBottom: 30,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 6,
  },
  cardBlock: {
    padding: 6,
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
    backgroundColor: '#1C1C1C',
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
    color: colors.textPrimary,
  },
  settingDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E1E1E',
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
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    flex: 1,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inputPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  resetInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
