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
  CaretRight,
  SunDim,
  Moon,
  Sliders,
  Globe,
  Clock,
  Bell,
  SpeakerHigh,
  Shield,
  Prohibit,
  DownloadSimple,
  Lock,
  PlayCircle,
  Info,
  X,
  Warning,
  Check,
} from 'phosphor-react-native';
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
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const [showAudioModal, setShowAudioModal] = useState<boolean>(false);
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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              haptics.light();
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#F5F5F2" weight="bold" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>SETTINGS</Text>
            <Text style={styles.headerSub}>FINE TUNE YOUR JOURNEY</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section 1: APPEARANCE */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>APPEARANCE</Text>
            <Text style={styles.sectionSub}>YOUR ENVIRONMENT MATTERS</Text>
          </View>
          <View style={styles.cardGroup}>
            {/* Theme Mode */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowThemeModal(true);
              }}
            >
              <View style={styles.iconCircle}>
                <SunDim size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Theme Mode</Text>
                <Text style={styles.menuDesc}>Light, Dark (OLED) or System</Text>
              </View>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>{themeDisplayLabel}</Text>
                <CaretRight size={14} color="#A6A9AE" weight="bold" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Language */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowLangModal(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Globe size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Language</Text>
                <Text style={styles.menuDesc}>App language</Text>
              </View>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>
                  {activeLangObj?.flag} {activeLangObj?.label}
                </Text>
                <CaretRight size={14} color="#A6A9AE" weight="bold" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 2: EXPERIENCE */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>EXPERIENCE</Text>
            <Text style={styles.sectionSub}>PERSONALIZE YOUR FLOW</Text>
          </View>
          <View style={styles.cardGroup}>
            {/* Notifications */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowNotifModal(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Bell size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Notifications</Text>
                <Text style={styles.menuDesc}>Reminders, alerts & updates</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Sounds & Haptics */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowAudioModal(true);
              }}
            >
              <View style={styles.iconCircle}>
                <SpeakerHigh size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Sounds & Haptics</Text>
                <Text style={styles.menuDesc}>SFX and vibration settings</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Section 3: SECURITY & ACCESS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SECURITY & ACCESS</Text>
            <Text style={styles.sectionSub}>STAY IN CONTROL</Text>
          </View>
          <View style={styles.cardGroup}>
            {/* Permissions Hub */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/permissions' as any);
              }}
            >
              <View style={styles.iconCircle}>
                <Shield size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Permissions Hub</Text>
                <Text style={styles.menuDesc}>Usage access, overlay & camera status</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Blocked Distraction Apps & Time Limit */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/settings/apps');
              }}
            >
              <View style={styles.iconCircle}>
                <Prohibit size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Blocked Apps & Time Limit</Text>
                <Text style={styles.menuDesc}>Select apps and configure daily limit</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Section 4: DATA & PRIVACY */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
            <Text style={styles.sectionSub}>YOUR DATA. YOURS.</Text>
          </View>
          <View style={styles.cardGroup}>
            {/* Export Offline Backup */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={handleExportBackup}
            >
              <View style={styles.iconCircle}>
                <DownloadSimple size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Export Offline Backup</Text>
                <Text style={styles.menuDesc}>Save progress, PRs and streak history to JSON</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Privacy & Security */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setShowPrivacyModal(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Lock size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Privacy & Security</Text>
                <Text style={styles.menuDesc}>Your data, camera feed and local storage</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Section 5: HELP & ABOUT */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>HELP & ABOUT</Text>
            <Text style={styles.sectionSub}>SUPPORT & INFORMATION</Text>
          </View>
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
              <View style={styles.iconCircle}>
                <PlayCircle size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>How to Use (Video Guide)</Text>
                <Text style={styles.menuDesc}>Watch official tutorial in Hindi or English</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* About ARISE */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                setIsAboutSheetOpen(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Info size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>About ARISE</Text>
                <Text style={styles.menuDesc}>Version, credits and legal info</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Section 6: SYSTEM / PROTOCOL RESET */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>DANGER ZONE</Text>
            <Text style={styles.sectionSub}>PROTOCOL RESET</Text>
          </View>
          <View style={[styles.cardGroup, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.warning();
                setShowResetModal(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Warning size={19} color="#EF4444" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuTitle, { color: '#EF4444' }]}>Clean Protocol Reset</Text>
                <Text style={styles.menuDesc}>Delete all data and return to first launch state</Text>
              </View>
              <CaretRight size={18} color="#EF4444" weight="bold" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SunDim size={22} color="#9AAEFF" weight="duotone" />
                <Text style={styles.modalTitle}>Select Theme Mode</Text>
              </View>
              <TouchableOpacity onPress={() => setShowThemeModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#A6A9AE" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Choose your preferred visual presentation for ARISE.
            </Text>

            <View style={{ gap: 8, marginTop: 4 }}>
              {[
                { mode: 'light' as ThemeMode, label: 'Light', desc: 'Crisp light presentation', icon: SunDim },
                { mode: 'dark' as ThemeMode, label: 'Dark (OLED)', desc: 'True AMOLED pure black', icon: Moon },
                { mode: 'system' as ThemeMode, label: 'System', desc: 'Follows device OS configuration', icon: Sliders },
              ].map((item) => {
                const isSelected = theme === item.mode;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.mode}
                    style={[
                      styles.modalOptionCard,
                      isSelected && styles.modalOptionCardActive,
                    ]}
                    onPress={() => {
                      haptics.light();
                      setTheme(item.mode);
                      setShowThemeModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <IconComponent size={20} color={isSelected ? '#9AAEFF' : '#A6A9AE'} weight="duotone" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.modalOptionTitle, isSelected && { color: '#9AAEFF' }]}>
                        {item.label}
                      </Text>
                      <Text style={styles.modalOptionSub}>{item.desc}</Text>
                    </View>
                    {isSelected && <Check size={18} color="#9AAEFF" weight="bold" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Bell size={22} color="#9AAEFF" weight="duotone" />
                <Text style={styles.modalTitle}>Notification Settings</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#A6A9AE" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Configure system alerts, daily workout reset reminders, and streak milestone notifications.
            </Text>

            <View style={styles.toggleRowCard}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.toggleTitle}>System Notifications</Text>
                <Text style={styles.toggleDesc}>Daily quests, rank promotions & penalty alerts</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleNotifications();
                }}
                trackColor={{ false: '#262626', true: '#9AAEFF' }}
                thumbColor={notificationsEnabled ? '#050607' : '#888888'}
              />
            </View>

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setShowNotifModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalConfirmBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sounds & Haptics Modal */}
      <Modal
        visible={showAudioModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAudioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SpeakerHigh size={22} color="#9AAEFF" weight="duotone" />
                <Text style={styles.modalTitle}>Sounds & Haptics</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAudioModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#A6A9AE" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Hardware-accelerated sound synthesis and haptic response feedback for workout execution.
            </Text>

            <View style={{ gap: 10, marginTop: 4 }}>
              <View style={styles.toggleRowCard}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.toggleTitle}>Sound Effects (SFX)</Text>
                  <Text style={styles.toggleDesc}>Rep counts, gate completion & level-up soundscapes</Text>
                </View>
                <Switch
                  value={sfxEnabled}
                  onValueChange={() => {
                    haptics.light();
                    toggleSfx();
                  }}
                  trackColor={{ false: '#262626', true: '#9AAEFF' }}
                  thumbColor={sfxEnabled ? '#050607' : '#888888'}
                />
              </View>

              <View style={styles.toggleRowCard}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.toggleTitle}>Vibration Haptics</Text>
                  <Text style={styles.toggleDesc}>Tactile vibration pulses on rep success & button taps</Text>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={() => {
                    haptics.light();
                    toggleHaptics();
                  }}
                  trackColor={{ false: '#262626', true: '#9AAEFF' }}
                  thumbColor={hapticsEnabled ? '#050607' : '#888888'}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setShowAudioModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalConfirmBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy & Security Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Lock size={22} color="#9AAEFF" weight="duotone" />
                <Text style={styles.modalTitle}>Privacy & Security</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#A6A9AE" />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyHighlightBox}>
              <Text style={styles.privacyHighlightTitle}>100% ON-DEVICE PRIVACY</Text>
              <Text style={styles.privacyHighlightBody}>
                • Camera frames are analyzed entirely in volatile RAM by Google ML Kit and discarded immediately.{'\n'}
                • No workout camera video or pictures are ever sent to remote servers.{'\n'}
                • All quest history, streak metrics, and profile data are stored in your local SQLite database on your device.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setShowPrivacyModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalConfirmBtnText}>UNDERSTOOD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { borderColor: '#EF4444' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Warning size={24} color="#EF4444" weight="duotone" />
                <Text style={styles.modalTitle}>Clean Protocol Reset</Text>
              </View>
              <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#A6A9AE" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              This will permanently delete all Coins, XP, Level, workout history, and photo timelines, returning ARISE to the initial first-launch state.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#A6A9AE', marginTop: 4 }}>
              Type <Text style={{ color: '#9AAEFF', fontWeight: '900' }}>ARISE</Text> to confirm:
            </Text>
            <TextInput
              style={styles.resetTextInput}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="ARISE"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                { backgroundColor: confirmInput.trim().toUpperCase() === 'ARISE' ? '#EF4444' : '#262626' },
              ]}
              onPress={handleResetData}
              disabled={confirmInput.trim().toUpperCase() !== 'ARISE'}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalConfirmBtnText, { color: confirmInput.trim().toUpperCase() === 'ARISE' ? '#FFFFFF' : '#888888' }]}>
                PERMANENTLY RESET ALL DATA
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={showLangModal}
        onClose={() => setShowLangModal(false)}
      />

      {/* How to Use Language Selector Modal (Hindi / English) */}
      <HowToUseModal
        visible={showHowToUseModal}
        onClose={() => setShowHowToUseModal(false)}
        onSelectLanguage={handleSelectTutorialLang}
      />

      {/* In-App Web Video Guide Viewer */}
      <InAppSurveyModal
        visible={tutorialWebModal.visible}
        url={tutorialWebModal.url}
        title={tutorialWebModal.title}
        provider="OFFICIAL VIDEO GUIDE"
        onClose={() => setTutorialWebModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* About ARISE Sheet */}
      <AboutAriseSheet
        visible={isAboutSheetOpen}
        onClose={() => setIsAboutSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050607',
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0E1115',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F5F5F2',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A6A9AE',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F5F5F2',
    letterSpacing: 1.2,
  },
  sectionSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A6A9AE',
    letterSpacing: 1,
  },
  cardGroup: {
    backgroundColor: '#0E1115',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(154, 174, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F2',
  },
  menuDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#A6A9AE',
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 64,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F5F5F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#0E1115',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(154, 174, 255, 0.3)',
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F5F2',
  },
  modalDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#A6A9AE',
  },
  modalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalOptionCardActive: {
    backgroundColor: 'rgba(154, 174, 255, 0.1)',
    borderColor: '#9AAEFF',
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F5F5F2',
  },
  modalOptionSub: {
    fontSize: 11.5,
    color: '#A6A9AE',
  },
  toggleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F5F5F2',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#A6A9AE',
  },
  modalConfirmBtn: {
    backgroundColor: '#9AAEFF',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#050607',
    letterSpacing: 0.5,
  },
  privacyHighlightBox: {
    backgroundColor: 'rgba(154, 174, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(154, 174, 255, 0.15)',
    padding: 14,
    gap: 6,
  },
  privacyHighlightTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9AAEFF',
    letterSpacing: 1,
  },
  privacyHighlightBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#A6A9AE',
  },
  resetTextInput: {
    backgroundColor: '#050607',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F5F2',
  },
});
