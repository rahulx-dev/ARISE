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
import { useLanguageStore } from '../../src/services/i18n';
import { Globe } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { fontFamilies } from '../../src/theme/typography';

const APP_CATEGORIES = ['ALL', 'SOCIAL', 'GAMES', 'STREAMING'] as const;

const SOCIAL_KEYWORDS = ['instagram', 'snapchat', 'facebook', 'twitter', 'reddit', 'threads', 'whatsapp', 'telegram', 'discord', 'tiktok', 'social'];
const GAME_KEYWORDS = ['game', 'pubg', 'bgmi', 'freefire', 'clash', 'candy', 'roblox', 'genshin', 'minecraft', 'cod', 'battlegrounds'];
const STREAMING_KEYWORDS = ['youtube', 'netflix', 'prime', 'hotstar', 'twitch', 'reels', 'shorts', 'hulu', 'disney', 'video'];

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
  const currentLang = useLanguageStore((s) => s.language);

  // Check all 5 permissions
  const checkAllPermissions = async () => {
    try {
      const usage = await appBlockerService.hasUsagePermission();
      setUsageGranted(usage);

      const overlay = await appBlockerService.hasOverlayPermission();
      setOverlayGranted(overlay);

      const battery = (await appBlockerService.hasBatteryOptimizationExemption?.()) ?? true;
      setBatteryGranted(battery);

      const cam = await Camera.getCameraPermissionsAsync();
      setCameraGranted(cam.granted);

      const notif = await Notifications.getPermissionsAsync();
      setNotifGranted(notif.granted);
    } catch (e) {
      console.warn('[Onboarding] Error checking permissions:', e);
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
          if (granted) {
            setBatteryGranted(true);
            haptics.success();
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        } else if (type === 'usage') {
          const granted = await appBlockerService.hasUsagePermission();
          if (granted) {
            setUsageGranted(true);
            haptics.success();
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        } else if (type === 'overlay') {
          const granted = await appBlockerService.hasOverlayPermission();
          if (granted) {
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

  const handleGoogleSignIn = async () => {
    haptics.medium();
    showIOSAlert('Google Sign-In', 'Connecting to Google Authentication...');
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
                <View style={styles.googleGLogo}>
                  <Text style={styles.googleGText}>G</Text>
                </View>
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
                    placeholder="Arjun"
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
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Set Your Goals</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                Let's personalize your daily journey.
              </Text>

              {/* 1. Daily Screen Time Allowance Section */}
              <View style={styles.goalSectionBlock}>
                <Text style={[styles.cleanInputLabel, { color: colors.textSecondary }]}>
                  Daily Screen Time Allowance
                </Text>

                <View style={styles.timePillsRow}>
                  {[
                    { mins: 0, label: '0m (Lock)' },
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
                          styles.timePill,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          haptics.light();
                          setIsCustomTime(false);
                          setDailyFocusMinutes(b.mins);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timePillText, { color: colors.textSecondary }, isSelected && { color: '#FFFFFF' }]}>
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[
                      styles.timePill,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isCustomTime && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setIsCustomTime(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timePillText, { color: colors.textSecondary }, isCustomTime && { color: '#FFFFFF' }]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {isCustomTime && (
                  <View style={[styles.customTimeInputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.customTimeLabel, { color: colors.textSecondary }]}>Allowance in minutes:</Text>
                    <TextInput
                      style={[styles.customTimeTextInput, { color: colors.primary, borderColor: colors.primary, backgroundColor: colors.background }]}
                      value={customTimeInput}
                      onChangeText={setCustomTimeInput}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="50"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>

              {/* 2. Select Your Top Distractions */}
              <View style={styles.goalSectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.cleanInputLabel, { color: colors.textSecondary, flex: 1 }]}>
                    Select Your Top Distractions
                  </Text>
                  {selectedApps.length > 0 && (
                    <Text style={[styles.appCountText, { color: colors.primary }]}>{selectedApps.length} selected</Text>
                  )}
                </View>

                {/* Auto Select Button */}
                <TouchableOpacity
                  style={[styles.quickSelectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleSelectTopDistractions}
                  activeOpacity={0.85}
                >
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={[styles.quickSelectBtnText, { color: colors.primary }]}>
                    Auto Select (Top Apps)
                  </Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={[styles.searchBarBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Search size={15} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchBarInput, { color: colors.textPrimary }]}
                    placeholder="Search apps..."
                    placeholderTextColor={colors.textMuted}
                    value={appSearchQuery}
                    onChangeText={setAppSearchQuery}
                  />
                </View>

                {/* Apps List */}
                {loadingApps ? (
                  <View style={styles.appsLoadingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.appsLoadingText, { color: colors.textSecondary }]}>Scanning installed apps...</Text>
                  </View>
                ) : filteredApps.length === 0 ? (
                  <View style={styles.noAppsBox}>
                    <Smartphone size={24} color={colors.textMuted} />
                    <Text style={[styles.noAppsText, { color: colors.textMuted }]}>No apps found.</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 240, width: '100%' }}
                    contentContainerStyle={{ gap: 8 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {filteredApps.slice(0, 30).map((app) => {
                      const isSelected = selectedApps.includes(app.packageName);
                      return (
                        <TouchableOpacity
                          key={app.packageName}
                          onPress={() => toggleApp(app.packageName)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.miniAppCard,
                              { backgroundColor: colors.card, borderColor: colors.border },
                              isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(229, 57, 53, 0.04)' },
                            ]}
                          >
                            <View style={[styles.miniAppIcon, { backgroundColor: colors.surfaceLight }]}>
                              {app.appIconBase64 ? (
                                <Image
                                  source={{ uri: app.appIconBase64 }}
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                />
                              ) : (
                                <Smartphone size={18} color={isSelected ? colors.primary : colors.textMuted} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.miniAppName, { color: colors.textPrimary }, isSelected && { fontFamily: fontFamilies.semiBold, fontWeight: '600' }]}>
                                {app.appName}
                              </Text>
                              <Text style={[styles.miniAppPkg, { color: colors.textMuted }]} numberOfLines={1}>
                                {app.packageName}
                              </Text>
                            </View>
                            <View style={[styles.lockIndicator, { backgroundColor: colors.surfaceLight }, isSelected && { backgroundColor: colors.primary }]}>
                              <Check size={12} color={isSelected ? '#FFFFFF' : colors.textMuted} strokeWidth={3} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Bottom Prominent CTA Button */}
        <View style={[styles.footerContainer, { borderTopColor: step === 2 ? 'transparent' : colors.border }]}>
          <TouchableOpacity
            style={[styles.primaryCtaBtn, { backgroundColor: '#E53935' }, isSubmitting && styles.primaryCtaBtnDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryCtaText}>
                {step === 1 ? 'Continue  →' : step === 2 ? 'Continue  →' : 'Start Training  🚀'}
              </Text>
            )}
          </TouchableOpacity>
          {step === 2 ? (
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
  // Step 3 Styles
  goalSectionBlock: {
    width: '100%',
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appCountText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
  timePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timePillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
  customTimeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  customTimeLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
  },
  customTimeTextInput: {
    fontFamily: fontFamilies.semiBold,
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    borderRadius: 6,
    paddingVertical: 4,
    borderWidth: 1,
  },
  quickSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickSelectBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchBarInput: {
    fontFamily: fontFamilies.regular,
    flex: 1,
    fontSize: 12.5,
    fontWeight: '400',
    padding: 0,
  },
  appsLoadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  appsLoadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
  },
  noAppsBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  noAppsText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
  },
  miniAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniAppIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAppName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
  },
  miniAppPkg: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    fontWeight: '400',
  },
  lockIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  primaryCtaBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCtaBtnDisabled: {
    opacity: 0.6,
  },
  primaryCtaText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerMottoText: {
    fontFamily: fontFamilies.regular,
    fontSize: 10.5,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '400',
  },
});
