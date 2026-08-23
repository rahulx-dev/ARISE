import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { AriseIcon } from '../../src/components/ui/AriseIcon';
import { PreviewBadge } from '../../src/components/preview/PreviewBadge';
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

  const handleResetData = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ARISE') {
      Alert.alert('Verification Failed', 'Please type ARISE in capital letters to confirm data reset.');
      return;
    }

    await resetProfile();
    setShowResetModal(false);
    setConfirmInput('');
    haptics.heavy();
    Alert.alert('Data Reset', 'All local statistics, coins, and levels have been reset to fresh Level 1 state.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Preferences</Text>
        <PreviewBadge />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Core Navigation Hubs */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PERMISSIONS & RESTRICTIONS</Text>
          <Card variant="elevated" style={styles.card}>
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/permissions' as any)}
            >
              <View style={styles.iconCircle}>
                <AriseIcon name="shield" size={20} color={colors.secondary} glowIntensity="none" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>System Permissions Hub</Text>
                <Text style={styles.settingDesc}>Usage access, overlay lock, and notifications</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/apps')}
            >
              <View style={styles.iconCircle}>
                <AriseIcon name="lock" size={20} color={colors.primary} glowIntensity="none" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Manage Restricted Apps</Text>
                <Text style={styles.settingDesc}>Configure which apps require Coin purchases to open</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => router.push('/photos')}
            >
              <View style={styles.iconCircle}>
                <AriseIcon name="photo" size={20} color={colors.accentGold} glowIntensity="none" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Transformation Photos</Text>
                <Text style={styles.settingDesc}>Private on-device transformation timeline</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Audio & Haptics */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AUDIO & FEEDBACK</Text>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Sound Effects (SFX)</Text>
                <Text style={styles.settingDesc}>Audio cues for reps, achievements, and coin unlocks</Text>
              </View>
              <Switch
                value={sfxEnabled}
                onValueChange={() => {
                  toggleSfx();
                  haptics.light();
                }}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                thumbColor={sfxEnabled ? colors.background : colors.textMuted}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingDesc}>Tactile vibration for reps, rewards, and buttons</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={() => {
                  toggleHaptics();
                  haptics.light();
                }}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                thumbColor={hapticsEnabled ? colors.background : colors.textMuted}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Reminders for streak maintenance and quest resets</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  toggleNotifications();
                  haptics.light();
                }}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                thumbColor={notificationsEnabled ? colors.background : colors.textMuted}
              />
            </View>
          </Card>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.danger }]}>DATA MANAGEMENT</Text>
          <Card variant="elevated" style={[styles.card, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={[styles.settingTitle, { color: colors.danger }]}>
                  Reset All Offline Data
                </Text>
                <Text style={styles.settingDesc}>
                  Permanently clear all player XP, coins, streaks, and exercise history
                </Text>
              </View>
              <Button
                title="Reset"
                variant="danger"
                size="sm"
                onPress={() => setShowResetModal(true)}
              />
            </View>
          </Card>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.resetModalCard}>
            <View style={styles.modalHeader}>
              <AriseIcon name="warning" size={24} color={colors.danger} glowIntensity="medium" />
              <Text style={styles.modalTitle}>Confirm Factory Reset</Text>
            </View>

            <Text style={styles.modalBody}>
              This will permanently delete all progress, coins, stats, and recorded sessions. Type{' '}
              <Text style={{ fontWeight: '900', color: colors.primaryLight }}>ARISE</Text> below to confirm.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Type ARISE to confirm"
              placeholderTextColor={colors.textMuted}
              value={confirmInput}
              onChangeText={setConfirmInput}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => {
                  setShowResetModal(false);
                  setConfirmInput('');
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Erase All Data"
                variant="danger"
                size="md"
                onPress={handleResetData}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  scrollContent: { padding: 16, gap: 18 },
  section: { gap: 8 },
  sectionHeader: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5 },
  card: { padding: 14, gap: 10 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextGroup: { flex: 1, gap: 2 },
  settingTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  settingDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  resetModalCard: { padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.danger },
  modalBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
