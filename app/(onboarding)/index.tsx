import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  AppState,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Shield,
  Zap,
  Flame,
  User,
  Check,
  Sparkles,
  Smartphone,
  Lock,
  ArrowLeft,
  Clock,
  Camera as CameraIcon,
  Bell,
  Dices,
  Search,
  ImagePlus,
  BarChart2,
  Layers,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  X,
  Sliders,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { useTheme } from '../../src/hooks/useTheme';
import { appBlockerService, InstalledAppItem } from '../../src/native';
import { db } from '../../src/database/client';
import { appRestriction } from '../../src/database/schema';
import { AriseLogo } from '../../src/components/ui/AriseLogo';
import { ALL_AVATARS, getAvatarSource } from '../../src/constants/avatars';
import { inventoryRepository } from '../../src/database/repositories/inventoryRepository';
import { HUNTER_ALIASES, getRandomHunterName } from '../../src/constants/names';
import { getIsOnboardingCompleted, setIsOnboardingCompletedSync } from '../../src/services/appStateService';
import { LanguageSelectorModal } from '../../src/components/ui/LanguageSelectorModal';
import { GoogleSignInModal, GoogleSignInResult } from '../../src/components/auth/GoogleSignInModal';
import { GoogleLogo } from '../../src/components/auth/GoogleLogo';
import { GoogleAuthUser } from '../../src/services/googleAuthService';
import { cloudSyncService } from '../../src/services/cloudSyncService';
import { useLanguageStore } from '../../src/services/i18n';
import { Globe } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { fontFamilies } from '../../src/theme/typography';

const APP_CATEGORIES = ['ALL', 'SOCIAL', 'GAMES', 'STREAMING'] as const;

const SOCIAL_KEYWORDS = ['instagram', 'snapchat', 'facebook', 'twitter', 'reddit', 'threads', 'whatsapp', 'telegram', 'discord', 'tiktok', 'social'];
const GAME_KEYWORDS = ['game', 'pubg', 'bgmi', 'freefire', 'clash', 'candy', 'roblox', 'genshin', 'minecraft', 'cod', 'battlegrounds'];
const STREAMING_KEYWORDS = ['youtube', 'netflix', 'prime', 'hotstar', 'twitch', 'reels', 'shorts', 'hulu', 'disney', 'video'];

function getAppCategoryLabel(appName: string, packageName: string): { label: string; color: string; bg: string } {
  const name = appName.toLowerCase();
  const pkg = packageName.toLowerCase();

  if (SOCIAL_KEYWORDS.some((k) => name.includes(k) || pkg.includes(k))) {
    return { label: 'Social Media', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' };
  }
  if (STREAMING_KEYWORDS.some((k) => name.includes(k) || pkg.includes(k))) {
    return { label: 'Video & Media', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
  }
  if (GAME_KEYWORDS.some((k) => name.includes(k) || pkg.includes(k))) {
    return { label: 'Gaming', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
  }
  if (['browser', 'chrome', 'brave', 'firefox', 'opera', 'edge'].some((k) => name.includes(k) || pkg.includes(k))) {
    return { label: 'Web Browser', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
  }
  return { label: 'Installed App', color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();
  const { colors, isDark } = useTheme();

  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const updateProfile = usePlayerStore((s) => s.updateProfile);

  // 3-Step Flow:
  // 1: Profile & Name
  // 2: Core Permissions
  // 3: Daily Goals & Distraction Apps
  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;

  // Step 1: Identity States
  const [userName, setUserName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('pfp_01');
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // Animated Dice Rotation
  const diceRotation = useSharedValue(0);
  const animatedDiceStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${diceRotation.value}deg` }],
    };
  });

  const handleRollDice = () => {
    haptics.light();
    sound.play('coin_earn');
    diceRotation.value = withTiming(diceRotation.value + 360, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    const randomName = getRandomHunterName();
    setUserName(randomName);
    setNameError('');
  };

  // Step 2: 5 Core Permissions
  const [usageGranted, setUsageGranted] = useState<boolean>(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(false);
  const [batteryGranted, setBatteryGranted] = useState<boolean>(false);
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);

  // Step 3: Time Setting + Apps
  const [dailyFocusMinutes, setDailyFocusMinutes] = useState<number>(30);
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>('45');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledAppItem[]>([]);
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<typeof APP_CATEGORIES[number]>('ALL');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showLangModal, setShowLangModal] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const currentLang = useLanguageStore((s) => s.language);
  const isMountedRef = useRef(true);
  const permissionCheckInFlight = useRef(false);

  // Check all 5 permissions
  const checkAllPermissions = async () => {
    if (permissionCheckInFlight.current) return;
    permissionCheckInFlight.current = true;
    try {
      const usage = await appBlockerService.hasUsagePermission();
      if (!isMountedRef.current) return;
      setUsageGranted(usage);

      const overlay = await appBlockerService.hasOverlayPermission();
      if (!isMountedRef.current) return;
      setOverlayGranted(overlay);

      const battery = (await appBlockerService.hasBatteryOptimizationExemption?.()) ?? true;
      if (!isMountedRef.current) return;
      setBatteryGranted(battery);

      const cam = await Camera.getCameraPermissionsAsync();
      if (!isMountedRef.current) return;
      setCameraGranted(cam.granted);

      const notif = await Notifications.getPermissionsAsync();
      if (!isMountedRef.current) return;
      setNotifGranted(notif.granted);
    } catch (e) {
      console.warn('[Onboarding] Error checking permissions:', e);
    } finally {
      permissionCheckInFlight.current = false;
    }
  };

  const allPermissionsCount = [usageGranted, overlayGranted, batteryGranted, cameraGranted, notifGranted].filter(Boolean).length;
  const allPermissionsGranted = allPermissionsCount === 5;

  useEffect(() => {
    if (onboardingCompleted || getIsOnboardingCompleted()) {
      useSettingsStore.setState({ onboardingCompleted: true });
      router.replace('/(tabs)');
    }
  }, [onboardingCompleted]);

  const permPollRef = useRef<any>(null);

  const startFastPermissionPolling = (type: 'battery' | 'usage' | 'overlay') => {
    if (permPollRef.current) clearInterval(permPollRef.current);
    const startTime = Date.now();
    permPollRef.current = setInterval(async () => {
      try {
        if (type === 'battery') {
          const granted = (await appBlockerService.hasBatteryOptimizationExemption?.()) ?? false;
          if (granted && isMountedRef.current) {
            setBatteryGranted(true);
            haptics.success();
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        } else if (type === 'usage') {
          const granted = await appBlockerService.hasUsagePermission();
          if (granted && isMountedRef.current) {
            setUsageGranted(true);
            haptics.success();
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        } else if (type === 'overlay') {
          const granted = await appBlockerService.hasOverlayPermission();
          if (granted && isMountedRef.current) {
            setOverlayGranted(true);
            haptics.success();
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        }
        if (Date.now() - startTime > 25000) {
          if (permPollRef.current) {
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        }
      } catch (e) {
        // ignore
      }
    }, 400);
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadApps();
    checkAllPermissions();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAllPermissions();
      }
    });

    const heartbeat = setInterval(() => {
      checkAllPermissions();
    }, 1200);

    return () => {
      isMountedRef.current = false;
      sub.remove();
      clearInterval(heartbeat);
      if (permPollRef.current) {
        clearInterval(permPollRef.current);
        permPollRef.current = null;
      }
    };
  }, []);

  const loadApps = async () => {
    setLoadingApps(true);
    try {
      const apps = await appBlockerService.getInstalledApps();
      setInstalledApps(apps);
    } catch (e) {
      console.warn('Error loading apps:', e);
    } finally {
      setLoadingApps(false);
    }
  };

  // Permission Request Handlers
  const handleGrantUsage = () => {
    haptics.medium();
    if (Platform.OS === 'android') {
      appBlockerService.requestUsagePermission();
      startFastPermissionPolling('usage');
    }
  };

  const handleGrantOverlay = () => {
    haptics.medium();
    if (Platform.OS === 'android') {
      appBlockerService.requestOverlayPermission();
      startFastPermissionPolling('overlay');
    }
  };

  const handleGrantBattery = () => {
    haptics.medium();
    if (Platform.OS === 'android') {
      appBlockerService.requestBatteryOptimizationExemption?.();
      startFastPermissionPolling('battery');
    }
  };

  const handleGrantCamera = async () => {
    haptics.medium();
    const res = await Camera.requestCameraPermissionsAsync();
    setCameraGranted(res.granted);
    if (res.granted) {
      haptics.success();
    }
    checkAllPermissions();
  };

  const handleGrantNotifications = async () => {
    haptics.medium();
    try {
      const res = await Notifications.requestPermissionsAsync();
      setNotifGranted(res.granted);
      if (res.granted) {
        haptics.success();
      }
      checkAllPermissions();
    } catch (e) {
      console.warn('Error requesting notifications:', e);
    }
  };

  const toggleApp = (pkg: string) => {
    haptics.light();
    setSelectedApps((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const handleSelectTopDistractions = () => {
    haptics.medium();
    const topKeywords = ['instagram', 'youtube', 'snapchat', 'reddit', 'twitter', 'facebook', 'pubg', 'bgmi', 'freefire', 'netflix', 'tiktok'];
    const matched = installedApps
      .filter((a) =>
        topKeywords.some(
          (k) =>
            a.packageName.toLowerCase().includes(k) ||
            a.appName.toLowerCase().includes(k)
        )
      )
      .map((a) => a.packageName);

    if (matched.length > 0) {
      setSelectedApps(Array.from(new Set([...selectedApps, ...matched])));
      sound.play('quest_complete');
      haptics.success();
    }
  };

  const handleUploadCustomPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showIOSAlert('Permission Required', 'Please allow gallery access to select your avatar photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        haptics.success();
        setCustomPhotoUri(result.assets[0].uri);
        setSelectedAvatar('custom');
      }
    } catch (e) {
      console.warn('Error picking image:', e);
    }
  };

  const handleGoogleSignIn = () => {
    haptics.medium();
    setShowGoogleModal(true);
  };

  const handleGoogleSuccess = async (result: GoogleSignInResult) => {
    const { user, restored, message } = result;

    if (restored) {
      haptics.success();
      sound.play('level_up');
      showIOSAlert(
        'Cloud Save Restored!',
        message,
        [
          {
            text: 'Enter ARISE',
            onPress: async () => {
              await usePlayerStore.getState().loadProfile();
              router.replace('/(tabs)');
            },
          },
        ]
      );
      setTimeout(async () => {
        await usePlayerStore.getState().loadProfile();
        router.replace('/(tabs)');
      }, 1200);
      return;
    }

    if (user.displayName) {
      setUserName(user.displayName);
      setNameError('');
    }
    if (user.photoUrl) {
      setCustomPhotoUri(user.photoUrl);
      setSelectedAvatar('custom');
    }
    showIOSAlert(
      'Google Account Connected',
      `Welcome ${user.displayName}! Signed in with ${user.email}.`
    );
    // Smoothly progress to Step 2
    setTimeout(() => {
      setStep(2);
    }, 250);
  };

  const getSelectedAvatar = () => {
    if (selectedAvatar === 'custom' && customPhotoUri) {
      return { type: 'custom' as const, uri: customPhotoUri };
    }
    return { type: 'image' as const, source: getAvatarSource(selectedAvatar) };
  };

  const handleNext = () => {
    Keyboard.dismiss();
    haptics.medium();

    // Step 1 Validation: Name is required
    if (step === 1) {
      const trimmed = userName.trim();
      if (!trimmed || trimmed.length < 2) {
        haptics.warning();
        setNameError('Please enter your name (at least 2 characters)');
        return;
      }
      setNameError('');
      setStep(2);
      return;
    }

    // Step 2 Validation: Permissions
    if (step === 2) {
      setStep(3);
      return;
    }

    // Step 3: Finish Onboarding
    if (step === 3) {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (isSubmitting) return;

    const finalName = userName.trim();
    if (!finalName || finalName.length < 2) {
      setStep(1);
      setNameError('Please enter your name to continue');
      return;
    }

    setIsSubmitting(true);
    haptics.heavy();

    try {
      const parsedCustom = parseInt(customTimeInput, 10);
      const finalMinutes = isCustomTime
        ? (isNaN(parsedCustom) ? 30 : Math.max(0, parsedCustom))
        : dailyFocusMinutes;

      // 1. Authoritative SQLite user profile update
      await updateProfile({
        displayName: finalName,
        avatarIcon: selectedAvatar,
        profileImageUri: customPhotoUri || undefined,
        dailyFocusGoal: finalMinutes,
      });

      // 1.1 Unlock the starter avatar permanently in user_inventory (1st time free for life)
      if (selectedAvatar && selectedAvatar !== 'custom') {
        await inventoryRepository.unlockItem(selectedAvatar, 'AVATAR');
        await inventoryRepository.unlockItem(`avatar_${selectedAvatar}`, 'AVATAR');
        await inventoryRepository.equipItem(selectedAvatar, 'AVATAR');
      }

      // 2. Persist restricted apps
      appBlockerService.setAppBudget?.(null, finalMinutes);
      for (const pkg of selectedApps) {
        const appInfo = installedApps.find((a) => a.packageName === pkg);
        try {
          await db.insert(appRestriction).values({
            packageName: pkg,
            appName: appInfo?.appName || pkg,
            isRestricted: 1,
          });
        } catch {
          // duplicate ignore
        }
        appBlockerService.setAppBudget?.(pkg, finalMinutes);
      }

      // 3. Start native background app blocker monitor
      if (selectedApps.length > 0) {
        appBlockerService.startMonitoring(selectedApps);
      }

      // 4. Mark onboarding completed & set canonical daily budget in SQLite settings table
      await updateSetting('dailyBudgetMinutes', finalMinutes);
      await setOnboardingCompleted();
      setIsOnboardingCompletedSync(true);
      cloudSyncService.triggerAutoSync();

      sound.play('level_up');
      haptics.success();

      // Route directly to Home Dashboard with welcome=true parameter
      router.replace({
        pathname: '/(tabs)',
        params: { welcome: 'true' },
      } as any);
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
      setIsSubmitting(false);
    }
  };

  const currentAvatar = getSelectedAvatar();

  // Filter installed apps
  const filteredApps = installedApps.filter((a) => {
    const matchesSearch =
      a.appName.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
      a.packageName.toLowerCase().includes(appSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'SOCIAL') {
      return SOCIAL_KEYWORDS.some((k) => a.packageName.toLowerCase().includes(k) || a.appName.toLowerCase().includes(k));
    }
    if (activeCategory === 'GAMES') {
      return GAME_KEYWORDS.some((k) => a.packageName.toLowerCase().includes(k) || a.appName.toLowerCase().includes(k));
    }
    if (activeCategory === 'STREAMING') {
      return STREAMING_KEYWORDS.some((k) => a.packageName.toLowerCase().includes(k) || a.appName.toLowerCase().includes(k));
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Progress Bar */}
        {step === 2 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                setStep((prev) => prev - 1);
              }}
              activeOpacity={0.7}
              style={{ padding: 6 }}
            >
              <ArrowLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                haptics.light();
                setStep((s) => s + 1);
              }}
              activeOpacity={0.7}
              style={{ padding: 6 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textMuted }}>Skip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              {step > 1 ? (
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    haptics.light();
                    setStep((prev) => prev - 1);
                  }}
                  activeOpacity={0.8}
                >
                  <ArrowLeft size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : (
                <AriseLogo size={28} glow={false} />
              )}
              <Text style={[styles.headerStageText, { color: colors.primary }]}>
                {step} / {totalSteps}
              </Text>
            </View>

            <View style={styles.headerRightArea}>
              <View style={styles.stepDotsRow}>
                {[1, 2, 3].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.stepDot,
                      { backgroundColor: colors.border },
                      s <= step && { backgroundColor: colors.primary },
                      s === step && { width: 22, backgroundColor: colors.primary },
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.langPickerPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  haptics.light();
                  setShowLangModal(true);
                }}
                activeOpacity={0.8}
              >
                <Globe size={13} color={colors.primary} />
                <Text style={[styles.langPickerText, { color: colors.primary }]}>
                  {currentLang === 'hi' ? 'हिंदी' : 'EN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  if (step < 3) setStep((s) => s + 1);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* ================= STEP 1: CLEAN PROFILE & NAME ================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Welcome to ARISE</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                A stronger mind. A healthier you. A better tomorrow.
              </Text>

              {/* Big Centered Avatar Preview */}
              <View style={styles.avatarCenterWrap}>
                <View style={[styles.avatarMainCircle, { borderColor: colors.primary, backgroundColor: colors.card }]}>
                  {currentAvatar.type === 'custom' && currentAvatar.uri ? (
                    <Image source={{ uri: currentAvatar.uri }} style={styles.avatarMainImg} />
                  ) : (
                    <Image source={currentAvatar.source} style={styles.avatarMainImg} />
                  )}
                  <TouchableOpacity
                    style={[styles.avatarCameraBadge, { backgroundColor: colors.primary }]}
                    onPress={handleUploadCustomPhoto}
                    activeOpacity={0.85}
                  >
                    <CameraIcon size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Google 1-Tap Sign In */}
              <TouchableOpacity
                style={[styles.googleSignInBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}
              >
                <GoogleLogo size={20} />
                <Text style={[styles.googleSignInText, { color: colors.textPrimary }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Name Input Box - Prominent & High Contrast */}
              <View style={styles.inputGroupBlock}>
                <Text style={[styles.cleanInputLabel, { color: colors.textSecondary }]}>Your Name</Text>
                <View
                  style={[
                    styles.cleanTextInputBox,
                    { backgroundColor: colors.card, borderColor: isInputFocused ? colors.primary : colors.border },
                    !!nameError && { borderColor: colors.danger },
                  ]}
                >
                  <User size={18} color={nameError ? colors.danger : isInputFocused ? colors.primary : colors.textMuted} />
                  <TextInput
                    style={[styles.cleanTextInputField, { color: colors.textPrimary }]}
                    placeholder="e.g. ShadowMonarch"
                    placeholderTextColor={colors.textMuted}
                    value={userName}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onChangeText={(t) => {
                      setUserName(t);
                      if (nameError && t.trim().length >= 2) {
                        setNameError('');
                      }
                    }}
                    maxLength={24}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={handleNext}
                  />
                  <TouchableOpacity
                    style={styles.diceBtnWrap}
                    onPress={handleRollDice}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={animatedDiceStyle}>
                      <Dices size={18} color={colors.primary} />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
                {!!nameError && <Text style={[styles.cleanErrorText, { color: colors.danger }]}>{nameError}</Text>}
              </View>

              {/* Choose Your Avatar (Hunters) */}
              <View style={styles.avatarSectionBlock}>
                <Text style={[styles.cleanInputLabel, { color: colors.textSecondary }]}>
                  Choose Your Starter Avatar (Free)
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarScrollRow}
                >
                  {ALL_AVATARS.map((item) => {
                    const isSelected = selectedAvatar === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          haptics.light();
                          setSelectedAvatar(item.id);
                        }}
                        style={[
                          styles.avatarItemWrap,
                          { borderColor: colors.border },
                          isSelected && { borderColor: colors.primary, borderWidth: 2.5 },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Image source={item.source} style={styles.avatarGridImg} />
                        {isSelected && (
                          <View style={[styles.selectedCheckOverlay, { backgroundColor: colors.primary }]}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ================= STEP 2: SYSTEM PERMISSIONS (1:1 MOCKUP MATCH) ================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              {/* App Logo & Title */}
              <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 4 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 18,
                    backgroundColor: '#111218',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#E53935',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 6,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={require('../../assets/icon.png')}
                    style={{ width: 68, height: 68, borderRadius: 18 }}
                    resizeMode="cover"
                  />
                </View>
                <Text
                  style={{
                    fontFamily: fontFamilies.semiBold,
                    fontSize: 13,
                    fontWeight: '600',
                    letterSpacing: 6,
                    marginTop: 10,
                    color: colors.textPrimary,
                  }}
                >
                  A R I S E
                </Text>

                <Text
                  style={{
                    fontFamily: fontFamilies.semiBold,
                    fontSize: 22,
                    fontWeight: '600',
                    letterSpacing: -0.3,
                    marginTop: 16,
                    textAlign: 'center',
                    color: colors.textPrimary,
                  }}
                >
                  System Permissions
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 18,
                    paddingHorizontal: 16,
                    color: colors.textSecondary,
                  }}
                >
                  Allow these permissions to unlock the full experience.
                </Text>
              </View>

              <View style={{ width: '100%', gap: 12, marginTop: 10 }}>
                {/* 1. App Usage Access */}
                <TouchableOpacity
                  onPress={usageGranted ? undefined : handleGrantUsage}
                  activeOpacity={usageGranted ? 1 : 0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 14,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FFF1F2',
                    }}
                  >
                    <BarChart2 size={22} color="#EF4444" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fontFamilies.semiBold, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary }}>
                      App Usage Access
                    </Text>
                    <Text style={{ fontFamily: fontFamilies.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                      Monitor distraction app screen time and usage.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {usageGranted ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 100,
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6F4EA',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" fill="#059669" />
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#059669' }}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#E53935',
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 100,
                        }}
                        onPress={handleGrantUsage}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#FFFFFF' }}>Allow</Text>
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {/* 2. Display Over Other Apps */}
                <TouchableOpacity
                  onPress={overlayGranted ? undefined : handleGrantOverlay}
                  activeOpacity={overlayGranted ? 1 : 0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 14,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE',
                    }}
                  >
                    <Layers size={22} color="#0284C7" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fontFamilies.semiBold, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary }}>
                      Display Over Other Apps
                    </Text>
                    <Text style={{ fontFamily: fontFamilies.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                      Show the lock screen when your limit is reached.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {overlayGranted ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 100,
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6F4EA',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" fill="#059669" />
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#059669' }}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#E53935',
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 100,
                        }}
                        onPress={handleGrantOverlay}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#FFFFFF' }}>Allow</Text>
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {/* 3. Background Activity */}
                <TouchableOpacity
                  onPress={batteryGranted ? undefined : handleGrantBattery}
                  activeOpacity={batteryGranted ? 1 : 0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 14,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#DCFCE7',
                    }}
                  >
                    <BatteryCharging size={22} color="#16A34A" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fontFamilies.semiBold, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary }}>
                      Background Activity
                    </Text>
                    <Text style={{ fontFamily: fontFamilies.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                      Keep blocking active in background to ensure consistency.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {batteryGranted ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 100,
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6F4EA',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" fill="#059669" />
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#059669' }}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#E53935',
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 100,
                        }}
                        onPress={handleGrantBattery}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#FFFFFF' }}>Allow</Text>
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {/* 4. Camera */}
                <TouchableOpacity
                  onPress={cameraGranted ? undefined : handleGrantCamera}
                  activeOpacity={cameraGranted ? 1 : 0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 14,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
                    }}
                  >
                    <CameraIcon size={22} color="#8B5CF6" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: fontFamilies.semiBold, fontSize: 14.5, fontWeight: '600', color: colors.textPrimary }}>
                      Camera
                    </Text>
                    <Text style={{ fontFamily: fontFamilies.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                      Required for AI exercise tracking and form analysis.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {cameraGranted ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 100,
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6F4EA',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" fill="#059669" />
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#059669' }}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#E53935',
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 100,
                        }}
                        onPress={handleGrantCamera}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontFamily: fontFamilies.medium, fontSize: 12, fontWeight: '500', color: '#FFFFFF' }}>Allow</Text>
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 3: DAILY GOALS & APPS ================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              {/* Hero Header */}
              <View style={styles.step3HeroBox}>
                <View
                  style={[
                    styles.step3BadgePill,
                    {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                    },
                  ]}
                >
                  <Shield size={12} color="#3B82F6" strokeWidth={2.5} />
                  <Text style={[styles.step3BadgeText, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                    FINAL PROTOCOL STEP
                  </Text>
                </View>
                <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Set Your Daily Goals</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  Choose your daily allowance and guard apps behind workout challenges.
                </Text>
              </View>

              {/* 1. Daily Screen Time Allowance Card */}
              <View
                style={[
                  styles.redesignedCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.cardHeaderIconBox,
                      {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF',
                      },
                    ]}
                  >
                    <Clock size={20} color="#3B82F6" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>
                      Daily Screen Time Allowance
                    </Text>
                    <Text style={[styles.cardSubtitleText, { color: colors.textSecondary }]}>
                      Time allowed for non-productive apps per day.
                    </Text>
                  </View>
                </View>

                {/* Time Pills Grid */}
                <View style={styles.timePillsGrid}>
                  {[
                    { mins: 0, label: '0m', isLock: true },
                    { mins: 15, label: '15m' },
                    { mins: 30, label: '30m' },
                    { mins: 45, label: '45m' },
                    { mins: 60, label: '60m' },
                  ].map((b) => {
                    const isSelected = dailyFocusMinutes === b.mins && !isCustomTime;
                    return (
                      <TouchableOpacity
                        key={b.mins}
                        style={[
                          styles.modernTimePill,
                          {
                            backgroundColor: isDark ? '#171B26' : '#F6F8FA',
                            borderColor: isDark ? '#262D3D' : '#E2E6EC',
                          },
                          isSelected && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 3,
                          },
                        ]}
                        onPress={() => {
                          haptics.light();
                          setIsCustomTime(false);
                          setDailyFocusMinutes(b.mins);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {b.isLock && <Lock size={12} color={isSelected ? '#FFFFFF' : colors.textPrimary} strokeWidth={2.5} />}
                          <Text
                            style={[
                              styles.modernTimePillText,
                              { color: colors.textPrimary },
                              isSelected && { color: '#FFFFFF', fontWeight: '700' },
                            ]}
                          >
                            {b.label}
                          </Text>
                        </View>
                        {b.isLock && (
                          <Text
                            style={[
                              styles.modernTimePillSub,
                              { color: colors.textMuted },
                              isSelected && { color: 'rgba(255,255,255,0.85)' },
                            ]}
                          >
                            Lock
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom Pill */}
                  <TouchableOpacity
                    style={[
                      styles.modernTimePill,
                      {
                        backgroundColor: isDark ? '#171B26' : '#F6F8FA',
                        borderColor: isDark ? '#262D3D' : '#E2E6EC',
                      },
                      isCustomTime && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 3,
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setIsCustomTime(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Sliders size={12} color={isCustomTime ? '#FFFFFF' : colors.textPrimary} />
                      <Text
                        style={[
                          styles.modernTimePillText,
                          { color: colors.textPrimary },
                          isCustomTime && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        Custom
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Custom Time Stepper */}
                {isCustomTime && (
                  <View
                    style={[
                      styles.customStepperBox,
                      {
                        backgroundColor: isDark ? '#161A24' : '#F1F4F9',
                        borderColor: isDark ? '#283145' : '#DDE3ED',
                      },
                    ]}
                  >
                    <Text style={[styles.customStepperLabel, { color: colors.textSecondary }]}>
                      Daily Allowance:
                    </Text>
                    <View style={styles.customStepperControls}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: isDark ? '#222838' : '#FFFFFF', borderColor: colors.border }]}
                        onPress={() => {
                          haptics.light();
                          const cur = parseInt(customTimeInput, 10) || 30;
                          setCustomTimeInput(String(Math.max(5, cur - 5)));
                        }}
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color={colors.textPrimary} />
                      </TouchableOpacity>

                      <View style={styles.stepperInputWrap}>
                        <TextInput
                          style={[styles.stepperInput, { color: colors.primary }]}
                          value={customTimeInput}
                          onChangeText={setCustomTimeInput}
                          keyboardType="numeric"
                          maxLength={3}
                        />
                        <Text style={[styles.stepperMinsText, { color: colors.textMuted }]}>mins</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: isDark ? '#222838' : '#FFFFFF', borderColor: colors.border }]}
                        onPress={() => {
                          haptics.light();
                          const cur = parseInt(customTimeInput, 10) || 30;
                          setCustomTimeInput(String(Math.min(240, cur + 5)));
                        }}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Dynamic Guidance Banner */}
                <View
                  style={[
                    styles.budgetInfoBanner,
                    {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#F0F7FF',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#D0E3FF',
                    },
                  ]}
                >
                  <Shield size={14} color="#3B82F6" />
                  <Text style={[styles.budgetInfoText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                    {dailyFocusMinutes === 0 && !isCustomTime
                      ? 'Hardcore Discipline: Apps are locked immediately. Complete workout reps to earn screen time!'
                      : `You will get ${isCustomTime ? customTimeInput || '0' : dailyFocusMinutes} mins of free app access daily before the blocker takes over.`}
                  </Text>
                </View>
              </View>

              {/* 2. Select Your Top Distractions Card */}
              <View
                style={[
                  styles.redesignedCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.cardHeaderIconBox,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
                      },
                    ]}
                  >
                    <Layers size={20} color="#EF4444" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>
                      Select Your Top Distractions
                    </Text>
                    <Text style={[styles.cardSubtitleText, { color: colors.textSecondary }]}>
                      Choose the apps that distract you the most.
                    </Text>
                  </View>
                  {selectedApps.length > 0 && (
                    <View
                      style={[
                        styles.appsSelectedPill,
                        {
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
                          borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
                        },
                      ]}
                    >
                      <Text style={[styles.appsSelectedText, { color: isDark ? '#F87171' : '#DC2626' }]}>
                        {selectedApps.length} Selected
                      </Text>
                    </View>
                  )}
                </View>

                {/* Auto Select Button */}
                <TouchableOpacity
                  style={[
                    styles.autoSelectBanner,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FFF5F5',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FED7D7',
                    },
                  ]}
                  onPress={handleSelectTopDistractions}
                  activeOpacity={0.8}
                >
                  <View style={styles.autoSelectLeft}>
                    <View style={[styles.sparkleCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
                      <Sparkles size={16} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[styles.autoSelectTitle, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
                        Auto Select (Top Apps)
                      </Text>
                      <Text style={[styles.autoSelectSub, { color: colors.textSecondary }]}>
                        Instantly selects YouTube, Instagram, Reddit, Games & TikTok
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
                </TouchableOpacity>

                {/* Category Filter Pills (ALL / SOCIAL / GAMES / STREAMING) */}
                <View style={styles.categoryPillsRow}>
                  {APP_CATEGORIES.map((cat) => {
                    const isCatActive = activeCategory === cat;
                    const catLabel =
                      cat === 'ALL'
                        ? 'All'
                        : cat === 'SOCIAL'
                        ? 'Social'
                        : cat === 'GAMES'
                        ? 'Games'
                        : 'Media';
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: isDark ? '#171B26' : '#F6F8FA',
                            borderColor: isDark ? '#262D3D' : '#E2E6EC',
                          },
                          isCatActive && {
                            backgroundColor: isDark ? '#2C1D24' : '#FEE2E2',
                            borderColor: isDark ? '#EF4444' : '#F87171',
                          },
                        ]}
                        onPress={() => {
                          haptics.light();
                          setActiveCategory(cat);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            { color: colors.textSecondary },
                            isCatActive && {
                              color: isDark ? '#FCA5A5' : '#DC2626',
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {catLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Search Bar */}
                <View
                  style={[
                    styles.modernSearchBox,
                    {
                      backgroundColor: isDark ? '#161922' : '#F4F6F9',
                      borderColor: isDark ? '#282F3F' : '#E2E6EC',
                    },
                  ]}
                >
                  <Search size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.modernSearchInput, { color: colors.textPrimary }]}
                    placeholder="Search apps..."
                    placeholderTextColor={colors.textMuted}
                    value={appSearchQuery}
                    onChangeText={setAppSearchQuery}
                  />
                  {appSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        haptics.light();
                        setAppSearchQuery('');
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Apps List */}
                {loadingApps ? (
                  <View style={styles.appsLoadingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.appsLoadingText, { color: colors.textSecondary }]}>Scanning installed apps...</Text>
                  </View>
                ) : filteredApps.length === 0 ? (
                  <View style={styles.noAppsBox}>
                    <Smartphone size={26} color={colors.textMuted} />
                    <Text style={[styles.noAppsText, { color: colors.textMuted }]}>No apps found.</Text>
                  </View>
                ) : (
                  <View style={styles.appsListWrap}>
                    <ScrollView
                      style={{ maxHeight: 290, width: '100%' }}
                      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredApps.slice(0, 40).map((app) => {
                        const isSelected = selectedApps.includes(app.packageName);
                        const catMeta = getAppCategoryLabel(app.appName, app.packageName);

                        return (
                          <TouchableOpacity
                            key={app.packageName}
                            onPress={() => toggleApp(app.packageName)}
                            activeOpacity={0.75}
                            style={[
                              styles.modernAppRow,
                              {
                                backgroundColor: isDark ? '#161A24' : '#FAFAFA',
                                borderColor: isDark ? '#232938' : '#EDF0F5',
                              },
                              isSelected && {
                                borderColor: isDark ? '#EF4444' : '#F87171',
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FFF5F5',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.modernAppIconBox,
                                { backgroundColor: isDark ? '#202638' : '#EEF2F6' },
                              ]}
                            >
                              {app.appIconBase64 ? (
                                <Image
                                  source={{ uri: app.appIconBase64 }}
                                  style={{ width: 34, height: 34, borderRadius: 9 }}
                                />
                              ) : (
                                <Smartphone
                                  size={20}
                                  color={isSelected ? colors.primary : colors.textMuted}
                                />
                              )}
                            </View>

                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                style={[
                                  styles.modernAppName,
                                  { color: colors.textPrimary },
                                  isSelected && { fontWeight: '700' },
                                ]}
                                numberOfLines={1}
                              >
                                {app.appName}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View
                                  style={[
                                    styles.categoryTagPill,
                                    { backgroundColor: catMeta.bg },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.categoryTagText,
                                      { color: catMeta.color },
                                    ]}
                                  >
                                    {catMeta.label}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.modernCheckbox,
                                {
                                  borderColor: isDark ? '#3E475E' : '#CBD5E1',
                                  backgroundColor: isDark ? '#1C212E' : '#FFFFFF',
                                },
                                isSelected && {
                                  backgroundColor: '#EF4444',
                                  borderColor: '#EF4444',
                                },
                              ]}
                            >
                              {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3.2} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.appsListFooter}>
                      <Text style={[styles.appsListFooterText, { color: colors.textMuted }]}>
                        {filteredApps.length} apps • {selectedApps.length} guarded
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Bottom Prominent CTA Button */}
        <View style={[styles.footerContainer, { borderTopColor: isDark ? '#1F2432' : colors.border }]}>
          <TouchableOpacity
            style={[
              styles.primaryCtaBtn,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              },
              isSubmitting && styles.primaryCtaBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={styles.primaryCtaText}>
                  {step === 1 ? 'Continue  →' : step === 2 ? 'Continue  →' : 'Start Training'}
                </Text>
                {step === 3 && <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />}
              </View>
            )}
          </TouchableOpacity>
          {step === 3 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <Shield size={12} color={colors.textMuted} />
              <Text style={[styles.footerMottoText, { color: colors.textMuted }]}>
                ARISE guards these apps on your device until workouts are cleared.
              </Text>
            </View>
          ) : step === 2 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, paddingHorizontal: 16 }}>
              <Lock size={13} color={colors.textMuted} />
              <Text style={[styles.privacyNoteText, { color: colors.textMuted, textAlign: 'center', fontSize: 11 }]}>
                Your data stays on your device. We only use these permissions to power core features.
              </Text>
            </View>
          ) : (
            <Text style={[styles.footerMottoText, { color: colors.textMuted }]}>
              "Every warrior has a beginning."
            </Text>
          )}
        </View>

        {/* Language Selection Modal */}
        <LanguageSelectorModal visible={showLangModal} onClose={() => setShowLangModal(false)} />

        {/* Google Sign-In Account Selector Modal */}
        <GoogleSignInModal
          visible={showGoogleModal}
          onClose={() => setShowGoogleModal(false)}
          onSuccess={handleGoogleSuccess}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langPickerText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  skipText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: '500',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStageText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  stepContainer: {
    gap: 16,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    fontWeight: '400',
  },
  avatarCenterWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  avatarMainCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarMainImg: {
    width: '100%',
    height: '100%',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleGLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleGText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  googleSignInText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13.5,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroupBlock: {
    width: '100%',
    gap: 6,
  },
  cleanInputLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cleanTextInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cleanTextInputField: {
    fontFamily: fontFamilies.medium,
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
    padding: 0,
  },
  diceBtnWrap: {
    padding: 4,
  },
  cleanErrorText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  avatarSectionBlock: {
    width: '100%',
    gap: 10,
  },
  avatarScrollRow: {
    gap: 12,
    paddingVertical: 4,
  },
  avatarItemWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarGridImg: {
    width: '100%',
    height: '100%',
  },
  selectedCheckOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 8,
    padding: 2,
  },
  // Step 2 Styles
  permStatusHeaderPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
  },
  permStatusHeaderText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  permCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  permCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permCardHeaderCol: {
    flex: 1,
    gap: 2,
  },
  permCardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
  },
  permCardDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
  },
  permActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  permActionBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  privacyNoteText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },
  // Step 3 Redesigned Styles
  step3HeroBox: {
    alignItems: 'center',
    width: '100%',
    gap: 4,
    marginBottom: 4,
  },
  step3BadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 2,
  },
  step3BadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  redesignedCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitleText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  timePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernTimePill: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernTimePillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
  },
  modernTimePillSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    marginTop: 2,
  },
  customStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  customStepperLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  customStepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
    justifyContent: 'center',
  },
  stepperInput: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 32,
    padding: 0,
  },
  stepperMinsText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
  },
  budgetInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetInfoText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
  appsSelectedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  appsSelectedText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  autoSelectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  autoSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sparkleCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoSelectTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  autoSelectSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 10.5,
    marginTop: 1,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
  modernSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  modernSearchInput: {
    fontFamily: fontFamilies.regular,
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  appsLoadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  appsLoadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  noAppsBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  noAppsText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  appsListWrap: {
    width: '100%',
    gap: 6,
  },
  modernAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  modernAppIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modernAppName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
  },
  categoryTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modernCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appsListFooter: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  appsListFooterText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  primaryCtaBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCtaBtnDisabled: {
    opacity: 0.6,
  },
  primaryCtaText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerMottoText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '400',
  },
});
