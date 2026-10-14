import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Coins,
  Sparkles,
  Zap,
  Shield,
  Flame,
  Clock,
  User,
  PlayCircle,
  Crown,
  Gift,
  Check,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { crystalRepository } from '../../src/database/repositories/crystalRepository';
import { inventoryRepository } from '../../src/database/repositories/inventoryRepository';
import { adMobService } from '../../src/services/adMobService';
import { screenTimerService, appBlockerService } from '../../src/native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { useTheme } from '../../src/hooks/useTheme';
import { fontFamilies } from '../../src/theme/typography';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { ALL_AVATARS } from '../../src/constants/avatars';
import { AVATAR_ICONS } from '../../src/components/profile/AvatarPicker';
import { AnimatedNumber } from '../../src/components/motion/AnimatedNumber';
import { AnimatedStreakFlame } from '../../src/components/ui/AnimatedStreakFlame';
import { Icon3D, Icon3DName } from '../../src/components/ui/Icon3D';
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';

interface BoostItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  iconBg: string;
  iconColor: string;
  icon3DName: Icon3DName;
}

interface AvatarItem {
  id: string;
  name: string;
  avatarIcon: string;
  cost: number;
}

interface VoucherItem {
  id: string;
  name: string;
  sub: string;
  crystalsCost: number;
  provider: 'amazon' | 'googleplay' | 'paytm';
  providerColor: string;
}

export default function ShopScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [filter, setFilter] = useState<'all' | 'avatars' | 'boosts' | 'redeem'>('all');
  const [manaCrystals, setManaCrystals] = useState<number>(0);
  const [unlockedItemIds, setUnlockedItemIds] = useState<string[]>([]);
  const [equippedAvatar, setEquippedAvatar] = useState<string>('pfp_01');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Dialog Modal
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
    onPress?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    buttonText: 'OK',
  });

  const showDialog = (title: string, message: string, buttonText = 'OK', onPress?: () => void) => {
    setDialog({
      visible: true,
      title,
      message,
      buttonText,
      onPress,
    });
  };

  const refreshData = useCallback(async () => {
    await loadProfile();
    const bal = await crystalRepository.getBalance();
    setManaCrystals(bal);

    const items = await inventoryRepository.getUnlockedItems();
    const unlockedIds = items.map((i) => i.itemId);

    // Ensure the starter avatar selected at install/onboarding is in unlocked inventory for life
    const starter = profile?.avatarIcon || 'pfp_01';
    if (!unlockedIds.includes(starter) && !unlockedIds.includes(`avatar_${starter}`)) {
      await inventoryRepository.unlockItem(starter, 'AVATAR');
      unlockedIds.push(starter);
      unlockedIds.push(`avatar_${starter}`);
    }

    setUnlockedItemIds(unlockedIds);
    if (profile?.avatarIcon) {
      setEquippedAvatar(profile.avatarIcon);
    }
  }, [loadProfile, profile?.avatarIcon]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const currentCoins = profile?.coins ?? 0;

  const boostsList: BoostItem[] = [
    {
      id: 'streak_freeze',
      name: 'Streak Freeze',
      desc: 'Saves your daily streak if missed',
      cost: 200,
      iconBg: isDark ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE',
      iconColor: '#2563EB',
      icon3DName: 'ice_blue',
    },
    {
      id: 'double_xp',
      name: 'XP 2X Booster',
      desc: '2x XP on workouts for 1 hour',
      cost: 300,
      iconBg: isDark ? 'rgba(219, 39, 119, 0.2)' : '#FCE7F3',
      iconColor: '#DB2777',
      icon3DName: 'lightning_gold',
    },
    {
      id: 'soul_pass',
      name: 'Soul Hunter Pass',
      desc: 'Unlock special raid gates & bonuses',
      cost: 500,
      iconBg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
      iconColor: '#D97706',
      icon3DName: 'ticket_gold',
    },
    {
      id: 'focus_shield',
      name: 'Focus Shield',
      desc: 'Block all distracting apps for 2 hours',
      cost: 400,
      iconBg: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE',
      iconColor: '#7C3AED',
      icon3DName: 'safe_gray',
    },
  ];

  // All 39 Hunter PFPs + 16 Insignia Crests
  const avatarsList: AvatarItem[] = [
    ...ALL_AVATARS.map((a, index) => {
      let cost = 500;
      if (index >= 30) cost = 2200;
      else if (index >= 20) cost = 1600;
      else if (index >= 10) cost = 1100;
      else if (index >= 4) cost = 750;

      return {
        id: `avatar_${a.id}`,
        name: a.name,
        avatarIcon: a.id,
        cost,
      };
    }),
    ...AVATAR_ICONS.map((icon, index) => ({
      id: `insignia_${icon.id}`,
      name: `${icon.name} Crest`,
      avatarIcon: icon.id,
      cost: 400 + (index % 4) * 150,
    })),
  ];

  const vouchersList: VoucherItem[] = [
    {
      id: 'voucher_amazon_100',
      name: '₹100 Amazon Voucher',
      sub: 'Instant digital claim code delivered in-app',
      crystalsCost: 100,
      provider: 'amazon',
      providerColor: '#FF9900',
    },
    {
      id: 'voucher_gplay_50',
      name: 'Google Play ₹50',
      sub: 'Google Play Gift Card Code',
      crystalsCost: 450,
      provider: 'googleplay',
      providerColor: '#34A853',
    },
    {
      id: 'voucher_paytm_100',
      name: 'Paytm ₹100',
      sub: 'Direct wallet cashback transfer',
      crystalsCost: 800,
      provider: 'paytm',
      providerColor: '#00BAF2',
    },
  ];

  const handleBuyBoost = async (item: BoostItem) => {
    haptics.medium();
    if (currentCoins < item.cost) {
      sound.play('rep_count');
      showDialog(
        'Insufficient Coins',
        `You need ${item.cost} Coins to buy "${item.name}". You currently have ${currentCoins.toLocaleString()} Coins.`
      );
      return;
    }

    try {
      const ok = await userRepository.spendCoins(item.cost, `Bought ${item.name}`);
      if (ok) {
        sound.play('purchase');
        haptics.success();
        await loadProfile();
        showDialog('Item Acquired!', `You have unlocked "${item.name}". It is now active.`);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAvatarAction = async (item: AvatarItem) => {
    haptics.medium();
    const isUnlocked =
      unlockedItemIds.includes(item.id) ||
      unlockedItemIds.includes(item.avatarIcon) ||
      unlockedItemIds.includes(`avatar_${item.avatarIcon}`) ||
      profile?.avatarIcon === item.avatarIcon;
    const isEquipped = equippedAvatar === item.avatarIcon || profile?.avatarIcon === item.avatarIcon;

    if (isEquipped) {
      showDialog('Already Equipped', `"${item.name}" is currently active on your profile.`);
      return;
    }

    if (isUnlocked) {
      // Equip directly
      await inventoryRepository.equipItem(item.avatarIcon, 'AVATAR');
      await userRepository.updateProfile({ avatarIcon: item.avatarIcon, profileImageUri: null });
      setEquippedAvatar(item.avatarIcon);
      await loadProfile();
      sound.play('quest_complete');
      haptics.success();
      showDialog('Avatar Equipped', `"${item.name}" is now set as your profile avatar.`);
      return;
    }

    // Purchase with Coins
    if (currentCoins < item.cost) {
      sound.play('rep_count');
      showDialog(
        'Insufficient Coins',
        `You need ${item.cost.toLocaleString()} Coins to unlock "${item.name}". You have ${currentCoins.toLocaleString()} Coins.`
      );
      return;
    }

    const ok = await userRepository.spendCoins(item.cost, `Purchased ${item.name}`);
    if (ok) {
      // Lifetime persistent unlock in SQLite
      await inventoryRepository.unlockItem(item.avatarIcon, 'AVATAR');
      await inventoryRepository.unlockItem(item.id, 'AVATAR');
      await inventoryRepository.unlockItem(`avatar_${item.avatarIcon}`, 'AVATAR');
      await inventoryRepository.equipItem(item.avatarIcon, 'AVATAR');
      await userRepository.updateProfile({ avatarIcon: item.avatarIcon, profileImageUri: null });
      setUnlockedItemIds((prev) => [...prev, item.id, item.avatarIcon, `avatar_${item.avatarIcon}`]);
      setEquippedAvatar(item.avatarIcon);
      await loadProfile();
      sound.play('purchase');
      haptics.success();
      showDialog('Unlocked & Equipped!', `"${item.name}" is now unlocked for your account for life.`);
    }
  };

  const handleRedeemVoucher = async (voucher: VoucherItem) => {
    haptics.heavy();
    if (manaCrystals < voucher.crystalsCost) {
      sound.play('rep_count');
      showDialog(
        'Insufficient Crystals',
        `Redeeming ${voucher.name} requires ${voucher.crystalsCost} Mana Crystals. Complete dungeon gates and surveys to earn more crystals.`
      );
      return;
    }

    try {
      const ok = await crystalRepository.spendCrystals(
        voucher.crystalsCost,
        `Redeemed ${voucher.name}`
      );
      if (ok) {
        sound.play('quest_complete');
        haptics.success();
        const bal = await crystalRepository.getBalance();
        setManaCrystals(bal);
        showDialog(
          'Voucher Claimed!',
          `Your request for ${voucher.name} has been processed! Your voucher digital code will be sent to your Hunter inbox within 24 hours.`
        );
      }
    } catch (e) {
      console.warn(e);
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
      showDialog('Reward Claimed!', `+${reward} Gold Coins have been added to your vault!`);
    };

    const shown = adMobService.showRewardedAd(onReward);
    if (!shown) {
      showDialog('Buffering Ad', 'Buffering sponsor video ad. Tap again in 3 seconds to watch!');
      adMobService.preloadRewarded();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER (Back + Vault Shop + Coins | Crystals) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <NeumorphicCircleButton
            size={40}
            onPress={() => {
              haptics.light();
              router.back();
            }}
            icon={<ArrowLeft size={18} color={colors.textPrimary} strokeWidth={2.5} />}
          />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vault Shop</Text>
        </View>

        <View style={styles.headerRightCurrencies}>
          <View style={styles.currencyBadge}>
            <Icon3D name="coin_gold" size={16} />
            <AnimatedNumber
              value={currentCoins}
              style={[styles.currencyBadgeText, { color: colors.textPrimary }]}
            />
          </View>
          <TouchableOpacity
            style={styles.currencyBadge}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.8}
          >
            <Icon3D name="crystal_blue" size={16} />
            <AnimatedNumber
              value={manaCrystals}
              style={[styles.currencyBadgeText, { color: '#0284C7' }]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. FILTER PILLS (All, Avatars, Boosts, Redeem) */}
      <View style={styles.filterRow}>
        {(['all', 'avatars', 'boosts', 'redeem'] as const).map((tab) => {
          const isSelected = filter === tab;
          const label = tab === 'all' ? 'All' : tab === 'avatars' ? 'Avatars' : tab === 'boosts' ? 'Boosts' : 'Redeem';
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isSelected ? '#E53935' : '#FFFFFF',
                  borderColor: isSelected ? '#E53935' : '#E8E4DC',
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                haptics.light();
                setFilter(tab);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Watch Ad Free Coins Banner */}
        <NeumorphicCard style={styles.freeCoinsCard}>
          <TouchableOpacity
            style={styles.freeCoinsCardInner}
            onPress={handleWatchAd}
            activeOpacity={0.85}
          >
            <View style={styles.freeCoinsLeft}>
              <View style={styles.freeCoinsIconWrap}>
                <Icon3D name="play_amber" size={32} />
              </View>
              <View>
                <Text style={styles.eyebrowTag}>SPONSOR PASS</Text>
                <Text style={[styles.freeCoinsTitle, { color: colors.textPrimary }]}>Watch Video Stream</Text>
              </View>
            </View>
            <View style={styles.freeCoinsRewardBadge}>
              <Icon3D name="coin_gold" size={14} />
              <Text style={styles.freeCoinsRewardText}>+50 COINS</Text>
            </View>
          </TouchableOpacity>
        </NeumorphicCard>

        {/* ======================= SECTION 1: BOOSTS & POWER-UPS ======================= */}
        {(filter === 'all' || filter === 'boosts') && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Boosts & Power-ups</Text>
            <View style={styles.boostsGrid}>
              {boostsList.map((item) => (
                <NeumorphicCard key={item.id} style={styles.boostCard}>
                  <View style={styles.boostIconWrap}>
                    <Icon3D name={item.icon3DName} size={44} />
                  </View>
                  <View style={styles.boostCostBadge}>
                    <Icon3D name="coin_gold" size={13} />
                    <Text style={styles.boostCostText}>{item.cost}</Text>
                  </View>
                  <Text style={[styles.boostName, { color: colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.boostDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  <TouchableOpacity
                    style={styles.boostBuyBtn}
                    onPress={() => handleBuyBoost(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.boostBuyBtnText}>BUY</Text>
                  </TouchableOpacity>
                </NeumorphicCard>
              ))}
            </View>
          </View>
        )}

        {/* ======================= SECTION 2: AVATARS & INSIGNIA ======================= */}
        {(filter === 'all' || filter === 'avatars') && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Avatars & Insignia</Text>
            <View style={styles.avatarsGrid}>
              {avatarsList.map((item) => {
                const isUnlocked =
                  unlockedItemIds.includes(item.id) ||
                  unlockedItemIds.includes(item.avatarIcon) ||
                  unlockedItemIds.includes(`avatar_${item.avatarIcon}`) ||
                  profile?.avatarIcon === item.avatarIcon;
                const isEquipped = equippedAvatar === item.avatarIcon || profile?.avatarIcon === item.avatarIcon;
                return (
                  <NeumorphicCard key={item.id} style={styles.avatarCard}>
                    <View style={styles.avatarWrap}>
                      <PlayerAvatar iconId={item.avatarIcon} size={64} />
                      {isEquipped && (
                        <View style={styles.equippedCheckPill}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.avatarName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View style={styles.avatarPriceRow}>
                      <Icon3D name="coin_gold" size={13} />
                      <Text style={[styles.avatarPriceText, { color: colors.textSecondary }]}>
                        {isUnlocked ? 'Owned' : item.cost.toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.avatarActionBtn,
                        {
                          backgroundColor: isEquipped
                            ? '#E5E7EB'
                            : isUnlocked
                            ? '#111827'
                            : '#E53935',
                        },
                      ]}
                      onPress={() => handleAvatarAction(item)}
                      activeOpacity={0.8}
                      disabled={isEquipped}
                    >
                      <Text
                        style={[
                          styles.avatarActionBtnText,
                          {
                            color: isEquipped
                              ? colors.textSecondary
                              : '#FFFFFF',
                          },
                        ]}
                      >
                        {isEquipped ? 'EQUIPPED' : isUnlocked ? 'EQUIP' : 'BUY'}
                      </Text>
                    </TouchableOpacity>
                  </NeumorphicCard>
                );
              })}
            </View>
          </View>
        )}

        {/* ======================= SECTION 3: REDEEM MANA CRYSTALS ======================= */}
        {(filter === 'all' || filter === 'redeem') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Redeem Mana Crystals</Text>
              <TouchableOpacity
                style={styles.openVaultLink}
                onPress={() => {
                  haptics.light();
                  router.push('/redeem' as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.openVaultLinkText}>Open Vault</Text>
                <ExternalLink size={12} color="#E53935" />
              </TouchableOpacity>
            </View>
            <View style={styles.vouchersList}>
              {vouchersList.map((voucher) => (
                <NeumorphicCard key={voucher.id} style={styles.voucherCard}>
                  <View style={styles.voucherLeft}>
                    <View style={styles.voucherIconCircle}>
                      <Icon3D name="gift_capsule" size={36} />
                    </View>
                    <View style={{ gap: 4, flex: 1 }}>
                      <Text style={[styles.voucherTitle, { color: colors.textPrimary }]}>{voucher.name}</Text>
                      <View style={styles.voucherPricePill}>
                        <Icon3D name="crystal_blue" size={13} />
                        <Text style={[styles.voucherPriceText, { color: '#0284C7' }]}>
                          {voucher.crystalsCost} Crystals
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.voucherRedeemBtn}
                    onPress={() => handleRedeemVoucher(voucher)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.voucherRedeemBtnText}>Redeem</Text>
                  </TouchableOpacity>
                </NeumorphicCard>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Solo Leveling Dialog Modal */}
      <Modal visible={dialog.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{dialog.title}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>{dialog.message}</Text>
            <TouchableOpacity
              style={styles.dialogBtn}
              onPress={() => {
                if (dialog.onPress) dialog.onPress();
                setDialog((prev) => ({ ...prev, visible: false }));
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogBtnText}>{dialog.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.3,
  },
  headerRightCurrencies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  currencyBadgeText: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },

  // Filter Pills
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },

  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 30,
  },

  // Watch Ad Card
  freeCoinsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  freeCoinsCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  freeCoinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freeCoinsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowTag: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  freeCoinsTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
  },
  freeCoinsRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  freeCoinsRewardText: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#92400E',
    letterSpacing: 0.5,
  },

  // Section Wrap
  sectionWrap: {
    gap: 12,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: fontFamilies.semiBold,
  },
  openVaultLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openVaultLinkText: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    color: '#00D2EE',
  },

  // Boosts Grid
  boostsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  boostCard: {
    width: '48%',
    padding: 14,
    gap: 6,
    alignItems: 'center',
  },
  boostIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F6F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  boostCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  boostCostText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#92400E',
  },
  boostName: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
  boostDesc: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
    minHeight: 28,
  },
  boostBuyBtn: {
    backgroundColor: '#E53935',
    width: '100%',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  boostBuyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.5,
  },

  // Avatars Grid
  avatarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarCard: {
    width: '48%',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  equippedCheckPill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
  avatarPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarPriceText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
  },
  avatarActionBtn: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  avatarActionBtnText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.5,
  },

  // Vouchers List
  vouchersList: {
    gap: 12,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voucherIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F6F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
  voucherSub: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  voucherPricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  voucherPriceText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
  },
  voucherRedeemBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  voucherRedeemBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },

  // Modal Dialog
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 22,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
    lineHeight: 20,
  },
  dialogBtn: {
    backgroundColor: '#E53935',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  dialogBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
});
