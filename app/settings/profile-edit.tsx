import React, { useState, useEffect, useMemo } from 'react';
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
  ShoppingBag,
  ChevronRight,
  Flame,
  Save,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { AVATAR_IMAGES, AVATAR_ICONS } from '../../src/components/profile/AvatarPicker';
import { ALL_AVATARS } from '../../src/constants/avatars';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { inventoryRepository } from '../../src/database/repositories/inventoryRepository';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeMode } from '../../src/theme/themeEngine';
import { fontFamilies } from '../../src/theme/typography';
import { appBlockerService } from '../../src/native';
import { db } from '../../src/database/client';
import { appRestriction } from '../../src/database/schema';

export default function ProfileEditScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark, themeMode } = useTheme();

  const profile = usePlayerStore((s) => s.profile);
  const updateProfile = usePlayerStore((s) => s.updateProfile);

  const settingsState = useSettingsStore();

  const [displayName, setDisplayName] = useState<string>(profile?.displayName || 'Warrior');
  const [bio, setBio] = useState<string>(profile?.bio || 'Disciplined warrior in training.');
  const [workoutGoal, setWorkoutGoal] = useState<string>(profile?.workoutGoal || 'strength');
  const [dailyFocusGoal, setDailyFocusGoal] = useState<number>(profile?.dailyFocusGoal || 30);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile?.avatarIcon || 'img_pfp_01');
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(profile?.profileImageUri || null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [unlockedItemIds, setUnlockedItemIds] = useState<string[]>([]);

  useEffect(() => {
    const loadInventory = async () => {
      const items = await inventoryRepository.getUnlockedItems();
      const ids = items.map((i) => i.itemId);
      const starter = profile?.avatarIcon || 'pfp_01';
      if (!ids.includes(starter) && !ids.includes(`avatar_${starter}`)) {
        await inventoryRepository.unlockItem(starter, 'AVATAR');
        ids.push(starter);
        ids.push(`avatar_${starter}`);
      }
      setUnlockedItemIds(ids);
    };
    loadInventory();
  }, [profile?.avatarIcon]);

  // Only the avatars this user legitimately owns/unlocked for lifetime
  const unlockedItemsList = useMemo(() => {
    const list: { id: string; name: string; avatarIcon: string }[] = [];
    const seen = new Set<string>();

    const starter = profile?.avatarIcon || 'pfp_01';
    seen.add(starter);
    seen.add(`avatar_${starter}`);
    seen.add(`img_${starter}`);
    list.push({
      id: starter,
      name: ALL_AVATARS.find((a) => a.id === starter)?.name || starter,
      avatarIcon: starter,
    });

    for (const rawId of unlockedItemIds) {
      const cleanId = rawId.replace('avatar_', '').replace('insignia_', '').replace('img_', '');
      if (seen.has(cleanId)) continue;
      seen.add(cleanId);

      const avatarMatch = ALL_AVATARS.find((a) => a.id === cleanId);
      if (avatarMatch) {
        list.push({ id: cleanId, name: avatarMatch.name, avatarIcon: cleanId });
        continue;
      }
      const iconMatch = AVATAR_ICONS.find((i) => i.id === cleanId);
      if (iconMatch) {
        list.push({ id: cleanId, name: iconMatch.name, avatarIcon: cleanId });
      }
    }
    return list;
  }, [unlockedItemIds, profile?.avatarIcon]);

  const persistAvatarLocally = async (tempUri: string): Promise<string> => {
    try {
      const baseDir = (FileSystem as any).documentDirectory || '';
      if (baseDir) {
        const avatarDir = `${baseDir}avatars/`;
        if ((FileSystem as any).getInfoAsync && (FileSystem as any).makeDirectoryAsync) {
          const dirInfo = await (FileSystem as any).getInfoAsync(avatarDir);
          if (!dirInfo.exists) {
            await (FileSystem as any).makeDirectoryAsync(avatarDir, { intermediates: true });
          }
          const filename = `avatar_${Date.now()}.jpg`;
          const targetPath = `${avatarDir}${filename}`;
          if ((FileSystem as any).copyAsync) {
            await (FileSystem as any).copyAsync({ from: tempUri, to: targetPath });
            return targetPath;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to copy avatar to permanent storage, using direct uri:', e);
    }
    return tempUri;
  };

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
      const permanentUri = await persistAvatarLocally(result.assets[0].uri);
      setCustomPhotoUri(permanentUri);
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
      const permanentUri = await persistAvatarLocally(result.assets[0].uri);
      setCustomPhotoUri(permanentUri);
      setSelectedAvatar('custom');
      haptics.light();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    haptics.heavy();

    try {
      const isCustom = selectedAvatar === 'custom' && !!customPhotoUri;
      await updateProfile({
        displayName: displayName.trim() || 'Warrior',
        bio: bio.trim(),
        avatarIcon: isCustom ? 'custom' : selectedAvatar,
        profileImageUri: isCustom ? customPhotoUri : null,
        workoutGoal,
        dailyFocusGoal,
      });

      await usePlayerStore.getState().loadProfile();

      haptics.success();
      showIOSAlert('Profile Saved!', 'Your Hunter Identity has been successfully updated.');
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
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>EDIT PROTOCOL PROFILE</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveHeaderText, { color: '#FFFFFF' }]}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Hero Card */}
          <GlassCard variant="glow" style={styles.avatarSectionCard}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatarWrap, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
                <PlayerAvatar
                  iconId={selectedAvatar}
                  profileImageUri={selectedAvatar === 'custom' ? customPhotoUri : null}
                  size={64}
                  glow={false}
                />
              </View>

              <View style={styles.avatarActionCol}>
                <Text style={[styles.avatarSectionTitle, { color: colors.textPrimary }]}>Profile Image</Text>
                <Text style={[styles.avatarSectionSub, { color: colors.textSecondary }]}>
                  Upload personal photo, or use your unlocked avatars.
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

            {/* My Unlocked Avatars (Only owned / unlocked avatars) */}
            {unlockedItemsList.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted, marginBottom: 8 }]}>
                  MY UNLOCKED AVATARS ({unlockedItemsList.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScroll}>
                  {unlockedItemsList.map((item) => {
                    const isSelected = selectedAvatar === item.avatarIcon && !customPhotoUri;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          haptics.light();
                          setSelectedAvatar(item.avatarIcon);
                          setCustomPhotoUri(null);
                        }}
                        style={[
                          styles.avatarThumbWrap,
                          { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                          isSelected && { borderColor: colors.primary, transform: [{ scale: 1.08 }] },
                        ]}
                      >
                        <PlayerAvatar iconId={item.avatarIcon} size={48} glow={false} />
                        {isSelected && (
                          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                            <Check size={12} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Shop for More Avatars Promo Banner */}
            <TouchableOpacity
              style={[
                styles.shopPromoCard,
                { backgroundColor: isDark ? '#141620' : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => {
                haptics.light();
                router.push('/shop' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.shopPromoIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                <ShoppingBag size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.shopPromoTitle, { color: colors.textPrimary }]}>Avatar & Insignia Shop</Text>
                <Text style={[styles.shopPromoSub, { color: colors.textSecondary }]}>
                  Unlock 50+ Monarch & Hunter avatars with Coins
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

          {/* Display Name & Bio */}
          <GlassCard variant="default" style={styles.formCard}>
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
          </GlassCard>

          {/* Protocol Goals */}
          <GlassCard variant="default" style={styles.formCard}>
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
                        workoutGoal === item.id && { color: '#FFFFFF', fontFamily: fontFamilies.semiBold, fontWeight: '600' },
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
                        dailyFocusGoal === mins && { color: '#FFFFFF', fontFamily: fontFamilies.semiBold, fontWeight: '600' },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </GlassCard>

          <GlassButton
            title="SAVE PROFILE CHANGES"
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={isSaving}
            icon={<Save size={18} color="#FFFFFF" />}
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    fontFamily: fontFamilies.semiBold,
    fontSize: 14.5,
    fontWeight: '600',
  },
  avatarSectionSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
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
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
  },
  shopPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  shopPromoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopPromoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
  },
  shopPromoSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
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
    overflow: 'hidden',
    position: 'relative',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    padding: 18,
    gap: 14,
    borderRadius: 18,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  inputBox: {
    fontFamily: fontFamilies.medium,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    fontWeight: '500',
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
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
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
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
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
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  settingSubText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
  },
  toggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
});
