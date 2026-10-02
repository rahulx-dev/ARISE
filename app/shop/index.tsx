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

interface BoostItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  iconBg: string;
  iconColor: string;
  icon: any;
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
  const [manaCrystals, setManaCrystals] = useState<number>(32);
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
    setManaCrystals(bal > 0 ? bal : 32);

    const items = await inventoryRepository.getUnlockedItems();
    setUnlockedItemIds(items.map((i) => i.itemId));
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
      icon: Flame,
    },
    {
      id: 'double_xp',
      name: 'XP 2X Booster',
      desc: '2x XP on workouts for 1 hour',
      cost: 300,
      iconBg: isDark ? 'rgba(219, 39, 119, 0.2)' : '#FCE7F3',
      iconColor: '#DB2777',
      icon: Zap,
    },
    {
      id: 'soul_pass',
      name: 'Soul Hunter Pass',
      desc: 'Unlock special raid gates & bonuses',
      cost: 500,
      iconBg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
      iconColor: '#D97706',
      icon: Crown,
    },
    {
      id: 'focus_shield',
      name: 'Focus Shield',
      desc: 'Block all distracting apps for 2 hours',
      cost: 400,
      iconBg: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE',
      iconColor: '#7C3AED',
      icon: Shield,
    },
  ];

  const avatarsList: AvatarItem[] = [
    {
      id: 'avatar_shadow_hunter',
      name: 'Shadow Hunter',
      avatarIcon: 'pfp_02',
      cost: 1000,
    },
    {
      id: 'avatar_crimson_knight',
      name: 'Crimson Knight',
      avatarIcon: 'pfp_03',
      cost: 1500,
    },
    {
      id: 'avatar_frost_warrior',
      name: 'Frost Warrior',
      avatarIcon: 'pfp_04',
      cost: 1200,
    },
    {
      id: 'avatar_demon_monarch',
      name: 'Demon Monarch',
      avatarIcon: 'pfp_05',
      cost: 2000,
    },
    {
      id: 'avatar_solar_knight',
      name: 'Solar Knight',
      avatarIcon: 'pfp_06',
      cost: 1800,
    },
    {
      id: 'avatar_valkyrie',
      name: 'Valkyrie Sovereign',
      avatarIcon: 'pfp_09',
      cost: 2200,
    },
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
    const isUnlocked = unlockedItemIds.includes(item.id) || item.avatarIcon === 'pfp_01';
    const isEquipped = equippedAvatar === item.avatarIcon;

    if (isEquipped) {
      showDialog('Already Equipped', `"${item.name}" is currently active on your profile.`);
      return;
    }

    if (isUnlocked) {
      // Equip
      await inventoryRepository.equipItem(item.id, 'AVATAR');
      await userRepository.updateProfile({ avatarIcon: item.avatarIcon });
      setEquippedAvatar(item.avatarIcon);
      await loadProfile();
      sound.play('quest_complete');
      haptics.success();
      showDialog('Avatar Equipped', `"${item.name}" is now set as your profile avatar.`);
      return;
    }

    // Purchase
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
      await inventoryRepository.unlockItem(item.id, 'AVATAR');
      await inventoryRepository.equipItem(item.id, 'AVATAR');
      await userRepository.updateProfile({ avatarIcon: item.avatarIcon });
      setUnlockedItemIds((prev) => [...prev, item.id]);
      setEquippedAvatar(item.avatarIcon);
      await loadProfile();
      sound.play('purchase');
      haptics.success();
      showDialog('Unlocked & Equipped!', `"${item.name}" is now your active avatar.`);
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              router.back();
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vault Shop</Text>
        </View>

        <View style={styles.headerRightCurrencies}>
          <View
            style={[
              styles.currencyBadge,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
              },
            ]}
          >
            <Coins size={15} color="#F59E0B" />
            <Text style={[styles.currencyBadgeText, { color: isDark ? '#F59E0B' : '#92400E' }]}>
              {currentCoins.toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.currencyBadge,
              {
                backgroundColor: isDark ? 'rgba(0, 210, 238, 0.15)' : '#F0F9FF',
                borderColor: isDark ? 'rgba(0, 210, 238, 0.3)' : '#E0F2FE',
              },
            ]}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.8}
          >
            <ManaCrystalIcon size={15} color="#00D2EE" secondaryColor="#0284C7" />
            <Text style={[styles.currencyBadgeText, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
              {manaCrystals.toLocaleString()}
            </Text>
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
                  backgroundColor: isSelected ? '#E53935' : isDark ? colors.card : '#F3F4F6',
                  borderColor: isSelected ? '#E53935' : colors.border,
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
        <TouchableOpacity
          style={[
            styles.freeCoinsCard,
            {
              backgroundColor: isDark ? 'rgba(229, 57, 53, 0.12)' : '#FFF1F2',
              borderColor: isDark ? 'rgba(229, 57, 53, 0.3)' : '#FFE4E6',
            },
          ]}
          onPress={handleWatchAd}
          activeOpacity={0.85}
        >
          <View style={styles.freeCoinsLeft}>
            <View
              style={[
                styles.freeCoinsIconWrap,
                { backgroundColor: isDark ? 'rgba(229, 57, 53, 0.25)' : '#FFFFFF' },
              ]}
            >
              <PlayCircle size={22} color="#E53935" />
            </View>
            <View>
              <Text style={[styles.freeCoinsTitle, { color: colors.textPrimary }]}>Watch Sponsor Video</Text>
              <Text style={[styles.freeCoinsSub, { color: colors.textSecondary }]}>Earn instant coins for the shop</Text>
            </View>
          </View>
          <View
            style={[
              styles.freeCoinsRewardBadge,
              {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
              },
            ]}
          >
            <Coins size={13} color="#F59E0B" />
            <Text style={[styles.freeCoinsRewardText, { color: isDark ? '#F59E0B' : '#D97706' }]}>+50 COINS</Text>
          </View>
        </TouchableOpacity>

        {/* ======================= SECTION 1: BOOSTS & POWER-UPS ======================= */}
        {(filter === 'all' || filter === 'boosts') && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Boosts & Power-ups</Text>
            <View style={styles.boostsGrid}>
              {boostsList.map((item) => {
                const IconComp = item.icon;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.boostCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={[styles.boostIconWrap, { backgroundColor: item.iconBg }]}>
                      <IconComp size={24} color={item.iconColor} />
                    </View>
                    <View
                      style={[
                        styles.boostCostBadge,
                        {
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                        },
                      ]}
                    >
                      <Coins size={12} color="#F59E0B" />
                      <Text
                        style={[
                          styles.boostCostText,
                          { color: isDark ? '#F59E0B' : '#92400E' },
                        ]}
                      >
                        {item.cost}
                      </Text>
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
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ======================= SECTION 2: AVATARS & INSIGNIA ======================= */}
        {(filter === 'all' || filter === 'avatars') && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Avatars & Insignia</Text>
            <View style={styles.avatarsGrid}>
              {avatarsList.map((item) => {
                const isUnlocked = unlockedItemIds.includes(item.id) || item.avatarIcon === 'pfp_01';
                const isEquipped = equippedAvatar === item.avatarIcon;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.avatarCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.avatarWrap}>
                      <PlayerAvatar iconId={item.avatarIcon} size={64} />
                      {isEquipped && (
                        <View style={[styles.equippedCheckPill, { borderColor: colors.card }]}>
                          <Check size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.avatarName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View style={styles.avatarPriceRow}>
                      <Coins size={13} color="#F59E0B" />
                      <Text style={[styles.avatarPriceText, { color: colors.textSecondary }]}>
                        {isUnlocked ? 'Owned' : item.cost.toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.avatarActionBtn,
                        {
                          backgroundColor: isEquipped
                            ? isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : '#E5E7EB'
                            : isUnlocked
                            ? isDark
                              ? '#0A84FF'
                              : '#111827'
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
                  </View>
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
                <ExternalLink size={12} color="#00D2EE" />
              </TouchableOpacity>
            </View>
            <View style={styles.vouchersList}>
              {vouchersList.map((voucher) => (
                <View
                  key={voucher.id}
                  style={[
                    styles.voucherCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.voucherLeft}>
                    <View style={[styles.voucherIconCircle, { backgroundColor: voucher.providerColor + '18' }]}>
                      <Gift size={22} color={voucher.providerColor} />
                    </View>
                    <View style={{ gap: 2, flex: 1 }}>
                      <Text style={[styles.voucherTitle, { color: colors.textPrimary }]}>{voucher.name}</Text>
                      <Text style={[styles.voucherSub, { color: colors.textSecondary }]}>{voucher.sub}</Text>
                      <View style={styles.voucherPricePill}>
                        <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                        <Text style={[styles.voucherPriceText, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
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
                </View>
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
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.semiBold,
  },
  headerRightCurrencies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  currencyBadgeText: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },

  // Filter Pills
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  freeCoinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freeCoinsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeCoinsTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },
  freeCoinsSub: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  freeCoinsRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  freeCoinsRewardText: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  boostIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  boostCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  boostCostText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
  },
  boostName: {
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
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
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  boostBuyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
  },
  avatarName: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
    textAlign: 'center',
  },
  avatarPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarPriceText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
  },
  avatarActionBtn: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  avatarActionBtnText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0.5,
  },

  // Vouchers List
  vouchersList: {
    gap: 10,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voucherIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
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
    fontFamily: fontFamilies.semiBold,
  },
  voucherRedeemBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  voucherRedeemBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },

  // Modal Dialog
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.semiBold,
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
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dialogBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },
});
