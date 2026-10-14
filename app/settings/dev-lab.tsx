import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import {
  ArrowLeft,
  Fire,
  Lightning,
  Coins,
  Gift,
  Trophy,
  Sparkle,
  ArrowRight,
  ArrowsCounterClockwise,
  CheckCircle,
  Crown,
  DeviceMobile,
  Camera,
  Play,
  FilmStrip,
  ShieldCheck,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useQuestStore } from '../../src/stores/useQuestStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { getRankForLevel } from '../../src/constants/ranks';
import { db } from '../../src/database/client';
import { achievement } from '../../src/database/schema';
import { eq } from 'drizzle-orm';
import { showTestOverlay, temporaryUnlock } from '../../modules/app-blocker';
import { adMobService } from '../../src/services/adMobService';
import { redGateService } from '../../src/services/redGateService';
import { fontFamilies } from '../../src/theme/typography';

export default function DevLabScreen() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const addXP = usePlayerStore((s) => s.addXP);
  const triggerTestLevelUp = usePlayerStore((s) => s.triggerTestLevelUp);

  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const level = profile?.level || 1;
  const currentStreak = profile?.currentStreak || 0;
  const coins = profile?.coins || 0;
  const rank = getRankForLevel(level);

  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  const notifySuccess = (text: string) => {
    haptics.success();
    sound.play('quest_complete');
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  // 1. Streak Modifiers
  const setStreakValue = async (days: number) => {
    haptics.heavy();
    await userRepository.updateProfile({
      currentStreak: days,
      longestStreak: Math.max(days, profile?.longestStreak || 0),
    });
    await loadProfile();
    notifySuccess(`Streak set to ${days} Days!`);
  };

  // 2. Coin Modifiers
  const addCoinsValue = async (amount: number) => {
    haptics.heavy();
    sound.play('coin_earn');
    await userRepository.addCoins(amount, `Testing Lab Credit (+${amount})`, 'dev_lab');
    await loadProfile();
    notifySuccess(`+${amount.toLocaleString()} Coins added to your vault!`);
  };

  // 3. Level & XP Modifiers
  const handleInstantLevelUp = async () => {
    haptics.heavy();
    const xpNeeded = Math.floor(100 * Math.pow(1.5, level - 1));
    await addXP(xpNeeded);
    await loadProfile();
    notifySuccess(`Level Up triggered! Level is now ${level + 1}`);
  };

  const jumpToLevel = async (targetLevel: number) => {
    haptics.heavy();
    await userRepository.updateProfile({ level: targetLevel });
    await loadProfile();
    notifySuccess(`Jumped to Level ${targetLevel} (${getRankForLevel(targetLevel).title})`);
  };

  // 4. Reset Claimed Streak Gifts
  const resetClaimedGifts = async () => {
    haptics.warning();
    try {
      await db.delete(achievement).where(eq(achievement.category, 'STREAK_GIFT'));
      notifySuccess('All claimed streak gifts reset! You can unbox them again.');
    } catch (e) {
      console.warn('Reset gifts error:', e);
    }
  };

  // 5. Test Overlay
  const handleLaunchTestOverlay = () => {
    haptics.heavy();
    const success = showTestOverlay('com.instagram.android');
    if (success) {
      notifySuccess('Lock Screen Overlay launched on screen!');
    } else {
      Alert.alert(
        'Overlay Permission Needed',
        'Please enable "Display Over Other Apps" permission in Settings to show the lock overlay.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestUnlock = () => {
    if (!__DEV__) {
      Alert.alert('Unavailable', 'Test unlock is only available in development builds.');
      return;
    }
    haptics.success();
    temporaryUnlock(15 * 60 * 1000);
    notifySuccess('Apps unlocked for 15 minutes test session!');
  };

  // 6. Test Daily Quests
  const handleResetQuests = async () => {
    haptics.warning();
    await useQuestStore.getState().resetTodayQuests();
    notifySuccess("Today's quests reset to incomplete!");
  };

  const handleRerollQuests = async () => {
    haptics.heavy();
    await useQuestStore.getState().rerollDailyQuests();
    notifySuccess('5 fresh daily quests loaded from pool!');
  };

  // 7. Test Video Ad (25 Coins)
  const handleTestVideoAd = () => {
    haptics.medium();
    const onReward = async () => {
      const reward = 25; // 25 coins confirmed
      await userRepository.addCoins(reward, 'Test Video Ad Reward', 'ad');
      await loadProfile();
      notifySuccess(`+${reward} Coins confirmed from Ad test!`);
    };

    const shown = adMobService.showRewardedAd(onReward);
    if (!shown) {
      onReward();
    }
  };

  // 8. Test Emergency Red Gate
  const handleTriggerRedGate = async () => {
    haptics.heavy();
    sound.play('unlock');
    await redGateService.triggerEmergencyGate(true);
    notifySuccess('Class-S Red Gate Manifested! Tap "GO TO GATES SCREEN" below to fight.');
  };

  const handleClearRedGate = async () => {
    haptics.medium();
    redGateService.clearGate();
    notifySuccess('Active Red Gate Cleared.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1C1E26' : '#E5E5EA' }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? '#14151C' : '#F2F2F7', borderColor: colors.border }]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            TESTING LAB // GOD MODE
          </Text>
          <Text style={[styles.headerSub, { color: '#0A84FF' }]}>
            INSTANT STREAK, LEVEL-UP & REDEEM CONTROLLER
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Toast */}
        {message ? (
          <View style={styles.toastCard}>
            <CheckCircle size={16} color="#10B981" weight="fill" />
            <Text style={styles.toastText}>{message}</Text>
          </View>
        ) : null}

        {/* Live Profile Overview Card */}
        <GlassCard variant="glow" style={styles.liveStatsCard}>
          <Text style={[styles.cardTag, { color: colors.textMuted }]}>CURRENT LIVE DATABASE VALUES</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>STREAK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Fire size={18} color="#EA580C" weight="fill" />
                <Text style={[styles.statColVal, { color: '#EA580C' }]}>{currentStreak}d</Text>
              </View>
            </View>

            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>HUNTER LEVEL</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Lightning size={18} color={rank.auraColor} weight="fill" />
                <Text style={[styles.statColVal, { color: rank.auraColor }]}>LVL {level}</Text>
              </View>
            </View>

            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>COINS VAULT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Coins size={18} color="#F59E0B" weight="fill" />
                <Text style={[styles.statColVal, { color: '#F59E0B' }]}>{coins.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* 1. STREAK CONTROLLER */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Fire size={18} color="#EA580C" weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              1. STREAK CONTROLLER (TEST GIFTS & HOME)
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Change streak with 1 tap to test unboxing milestone gifts (3d, 7d, 14d, 30d, 100d) and see the Home streak card states.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionPillBtn} onPress={() => setStreakValue(3)}>
              <Text style={styles.actionPillBtnText}>Set 3 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => setStreakValue(7)}>
              <Text style={styles.actionPillBtnText}>Set 7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => setStreakValue(14)}>
              <Text style={styles.actionPillBtnText}>Set 14 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => setStreakValue(30)}>
              <Text style={styles.actionPillBtnText}>Set 30 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionPillBtn, { borderColor: '#A855F7' }]} onPress={() => setStreakValue(100)}>
              <Text style={[styles.actionPillBtnText, { color: '#A855F7' }]}>Set 100 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionPillBtn, { borderColor: '#EF4444' }]} onPress={() => setStreakValue(0)}>
              <Text style={[styles.actionPillBtnText, { color: '#EF4444' }]}>Reset to 0</Text>
            </TouchableOpacity>
          </View>

          {/* Test Streak Gifts Button */}
          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: '#EA580C' }]}
            onPress={() => {
              haptics.heavy();
              router.push('/rewards/streak-milestones' as any);
            }}
            activeOpacity={0.85}
          >
            <Gift size={18} color="#FFFFFF" weight="fill" />
            <Text style={styles.bigNavBtnText}>OPEN STREAK GIFTS SCREEN & UNBOX</Text>
            <ArrowRight size={16} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </View>

        {/* 2. LEVEL-UP & RANK CONTROLLER */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Lightning size={18} color={colors.primary} weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              2. LEVEL-UP & CINEMATIC ANIMATION
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Trigger real level-ups or preview the Monarch System cinematic modal with rotating rays, screen shake & audio!
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionPillBtn, { backgroundColor: 'rgba(10, 132, 255, 0.15)', borderColor: colors.primary }]}
              onPress={handleInstantLevelUp}
            >
              <Text style={[styles.actionPillBtnText, { color: colors.primary, fontWeight: '600' }]}>
                +1 Level (Real XP)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => jumpToLevel(15)}>
              <Text style={styles.actionPillBtnText}>Jump LVL 15 (D-Rank)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => jumpToLevel(35)}>
              <Text style={styles.actionPillBtnText}>Jump LVL 35 (C-Rank)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => jumpToLevel(60)}>
              <Text style={styles.actionPillBtnText}>Jump LVL 60 (A-Rank)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionPillBtn, { borderColor: '#F59E0B' }]} onPress={() => jumpToLevel(85)}>
              <Text style={[styles.actionPillBtnText, { color: '#F59E0B' }]}>Jump LVL 85 (S-Rank Monarch)</Text>
            </TouchableOpacity>
          </View>

          {/* Test Level-Up Cinematic Modal */}
          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              haptics.heavy();
              triggerTestLevelUp();
            }}
            activeOpacity={0.85}
          >
            <Crown size={18} color="#FFFFFF" weight="fill" />
            <Text style={styles.bigNavBtnText}>TRIGGER CINEMATIC LEVEL-UP MODAL</Text>
            <Sparkle size={16} color="#FFFFFF" weight="fill" />
          </TouchableOpacity>
        </View>

        {/* 3. COINS VAULT & REDEEM SHOP LAB */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Coins size={18} color="#F59E0B" weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              3. COINS VAULT & REDEEM SHOP
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Inject coins to test purchasing screen time passes, boosters, themes, and avatars in the shop.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionPillBtn} onPress={() => addCoinsValue(500)}>
              <Text style={styles.actionPillBtnText}>+500 Coins</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' }]}
              onPress={() => addCoinsValue(2000)}
            >
              <Text style={[styles.actionPillBtnText, { color: '#F59E0B', fontWeight: '600' }]}>
                +2,000 Coins (Shop Gear)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillBtn} onPress={() => addCoinsValue(10000)}>
              <Text style={styles.actionPillBtnText}>+10,000 Coins</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionPillBtn, { borderColor: '#F59E0B' }]} onPress={() => addCoinsValue(50000)}>
              <Text style={[styles.actionPillBtnText, { color: '#F59E0B' }]}>+50,000 Coins</Text>
            </TouchableOpacity>
          </View>

          {/* Open Shop Button */}
          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: '#F59E0B' }]}
            onPress={() => {
              haptics.heavy();
              router.push('/shop' as any);
            }}
            activeOpacity={0.85}
          >
            <Coins size={18} color="#000000" weight="fill" />
            <Text style={[styles.bigNavBtnText, { color: '#000000' }]}>
              OPEN SHOP & TEST REDEEM / CASHOUT
            </Text>
            <ArrowRight size={16} color="#000000" weight="bold" />
          </TouchableOpacity>
        </View>

        {/* 4. RE-TEST UNBOXING (RESET CLAIMED GIFTS) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <ArrowsCounterClockwise size={18} color="#8E8E93" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              4. RE-TEST UNBOXING ANIMATION
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Already claimed gift boxes? Tap below to clear claim history so you can unbox the mystery boxes again and again!
          </Text>

          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: isDark ? '#261B1B' : '#FEE2E2', borderColor: '#EF4444', borderWidth: 1 }]}
            onPress={resetClaimedGifts}
            activeOpacity={0.85}
          >
            <ArrowsCounterClockwise size={18} color="#EF4444" />
            <Text style={[styles.bigNavBtnText, { color: '#EF4444' }]}>
              RESET CLAIMED GIFTS (RE-UNBOX ANYTIME)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. LOCK SCREEN OVERLAY TESTER */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <DeviceMobile size={18} color="#00F2FE" weight="bold" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              5. APP LOCK SCREEN OVERLAY TESTER
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Instantly launch the authentic Solo Leveling holographic lock screen overlay on your phone screen to test the new UI and unlock flows!
          </Text>

          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: '#0A2540', borderColor: '#00F2FE', borderWidth: 1 }]}
            onPress={handleLaunchTestOverlay}
            activeOpacity={0.85}
          >
            <DeviceMobile size={18} color="#00F2FE" />
            <Text style={[styles.bigNavBtnText, { color: '#00F2FE' }]}>
              LAUNCH TEST LOCK SCREEN OVERLAY NOW
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: '#0B262F', borderColor: '#06B6D4', borderWidth: 1, marginTop: 8 }]}
            onPress={handleTestUnlock}
            activeOpacity={0.85}
          >
            <ShieldCheck size={18} color="#06B6D4" />
            <Text style={[styles.bigNavBtnText, { color: '#06B6D4' }]}>
              SIMULATE 15-MIN UNLOCK PASS
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. AI MOTION CAMERA & EXERCISE TESTER */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Camera size={18} color="#0A84FF" weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              6. AI MOTION SENSORS & WORKOUT TESTER
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Quick launch AI Motion Tracker with calibrated 5-rep targets to verify anti-cheat and elbow/knee angle tracking.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#0A84FF' }]}
              onPress={() => router.push({ pathname: '/exercise/[type]', params: { type: 'PUSHUP', target: 5 } } as any)}
            >
              <Text style={[styles.actionPillBtnText, { color: '#0A84FF' }]}>Push-ups (5 reps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#A855F7' }]}
              onPress={() => router.push({ pathname: '/exercise/[type]', params: { type: 'SQUAT', target: 5 } } as any)}
            >
              <Text style={[styles.actionPillBtnText, { color: '#A855F7' }]}>Squats (5 reps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#10B981' }]}
              onPress={() => router.push({ pathname: '/exercise/[type]', params: { type: 'JUMPING_JACK', target: 10 } } as any)}
            >
              <Text style={[styles.actionPillBtnText, { color: '#10B981' }]}>Jacks (10 reps)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. DAILY QUESTS & REWARDS (ANTI-CHEAT) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Play size={18} color="#10B981" weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              7. DAILY QUESTS & REWARDS (ANTI-CHEAT)
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Reset today's quests or draw 5 fresh quests from the 14-quest pool to test completion, camera routing, and 5-10 coin rewards.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#EF4444' }]}
              onPress={handleResetQuests}
            >
              <Text style={[styles.actionPillBtnText, { color: '#EF4444' }]}>Reset Today Quests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#10B981' }]}
              onPress={handleRerollQuests}
            >
              <Text style={[styles.actionPillBtnText, { color: '#10B981' }]}>Reroll 5 Fresh Quests</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 8. REWARDED VIDEO AD TESTER (25 COINS CONFIRMED) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <FilmStrip size={18} color="#F59E0B" weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              8. VIDEO AD TESTER (25 COINS CONFIRMED)
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Test rewarded video ad playback and verify strictly +25 Gold Coins transferred to the Vault.
          </Text>

          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: '#281E08', borderColor: '#F59E0B', borderWidth: 1 }]}
            onPress={handleTestVideoAd}
            activeOpacity={0.85}
          >
            <FilmStrip size={18} color="#F59E0B" />
            <Text style={[styles.bigNavBtnText, { color: '#F59E0B' }]}>
              PLAY TEST REWARDED AD (+25 COINS)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 9. EMERGENCY RED GATE ENCOUNTER */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Fire size={18} color="#FF1E44" weight="fill" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              9. EMERGENCY RED GATE CONTROLLER
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Spawn a Class-S Red Gate encounter (Demon Monarch Baran) with 24-hour countdown, 350 crystal bounty, and physical AI trials.
          </Text>

          <TouchableOpacity
            style={[styles.bigNavBtn, { backgroundColor: '#200A0E', borderColor: '#FF1E44', borderWidth: 1 }]}
            onPress={handleTriggerRedGate}
            activeOpacity={0.85}
          >
            <Fire size={18} color="#FF1E44" weight="fill" />
            <Text style={[styles.bigNavBtnText, { color: '#FF1E44' }]}>
              SPAWN EMERGENCY RED GATE NOW
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#FF1E44' }]}
              onPress={() => {
                haptics.heavy();
                router.push('/(tabs)/gates' as any);
              }}
            >
              <Text style={[styles.actionPillBtnText, { color: '#FF1E44' }]}>Go To Gates Screen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, { borderColor: '#8E8E93' }]}
              onPress={handleClearRedGate}
            >
              <Text style={[styles.actionPillBtnText, { color: '#8E8E93' }]}>Clear Active Gate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    textAlign: 'center',
  },
  emptyStateText: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontFamily: fontFamilies.medium,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  toastText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  liveStatsCard: {
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  cardTag: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    gap: 4,
  },
  statColLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 8.5,
    fontWeight: '500',
    color: '#8E8E93',
  },
  statColVal: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionWrap: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  sectionHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  actionPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionPillBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  bigNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  bigNavBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
