import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Ghost,
  Rocket,
  Gem,
  Cpu,
  Heart,
  Star,
  User,
  Check,
  ChevronRight,
  Sparkles,
  Smartphone,
  Lock,
  ArrowLeft,
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
import { colors } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

const GOALS_LIST = [
  { id: 'fitness', title: 'Physical Power', icon: Dumbbell, desc: 'Push-ups, squats, calisthenics CV tracking' },
  { id: 'focus', title: 'Deep Concentration', icon: Brain, desc: 'Flow-state work sprints with zero distraction' },
  { id: 'screentime', title: 'Screen Lock Protocol', icon: Lock, desc: 'Lock apps behind physical workout reps' },
  { id: 'discipline', title: 'Iron Discipline', icon: Shield, desc: 'Build consecutive daily streaks & habits' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();

  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const updateProfile = usePlayerStore((s) => s.updateProfile);

  const [step, setStep] = useState<number>(1);
  const [userName, setUserName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('img_pfp_01');
  const [avatarTab, setAvatarTab] = useState<'images' | 'icons'>('images');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['fitness', 'screentime']);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledAppItem[]>([]);
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalSteps = 3;

  useEffect(() => {
    // If onboarding already marked done, immediately skip to tabs
    if (onboardingCompleted || getIsOnboardingCompleted()) {
      useSettingsStore.setState({ onboardingCompleted: true });
      router.replace('/(tabs)');
    }
  }, [onboardingCompleted]);

  useEffect(() => {
    if (step === 2) {
      loadApps();
    }
  }, [step]);

  const loadApps = async () => {
    setLoadingApps(true);
    try {
      const apps = await appBlockerService.getInstalledApps();
      const filtered = apps.filter((a) => !a.isSystemApp);
      const appList = filtered.length > 0 ? filtered : apps;
      setInstalledApps(appList);

      if (selectedApps.length === 0) {
        const topDistractions = ['instagram', 'youtube', 'tiktok', 'snapchat', 'reddit', 'twitter', 'facebook'];
        const matched = appList
          .filter((a) =>
            topDistractions.some(
              (d) =>
                a.packageName.toLowerCase().includes(d) ||
                a.appName.toLowerCase().includes(d)
            )
          )
          .map((a) => a.packageName);
        if (matched.length > 0) {
          setSelectedApps(matched);
        } else if (appList.length > 0) {
          setSelectedApps([appList[0].packageName]);
        }
      }
    } catch (e) {
      console.warn('Error loading apps:', e);
    } finally {
      setLoadingApps(false);
    }
  };

  const toggleGoal = (id: string) => {
    haptics.light();
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleApp = (pkg: string) => {
    haptics.light();
    setSelectedApps((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const getSelectedAvatarSource = () => {
    const imgObj = AVATAR_IMAGES.find((img) => img.id === selectedAvatar);
    if (imgObj) return { type: 'image' as const, source: imgObj.source };
    return { type: 'icon' as const, iconName: selectedAvatar };
  };

  const handleNext = () => {
    haptics.medium();
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    haptics.heavy();

    try {
      const finalName = userName.trim() || 'Warrior';

      // 1. Authoritative SQLite user profile update
      await updateProfile({
        displayName: finalName,
        avatarIcon: selectedAvatar,
      });

      // 2. Persist restricted apps
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
      }

      // 3. Start native background app blocker monitor
      if (selectedApps.length > 0) {
        appBlockerService.startMonitoring(selectedApps);
      }

      // 4. Mark onboarding completed in SQLite settings table synchronously BEFORE navigating
      await setOnboardingCompleted();
      setIsOnboardingCompletedSync(true);

      sound.play('level_up');
      haptics.success();

      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
      setIsSubmitting(false);
    }
  };

  const avatarInfo = getSelectedAvatarSource();

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
                  setStep(step - 1);
                }}
                activeOpacity={0.8}
              >
                <ArrowLeft size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <AriseLogo size={32} glow />
            )}
            <Text style={styles.headerStageText}>
              PROTOCOL // PHASE 0{step}
            </Text>
          </View>

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
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= STEP 1: IDENTITY CREATION ================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroBadge}>
                <Sparkles size={16} color={colors.primary} />
                <Text style={styles.heroBadgeText}>NEURAL IDENTITY FORGE</Text>
              </View>

              <Text style={styles.heroTitle}>CREATE YOUR IDENTITY</Text>
              <Text style={styles.heroSubtitle}>
                Welcome to ARISE. Forge your warrior callsign and choose your visual avatar.
              </Text>

              {/* Holographic Identity Card Live Preview */}
              <GlassCard variant="glow" style={styles.holographicCard}>
                <View style={styles.holoTopRow}>
                  <View style={styles.holoAvatarWrapper}>
                    {avatarInfo.type === 'image' ? (
                      <Image source={avatarInfo.source} style={styles.holoAvatarImg} />
                    ) : (
                      <View style={styles.holoAvatarFallback}>
                        <User size={34} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.onlinePill} />
                  </View>

                  <View style={styles.holoMeta}>
                    <View style={styles.tagRow}>
                      <Text style={styles.holoRankTag}>LEVEL 1 • RECRUIT</Text>
                    </View>
                    <Text style={styles.holoCallsignText} numberOfLines={1}>
                      {userName || 'WARRIOR'}
                    </Text>
                    <Text style={styles.holoIdText}>ID: ARISE-001 • STATUS: ACTIVE</Text>
                  </View>
                </View>

                {/* RPG Attributes Preview */}
                <View style={styles.holoStatsGrid}>
                  <View style={styles.holoStatBox}>
                    <Text style={styles.holoStatLabel}>STRENGTH</Text>
                    <Text style={[styles.holoStatVal, { color: colors.primary }]}>0</Text>
                  </View>
                  <View style={styles.holoStatBox}>
                    <Text style={styles.holoStatLabel}>FOCUS</Text>
                    <Text style={[styles.holoStatVal, { color: colors.secondary }]}>0</Text>
                  </View>
                  <View style={styles.holoStatBox}>
                    <Text style={styles.holoStatLabel}>DISCIPLINE</Text>
                    <Text style={[styles.holoStatVal, { color: colors.success }]}>0</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Callsign Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputHeaderLabel}>WARRIOR CALLSIGN</Text>
                <View style={styles.textInputBox}>
                  <User size={18} color={colors.primary} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="Enter your warrior name..."
                    placeholderTextColor={colors.textMuted}
                    value={userName}
                    onChangeText={setUserName}
                    maxLength={24}
                  />
                </View>
              </View>

              {/* Avatar Selector Tabs */}
              <View style={styles.avatarPickerSection}>
                <View style={styles.avatarTabsHeader}>
                  <Text style={styles.inputHeaderLabel}>CHOOSE AVATAR</Text>
                  <View style={styles.tabToggleRow}>
                    <TouchableOpacity
                      style={[styles.tabBtn, avatarTab === 'images' && styles.tabBtnActive]}
                      onPress={() => setAvatarTab('images')}
                    >
                      <Text
                        style={[
                          styles.tabBtnText,
                          avatarTab === 'images' && styles.tabBtnTextActive,
                        ]}
                      >
                        CYBER PFPs ({AVATAR_IMAGES.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabBtn, avatarTab === 'icons' && styles.tabBtnActive]}
                      onPress={() => setAvatarTab('icons')}
                    >
                      <Text
                        style={[
                          styles.tabBtnText,
                          avatarTab === 'icons' && styles.tabBtnTextActive,
                        ]}
                      >
                        INSIGNIAS
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Avatar Grid */}
                {avatarTab === 'images' ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.avatarScrollRow}
                  >
                    {AVATAR_IMAGES.map((item) => {
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
                            isSelected && styles.avatarItemWrapSelected,
                          ]}
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.avatarScrollRow}
                  >
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
                          style={[
                            styles.avatarItemWrap,
                            styles.avatarIconItemWrap,
                            isSelected && styles.avatarItemWrapSelected,
                          ]}
                          activeOpacity={0.8}
                        >
                          <IconComponent
                            size={24}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
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

          {/* ================= STEP 2: PROTOCOL OBJECTIVES & APPS ================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroBadge}>
                <Target size={16} color={colors.secondary} />
                <Text style={[styles.heroBadgeText, { color: colors.secondary }]}>
                  PROTOCOL DIRECTIVES
                </Text>
              </View>

              <Text style={styles.heroTitle}>SELECT YOUR GOALS</Text>
              <Text style={styles.heroSubtitle}>
                Choose your focus areas. ARISE will customize your daily missions and screen-time unlock costs.
              </Text>

              {/* Goals Cards */}
              <View style={styles.goalsListWrap}>
                {GOALS_LIST.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  const IconC = goal.icon;
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      onPress={() => toggleGoal(goal.id)}
                      activeOpacity={0.8}
                    >
                      <GlassCard
                        variant={isSelected ? 'glow' : 'default'}
                        style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                      >
                        <View
                          style={[
                            styles.goalIconCircle,
                            isSelected && styles.goalIconCircleSelected,
                          ]}
                        >
                          <IconC
                            size={20}
                            color={isSelected ? colors.primary : colors.textMuted}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={[
                              styles.goalTitle,
                              isSelected && { color: colors.primary },
                            ]}
                          >
                            {goal.title}
                          </Text>
                          <Text style={styles.goalDesc}>{goal.desc}</Text>
                        </View>
                        <View
                          style={[
                            styles.checkboxCircle,
                            isSelected && styles.checkboxCircleSelected,
                          ]}
                        >
                          {isSelected && <Check size={14} color="#000" strokeWidth={3} />}
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Apps to Restrict Section */}
              <View style={styles.appsToRestrictSection}>
                <View style={styles.appsHeaderRow}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text style={styles.inputHeaderLabel}>DISTRACTION APPS TO LOCK</Text>
                    <Text style={styles.appsSubdesc}>
                      These apps will require coins earned from exercise to unlock.
                    </Text>
                  </View>
                  {selectedApps.length > 0 && (
                    <View style={styles.appCountBadge}>
                      <Text style={styles.appCountBadgeText}>
                        {selectedApps.length} LOCKED
                      </Text>
                    </View>
                  )}
                </View>

                {loadingApps ? (
                  <View style={styles.appsLoadingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.appsLoadingText}>Scanning device for apps...</Text>
                  </View>
                ) : installedApps.length === 0 ? (
                  <View style={styles.noAppsBox}>
                    <Smartphone size={28} color={colors.textMuted} />
                    <Text style={styles.noAppsText}>
                      No third-party apps detected. You can configure locked apps in Settings anytime.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 220, width: '100%' }}
                    contentContainerStyle={{ gap: 8 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {installedApps.slice(0, 15).map((app) => {
                      const isSelected = selectedApps.includes(app.packageName);
                      return (
                        <TouchableOpacity
                          key={app.packageName}
                          onPress={() => toggleApp(app.packageName)}
                          activeOpacity={0.8}
                        >
                          <GlassCard
                            variant={isSelected ? 'glow' : 'default'}
                            style={styles.miniAppCard}
                          >
                            <View style={styles.miniAppIcon}>
                              {app.appIconBase64 ? (
                                <Image
                                  source={{ uri: app.appIconBase64 }}
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                />
                              ) : (
                                <Smartphone
                                  size={18}
                                  color={isSelected ? colors.primary : colors.textMuted}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.miniAppName}>{app.appName}</Text>
                              <Text style={styles.miniAppPkg} numberOfLines={1}>
                                {app.packageName}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.lockIndicator,
                                isSelected && styles.lockIndicatorActive,
                              ]}
                            >
                              <Lock
                                size={14}
                                color={isSelected ? colors.primary : colors.textMuted}
                              />
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

          {/* ================= STEP 3: ACTIVATION & DEPLOYMENT ================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.heroBadge}>
                <Crown size={16} color={colors.primary} />
                <Text style={styles.heroBadgeText}>SYSTEM ARMED</Text>
              </View>

              <Text style={styles.heroTitle}>READY TO ARISE</Text>
              <Text style={styles.heroSubtitle}>
                Your protocol is initialized. Passive doom-scrolling ends now. Every minute of entertainment is earned through real discipline.
              </Text>

              {/* Final Identity Hologram */}
              <GlassCard variant="glow" style={styles.deploymentCard}>
                <View style={styles.deploymentAvatarWrap}>
                  {avatarInfo.type === 'image' ? (
                    <Image source={avatarInfo.source} style={styles.deployAvatarImg} />
                  ) : (
                    <User size={60} color={colors.primary} />
                  )}
                  <View style={styles.deployGlowRing} />
                </View>

                <Text style={styles.deployWarriorName}>{userName || 'WARRIOR'}</Text>
                <Text style={styles.deployRank}>LEVEL 1 • DISCIPLINE INITIATE</Text>

                <View style={styles.protocolDetailsBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GOALS CONFIGURED</Text>
                    <Text style={styles.detailValue}>{selectedGoals.length} DIRECTIVES</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>LOCKED APPS</Text>
                    <Text style={styles.detailValue}>{selectedApps.length} APPS</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>AI POSE TRACKER</Text>
                    <Text style={[styles.detailValue, { color: colors.primary }]}>
                      ON-DEVICE ML KIT
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>STARTING BALANCE</Text>
                    <Text style={[styles.detailValue, { color: colors.accentGold }]}>
                      0 COINS • 0 XP
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom CTA Button */}
        <View style={styles.footerContainer}>
          <GlassButton
            title={
              isSubmitting
                ? 'INITIALIZING PROTOCOL...'
                : step === totalSteps
                ? 'ENTER ARISE'
                : 'CONTINUE PROTOCOL'
            }
            onPress={handleNext}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ width: '100%' }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStageText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#222222',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotCurrent: {
    width: 28,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  stepContainer: {
    gap: 16,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.3)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  holographicCard: {
    width: '100%',
    padding: 18,
    borderRadius: 20,
    gap: 14,
    backgroundColor: '#121212',
    borderColor: 'rgba(209, 255, 0, 0.25)',
  },
  holoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  holoAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#121212',
  },
  holoMeta: {
    flex: 1,
    gap: 3,
  },
  tagRow: {
    flexDirection: 'row',
  },
  holoRankTag: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 1,
  },
  holoCallsignText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  holoIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  holoStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181818',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  holoStatBox: {
    alignItems: 'center',
    gap: 2,
  },
  holoStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  holoStatVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  inputGroup: {
    width: '100%',
    gap: 8,
  },
  inputHeaderLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#282828',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatarPickerSection: {
    width: '100%',
    gap: 10,
  },
  avatarTabsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 2,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#262626',
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  avatarScrollRow: {
    gap: 12,
    paddingVertical: 4,
  },
  avatarItemWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#242424',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  avatarIconItemWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarItemWrapSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    transform: [{ scale: 1.05 }],
  },
  avatarGridImg: {
    width: '100%',
    height: '100%',
  },
  selectedCheckOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(209, 255, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalsListWrap: {
    width: '100%',
    gap: 10,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
  },
  goalCardSelected: {
    borderColor: 'rgba(209, 255, 0, 0.35)',
  },
  goalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIconCircleSelected: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  goalDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appsToRestrictSection: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  appsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appsSubdesc: {
    fontSize: 11,
    color: colors.textMuted,
  },
  appCountBadge: {
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  appCountBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
  },
  appsLoadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  appsLoadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  noAppsBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#121212',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  noAppsText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  miniAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
  },
  miniAppIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniAppName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  miniAppPkg: {
    fontSize: 10,
    color: colors.textMuted,
  },
  lockIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIndicatorActive: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.3)',
  },
  deploymentCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    borderRadius: 24,
    gap: 12,
    backgroundColor: '#121212',
    borderColor: 'rgba(209, 255, 0, 0.3)',
  },
  deploymentAvatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  deployAvatarImg: {
    width: '100%',
    height: '100%',
  },
  deployGlowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.5)',
  },
  deployWarriorName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  deployRank: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  protocolDetailsBox: {
    width: '100%',
    backgroundColor: '#181818',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#242424',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
});
