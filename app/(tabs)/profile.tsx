import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Crown,
  ChevronRight,
  Mic,
  Moon,
  Sun,
  Globe,
  Bell,
  Shield,
  Cloud,
  Info,
  Plus,
  Flame,
  Award,
  Settings,
  Edit3,
  Check,
  X,
  PlayCircle,
  Sparkles,
} from 'lucide-react-native';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { getRankForLevel } from '../../src/constants/ranks';
import { db } from '../../src/database/client';
import { exerciseSession, achievement } from '../../src/database/schema';
import { LanguageSelectorModal } from '../../src/components/ui/LanguageSelectorModal';
import { AboutAriseSheet } from '../../src/components/ui/AboutAriseSheet';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { backupService } from '../../src/services/backupService';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/services/i18n';
import { ThemeMode } from '../../src/theme/themeEngine';
import { fontFamilies } from '../../src/theme/typography';

export default function WarriorProfileTab() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();
  const { t, language: currentLang, currentLangObj: activeLangObj } = useTranslation();

  const {
    notificationsEnabled,
    toggleNotifications,
    theme,
    setTheme,
  } = useSettingsStore();

  const [voiceCoachActive, setVoiceCoachActive] = useState<boolean>(true);
  const [totalWorkouts, setTotalWorkouts] = useState<number>(0);
  const [totalAchievements, setTotalAchievements] = useState<number>(0);
  const lastFocusLoadRef = useRef<number>(0);

  // Modals state
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [showLangModal, setShowLangModal] = useState<boolean>(false);
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      const [workouts, achs] = await Promise.all([
        db.select().from(exerciseSession),
        db.select().from(achievement),
      ]);
      setTotalWorkouts(workouts.length);
      setTotalAchievements(achs.length);
    } catch (e) {
      console.warn('Error fetching warrior stats:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusLoadRef.current > 10000) {
        lastFocusLoadRef.current = now;
        loadProfile();
        fetchStats();
      }
    }, [loadProfile])
  );

  useEffect(() => {
    loadProfile();
    fetchStats();
  }, [loadProfile]);

  const level = profile?.level || 12;
  const displayName = profile?.displayName || 'Hunter';
  const currentRank = getRankForLevel(level);
  const avatarIcon = profile?.avatarIcon || 'pfp_01';


  const handleExportBackup = async () => {
    haptics.medium();
    const success = await backupService.exportBackup();
    if (success) {
      haptics.success();
      showIOSAlert(
        'Backup Created',
        'Your local ARISE database was exported successfully to offline JSON backup.'
      );
    } else {
      showIOSAlert('Export Failed', 'Could not create offline backup file.');
    }
  };

  const themeDisplayLabel =
    theme === 'light'
      ? 'Light'
      : theme === 'dark'
      ? 'Dark (OLED)'
      : 'System';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action Bar */}
        <View style={styles.topBarRow}>
          <Text style={[styles.screenHeaderTitle, { color: colors.textPrimary }]}>
            WARRIOR PROFILE
          </Text>
          <TouchableOpacity
            style={[
              styles.settingsBtn,
              {
                backgroundColor: isDark ? '#1C1E2A' : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              haptics.light();
              router.push('/settings' as any);
            }}
            activeOpacity={0.7}
          >
            <Settings size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ================= 1. PROFILE HEADER CARD ================= */}
        <TouchableOpacity
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {
            haptics.light();
            router.push('/settings/profile-edit' as any);
          }}
          activeOpacity={0.88}
        >
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              <PlayerAvatar iconId={avatarIcon} size={72} />
              <View
                style={[
                  styles.crownPill,
                  { backgroundColor: isDark ? '#1A1C28' : '#FFFFFF' },
                ]}
              >
                <Crown size={14} color="#F59E0B" />
              </View>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.displayName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <View
                  style={[
                    styles.editBadge,
                    {
                      backgroundColor: isDark ? '#1C1E2A' : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Edit3 size={12} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.editBadgeText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Edit
                  </Text>
                </View>
              </View>
              <Text style={styles.rankSubText}>
                {t('level', 'Level')} {level} • {currentRank.rankCode}-{t('rankHunter', 'Rank Hunter').replace('{0}-', '')}
              </Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpWrap}>
            <View style={styles.xpLabelRow}>
              <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
                XP Progress
              </Text>
              <Text
                style={[styles.xpFraction, { color: colors.textPrimary }]}
              >
                380 / 500 XP (76%)
              </Text>
            </View>
            <View
              style={[
                styles.xpTrack,
                { backgroundColor: isDark ? '#1A1C28' : '#F3F4F6' },
              ]}
            >
              <View style={[styles.xpFill, { width: '76%' }]} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= 2. ATTRIBUTES SECTION ================= */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Attributes
          </Text>
          <View style={styles.attributesRow}>
            <View
              style={[
                styles.attributeBadge,
                {
                  backgroundColor: isDark ? '#2D1414' : '#FEE2E2',
                  borderColor: isDark ? '#4C1D24' : '#FECACA',
                },
              ]}
            >
              <Text style={[styles.attributeCode, { color: '#EF4444' }]}>
                STR
              </Text>
              <Text style={[styles.attributeVal, { color: '#EF4444' }]}>
                80
              </Text>
            </View>

            <View
              style={[
                styles.attributeBadge,
                {
                  backgroundColor: isDark ? '#0F2E22' : '#D1FAE5',
                  borderColor: isDark ? '#134E39' : '#A7F3D0',
                },
              ]}
            >
              <Text style={[styles.attributeCode, { color: '#10B981' }]}>
                DIS
              </Text>
              <Text style={[styles.attributeVal, { color: '#10B981' }]}>
                95
              </Text>
            </View>

            <View
              style={[
                styles.attributeBadge,
                {
                  backgroundColor: isDark ? '#0C2B44' : '#E0F2FE',
                  borderColor: isDark ? '#0C4A6E' : '#BAE6FD',
                },
              ]}
            >
              <Text style={[styles.attributeCode, { color: '#0EA5E9' }]}>
                FOC
              </Text>
              <Text style={[styles.attributeVal, { color: '#0EA5E9' }]}>
                78
              </Text>
            </View>

            <View
              style={[
                styles.attributeBadge,
                {
                  backgroundColor: isDark ? '#26123D' : '#EDE9FE',
                  borderColor: isDark ? '#4A1D75' : '#DDD6FE',
                },
              ]}
            >
              <Text style={[styles.attributeCode, { color: '#A855F7' }]}>
                HLT
              </Text>
              <Text style={[styles.attributeVal, { color: '#A855F7' }]}>
                70
              </Text>
            </View>

            <View
              style={[
                styles.attributeBadge,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                  borderColor: isDark ? '#312E81' : '#E0E7FF',
                },
              ]}
            >
              <Text style={[styles.attributeCode, { color: '#6366F1' }]}>
                INT
              </Text>
              <Text style={[styles.attributeVal, { color: '#6366F1' }]}>
                65
              </Text>
            </View>
          </View>
        </View>

        {/* ================= 3. TRANSFORMATION JOURNEY ================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderBetween}>
            <Text
              style={[styles.sectionHeading, { color: colors.textPrimary }]}
            >
              Transformation Journey
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                router.push('/photos' as any);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.transformationScroll}
          >
            {/* Before Card */}
            <TouchableOpacity
              style={[
                styles.transformCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/photos' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.transformPlaceholder,
                  { backgroundColor: isDark ? '#1A1C28' : '#F3F4F6' },
                ]}
              >
                <Text style={styles.transformPlaceholderEmoji}>💪</Text>
              </View>
              <Text
                style={[
                  styles.transformCardTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Before
              </Text>
              <Text
                style={[
                  styles.transformCardSub,
                  { color: colors.textSecondary },
                ]}
              >
                Day 1 • 78 kg
              </Text>
            </TouchableOpacity>

            {/* After Card */}
            <TouchableOpacity
              style={[
                styles.transformCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/photos' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.transformPlaceholder,
                  { backgroundColor: isDark ? '#2D1414' : '#FEF2F2' },
                ]}
              >
                <Text style={styles.transformPlaceholderEmoji}>🔥</Text>
              </View>
              <Text
                style={[
                  styles.transformCardTitle,
                  { color: colors.textPrimary },
                ]}
              >
                After
              </Text>
              <Text
                style={[
                  styles.transformCardSub,
                  { color: colors.textSecondary },
                ]}
              >
                Day 45 • 72 kg
              </Text>
            </TouchableOpacity>

            {/* Add Photo Card */}
            <TouchableOpacity
              style={[
                styles.addPhotoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/photos' as any);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.addPhotoCircle,
                  { backgroundColor: isDark ? '#1A1C28' : '#E5E7EB' },
                ]}
              >
                <Plus size={20} color={colors.textSecondary} />
              </View>
              <Text
                style={[
                  styles.addPhotoText,
                  { color: colors.textSecondary },
                ]}
              >
                Add Photo
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ================= 4. SETTINGS & PREFERENCES ================= */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            {t('generalSettings', 'Preferences')}
          </Text>

          <View
            style={[
              styles.settingsGroupCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Voice Coach */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#2D1414' : '#FEE2E2' },
                  ]}
                >
                  <Mic size={18} color="#E53935" />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('voiceCoach', 'Voice Coach')}
                </Text>
              </View>
              <Switch
                value={voiceCoachActive}
                onValueChange={(v) => {
                  haptics.light();
                  setVoiceCoachActive(v);
                }}
                trackColor={{
                  false: isDark ? '#2A2D3D' : '#E5E7EB',
                  true: isDark ? '#3A3F55' : '#D1D5DB',
                }}
                thumbColor={
                  voiceCoachActive
                    ? '#0A84FF'
                    : isDark
                    ? '#6B7280'
                    : '#FFFFFF'
                }
                ios_backgroundColor={isDark ? '#2A2D3D' : '#E5E7EB'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Theme */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                setShowThemeModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#26123D' : '#EDE9FE' },
                  ]}
                >
                  <Moon size={18} color="#A855F7" />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('themeMode', 'Theme Mode')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{themeDisplayLabel}</Text>
                <ChevronRight size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Language */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                setShowLangModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#0C2B44' : '#E0F2FE' },
                  ]}
                >
                  <Globe size={18} color="#0284C7" />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('language', 'Language')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  {activeLangObj?.flag} {activeLangObj?.label}
                </Text>
                <ChevronRight size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Notifications */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#33210C' : '#FEF3C7' },
                  ]}
                >
                  <Bell size={18} color="#D97706" />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('notifications', 'Notifications')}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleNotifications();
                }}
                trackColor={{
                  false: isDark ? '#2A2D3D' : '#E5E7EB',
                  true: isDark ? '#3A3F55' : '#D1D5DB',
                }}
                thumbColor={
                  notificationsEnabled
                    ? '#0A84FF'
                    : isDark
                    ? '#6B7280'
                    : '#FFFFFF'
                }
                ios_backgroundColor={isDark ? '#2A2D3D' : '#E5E7EB'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* App Blocking */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings/apps' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#2D1414' : '#FEE2E2' },
                  ]}
                >
                  <Shield size={18} color="#DC2626" />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('appBlocker', 'App Blocking & Detox')}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Cloud / Local Backup */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleExportBackup}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#0C2B44' : '#E0F2FE' },
                  ]}
                >
                  <Cloud size={18} color="#0A84FF" />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('backupData', 'Offline Backup & Export')}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />


            {/* About ARISE */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                setIsAboutSheetOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View
                  style={[
                    styles.settingsIconWrap,
                    { backgroundColor: isDark ? '#1A1C28' : '#F3F4F6' },
                  ]}
                >
                  <Info size={18} color={colors.textSecondary} />
                </View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t('aboutArise', 'About ARISE')}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Theme Selector Modal */}
      <Modal
        visible={showThemeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Theme Mode
              </Text>
              <TouchableOpacity
                onPress={() => setShowThemeModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              {[
                {
                  mode: 'light' as ThemeMode,
                  label: 'Light',
                  desc: 'Clean white presentation (Recommended)',
                },
                {
                  mode: 'dark' as ThemeMode,
                  label: 'Dark (OLED)',
                  desc: 'True AMOLED pure black',
                },
                {
                  mode: 'system' as ThemeMode,
                  label: 'System',
                  desc: 'Follow device OS configuration',
                },
              ].map((item) => {
                const isSelected = theme === item.mode;
                return (
                  <TouchableOpacity
                    key={item.mode}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isDark ? '#12131A' : '#F9FAFB',
                        borderColor: isSelected ? '#0A84FF' : colors.border,
                      },
                    ]}
                    onPress={() => {
                      haptics.medium();
                      setTheme(item.mode);
                      setShowThemeModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: isSelected ? '#0A84FF' : colors.textPrimary,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDesc,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.optionCheck}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={showLangModal}
        onClose={() => setShowLangModal(false)}
      />


      {/* About ARISE Bottom Sheet */}
      <AboutAriseSheet
        visible={isAboutSheetOpen}
        onClose={() => setIsAboutSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
    paddingBottom: 40,
  },

  // Top Bar Row
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 1. Profile Header Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  crownPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  displayName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    flex: 1,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
  rankSubText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#E53935',
  },
  xpWrap: {
    gap: 6,
  },
  xpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
  },
  xpFraction: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#E53935',
  },

  // 2. Attributes Section
  sectionWrap: {
    gap: 12,
  },
  sectionHeading: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLinkText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#E53935',
  },
  attributesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attributeBadge: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
  },
  attributeCode: {
    fontFamily: fontFamilies.medium,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  attributeVal: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // 3. Transformation Journey
  transformationScroll: {
    flexDirection: 'row',
    gap: 12,
  },
  transformCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
    gap: 4,
  },
  transformPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  transformPlaceholderEmoji: {
    fontSize: 32,
  },
  transformCardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
  },
  transformCardSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
  },
  addPhotoCard: {
    width: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
  },

  // 4. Settings Group
  settingsGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 10,
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
  },
  settingsRowSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
  },
  optionDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
