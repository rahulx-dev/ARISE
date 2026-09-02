import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera as CameraIcon,
  Image as ImageIcon,
  User,
  Check,
  Sparkles,
  Volume2,
  Vibrate,
  Music,
  Sun,
  Moon,
  Smartphone,
  Save,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { AVATAR_IMAGES, AVATAR_ICONS } from '../../src/components/profile/AvatarPicker';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeMode } from '../../src/theme/themeEngine';

export default function ProfileEditScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, themeMode } = useTheme();

  const profile = usePlayerStore((s) => s.profile);
  const updateProfile = usePlayerStore((s) => s.updateProfile);

  const settingsState = useSettingsStore();

  const [displayName, setDisplayName] = useState<string>(profile?.displayName || 'Warrior');
  const [bio, setBio] = useState<string>(profile?.bio || 'Disciplined warrior in training.');
  const [workoutGoal, setWorkoutGoal] = useState<string>(profile?.workoutGoal || 'strength');
  const [dailyFocusGoal, setDailyFocusGoal] = useState<number>(profile?.dailyFocusGoal || 30);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile?.avatarIcon || 'img_pfp_01');
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(profile?.profileImageUri || null);
  const [avatarTab, setAvatarTab] = useState<'images' | 'icons'>('images');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleCaptureCameraAvatar = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showIOSAlert('Permission Required', 'Camera permission is required to capture an avatar.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCustomPhotoUri(result.assets[0].uri);
      setSelectedAvatar('custom');
      haptics.light();
    }
  };

  const handleGalleryAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCustomPhotoUri(result.assets[0].uri);
      setSelectedAvatar('custom');
      haptics.light();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    haptics.heavy();

    try {
      await updateProfile({
        displayName: displayName.trim() || 'Warrior',
        bio: bio.trim(),
        avatarIcon: selectedAvatar,
        profileImageUri: customPhotoUri,
        workoutGoal,
        dailyFocusGoal,
      });

      haptics.success();
      router.back();
    } catch (e) {
      console.warn('Failed to save profile:', e);
      setIsSaving(false);
    }
  };

  const currentAvatarImage = AVATAR_IMAGES.find((img) => img.id === selectedAvatar);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>EDIT PROTOCOL PROFILE</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.saveHeaderText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Hero Card */}
          <GlowCard variant="glow" style={styles.avatarSectionCard}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatarWrap, { borderColor: colors.primary }]}>
                {customPhotoUri && selectedAvatar === 'custom' ? (
                  <Image source={{ uri: customPhotoUri }} style={styles.avatarImg} />
                ) : currentAvatarImage ? (
                  <Image source={currentAvatarImage.source} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <User size={40} color={colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.avatarActionCol}>
                <Text style={[styles.avatarSectionTitle, { color: colors.textPrimary }]}>Profile Image</Text>
                <Text style={[styles.avatarSectionSub, { color: colors.textSecondary }]}>
                  Choose from cyber avatars, or upload your own.
                </Text>

                <View style={styles.avatarButtonsRow}>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                    onPress={handleCaptureCameraAvatar}
                  >
                    <CameraIcon size={14} color={colors.textPrimary} />
                    <Text style={[styles.smallActionBtnText, { color: colors.textPrimary }]}>CAMERA</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                    onPress={handleGalleryAvatar}
                  >
                    <ImageIcon size={14} color={colors.textPrimary} />
                    <Text style={[styles.smallActionBtnText, { color: colors.textPrimary }]}>GALLERY</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Built-in Avatars Horizontal Grid */}
            <View style={styles.avatarTabsHeader}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>BUILT-IN CYBER AVATARS</Text>
              <View style={[styles.tabPillWrap, { backgroundColor: colors.surfaceLight }]}>
                <TouchableOpacity
                  onPress={() => setAvatarTab('images')}
                  style={[styles.tabPill, avatarTab === 'images' && { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[styles.tabPillText, avatarTab === 'images' && { color: colors.primary }]}>
                    PFPs ({AVATAR_IMAGES.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAvatarTab('icons')}
                  style={[styles.tabPill, avatarTab === 'icons' && { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[styles.tabPillText, avatarTab === 'icons' && { color: colors.primary }]}>
                    ICONS
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {avatarTab === 'images' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScroll}>
                {AVATAR_IMAGES.map((img) => {
                  const isSelected = selectedAvatar === img.id && !customPhotoUri;
                  return (
                    <TouchableOpacity
                      key={img.id}
                      onPress={() => {
                        haptics.light();
                        setSelectedAvatar(img.id);
                        setCustomPhotoUri(null);
                      }}
                      style={[
                        styles.avatarThumbWrap,
                        isSelected && { borderColor: colors.primary, transform: [{ scale: 1.08 }] },
                      ]}
                    >
                      <Image source={img.source} style={styles.avatarThumbImg} />
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Check size={12} color="#000" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScroll}>
                {AVATAR_ICONS.map((iconItem) => {
                  const isSelected = selectedAvatar === iconItem.id && !customPhotoUri;
                  const IconComp = iconItem.component;
                  return (
                    <TouchableOpacity
                      key={iconItem.id}
                      onPress={() => {
                        haptics.light();
                        setSelectedAvatar(iconItem.id);
                        setCustomPhotoUri(null);
                      }}
                      style={[
                        styles.avatarThumbWrap,
                        styles.iconThumbWrap,
                        isSelected && { borderColor: colors.primary, transform: [{ scale: 1.08 }] },
                      ]}
                    >
                      <IconComp size={22} color={isSelected ? colors.primary : colors.textMuted} />
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Check size={12} color="#000" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </GlowCard>

          {/* Display Name & Bio */}
          <GlowCard variant="default" style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DISPLAY NAME / CALLSIGN</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter warrior name"
                placeholderTextColor={colors.textMuted}
                maxLength={24}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>WARRIOR BIO / MANIFESTO</Text>
              <TextInput
                style={[styles.inputBox, styles.bioInputBox, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Your motivation manifesto"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={120}
              />
            </View>
          </GlowCard>

          {/* Protocol Goals */}
          <GlowCard variant="default" style={styles.formCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>PROTOCOL TARGETS</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>PRIMARY WORKOUT GOAL</Text>
              <View style={styles.optionsRow}>
                {[
                  { id: 'strength', label: 'Strength' },
                  { id: 'muscle_gain', label: 'Hypertrophy' },
                  { id: 'fat_loss', label: 'Fat Loss' },
                  { id: 'general_fitness', label: 'Fitness' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      haptics.light();
                      setWorkoutGoal(item.id);
                    }}
                    style={[
                      styles.optionPill,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      workoutGoal === item.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        { color: colors.textSecondary },
                        workoutGoal === item.id && { color: '#000', fontWeight: '900' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DAILY FOCUS SPRINT TARGET</Text>
              <View style={styles.optionsRow}>
                {[15, 25, 30, 45, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => {
                      haptics.light();
                      setDailyFocusGoal(mins);
                    }}
                    style={[
                      styles.optionPill,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      dailyFocusGoal === mins && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        { color: colors.textSecondary },
                        dailyFocusGoal === mins && { color: '#000', fontWeight: '900' },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </GlowCard>

          {/* Theme & System Preferences */}
          <GlowCard variant="default" style={styles.formCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>APPEARANCE & THEME</Text>
            <View style={styles.themeSelectorRow}>
              {[
                { id: 'dark' as ThemeMode, label: 'Dark Void', icon: Moon },
                { id: 'light' as ThemeMode, label: 'Light Clean', icon: Sun },
                { id: 'system' as ThemeMode, label: 'System Auto', icon: Smartphone },
              ].map((t) => {
                const isSelected = settingsState.theme === t.id;
                const IconC = t.icon;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      haptics.medium();
                      settingsState.setTheme(t.id);
                    }}
                    style={[
                      styles.themeCard,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(209, 255, 0, 0.1)' },
                    ]}
                  >
                    <IconC size={20} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={[styles.themeCardText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.settingRowDivider, { backgroundColor: colors.border }]} />

            {/* Audio Toggles */}
            <View style={styles.settingToggleRow}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingMainText, { color: colors.textPrimary }]}>Audio Sound Effects (SFX)</Text>
                <Text style={[styles.settingSubText, { color: colors.textMuted }]}>Quests, rep counts, level up sounds</Text>
              </View>
              <TouchableOpacity
                onPress={settingsState.toggleSfx}
                style={[
                  styles.toggleBadge,
                  { backgroundColor: settingsState.sfxEnabled ? colors.primary : colors.surfaceLight },
                ]}
              >
                <Text style={[styles.toggleBadgeText, { color: settingsState.sfxEnabled ? '#000' : colors.textMuted }]}>
                  {settingsState.sfxEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingToggleRow}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingMainText, { color: colors.textPrimary }]}>Haptic Tactile Feedback</Text>
                <Text style={[styles.settingSubText, { color: colors.textMuted }]}>Device vibrations on actions</Text>
              </View>
              <TouchableOpacity
                onPress={settingsState.toggleHaptics}
                style={[
                  styles.toggleBadge,
                  { backgroundColor: settingsState.hapticsEnabled ? colors.primary : colors.surfaceLight },
                ]}
              >
                <Text style={[styles.toggleBadgeText, { color: settingsState.hapticsEnabled ? '#000' : colors.textMuted }]}>
                  {settingsState.hapticsEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingToggleRow}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingMainText, { color: colors.textPrimary }]}>Background Ambient Music</Text>
                <Text style={[styles.settingSubText, { color: colors.textMuted }]}>Subtle ambient music while using app</Text>
              </View>
              <TouchableOpacity
                onPress={() => settingsState.setBgMusic(!settingsState.bgMusicEnabled)}
                style={[
                  styles.toggleBadge,
                  { backgroundColor: settingsState.bgMusicEnabled ? colors.primary : colors.surfaceLight },
                ]}
              >
                <Text style={[styles.toggleBadgeText, { color: settingsState.bgMusicEnabled ? '#000' : colors.textMuted }]}>
                  {settingsState.bgMusicEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlowCard>

          <GlowButton
            title="SAVE PROFILE CHANGES"
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={isSaving}
            icon={<Save size={18} color="#000" />}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  avatarSectionCard: {
    padding: 18,
    gap: 16,
    borderRadius: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActionCol: {
    flex: 1,
    gap: 4,
  },
  avatarSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  avatarSectionSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  avatarButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  avatarTabsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  tabPillWrap: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  tabPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tabPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8E93',
  },
  avatarScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  avatarThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#262626',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  iconThumbWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarThumbImg: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D1FF00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    padding: 18,
    gap: 14,
    borderRadius: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
  },
  bioInputBox: {
    height: 75,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  themeCardText: {
    fontSize: 11,
    fontWeight: '800',
  },
  settingRowDivider: {
    height: 1,
    marginVertical: 4,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextCol: {
    flex: 1,
    gap: 2,
  },
  settingMainText: {
    fontSize: 13,
    fontWeight: '800',
  },
  settingSubText: {
    fontSize: 11,
  },
  toggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
