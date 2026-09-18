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
  Dimensions,
  Platform,
  AppState,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import {
  Shield,
  Zap,
  Flame,
  Crown,
  Swords,
  Brain,
  Target,
  Dumbbell,
  Trophy,
  User,
  Check,
  Sparkles,
  Smartphone,
  Lock,
  ArrowLeft,
  Clock,
  Camera as CameraIcon,
  Bell,
  Layers,
  Dices,
  Search,
} from 'lucide-react-native';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { appBlockerService, InstalledAppItem } from '../../src/native';
import { db } from '../../src/database/client';
import { appRestriction } from '../../src/database/schema';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { AriseLogo } from '../../src/components/ui/AriseLogo';
import { AVATAR_IMAGES, AVATAR_ICONS } from '../../src/components/profile/AvatarPicker';
import { getIsOnboardingCompleted, setIsOnboardingCompletedSync } from '../../src/services/appStateService';
import { LanguageSelectorModal } from '../../src/components/ui/LanguageSelectorModal';
import { useLanguageStore } from '../../src/services/i18n';
import { Globe } from 'phosphor-react-native';
import { colors } from '../../src/theme/colors';
import * as ImagePicker from 'expo-image-picker';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';

const { width } = Dimensions.get('window');

const HUNTER_ALIASES = [
  'SungJinWoo',
  'ShadowMonarch',
  'IronFang',
  'Ashborne',
  'VoidKnight',
  'StormBreaker',
  'NightStalker',
  'FrostViper',
  'AbyssHunter',
  'TitanSlayer',
  'GhostBlade',
  'CrimsonReaper',
];

const APP_CATEGORIES = ['ALL', 'SOCIAL', 'GAMES', 'STREAMING'] as const;

const SOCIAL_KEYWORDS = ['instagram', 'snapchat', 'facebook', 'twitter', 'reddit', 'threads', 'whatsapp', 'telegram', 'discord', 'tiktok', 'social'];
const GAME_KEYWORDS = ['game', 'pubg', 'bgmi', 'freefire', 'clash', 'candy', 'roblox', 'genshin', 'minecraft', 'cod', 'battlegrounds'];
const STREAMING_KEYWORDS = ['youtube', 'netflix', 'prime', 'hotstar', 'twitch', 'reels', 'shorts', 'hulu', 'disney', 'video'];

export default function OnboardingScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();

  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const updateProfile = usePlayerStore((s) => s.updateProfile);

  // 3-Step Flow:
  // 1: Name Creation & Avatar
  // 2: 5-in-1 Unified Permissions Gate
  // 3: Time Set + Distraction Apps
  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;

  // Step 1: Identity States
  const [userName, setUserName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('img_pfp_01');
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
  const [avatarTab, setAvatarTab] = useState<'images' | 'icons'>('images');

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

  const getSelectedAvatarSource = () => {
    if (selectedAvatar === 'custom' && customPhotoUri) {
      return { type: 'custom' as const, uri: customPhotoUri };
    }
    const imgObj = AVATAR_IMAGES.find((img) => img.id === selectedAvatar);
    if (imgObj) return { type: 'image' as const, source: imgObj.source };
    return { type: 'icon' as const, iconName: selectedAvatar };
  };

  const handleNext = () => {
    Keyboard.dismiss();
    haptics.medium();

    // Step 1 Validation: Hunter Name is strictly required
    if (step === 1) {
      const trimmed = userName.trim();
      if (!trimmed || trimmed.length < 2) {
        haptics.warning();
        setNameError('Please enter your Hunter Callsign (minimum 2 characters)');
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
      setNameError('Hunter Callsign is required to initialize protocol');
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

  const avatarInfo = getSelectedAvatarSource();

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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Progress Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            {step > 1 ? (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  haptics.light();
                  setStep((prev) => prev - 1);
                }}
                activeOpacity={0.8}
              >
                <ArrowLeft size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <AriseLogo size={32} glow />
            )}
            <Text style={styles.headerStageText}>
              PHASE {step} OF {totalSteps}
            </Text>
          </View>

          <View style={styles.headerRightArea}>
            <View style={styles.stepDotsRow}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    s <= step && styles.stepDotActive,
                    s === step && styles.stepDotCurrent,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.langPickerPill}
              onPress={() => {
                haptics.light();
                setShowLangModal(true);
              }}
              activeOpacity={0.8}
            >
              <Globe size={13} color="#0284C7" />
              <Text style={styles.langPickerText}>
                {currentLang === 'hi' ? 'हिंदी' : 'EN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* ================= STEP 1: IDENTITY & NAME CREATION ================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroBadge}>
                <Sparkles size={14} color="#0284C7" />
                <Text style={styles.heroBadgeText}>[ MONARCH IDENTITY ]</Text>
              </View>

              <Text style={styles.heroTitle}>HUNTER AWAKENING</Text>
              <Text style={styles.heroSubtitle}>
                Establish your vessel callsign and awaken your avatar to initiate system directives.
              </Text>

              {/* Holographic Identity Card Live Preview */}
              <GlassCard variant="glow" style={styles.holographicCard}>
                <View style={styles.holoTopRow}>
                  <View style={styles.holoAvatarWrapper}>
                    {avatarInfo.type === 'custom' && avatarInfo.uri ? (
                      <Image source={{ uri: avatarInfo.uri }} style={styles.holoAvatarImg} />
                    ) : avatarInfo.type === 'image' ? (
                      <Image source={avatarInfo.source} style={styles.holoAvatarImg} />
                    ) : (
                      <View style={styles.holoAvatarFallback}>
                        <User size={32} color="#0284C7" />
                      </View>
                    )}
                    <View style={styles.onlinePill} />
                  </View>

                  <View style={styles.holoMeta}>
                    <View style={styles.tagRow}>
                      <Text style={styles.holoRankTag}>E-RANK • VESSEL RECOGNIZED</Text>
                    </View>
                    <Text style={styles.holoCallsignText} numberOfLines={1}>
                      {userName.toUpperCase() || 'UNKNOWN HUNTER'}
                    </Text>
                    <Text style={styles.holoIdText}>ID: ARISE-001 // STATUS: AWAKENED</Text>
                  </View>
                </View>

                {/* RPG Attributes Preview */}
                <View style={styles.holoStatsGrid}>
                  <View style={styles.holoStatBox}>
                    <Text style={styles.holoStatLabel}>STR</Text>
                    <Text style={[styles.holoStatVal, { color: '#0284C7' }]}>10</Text>
                  </View>
                  <View style={styles.holoStatBox}>
                    <Text style={styles.holoStatLabel}>AGI</Text>
                    <Text style={[styles.holoStatVal, { color: '#38BDF8' }]}>10</Text>
                  </View>
                  <View style={styles.holoStatBox}>
                    <Text style={styles.holoStatLabel}>VIT</Text>
                    <Text style={[styles.holoStatVal, { color: '#10B981' }]}>10</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Callsign Input with Random Name Generator Dice */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.inputHeaderLabel}>HUNTER CALLSIGN *</Text>
                  <TouchableOpacity
                    style={styles.randomAliasBtn}
                    onPress={() => {
                      haptics.light();
                      const randomName = HUNTER_ALIASES[Math.floor(Math.random() * HUNTER_ALIASES.length)];
                      setUserName(randomName);
                      setNameError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Dices size={14} color="#0284C7" />
                    <Text style={styles.randomAliasText}>AUTO ROLL</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.textInputBox, !!nameError && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
                  <User size={18} color={nameError ? '#EF4444' : '#0284C7'} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="Enter hunter name (e.g. SungJinWoo)..."
                    placeholderTextColor="#64748B"
                    value={userName}
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
                </View>
                {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              {/* Avatar Selector */}
              <View style={styles.avatarPickerSection}>
                <View style={styles.avatarSectionHeader}>
                  <Text style={styles.inputHeaderLabel}>CHOOSE AVATAR</Text>
                  <View style={styles.tabToggleRow}>
                    <TouchableOpacity
                      style={[styles.tabBtn, avatarTab === 'images' && styles.tabBtnActive]}
                      onPress={() => setAvatarTab('images')}
                    >
                      <Text style={[styles.tabBtnText, avatarTab === 'images' && styles.tabBtnTextActive]}>
                        HUNTERS
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabBtn, avatarTab === 'icons' && styles.tabBtnActive]}
                      onPress={() => setAvatarTab('icons')}
                    >
                      <Text style={[styles.tabBtnText, avatarTab === 'icons' && styles.tabBtnTextActive]}>
                        INSIGNIAS
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Avatar Horizontal Carousel */}
                {avatarTab === 'images' ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScrollRow}>
                    {AVATAR_IMAGES.map((item) => {
                      const isSelected = selectedAvatar === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            haptics.light();
                            setSelectedAvatar(item.id);
                          }}
                          style={[styles.avatarItemWrap, isSelected && styles.avatarItemWrapSelected]}
                          activeOpacity={0.8}
                        >
                          <Image source={item.source} style={styles.avatarGridImg} />
                          {isSelected && (
                            <View style={styles.selectedCheckOverlay}>
                              <Check size={14} color="#000000" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScrollRow}>
                    {AVATAR_ICONS.map((item) => {
                      const isSelected = selectedAvatar === item.id;
                      const IconComponent = item.component;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            haptics.light();
                            setSelectedAvatar(item.id);
                          }}
                          style={[styles.avatarItemWrap, styles.avatarIconItemWrap, isSelected && styles.avatarItemWrapSelected]}
                          activeOpacity={0.8}
                        >
                          <IconComponent size={24} color={isSelected ? '#0284C7' : '#94A3B8'} />
                          {isSelected && (
                            <View style={styles.selectedCheckOverlay}>
                              <Check size={14} color="#000000" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          {/* ================= STEP 2: 5-IN-1 UNIFIED PERMISSIONS GATE ================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroBadge}>
                <Shield size={14} color="#0284C7" />
                <Text style={styles.heroBadgeText}>[ SYSTEM PROTOCOLS ]</Text>
              </View>

              <Text style={styles.heroTitle}>AUTHORIZE SYSTEM ACCESS</Text>
              <Text style={styles.heroSubtitle}>
                Grant all 5 core Android permissions required for AI pose tracking and real screen time locking.
              </Text>

              {/* Status Header Pill */}
              <View style={[styles.permStatusHeaderPill, { borderColor: allPermissionsGranted ? '#10B981' : '#0284C7' }]}>
                <Text style={[styles.permStatusHeaderText, { color: allPermissionsGranted ? '#10B981' : '#0284C7' }]}>
                  {allPermissionsGranted
                    ? 'ALL 5 PERMISSIONS GRANTED • SYSTEM READY'
                    : `PERMISSIONS ACTIVE: ${allPermissionsCount} / 5 REQUIRED`}
                </Text>
              </View>

              <View style={{ width: '100%', gap: 10 }}>
                {/* 1. Camera Tracker */}
                <GlassCard variant={cameraGranted ? 'glow' : 'default'} style={styles.permCard}>
                  <View style={styles.permCardTop}>
                    <View style={[styles.permIconBox, { backgroundColor: cameraGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(2, 132, 199, 0.15)' }]}>
                      <CameraIcon size={20} color={cameraGranted ? '#10B981' : '#0284C7'} />
                    </View>
                    <View style={styles.permCardHeaderCol}>
                      <Text style={styles.permCardTitle}>1. AI Movement Camera</Text>
                      <Text style={[styles.permCardStatusText, { color: cameraGranted ? '#10B981' : '#64748B' }]}>
                        {cameraGranted ? 'Camera Authorized' : 'Required for rep counting'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.permActionBtn, cameraGranted && styles.permActionBtnGranted]}
                      onPress={handleGrantCamera}
                      disabled={cameraGranted}
                      activeOpacity={0.8}
                    >
                      {cameraGranted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={13} color="#10B981" strokeWidth={3} />
                          <Text style={styles.permActionBtnTextGranted}>ENABLED</Text>
                        </View>
                      ) : (
                        <Text style={styles.permActionBtnText}>GRANT</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.permCardDesc}>
                    Powers real-time ML Kit computer vision for push-up and squat rep tracking.
                  </Text>
                </GlassCard>

                {/* 2. System Notifications */}
                <GlassCard variant={notifGranted ? 'glow' : 'default'} style={styles.permCard}>
                  <View style={styles.permCardTop}>
                    <View style={[styles.permIconBox, { backgroundColor: notifGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(2, 132, 199, 0.15)' }]}>
                      <Bell size={20} color={notifGranted ? '#10B981' : '#0284C7'} />
                    </View>
                    <View style={styles.permCardHeaderCol}>
                      <Text style={styles.permCardTitle}>2. System Notifications</Text>
                      <Text style={[styles.permCardStatusText, { color: notifGranted ? '#10B981' : '#64748B' }]}>
                        {notifGranted ? 'Notifications Active' : 'Daily quests & rank alerts'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.permActionBtn, notifGranted && styles.permActionBtnGranted]}
                      onPress={handleGrantNotifications}
                      disabled={notifGranted}
                      activeOpacity={0.8}
                    >
                      {notifGranted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={13} color="#10B981" strokeWidth={3} />
                          <Text style={styles.permActionBtnTextGranted}>ENABLED</Text>
                        </View>
                      ) : (
                        <Text style={styles.permActionBtnText}>GRANT</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.permCardDesc}>
                    Transmits daily quest resets, penalty zone warnings, and Solo Leveling rank promotions.
                  </Text>
                </GlassCard>

                {/* 3. App Usage Access */}
                <GlassCard variant={usageGranted ? 'glow' : 'default'} style={styles.permCard}>
                  <View style={styles.permCardTop}>
                    <View style={[styles.permIconBox, { backgroundColor: usageGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(2, 132, 199, 0.15)' }]}>
                      <Clock size={20} color={usageGranted ? '#10B981' : '#0284C7'} />
                    </View>
                    <View style={styles.permCardHeaderCol}>
                      <Text style={styles.permCardTitle}>3. App Usage Access</Text>
                      <Text style={[styles.permCardStatusText, { color: usageGranted ? '#10B981' : '#64748B' }]}>
                        {usageGranted ? 'Usage Access Active' : 'Monitors screen time limit'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.permActionBtn, usageGranted && styles.permActionBtnGranted]}
                      onPress={handleGrantUsage}
                      disabled={usageGranted}
                      activeOpacity={0.8}
                    >
                      {usageGranted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={13} color="#10B981" strokeWidth={3} />
                          <Text style={styles.permActionBtnTextGranted}>ENABLED</Text>
                        </View>
                      ) : (
                        <Text style={styles.permActionBtnText}>GRANT</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.permCardDesc}>
                    Tracks distraction app usage and locks them once your daily allowance expires.
                  </Text>
                </GlassCard>

                {/* 4. Display Over Other Apps */}
                <GlassCard variant={overlayGranted ? 'glow' : 'default'} style={styles.permCard}>
                  <View style={styles.permCardTop}>
                    <View style={[styles.permIconBox, { backgroundColor: overlayGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(2, 132, 199, 0.15)' }]}>
                      <Shield size={20} color={overlayGranted ? '#10B981' : '#0284C7'} />
                    </View>
                    <View style={styles.permCardHeaderCol}>
                      <Text style={styles.permCardTitle}>4. Screen Lock Shield</Text>
                      <Text style={[styles.permCardStatusText, { color: overlayGranted ? '#10B981' : '#64748B' }]}>
                        {overlayGranted ? 'Shield Active' : 'Required for workout lock'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.permActionBtn, overlayGranted && styles.permActionBtnGranted]}
                      onPress={handleGrantOverlay}
                      disabled={overlayGranted}
                      activeOpacity={0.8}
                    >
                      {overlayGranted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={13} color="#10B981" strokeWidth={3} />
                          <Text style={styles.permActionBtnTextGranted}>ENABLED</Text>
                        </View>
                      ) : (
                        <Text style={styles.permActionBtnText}>GRANT</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.permCardDesc}>
                    Draws the impenetrable Solo Leveling lock screen over restricted apps until workout reps are done.
                  </Text>
                </GlassCard>

                {/* 5. Battery Optimization Exemption */}
                <GlassCard variant={batteryGranted ? 'glow' : 'default'} style={styles.permCard}>
                  <View style={styles.permCardTop}>
                    <View style={[styles.permIconBox, { backgroundColor: batteryGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(2, 132, 199, 0.15)' }]}>
                      <Zap size={20} color={batteryGranted ? '#10B981' : '#0284C7'} />
                    </View>
                    <View style={styles.permCardHeaderCol}>
                      <Text style={styles.permCardTitle}>5. Battery Optimization</Text>
                      <Text style={[styles.permCardStatusText, { color: batteryGranted ? '#10B981' : '#64748B' }]}>
                        {batteryGranted ? 'Exemption Granted' : 'Required for background'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.permActionBtn, batteryGranted && styles.permActionBtnGranted]}
                      onPress={handleGrantBattery}
                      disabled={batteryGranted}
                      activeOpacity={0.8}
                    >
                      {batteryGranted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={13} color="#10B981" strokeWidth={3} />
                          <Text style={styles.permActionBtnTextGranted}>ENABLED</Text>
                        </View>
                      ) : (
                        <Text style={styles.permActionBtnText}>GRANT</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.permCardDesc}>
                    Ensures the background app blocker and focus timers are never killed by Android OS.
                  </Text>
                </GlassCard>
              </View>
            </View>
          )}

          {/* ================= STEP 3: TIME SETTING + APPS SELECTION ================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroBadge}>
                <Clock size={14} color="#0284C7" />
                <Text style={styles.heroBadgeText}>[ PROTOCOL CALIBRATION ]</Text>
              </View>

              <Text style={styles.heroTitle}>DAILY TIME & APPS</Text>
              <Text style={styles.heroSubtitle}>
                Set your daily screen time allowance and choose the distraction apps to lock behind workout reps.
              </Text>

              {/* 1. Daily Screen Time Allowance Section (TOP) */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIconCircle}>
                    <Clock size={16} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputHeaderLabel}>DAILY SCREEN TIME ALLOWANCE</Text>
                    <Text style={styles.sectionSubdesc}>Free distraction time allowed before apps lock.</Text>
                  </View>
                </View>

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
                        style={[styles.timePill, isSelected && styles.timePillActive]}
                        onPress={() => {
                          haptics.light();
                          setIsCustomTime(false);
                          setDailyFocusMinutes(b.mins);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timePillText, isSelected && styles.timePillTextActive]}>
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.timePill, isCustomTime && styles.timePillActive]}
                    onPress={() => {
                      haptics.light();
                      setIsCustomTime(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timePillText, isCustomTime && styles.timePillTextActive]}>
                      CUSTOM
                    </Text>
                  </TouchableOpacity>
                </View>

                {isCustomTime && (
                  <View style={styles.customTimeInputBox}>
                    <Text style={styles.customTimeLabel}>Allowance in minutes:</Text>
                    <TextInput
                      style={styles.customTimeTextInput}
                      value={customTimeInput}
                      onChangeText={setCustomTimeInput}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="e.g. 50"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                )}
              </View>

              {/* 2. Apps To Restrict Section (BOTTOM) */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIconCircle}>
                    <Lock size={16} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputHeaderLabel}>DISTRACTION APPS TO LOCK</Text>
                    <Text style={styles.sectionSubdesc}>Locked apps unlock only by executing workout reps.</Text>
                  </View>
                  {selectedApps.length > 0 && (
                    <View style={styles.appCountBadge}>
                      <Text style={styles.appCountBadgeText}>{selectedApps.length} LOCKED</Text>
                    </View>
                  )}
                </View>

                {/* Quick 1-Click Select Top Distractions Button */}
                <TouchableOpacity
                  style={styles.quickSelectBtn}
                  onPress={handleSelectTopDistractions}
                  activeOpacity={0.85}
                >
                  <Sparkles size={14} color="#0284C7" />
                  <Text style={styles.quickSelectBtnText}>SELECT ALL TOP DISTRACTIONS</Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={styles.searchBarBox}>
                  <Search size={15} color="#64748B" />
                  <TextInput
                    style={styles.searchBarInput}
                    placeholder="Search apps..."
                    placeholderTextColor="#64748B"
                    value={appSearchQuery}
                    onChangeText={setAppSearchQuery}
                  />
                </View>

                {/* Category Pills */}
                <View style={styles.categoryPillsRow}>
                  {APP_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                      onPress={() => {
                        haptics.light();
                        setActiveCategory(cat);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.categoryPillText, activeCategory === cat && styles.categoryPillTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Apps List */}
                {loadingApps ? (
                  <View style={styles.appsLoadingBox}>
                    <ActivityIndicator size="small" color="#0284C7" />
                    <Text style={styles.appsLoadingText}>Scanning installed apps...</Text>
                  </View>
                ) : filteredApps.length === 0 ? (
                  <View style={styles.noAppsBox}>
                    <Smartphone size={24} color="#64748B" />
                    <Text style={styles.noAppsText}>No apps found in this category.</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 260, width: '100%' }}
                    contentContainerStyle={{ gap: 8 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {filteredApps.slice(0, 25).map((app) => {
                      const isSelected = selectedApps.includes(app.packageName);
                      return (
                        <TouchableOpacity
                          key={app.packageName}
                          onPress={() => toggleApp(app.packageName)}
                          activeOpacity={0.8}
                        >
                          <GlassCard
                            variant={isSelected ? 'glow' : 'default'}
                            style={[styles.miniAppCard, isSelected && { borderColor: '#0284C7' }]}
                          >
                            <View style={styles.miniAppIcon}>
                              {app.appIconBase64 ? (
                                <Image
                                  source={{ uri: app.appIconBase64 }}
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                />
                              ) : (
                                <Smartphone size={18} color={isSelected ? '#0284C7' : '#64748B'} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.miniAppName, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                                {app.appName}
                              </Text>
                              <Text style={styles.miniAppPkg} numberOfLines={1}>
                                {app.packageName}
                              </Text>
                            </View>
                            <View style={[styles.lockIndicator, isSelected && styles.lockIndicatorActive]}>
                              <Lock size={13} color={isSelected ? '#FFFFFF' : '#64748B'} />
                            </View>
                          </GlassCard>
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

        {/* Bottom CTA Button */}
        <View style={styles.footerContainer}>
          <GlassButton
            title={
              isSubmitting
                ? 'AWAKENING VESSEL...'
                : step === 1
                ? 'PROCEED TO PERMISSIONS'
                : step === 2
                ? allPermissionsGranted
                  ? 'PROCEED TO PROTOCOL'
                  : 'PROCEED TO PROTOCOL (OR GRANT ALL)'
                : 'COMPLETE AWAKENING'
            }
            onPress={handleNext}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ width: '100%' }}
          />
        </View>

        {/* Language Selection Modal */}
        <LanguageSelectorModal visible={showLangModal} onClose={() => setShowLangModal(false)} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030509' },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0E1422',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langPickerText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0C111D',
    borderWidth: 1,
    borderColor: '#1C2538',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStageText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 1.2,
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepDot: {
    width: 18,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#1C2538',
  },
  stepDotActive: {
    backgroundColor: '#0284C7',
  },
  stepDotCurrent: {
    width: 24,
    backgroundColor: '#0284C7',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  stepContainer: {
    gap: 14,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  holographicCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    backgroundColor: '#060A12',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  holoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  holoAvatarWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#0284C7',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0C111D',
  },
  holoAvatarImg: {
    width: '100%',
    height: '100%',
  },
  holoAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlinePill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#060A12',
  },
  holoMeta: {
    flex: 1,
    gap: 3,
  },
  tagRow: {
    flexDirection: 'row',
  },
  holoRankTag: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.4,
  },
  holoCallsignText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  holoIdText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  holoStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C111D',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1C2538',
  },
  holoStatBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  holoStatLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  holoStatVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  inputGroup: {
    width: '100%',
  },
  inputHeaderLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  randomAliasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  randomAliasText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#060A12',
    borderWidth: 1,
    borderColor: '#1C2538',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
  },
  avatarPickerSection: {
    width: '100%',
    gap: 10,
  },
  avatarSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0C111D',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
  },
  tabBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E8E93',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  avatarScrollRow: {
    gap: 10,
    paddingVertical: 4,
  },
  avatarItemWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#1C2538',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarIconItemWrap: {
    backgroundColor: '#0C111D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarItemWrapSelected: {
    borderColor: '#0284C7',
  },
  avatarGridImg: {
    width: '100%',
    height: '100%',
  },
  selectedCheckOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    padding: 2,
  },
  // Permissions
  permStatusHeaderPill: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#060A12',
    alignItems: 'center',
  },
  permStatusHeaderText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  permCard: {
    padding: 12,
    borderRadius: 14,
    gap: 6,
    backgroundColor: '#060A12',
    borderWidth: 1,
    borderColor: '#1C2538',
  },
  permCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  permCardStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  permActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  permActionBtnGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  permActionBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  permActionBtnTextGranted: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  permCardDesc: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 15,
  },
  // Step 3
  sectionBlock: {
    width: '100%',
    gap: 10,
    backgroundColor: '#060A12',
    borderWidth: 1,
    borderColor: '#1C2538',
    borderRadius: 16,
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionSubdesc: {
    fontSize: 11,
    color: '#8E8E93',
  },
  timePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#0C111D',
    borderWidth: 1,
    borderColor: '#1C2538',
    alignItems: 'center',
  },
  timePillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
  },
  timePillTextActive: {
    color: '#FFFFFF',
  },
  customTimeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0C111D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1C2538',
  },
  customTimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  customTimeTextInput: {
    width: 60,
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
    textAlign: 'center',
    backgroundColor: '#060A12',
    borderRadius: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  appCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  appCountBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  quickSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.35)',
  },
  quickSelectBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0C111D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#1C2538',
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 0,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#0C111D',
    borderWidth: 1,
    borderColor: '#1C2538',
  },
  categoryPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  appsLoadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  appsLoadingText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  noAppsBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  noAppsText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  miniAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0C111D',
    borderWidth: 1,
    borderColor: '#1C2538',
  },
  miniAppIcon: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#161B26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAppName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  miniAppPkg: {
    fontSize: 10,
    color: '#64748B',
  },
  lockIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#161B26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIndicatorActive: {
    backgroundColor: '#0284C7',
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#0E1422',
  },
});
