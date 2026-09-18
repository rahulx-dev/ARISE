import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  Shield,
  Flame,
  Clock,
  Palette,
  User,
  PlayCircle,
  Lock,
  Check,
  Crown,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { isSupabaseConfigured } from '../../src/services/supabaseClient';
import { adMobService } from '../../src/services/adMobService';
import { screenTimerService, appBlockerService } from '../../src/native';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { SoloLevelingWindow } from '../../src/components/ui/SoloLevelingWindow';
import { AVATAR_IMAGES } from '../../src/components/profile/AvatarPicker';
import { inventoryRepository } from '../../src/database/repositories/inventoryRepository';
import { useTheme } from '../../src/hooks/useTheme';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { getRankForLevel } from '../../src/constants/ranks';

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  type: 'boost' | 'time' | 'theme' | 'avatar' | 'title';
  icon: any;
  minutes?: number;
  rarity?: 'MYTHIC' | 'LEGENDARY' | 'EPIC';
  gradientColors?: string[];
  avatarId?: string;
  titleString?: string;
}

export default function ShopScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const currentRank = getRankForLevel(profile?.level || 1);

  const [activeTab, setActiveTab] = useState<'boosters' | 'time' | 'themes' | 'titles' | 'avatars'>('boosters');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);
  const [insufficientItem, setInsufficientItem] = useState<ShopItem | null>(null);

  const [unlockedItemIds, setUnlockedItemIds] = useState<string[]>([]);
  const [equippedTheme, setEquippedTheme] = useState<string>('cyber_sapphire');
  const [equippedAvatar, setEquippedAvatar] = useState<string>('pfp_01');
  const [equippedTitle, setEquippedTitle] = useState<string>('Shadow Sovereign');

  // Solo Leveling System UI Modal Dialog State
  const [systemDialog, setSystemDialog] = useState<{
    visible: boolean;
    variant: 'default' | 'info' | 'warning' | 'danger' | 'quest' | 'success';
    tag: string;
    subtag: string;
    title: string;
    message: string;
    buttons: {
      text: string;
      style?: 'primary' | 'cancel' | 'destructive';
      onPress?: () => void;
    }[];
  }>({
    visible: false,
    variant: 'default',
    tag: 'SYSTEM NOTIFICATION',
    subtag: 'ARISE OS',
    title: '',
    message: '',
    buttons: [],
  });

  const showShopAlert = (
    title: string,
    message: string,
    variant: 'default' | 'info' | 'warning' | 'danger' | 'quest' | 'success' = 'default',
    tag = 'SYSTEM NOTIFICATION',
    buttons?: { text: string; style?: 'primary' | 'cancel' | 'destructive'; onPress?: () => void }[]
  ) => {
    if (variant === 'danger') {
      haptics.warning();
      sound.play('rep_count');
    } else if (variant === 'success') {
      haptics.success();
      sound.play('purchase');
    } else {
      haptics.heavy();
      sound.play('unlock');
    }

    setSystemDialog({
      visible: true,
      variant,
      tag,
      subtag: 'ARISE OS',
      title,
      message,
      buttons: buttons || [
        {
          text: 'CONFIRM',
          style: 'primary',
          onPress: () => setSystemDialog((prev) => ({ ...prev, visible: false })),
        },
      ],
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      inventoryRepository.getUnlockedItems().then((items) => {
        setUnlockedItemIds(items.map((i) => i.itemId));
        const activeTheme = items.find((i) => i.itemType === 'THEME' && i.isEquipped);
        if (activeTheme) setEquippedTheme(activeTheme.itemId);
        const activeTitle = items.find((i) => i.itemType === 'TITLE' && i.isEquipped);
        if (activeTitle) {
          const foundTitle = titlesList.find((t) => t.id === activeTitle.itemId);
          if (foundTitle?.titleString) setEquippedTitle(foundTitle.titleString);
        }
      });
      if (profile?.avatarIcon) {
        setEquippedAvatar(profile.avatarIcon);
      }
    }, [profile?.avatarIcon])
  );

  const currentCoins = profile?.coins || 0;

  const boostersList: ShopItem[] = [
    {
      id: 'double_coins',
      name: 'Double Coins Extractor',
      desc: 'Earn 2x coins on all workout reps and focus minutes for 30 minutes',
      cost: 750,
      type: 'boost',
      icon: Zap,
      rarity: 'EPIC',
    },
    {
      id: 'focus_shield',
      name: 'Aegis Focus Shield',
      desc: 'Invincible lock on all social apps for 60 minutes with zero bailout',
      cost: 1000,
      type: 'boost',
      icon: Shield,
      rarity: 'LEGENDARY',
    },
    {
      id: 'streak_freeze',
      name: 'Phoenix Streak Flame',
      desc: 'Auto-saves your discipline streak if you miss a daily workout',
      cost: 600,
      type: 'boost',
      icon: Flame,
      rarity: 'MYTHIC',
    },
    {
      id: 'stamina_potion',
      name: 'Elixir of Life',
      desc: 'Instant stamina recovery potion that removes all workout fatigue status',
      cost: 400,
      type: 'boost',
      icon: Sparkles,
      rarity: 'EPIC',
    },
    {
      id: 'exp_rune',
      name: 'Shadow Extraction XP Rune',
      desc: 'Infuses your hunter aura with 2x XP multiplier across all exercise sets for 1 hour',
      cost: 850,
      type: 'boost',
      icon: Crown,
      rarity: 'LEGENDARY',
    },
    {
      id: 'red_gate_key',
      name: 'Red Gate Dungeon Key',
      desc: 'Unlocks an emergency high-yield Red Gate boss raid in the Hunter Guild Hall',
      cost: 500,
      type: 'boost',
      icon: Lock,
      rarity: 'MYTHIC',
    },
  ];

  const timeUnlockList: ShopItem[] = [
    {
      id: 'time_15m',
      name: '15-Min Quick Pass',
      desc: 'Temporarily unlocks all restricted apps for 15 minutes',
      cost: 100,
      minutes: 15,
      type: 'time',
      icon: Clock,
    },
    {
      id: 'time_30m',
      name: '30-Min Extended Key',
      desc: 'Temporarily unlocks all restricted apps for 30 minutes',
      cost: 200,
      minutes: 30,
      type: 'time',
      icon: Clock,
    },
    {
      id: 'time_60m',
      name: '60-Min Full Access Pass',
      desc: 'Temporarily unlocks all restricted apps for 1 full hour',
      cost: 350,
      minutes: 60,
      type: 'time',
      icon: Clock,
    },
    {
      id: 'time_120m',
      name: '2-Hour Sovereign Exemption Pass',
      desc: 'Temporarily unlocks all restricted apps for 2 full hours',
      cost: 600,
      minutes: 120,
      type: 'time',
      icon: Clock,
    },
    {
      id: 'app_seal',
      name: 'App Exemption Seal',
      desc: 'Whitelists 1 specific app from block restrictions for 24 hours',
      cost: 500,
      minutes: 1440,
      type: 'time',
      icon: Shield,
    },
  ];

  const themesList: ShopItem[] = [
    {
      id: 'cyber_gold',
      name: 'Solar Monarch Gold',
      desc: 'Radiant molten gold UI glow and awakening particle aura',
      cost: 1500,
      type: 'theme',
      icon: Palette,
      rarity: 'LEGENDARY',
      gradientColors: ['#F59E0B', '#D97706'],
    },
    {
      id: 'neon_purple',
      name: 'Shadow Sovereign Violet',
      desc: 'Deep necromancer violet glow with electric pulse accents',
      cost: 1500,
      type: 'theme',
      icon: Palette,
      rarity: 'MYTHIC',
      gradientColors: ['#8B5CF6', '#6D28D9'],
    },
    {
      id: 'crimson_berserk',
      name: 'Blood Monarch Crimson',
      desc: 'Intense molten blood-red HUD glow with fury particle aura',
      cost: 1500,
      type: 'theme',
      icon: Palette,
      rarity: 'LEGENDARY',
      gradientColors: ['#EF4444', '#B91C1C'],
    },
    {
      id: 'emerald_hunter',
      name: 'S-Rank Hunter Emerald',
      desc: 'Cybernetic matrix green terminal HUD with high-contrast runes',
      cost: 1500,
      type: 'theme',
      icon: Palette,
      rarity: 'EPIC',
      gradientColors: ['#10B981', '#047857'],
    },
  ];

  const titlesList: ShopItem[] = [
    {
      id: 'title_shadow_monarch',
      name: 'Shadow Sovereign',
      desc: 'Equip the supreme monarch title across profile and global leaderboards',
      cost: 1200,
      type: 'title',
      icon: Crown,
      rarity: 'MYTHIC',
      titleString: 'Shadow Sovereign',
    },
    {
      id: 'title_iron_will',
      name: 'Iron Will Juggernaut',
      desc: 'Title bestowed upon relentless athletes who conquer heavy workout sets',
      cost: 800,
      type: 'title',
      icon: Shield,
      rarity: 'EPIC',
      titleString: 'Iron Will Juggernaut',
    },
    {
      id: 'title_demon_slayer',
      name: 'Demon Castle Conqueror',
      desc: 'Exclusive raid title recognized by all hunter syndicates in the sector',
      cost: 1000,
      type: 'title',
      icon: Flame,
      rarity: 'LEGENDARY',
      titleString: 'Demon Castle Conqueror',
    },
    {
      id: 'title_relentless',
      name: 'The Relentless',
      desc: 'Badge honoring hunters with unbreakable workout discipline and consistency',
      cost: 600,
      type: 'title',
      icon: Zap,
      rarity: 'EPIC',
      titleString: 'The Relentless',
    },
  ];

  const avatarsList: ShopItem[] = [
    {
      id: 'avatar_cyber_king',
      name: 'Cyber Samurai PFP',
      desc: 'Legendary Hunter Avatar with cybernetic battle visor',
      cost: 2000,
      type: 'avatar',
      icon: User,
      rarity: 'LEGENDARY',
      avatarId: 'img_pfp_03',
    },
    {
      id: 'avatar_shadow_blade',
      name: 'Shadow Monarch Blade',
      desc: 'Mythic Sovereign Avatar with glowing blue eyes',
      cost: 2000,
      type: 'avatar',
      icon: User,
      rarity: 'MYTHIC',
      avatarId: 'img_pfp_02',
    },
    {
      id: 'avatar_demon_king',
      name: 'Baran Demon King PFP',
      desc: 'Fierce horned sovereign avatar radiating crackling lightning',
      cost: 2500,
      type: 'avatar',
      icon: User,
      rarity: 'LEGENDARY',
      avatarId: 'img_pfp_01',
    },
    {
      id: 'avatar_frost_monarch',
      name: 'Frost Sovereign PFP',
      desc: 'Glacial monarch avatar enveloped in blizzard aura',
      cost: 2500,
      type: 'avatar',
      icon: User,
      rarity: 'MYTHIC',
      avatarId: 'img_pfp_02',
    },
  ];

  const handlePurchase = (item: ShopItem) => {
    haptics.medium();
    if (currentCoins < item.cost) {
      showShopAlert(
        'INSUFFICIENT FUNDS',
        `Acquiring "${item.name}" requires ${item.cost.toLocaleString()} Gold Coins.\n\nCurrent Vault Balance: ${currentCoins.toLocaleString()} Coins.\nComplete physical workouts & daily quests to earn coins!`,
        'danger',
        'SYSTEM ALERT',
        [
          {
            text: 'ACKNOWLEDGE',
            style: 'destructive',
            onPress: () => setSystemDialog((prev) => ({ ...prev, visible: false })),
          },
        ]
      );
      return;
    }

    // Authentic Solo Leveling Purchase Directive Window
    showShopAlert(
      'TRANSACTION DIRECTIVE',
      `Authorize acquisition of "${item.name}" for ${item.cost.toLocaleString()} Gold Coins?\n\nCurrent Balance: ${currentCoins.toLocaleString()} Coins\nRemaining Balance: ${(currentCoins - item.cost).toLocaleString()} Coins`,
      'default',
      'SYSTEM DIRECTIVE',
      [
        {
          text: 'AUTHORIZE',
          style: 'primary',
          onPress: () => {
            setSystemDialog((prev) => ({ ...prev, visible: false }));
            handleExecutePurchase(item);
          },
        },
        {
          text: 'ABORT',
          style: 'cancel',
          onPress: () => setSystemDialog((prev) => ({ ...prev, visible: false })),
        },
      ]
    );
  };

  const handleExecutePurchase = async (item: ShopItem) => {
    if (purchasingId) return;

    setPurchasingId(item.id);
    haptics.heavy();

    try {
      if (item.type === 'time' && item.minutes) {
        const addedDurationMs = item.minutes * 60 * 1000;
        const now = new Date();
        const currentRemainingMs = await screenTimerService.getRemainingMillis();
        const totalDurationMs = Math.max(0, currentRemainingMs) + addedDurationMs;
        const targetEpoch = Date.now() + totalDurationMs;

        const result = await userRepository.purchaseScreenTimeAtomically(
          item.cost,
          {
            packageName: 'ALL_APPS',
            appName: 'Screen Time Pass',
            durationMs: totalDurationMs,
            startTime: now.toISOString(),
            endTime: new Date(targetEpoch).toISOString(),
            targetEndEpoch: targetEpoch,
            status: 'ACTIVE',
          },
          `Unlocked ${item.minutes}m Screen Time`
        );

        if (!result.success) {
          showShopAlert('INSUFFICIENT FUNDS', 'You do not have enough coins for this pass.', 'danger', 'SYSTEM ALERT');
          return;
        }

        const totalMinutes = Math.round(totalDurationMs / 60000);
        screenTimerService.startSessionTimer(totalDurationMs, `Screen Time (${totalMinutes}m)`);
        appBlockerService.temporaryUnlock?.(totalDurationMs);
      } else if (item.type === 'theme' || item.type === 'avatar') {
        const success = await userRepository.spendCoins(item.cost, `Purchased ${item.name}`);
        if (!success) {
          showShopAlert('INSUFFICIENT FUNDS', 'You do not have enough coins for this item.', 'danger', 'SYSTEM ALERT');
          return;
        }

        // Save unlock to persistent inventory
        await inventoryRepository.unlockItem(item.id, item.type.toUpperCase());
        setUnlockedItemIds((prev) => [...prev, item.id]);

        // Automatically equip purchased theme or avatar
        if (item.type === 'theme') {
          await inventoryRepository.equipItem(item.id, 'THEME');
          setEquippedTheme(item.id);
          useSettingsStore.getState().setTheme(item.id as any);
        } else if (item.type === 'avatar' && item.avatarId) {
          await inventoryRepository.equipItem(item.id, 'AVATAR');
          await userRepository.updateProfile({ avatarIcon: item.avatarId });
          await loadProfile();
          setEquippedAvatar(item.avatarId);
        }
      } else if (item.type === 'title') {
        const success = await userRepository.spendCoins(item.cost, `Purchased ${item.name}`);
        if (!success) {
          showShopAlert('INSUFFICIENT FUNDS', 'You do not have enough coins for this title.', 'danger', 'SYSTEM ALERT');
          return;
        }

        await inventoryRepository.unlockItem(item.id, 'TITLE');
        setUnlockedItemIds((prev) => [...prev, item.id]);
        if (item.titleString) {
          await inventoryRepository.equipItem(item.id, 'TITLE');
          setEquippedTitle(item.titleString);
        }
      } else {
        const success = await userRepository.spendCoins(item.cost, `Purchased ${item.name}`);
        if (!success) {
          showShopAlert('INSUFFICIENT FUNDS', 'You do not have enough coins for this item.', 'danger', 'SYSTEM ALERT');
          return;
        }
      }

      await loadProfile();
      sound.play('purchase');
      haptics.heavy();

      showShopAlert(
        'ITEM ACQUIRED',
        `"${item.name}" has been registered and bound to your Hunter inventory.`,
        'success',
        'SYSTEM NOTIFICATION',
        [
          {
            text: 'PROCEED',
            style: 'primary',
            onPress: () => setSystemDialog((prev) => ({ ...prev, visible: false })),
          },
        ]
      );
    } catch (e) {
      console.warn('Purchase error:', e);
      showShopAlert('TRANSACTION ERROR', 'Could not complete transaction. Please retry.', 'danger', 'SYSTEM ALERT');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquipItem = async (item: ShopItem) => {
    haptics.heavy();
    sound.play('quest_complete');
    if (item.type === 'theme') {
      await inventoryRepository.equipItem(item.id, 'THEME');
      setEquippedTheme(item.id);
      useSettingsStore.getState().setTheme(item.id as any);
      showShopAlert(
        'AURA SYNCHRONIZED',
        `"${item.name}" is now radiating as your active system theme aura.`,
        'default',
        'SYSTEM NOTIFICATION'
      );
    } else if (item.type === 'avatar' && item.avatarId) {
      await inventoryRepository.equipItem(item.id, 'AVATAR');
      await userRepository.updateProfile({ avatarIcon: item.avatarId });
      await loadProfile();
      setEquippedAvatar(item.avatarId);
      showShopAlert(
        'IDENTITY BOUND',
        `"${item.name}" has been set as your active Hunter avatar identity.`,
        'default',
        'SYSTEM NOTIFICATION'
      );
    } else if (item.type === 'title' && item.titleString) {
      await inventoryRepository.equipItem(item.id, 'TITLE');
      setEquippedTitle(item.titleString);
      showShopAlert(
        'TITLE BESTOWED',
        `"${item.titleString}" is now your active title displayed on all leaderboards.`,
        'default',
        'SYSTEM NOTIFICATION'
      );
    }
  };

  const handleWatchAd = () => {
    haptics.medium();

    const onReward = async () => {
      const reward = 50;
      await userRepository.addCoins(reward, 'Watched Sponsor Video Ad', 'ad');
      await loadProfile();
      sound.play('quest_complete');
      haptics.success();
      showShopAlert(
        'REWARD DISBURSED',
        `+${reward} Gold Coins have been transferred to your Vault!`,
        'success',
        'SYSTEM NOTIFICATION',
        [
          {
            text: 'CLAIM REWARD',
            style: 'primary',
            onPress: () => setSystemDialog((prev) => ({ ...prev, visible: false })),
          },
        ]
      );
    };

    const shown = adMobService.showRewardedAd(onReward);
    if (!shown) {
      showShopAlert(
        'BUFFERING STREAM',
        'Buffering AdMob sponsor video. Tap again in 3 seconds to watch!',
        'info',
        'SYSTEM NOTICE',
        [
          {
            text: 'PROCEED',
            style: 'primary',
            onPress: () => setSystemDialog((prev) => ({ ...prev, visible: false })),
          },
        ]
      );
      adMobService.preloadRewarded();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={[styles.header, { backgroundColor: colors.backgroundElevated, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={19} color={colors.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>SYSTEM STORE</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Hunter Commissary & Rewards</Text>
            </View>
          </View>

          <View style={[styles.coinsPill, { backgroundColor: isDark ? '#14120A' : '#FEF3C7', borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#F59E0B' }]}>
            <Coins size={14} color="#F59E0B" />
            <Text style={styles.coinsPillAmount}>{currentCoins.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hunter Vault Card */}
          <View style={[styles.vaultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.vaultTopRow}>
              <View style={styles.vaultBadge}>
                <Shield size={14} color="#F59E0B" />
                <Text style={styles.vaultBadgeText}>HUNTER VAULT</Text>
              </View>
              <View style={styles.hunterRankPill}>
                <Crown size={12} color="#0A84FF" />
                <Text style={styles.hunterRankText}>
                  RANK {currentRank.rankCode} • LVL {profile?.level || 1}
                </Text>
              </View>
            </View>

            <View style={{ gap: 2, marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Coins size={28} color="#F59E0B" />
                <Text style={[styles.vaultBalanceCoins, { color: colors.textPrimary }]}>
                  {currentCoins.toLocaleString()}
                </Text>
                <Text style={styles.vaultCoinsLabel}>GOLD COINS</Text>
              </View>
              <Text style={[styles.vaultSubText, { color: colors.textSecondary }]}>
                Complete push-ups, squats, and daily quests to earn coins and unlock commissary gear.
              </Text>
            </View>

            {/* Watch Rewarded Video Ad Card */}
            <TouchableOpacity
              style={[styles.watchAdCard, { backgroundColor: isDark ? '#0A0E18' : colors.surfaceLight, borderColor: colors.border }]}
              onPress={handleWatchAd}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={styles.watchAdIconCircle}>
                  <PlayCircle size={22} color="#0A84FF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.watchAdTitle, { color: colors.textPrimary }]}>Watch Sponsor Video</Text>
                  <Text style={[styles.watchAdSub, { color: colors.textSecondary }]}>Support the system and earn instant coins</Text>
                </View>
              </View>
              <View style={styles.watchAdBonusPill}>
                <Coins size={13} color="#F59E0B" />
                <Text style={styles.watchAdBonusText}>+50 COINS</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* AdMob Banner right below Vault Card */}
          <AriseBannerAd style={{ marginVertical: 4 }} />

          {/* iOS Segmented Capsule Tab Bar (5 Tabs) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollWrap}
          >
            {[
              { id: 'boosters', label: 'Boosters' },
              { id: 'time', label: 'Screen Time' },
              { id: 'themes', label: 'Themes' },
              { id: 'titles', label: 'Titles' },
              { id: 'avatars', label: 'Avatars' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabSegmentBtn,
                    { backgroundColor: isDark ? '#0A0D15' : colors.surfaceLight, borderColor: colors.border },
                    isActive && styles.tabSegmentBtnActive,
                  ]}
                  onPress={() => {
                    haptics.light();
                    setActiveTab(tab.id as any);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabSegmentText,
                      isActive && styles.tabSegmentTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* TAB 1: BOOSTERS */}
          {activeTab === 'boosters' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>TACTICAL HUNTER BOOSTERS</Text>
              <View style={{ gap: 10 }}>
                {boostersList.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.itemRowCard}
                      onPress={() => handlePurchase(item)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.itemRowIconCircle, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                        <IconComp size={20} color="#F59E0B" />
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.itemRowTitle}>{item.name}</Text>
                          {item.rarity && (
                            <View style={styles.rarityBadge}>
                              <Text style={styles.rarityBadgeText}>{item.rarity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemRowDesc}>{item.desc}</Text>
                      </View>

                      <View style={styles.itemPricePill}>
                        <Coins size={12} color="#F59E0B" />
                        <Text style={styles.itemPriceText}>{item.cost}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 2: SCREEN TIME PASSES */}
          {activeTab === 'time' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>SCREEN TIME KEYS & PASSES</Text>
              <View style={{ gap: 10 }}>
                {timeUnlockList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemRowCard}
                    onPress={() => handlePurchase(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemRowIconCircle}>
                      <Clock size={20} color="#0A84FF" />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.itemRowTitle}>{item.name}</Text>
                      <Text style={styles.itemRowDesc}>{item.desc}</Text>
                    </View>

                    <View style={styles.itemPricePill}>
                      <Coins size={12} color="#F59E0B" />
                      <Text style={styles.itemPriceText}>{item.cost}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* TAB 3: THEMES */}
          {activeTab === 'themes' && (
            <View style={styles.tabSection}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>HUNTER SYSTEM AURA THEMES</Text>
              <View style={{ gap: 10 }}>
                {themesList.map((item) => {
                  const isUnlocked = unlockedItemIds.includes(item.id);
                  const isEquipped = equippedTheme === item.id;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.visualProductCard,
                        {
                          backgroundColor: isDark ? '#0A0D15' : colors.surface,
                          borderColor: isEquipped ? '#10B981' : isDark ? '#161E2E' : colors.border,
                        },
                      ]}
                    >
                      {/* Visual Aura Preview Bar */}
                      <View
                        style={[
                          styles.themeColorPreviewBar,
                          { backgroundColor: item.gradientColors?.[0] || '#F59E0B' },
                        ]}
                      />

                      <View style={{ flex: 1, gap: 4, paddingVertical: 12, paddingRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.visualTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                          {item.rarity && (
                            <View style={styles.rarityBadge}>
                              <Text style={styles.rarityBadgeText}>{item.rarity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.visualDesc, { color: colors.textSecondary }]}>{item.desc}</Text>

                        <View style={styles.visualActionRow}>
                          {!isUnlocked && (
                            <View style={styles.itemPricePill}>
                              <Coins size={12} color="#F59E0B" />
                              <Text style={styles.itemPriceText}>{item.cost.toLocaleString()}</Text>
                            </View>
                          )}
                          <View style={{ marginLeft: isUnlocked ? 0 : 'auto' }}>
                            {isEquipped ? (
                              <View style={[styles.equipBtn, { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderWidth: 1, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                <Check size={12} color="#10B981" />
                                <Text style={[styles.equipBtnText, { color: '#10B981' }]}>EQUIPPED</Text>
                              </View>
                            ) : isUnlocked ? (
                              <TouchableOpacity
                                style={[styles.equipBtn, { backgroundColor: '#0A84FF' }]}
                                onPress={() => handleEquipItem(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.equipBtnText}>EQUIP</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.equipBtn, { backgroundColor: '#0A84FF' }]}
                                onPress={() => handlePurchase(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.equipBtnText}>PURCHASE</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 4: TITLES */}
          {activeTab === 'titles' && (
            <View style={styles.tabSection}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>SOVEREIGN HUNTER TITLES</Text>
              <View style={{ gap: 10 }}>
                {titlesList.map((item) => {
                  const isUnlocked = unlockedItemIds.includes(item.id);
                  const isEquipped = equippedTitle === item.titleString;
                  const IconComp = item.icon;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.visualProductCard,
                        {
                          backgroundColor: isDark ? '#0A0D15' : colors.surface,
                          borderColor: isEquipped ? '#10B981' : isDark ? '#161E2E' : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.itemRowIconCircle, { margin: 12, backgroundColor: '#101625', borderColor: isEquipped ? '#10B981' : 'rgba(10, 132, 255, 0.4)' }]}>
                        <IconComp size={22} color={isEquipped ? '#10B981' : '#F59E0B'} />
                      </View>

                      <View style={{ flex: 1, gap: 4, paddingVertical: 12, paddingRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.visualTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                          {item.rarity && (
                            <View style={styles.rarityBadge}>
                              <Text style={styles.rarityBadgeText}>{item.rarity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.visualDesc, { color: colors.textSecondary }]}>{item.desc}</Text>

                        <View style={styles.visualActionRow}>
                          {!isUnlocked && (
                            <View style={styles.itemPricePill}>
                              <Coins size={12} color="#F59E0B" />
                              <Text style={styles.itemPriceText}>{item.cost.toLocaleString()}</Text>
                            </View>
                          )}
                          <View style={{ marginLeft: isUnlocked ? 0 : 'auto' }}>
                            {isEquipped ? (
                              <View style={[styles.equipBtn, { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderWidth: 1, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                <Check size={12} color="#10B981" />
                                <Text style={[styles.equipBtnText, { color: '#10B981' }]}>EQUIPPED</Text>
                              </View>
                            ) : isUnlocked ? (
                              <TouchableOpacity
                                style={[styles.equipBtn, { backgroundColor: '#0A84FF' }]}
                                onPress={() => handleEquipItem(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.equipBtnText}>EQUIP</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.equipBtn, { backgroundColor: '#0A84FF' }]}
                                onPress={() => handlePurchase(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.equipBtnText}>PURCHASE</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 5: AVATARS */}
          {activeTab === 'avatars' && (
            <View style={styles.tabSection}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>SOVEREIGN HUNTER AVATARS</Text>
              <View style={{ gap: 10 }}>
                {avatarsList.map((item) => {
                  const pfpObj = AVATAR_IMAGES.find((img) => img.id === item.avatarId);
                  const isUnlocked = unlockedItemIds.includes(item.id);
                  const isEquipped = profile?.avatarIcon === item.avatarId || equippedAvatar === item.avatarId;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.visualProductCard,
                        {
                          backgroundColor: isDark ? '#0A0D15' : colors.surface,
                          borderColor: isEquipped ? '#10B981' : isDark ? '#161E2E' : colors.border,
                        },
                      ]}
                    >
                      {/* Avatar Image Preview */}
                      <View style={[styles.avatarThumbWrap, { borderColor: isEquipped ? '#10B981' : 'rgba(10, 132, 255, 0.4)' }]}>
                        {pfpObj?.source ? (
                          <Image
                            source={pfpObj.source}
                            style={styles.avatarThumbImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <User size={28} color="#0A84FF" />
                        )}
                      </View>

                      <View style={{ flex: 1, gap: 4, paddingVertical: 12, paddingRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.visualTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                          {item.rarity && (
                            <View style={styles.rarityBadge}>
                              <Text style={styles.rarityBadgeText}>{item.rarity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.visualDesc, { color: colors.textSecondary }]}>{item.desc}</Text>

                        <View style={styles.visualActionRow}>
                          {!isUnlocked && (
                            <View style={styles.itemPricePill}>
                              <Coins size={12} color="#F59E0B" />
                              <Text style={styles.itemPriceText}>{item.cost.toLocaleString()}</Text>
                            </View>
                          )}
                          <View style={{ marginLeft: isUnlocked ? 0 : 'auto' }}>
                            {isEquipped ? (
                              <View style={[styles.equipBtn, { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderWidth: 1, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                <Check size={12} color="#10B981" />
                                <Text style={[styles.equipBtnText, { color: '#10B981' }]}>EQUIPPED</Text>
                              </View>
                            ) : isUnlocked ? (
                              <TouchableOpacity
                                style={[styles.equipBtn, { backgroundColor: '#0A84FF' }]}
                                onPress={() => handleEquipItem(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.equipBtnText}>EQUIP</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.equipBtn, { backgroundColor: '#0A84FF' }]}
                                onPress={() => handlePurchase(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.equipBtnText}>UNLOCK PFP</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* AdMob Banner at bottom */}
          <AriseBannerAd style={{ marginVertical: 12 }} />

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Universal Solo Leveling System Window for all Shop Directives & Alerts */}
        <Modal
          visible={systemDialog.visible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setSystemDialog((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <View style={{ width: '100%', maxWidth: 350, alignItems: 'center' }}>
              <SoloLevelingWindow
                variant={systemDialog.variant}
                tag={systemDialog.tag}
                subtag={systemDialog.subtag}
                title={systemDialog.title}
                message={systemDialog.message}
                buttons={systemDialog.buttons.map((btn) => ({
                  text: btn.text,
                  style: btn.style,
                  onPress: () => {
                    if (btn.onPress) {
                      btn.onPress();
                    } else {
                      setSystemDialog((prev) => ({ ...prev, visible: false }));
                    }
                  },
                }))}
                onClose={() => setSystemDialog((prev) => ({ ...prev, visible: false }))}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#121722',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#101420',
    borderWidth: 1,
    borderColor: '#1C263B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#14120A',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  coinsPillAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
    fontVariant: ['tabular-nums'],
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },

  // Segment Tab Bar
  tabScrollWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  tabSegmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    backgroundColor: '#0A0D15',
    borderWidth: 1,
    borderColor: '#161E2E',
  },
  tabSegmentBtnActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  tabSegmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  tabSegmentTextActive: {
    color: '#FFFFFF',
  },

  tabSection: {
    gap: 14,
  },
  sectionHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#8E9BB0',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },

  // Hunter Vault Card
  vaultCard: {
    backgroundColor: '#0A0D15',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: 16,
    gap: 10,
  },
  vaultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  hunterRankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  hunterRankText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  vaultBalanceCoins: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  vaultCoinsLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.6,
    marginTop: 10,
  },
  vaultSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E9BB0',
    lineHeight: 15,
  },

  // Watch Ad Card
  watchAdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0A0E18',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  watchAdIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchAdTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  watchAdSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  watchAdBonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  watchAdBonusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Item List (Time & Boosters)
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0A0D15',
    borderWidth: 1,
    borderColor: '#161E2E',
  },
  itemRowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#101625',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRowTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  itemRowDesc: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },
  itemPricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#14120A',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  itemPriceText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  rarityBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#A78BFA',
    letterSpacing: 0.5,
  },

  // Visual Product Cards (Themes & Avatars)
  visualProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#0A0D15',
    borderWidth: 1,
    borderColor: '#161E2E',
    overflow: 'hidden',
  },
  themeColorPreviewBar: {
    width: 10,
    alignSelf: 'stretch',
  },
  avatarThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    margin: 10,
    backgroundColor: '#101625',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.4)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarThumbImg: {
    width: '100%',
    height: '100%',
  },
  visualTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  visualDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
  },
  visualActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  equipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#0A84FF',
  },
  equipBtnText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // Solo Leveling Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
