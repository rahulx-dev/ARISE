import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { AriseIcon } from '../../src/components/ui/AriseIcon';
import { AriseLogo } from '../../src/components/ui/AriseLogo';
import { colors } from '../../src/theme/colors';

const GOALS_LIST = [
  { id: 'fitness', title: 'Physical Strength', icon: 'dumbbell', desc: 'Push-ups, squats, calisthenics tracking' },
  { id: 'focus', title: 'Deep Concentration', icon: 'crosshairs-gps', desc: 'Study, deep work, uninterrupted focus sprints' },
  { id: 'screentime', title: 'Screen Time Control', icon: 'cellphone-lock', desc: 'Break doom-scrolling and earn phone passes' },
  { id: 'discipline', title: 'Iron Discipline', icon: 'shield-sword', desc: 'Build consecutive day streaks and habits' },
];

const RESTRICTED_APP_OPTIONS = [
  { name: 'Instagram', pkg: 'com.instagram.android', icon: 'instagram' },
  { name: 'YouTube', pkg: 'com.google.android.youtube', icon: 'youtube' },
  { name: 'TikTok', pkg: 'com.zhiliaoapp.musically', icon: 'music-box' },
  { name: 'Reddit', pkg: 'com.reddit.frontpage', icon: 'reddit' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();

  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const updateProfile = usePlayerStore((s) => s.updateProfile);

  const [step, setStep] = useState<number>(1);
  const [userName, setUserName] = useState<string>('Warrior');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['fitness', 'screentime']);
  const [selectedApps, setSelectedApps] = useState<string[]>([
    'com.instagram.android',
    'com.google.android.youtube',
  ]);
  const [dailyBudget, setDailyBudget] = useState<number>(60);
  const [allowNotifications, setAllowNotifications] = useState<boolean>(true);

  const totalSteps = 7;

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

  const handleNext = () => {
    haptics.medium();
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    await updateProfile({ displayName: userName.trim() || 'Warrior' });
    await setOnboardingCompleted();
    sound.play('level_up');
    haptics.heavy();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Progress */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <Text style={styles.stepCounter}>STEP {step} OF {totalSteps}</Text>
          <ProgressBar
            progress={step / totalSteps}
            color={colors.primary}
            height={6}
            animated
            style={{ width: '100%', marginTop: 6 }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Welcome */}
        {step === 1 && (
          <View style={styles.stepView}>
            <View style={styles.brandCircle}>
              <AriseLogo size={48} color={colors.secondary} glow />
            </View>
            <Text style={styles.brandTitle}>ARISE</Text>
            <Text style={styles.brandTagline}>Earn Your Time. Build Yourself.</Text>
            <Text style={styles.brandDescription}>
              ARISE turns real-world discipline into unlockable screen time. Complete push-ups, squats, and deep focus sessions to earn Coins and unlock your phone.
            </Text>

            <View style={styles.nameInputContainer}>
              <Text style={styles.inputLabel}>What should we call you?</Text>
              <TextInput
                style={styles.nameInput}
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your callsign"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Step 2: Choose Goals */}
        {step === 2 && (
          <View style={styles.stepView}>
            <Text style={styles.stepTitle}>Choose Your Primary Goals</Text>
            <Text style={styles.stepSubtitle}>We will customize your daily quests based on your focus.</Text>

            <View style={styles.optionsList}>
              {GOALS_LIST.map((g) => {
                const isSelected = selectedGoals.includes(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.8}
                    onPress={() => toggleGoal(g.id)}
                  >
                    <Card
                      variant={isSelected ? 'glow' : 'elevated'}
                      style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                    >
                      <MaterialCommunityIcons
                        name={g.icon as any}
                        size={26}
                        color={isSelected ? colors.secondary : colors.textMuted}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.goalTitle, isSelected && { color: colors.secondary }]}>
                          {g.title}
                        </Text>
                        <Text style={styles.goalDesc}>{g.desc}</Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.secondary} />
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 3: Select Apps to Restrict */}
        {step === 3 && (
          <View style={styles.stepView}>
            <Text style={styles.stepTitle}>Select Apps to Restrict</Text>
            <Text style={styles.stepSubtitle}>
              These apps will require Coins earned from exercise or focus to unlock.
            </Text>

            <View style={styles.optionsList}>
              {RESTRICTED_APP_OPTIONS.map((app) => {
                const isSelected = selectedApps.includes(app.pkg);
                return (
                  <TouchableOpacity
                    key={app.pkg}
                    activeOpacity={0.8}
                    onPress={() => toggleApp(app.pkg)}
                  >
                    <Card
                      variant={isSelected ? 'glow' : 'elevated'}
                      style={[styles.appCard, isSelected && styles.appCardSelected]}
                    >
                      <MaterialCommunityIcons
                        name={app.icon as any}
                        size={26}
                        color={isSelected ? colors.primaryLight : colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.appNameText}>{app.name}</Text>
                        <Text style={styles.appPkgText}>{app.pkg}</Text>
                      </View>
                      <Switch
                        value={isSelected}
                        onValueChange={() => toggleApp(app.pkg)}
                        trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                        thumbColor={isSelected ? colors.background : colors.textMuted}
                      />
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 4: Daily Budget */}
        {step === 4 && (
          <View style={styles.stepView}>
            <Text style={styles.stepTitle}>Set Daily Screen-Time Target</Text>
            <Text style={styles.stepSubtitle}>
              Maximum entertaining screen time you aim to earn each day.
            </Text>

            <Card variant="glow" style={styles.budgetCard}>
              <Text style={styles.budgetAmount}>{dailyBudget} MIN</Text>
              <Text style={styles.budgetSub}>Daily Unlocked Time Target</Text>

              <View style={styles.budgetButtonsRow}>
                {[30, 45, 60, 90, 120].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.budgetBtn, dailyBudget === mins && styles.budgetBtnActive]}
                    onPress={() => {
                      setDailyBudget(mins);
                      haptics.light();
                    }}
                  >
                    <Text
                      style={[
                        styles.budgetBtnText,
                        dailyBudget === mins && { color: colors.background, fontWeight: '800' },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Step 5: Default Challenges */}
        {step === 5 && (
          <View style={styles.stepView}>
            <Text style={styles.stepTitle}>Your Starting Quests</Text>
            <Text style={styles.stepSubtitle}>
              We have generated your first set of RPG daily quests based on your goals.
            </Text>

            <View style={styles.questsList}>
              <Card variant="elevated" style={styles.questPreviewCard}>
                <AriseIcon name="strength" size={24} color={colors.danger} glowIntensity="none" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.questPreviewTitle}>Push-up Initiate</Text>
                  <Text style={styles.questPreviewDesc}>Complete 15 camera-tracked push-ups</Text>
                </View>
                <Badge label="+30 Coins" color={colors.accentGold} size="sm" variant="filled" />
              </Card>

              <Card variant="elevated" style={styles.questPreviewCard}>
                <AriseIcon name="focus" size={24} color={colors.primaryLight} glowIntensity="none" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.questPreviewTitle}>Deep Focus Primer</Text>
                  <Text style={styles.questPreviewDesc}>Complete a 25-minute focus sprint</Text>
                </View>
                <Badge label="+50 Coins" color={colors.accentGold} size="sm" variant="filled" />
              </Card>

              <Card variant="elevated" style={styles.questPreviewCard}>
                <AriseIcon name="discipline" size={24} color={colors.secondary} glowIntensity="none" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.questPreviewTitle}>Iron Plank</Text>
                  <Text style={styles.questPreviewDesc}>Hold 45 seconds of perfect form plank</Text>
                </View>
                <Badge label="+45 Coins" color={colors.accentGold} size="sm" variant="filled" />
              </Card>
            </View>
          </View>
        )}

        {/* Step 6: Notifications */}
        {step === 6 && (
          <View style={styles.stepView}>
            <Text style={styles.stepTitle}>Streak Protection & Alerts</Text>
            <Text style={styles.stepSubtitle}>
              Receive silent reminders before your streak resets at midnight.
            </Text>

            <Card variant="glow" style={styles.notifCard}>
              <MaterialCommunityIcons name="bell-ring-outline" size={48} color={colors.primary} />
              <Text style={styles.notifCardTitle}>Enable Local Notifications</Text>
              <Text style={styles.notifCardDesc}>
                100% on-device alerts. No cloud notifications or spam.
              </Text>
              <Switch
                value={allowNotifications}
                onValueChange={(val) => {
                  setAllowNotifications(val);
                  haptics.light();
                }}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                thumbColor={allowNotifications ? colors.background : colors.textMuted}
              />
            </Card>
          </View>
        )}

        {/* Step 7: Ready to ARISE */}
        {step === 7 && (
          <View style={styles.stepView}>
            <View style={styles.readyCircle}>
              <AriseLogo size={60} color={colors.secondary} glow />
            </View>
            <Text style={styles.readyTitle}>You Are Ready, {userName}.</Text>
            <Text style={styles.readyTagline}>The Era of Passive Scrolling is Over.</Text>
            <Text style={styles.readyDesc}>
              Every minute of screen time is now earned through strength, discipline, and focus.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Controls */}
      <View style={styles.footer}>
        <Button
          title={step === totalSteps ? 'Enter ARISE' : 'Continue'}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  progressContainer: { alignItems: 'center' },
  stepCounter: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5 },
  scrollContent: { padding: 20, flexGrow: 1 },
  stepView: { alignItems: 'center', gap: 14 },
  brandCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
    marginBottom: 8,
  },
  brandTitle: { fontSize: 32, fontWeight: '900', color: colors.textPrimary, letterSpacing: 3 },
  brandTagline: { fontSize: 14, fontWeight: '700', color: colors.secondary, textAlign: 'center' },
  brandDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  nameInputContainer: { width: '100%', marginTop: 16, gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  stepTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
  stepSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  optionsList: { width: '100%', gap: 10, marginTop: 8 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  goalCardSelected: { borderColor: colors.secondary },
  goalTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  goalDesc: { fontSize: 11, color: colors.textSecondary },
  appCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  appCardSelected: { borderColor: colors.primary },
  appNameText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  appPkgText: { fontSize: 11, color: colors.textMuted },
  budgetCard: { width: '100%', padding: 24, alignItems: 'center', gap: 12, marginTop: 12 },
  budgetAmount: { fontSize: 44, fontWeight: '900', color: colors.primary, fontVariant: ['tabular-nums'] },
  budgetSub: { fontSize: 12, color: colors.textSecondary },
  budgetButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  budgetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  budgetBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  budgetBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  questsList: { width: '100%', gap: 10, marginTop: 8 },
  questPreviewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  questPreviewTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  questPreviewDesc: { fontSize: 11, color: colors.textSecondary },
  notifCard: { width: '100%', padding: 28, alignItems: 'center', gap: 14, marginTop: 16 },
  notifCardTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  notifCardDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  readyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
    marginVertical: 12,
  },
  readyTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
  readyTagline: { fontSize: 14, fontWeight: '700', color: colors.secondary, textAlign: 'center' },
  readyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceBorder },
});
