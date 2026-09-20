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
  ChevronRight,
  Sun,
  Moon,
  Globe,
  Bell,
  Volume2,
  Vibrate,
  Shield,
  Lock,
  Cloud,
  Download,
  PlayCircle,
  Info,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { LanguageSelectorModal } from '../../src/components/ui/LanguageSelectorModal';
import { HowToUseModal } from '../../src/components/ui/HowToUseModal';
import { InAppSurveyModal } from '../../src/components/surveys/InAppSurveyModal';
import { AboutAriseSheet } from '../../src/components/ui/AboutAriseSheet';
import { getTutorialUrl } from '../../src/config/webConfig';
import { useLanguageStore, SUPPORTED_LANGUAGES } from '../../src/services/i18n';
import { backupService } from '../../src/services/backupService';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { ThemeMode } from '../../src/theme/themeEngine';

export default function SettingsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const {
    sfxEnabled,
    hapticsEnabled,
    notificationsEnabled,
    theme,
    toggleSfx,
    toggleHaptics,
    toggleNotifications,
    setTheme,
  } = useSettingsStore();

  const resetProfile = usePlayerStore((s) => s.resetProfile);

  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [showLangModal, setShowLangModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState<boolean>(false);
  const [showHowToUseModal, setShowHowToUseModal] = useState<boolean>(false);
  const [tutorialWebModal, setTutorialWebModal] = useState<{
    visible: boolean;
    url: string | null;
    title: string;
  }>({
    visible: false,
    url: null,
    title: '',
  });
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');

  const currentLang = useLanguageStore((s) => s.language);
  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang);

  const handleSelectTutorialLang = (lang: 'hi' | 'en') => {
    setShowHowToUseModal(false);
    const url = getTutorialUrl(lang);
    setTutorialWebModal({
      visible: true,
      url,
      title: lang === 'hi' ? 'ARISE HINDI GUIDE // VIDEO TUTORIAL' : 'ARISE ENGLISH GUIDE // VIDEO TUTORIAL',
    });
  };

  const handleExportBackup = async () => {
    haptics.medium();
    const success = await backupService.exportBackup();
    if (success) {
      haptics.success();
      showIOSAlert('Backup Created', 'Your local ARISE database was exported successfully to JSON.');
    } else {
      showIOSAlert('Export Failed', 'Could not create offline backup file.');
    }
  };

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

  const themeDisplayLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark (OLED)' : 'System';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: APPEARANCE */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>APPEARANCE</Text>
          <View style={styles.cardGroup}>
            {/* Theme */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowThemeModal(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Sun size={18} color="#E53935" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Theme Mode</Text>
                <Text style={styles.menuDesc}>Light, Dark (OLED) or System</Text>
              </View>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>{themeDisplayLabel}</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Language */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowLangModal(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Globe size={18} color="#0284C7" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Language</Text>
                <Text style={styles.menuDesc}>App display language</Text>
              </View>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>
                  {activeLangObj?.flag} {activeLangObj?.label}
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: AUDIO & EXPERIENCE */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>EXPERIENCE & AUDIO</Text>
          <View style={styles.cardGroup}>
            {/* Notifications */}
            <View style={styles.menuRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Bell size={18} color="#D97706" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Notifications</Text>
                <Text style={styles.menuDesc}>Daily workout reminders & streak alerts</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleNotifications();
                }}
                trackColor={{ false: '#E5E7EB', true: '#E53935' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* SFX */}
            <View style={styles.menuRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Volume2 size={18} color="#7C3AED" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Sound Effects (SFX)</Text>
                <Text style={styles.menuDesc}>Rep counts, gate completions & UI sounds</Text>
              </View>
              <Switch
                value={sfxEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleSfx();
                }}
                trackColor={{ false: '#E5E7EB', true: '#E53935' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Haptics */}
            <View style={styles.menuRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Vibrate size={18} color="#059669" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Vibration Haptics</Text>
                <Text style={styles.menuDesc}>Tactile pulse feedback on button taps & reps</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleHaptics();
                }}
                trackColor={{ false: '#E5E7EB', true: '#E53935' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Section 3: APP BLOCKING & DETOX */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>DIGITAL DETOX & SECURITY</Text>
          <View style={styles.cardGroup}>
            {/* Blocked Apps */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/settings/apps' as any);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Lock size={18} color="#DC2626" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>App Blocking & Screen Time</Text>
                <Text style={styles.menuDesc}>Select restricted apps & time limits</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Permissions */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/permissions' as any);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Shield size={18} color="#0284C7" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Permissions Hub</Text>
                <Text style={styles.menuDesc}>Usage access, overlay & camera status</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: DATA & PRIVACY */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>DATA & PRIVACY</Text>
          <View style={styles.cardGroup}>
            {/* Export Backup */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={handleExportBackup}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Download size={18} color="#059669" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Export Offline Backup</Text>
                <Text style={styles.menuDesc}>Export workouts, XP and streaks to JSON</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowPrivacyModal(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                <Shield size={18} color="#4F46E5" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Privacy & Security</Text>
                <Text style={styles.menuDesc}>100% on-device pose estimation details</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: GUIDE & ABOUT */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>HELP & ABOUT</Text>
          <View style={styles.cardGroup}>
            {/* How to Use */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowHowToUseModal(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <PlayCircle size={18} color="#E53935" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>How to Use (Video Guide)</Text>
                <Text style={styles.menuDesc}>Watch official tutorial in Hindi or English</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* About ARISE */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setIsAboutSheetOpen(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
                <Info size={18} color="#4B5563" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>About ARISE</Text>
                <Text style={styles.menuDesc}>Version 1.0.0 • Monarch Edition</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 6: DANGER ZONE */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: '#DC2626' }]}>DANGER ZONE</Text>
          <View style={[styles.cardGroup, { borderColor: '#FECACA' }]}>
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.warning();
                setShowResetModal(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <AlertTriangle size={18} color="#DC2626" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Clean Protocol Reset</Text>
                <Text style={styles.menuDesc}>Delete all local data and restart fresh</Text>
              </View>
              <ChevronRight size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} animationType="fade" transparent onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Theme Mode</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8, marginTop: 10 }}>
              {[
                { mode: 'light' as ThemeMode, label: 'Light', desc: 'Clean white presentation (Recommended)' },
                { mode: 'dark' as ThemeMode, label: 'Dark (OLED)', desc: 'True AMOLED pure black' },
                { mode: 'system' as ThemeMode, label: 'System', desc: 'Follow device OS configuration' },
              ].map((item) => {
                const isSelected = theme === item.mode;
                return (
                  <TouchableOpacity
                    key={item.mode}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => {
                      haptics.light();
                      setTheme(item.mode);
                      setShowThemeModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && { color: '#E53935' }]}>{item.label}</Text>
                      <Text style={styles.optionDesc}>{item.desc}</Text>
                    </View>
                    {isSelected && <Check size={18} color="#E53935" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} animationType="fade" transparent onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy & Security</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.privacyBox}>
              <Text style={styles.privacyHeading}>100% ON-DEVICE PRIVACY</Text>
              <Text style={styles.privacyBody}>
                • Camera frames are analyzed entirely in volatile RAM by Google ML Kit and discarded immediately.{'\n\n'}
                • No workout camera video or images are ever stored or transmitted to remote servers.{'\n\n'}
                • All quest history, streak metrics, and profile data are stored safely in your local SQLite database on your device.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowPrivacyModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>UNDERSTOOD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal visible={showResetModal} animationType="slide" transparent onRequestClose={() => setShowResetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { borderColor: '#DC2626' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Clean Protocol Reset</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.resetWarningText}>
              This will permanently wipe all Coins, XP, Level progress, workout logs, and photos, returning ARISE to the first-launch setup.
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 10 }}>
              Type <Text style={{ color: '#E53935', fontWeight: '900' }}>ARISE</Text> to confirm:
            </Text>
            <TextInput
              style={styles.resetInput}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="ARISE"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.modalPrimaryBtn,
                { backgroundColor: confirmInput.trim().toUpperCase() === 'ARISE' ? '#DC2626' : '#E5E7EB' },
              ]}
              onPress={handleResetData}
              disabled={confirmInput.trim().toUpperCase() !== 'ARISE'}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modalPrimaryBtnText,
                  { color: confirmInput.trim().toUpperCase() === 'ARISE' ? '#FFFFFF' : '#9CA3AF' },
                ]}
              >
                PERMANENTLY RESET ALL DATA
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelectorModal visible={showLangModal} onClose={() => setShowLangModal(false)} />

      {/* Video Guide Selector */}
      <HowToUseModal
        visible={showHowToUseModal}
        onClose={() => setShowHowToUseModal(false)}
        onSelectLanguage={handleSelectTutorialLang}
      />

      {/* In-App Web Video Guide */}
      <InAppSurveyModal
        visible={tutorialWebModal.visible}
        url={tutorialWebModal.url}
        title={tutorialWebModal.title}
        provider="OFFICIAL VIDEO GUIDE"
        onClose={() => setTutorialWebModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* About Sheet */}
      <AboutAriseSheet visible={isAboutSheetOpen} onClose={() => setIsAboutSheetOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
    paddingBottom: 40,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  menuDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  optionCardActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECACA',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  optionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  privacyBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  privacyHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0284C7',
  },
  privacyBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
  modalPrimaryBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetWarningText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  resetInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
});
