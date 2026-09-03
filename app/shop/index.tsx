import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Hourglass,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  Shield,
  Flame,
  Clock,
  ChevronRight,
  Palette,
  User,
  Banknote,
  Wallet,
  ArrowUpRight,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { payoutRepository, PayoutRequestItem } from '../../src/database/repositories/payoutRepository';
import { screenTimerService, appBlockerService } from '../../src/native';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { colors } from '../../src/theme/colors';

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  type: 'boost' | 'time' | 'theme' | 'avatar';
  icon: any;
  minutes?: number;
}

interface CashoutTier {
  id: string;
  amountInr: number;
  cost: number;
  badge?: string;
}

const CASHOUT_TIERS: CashoutTier[] = [
  { id: 'upi_20', amountInr: 20, cost: 2000, badge: 'STARTER' },
  { id: 'upi_50', amountInr: 50, cost: 5000, badge: 'MOST POPULAR' },
  { id: 'upi_100', amountInr: 100, cost: 10000, badge: 'WARRIOR PACK' },
  { id: 'upi_200', amountInr: 200, cost: 18000, badge: 'MONARCH ELITE' },
];

export default function ShopScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [activeTab, setActiveTab] = useState<'cashout' | 'time' | 'boosters' | 'themes'>('cashout');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);
  const [insufficientItem, setInsufficientItem] = useState<ShopItem | null>(null);

  const [selectedTier, setSelectedTier] = useState<CashoutTier | null>(null);
  const [upiInput, setUpiInput] = useState<string>('');
  const [isUpiModalOpen, setIsUpiModalOpen] = useState<boolean>(false);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequestItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      payoutRepository.getUserRequests().then(setPayoutHistory);
    }, [])
  );

  const currentCoins = profile?.coins || 0;

  const boostersList: ShopItem[] = [
    {
      id: 'double_coins',
      name: 'Double Coins',
      desc: 'Get 2x coins for 30 minutes',
      cost: 750,
      type: 'boost',
      icon: Zap,
    },
    {
      id: 'focus_shield',
      name: 'Focus Shield',
      desc: 'Block distractions for 60 minutes',
      cost: 1000,
      type: 'boost',
      icon: Shield,
    },
    {
      id: 'streak_freeze',
      name: 'Streak Freeze',
      desc: 'Protect your streak for 1 day',
      cost: 600,
      type: 'boost',
      icon: Flame,
    },
  ];

  const timeUnlockList: ShopItem[] = [
    {
      id: 'time_15m',
      name: '15m App Unlock',
      desc: 'Unlock all restricted apps for 15 minutes',
      cost: 100,
      minutes: 15,
      type: 'time',
      icon: Clock,
    },
    {
      id: 'time_30m',
      name: '30m App Unlock',
      desc: 'Unlock all restricted apps for 30 minutes',
      cost: 200,
      minutes: 30,
      type: 'time',
      icon: Clock,
    },
    {
      id: 'time_60m',
      name: '60m App Unlock',
      desc: 'Unlock all restricted apps for 1 hour',
      cost: 350,
      minutes: 60,
      type: 'time',
      icon: Clock,
    },
  ];

  const themesList: ShopItem[] = [
    { id: 'cyber_gold', name: 'Cyber Gold Theme', desc: 'Solar Flare Gold UI Accent', cost: 1500, type: 'theme', icon: Palette },
    { id: 'neon_purple', name: 'Neon Purple Aura', desc: 'Synthwave Neon Purple Accent', cost: 1500, type: 'theme', icon: Palette },
  ];

  const avatarsList: ShopItem[] = [
    { id: 'avatar_cyber_king', name: 'Cyber Samurai PFP', desc: 'Legendary Warrior Avatar', cost: 2000, type: 'avatar', icon: User },
    { id: 'avatar_shadow_blade', name: 'Shadow Blade PFP', desc: 'Mythic Stealth Avatar', cost: 2000, type: 'avatar', icon: User },
  ];

  const handlePurchase = async (item: ShopItem) => {
    if (purchasingId) return;

    if (currentCoins < item.cost) {
      haptics.warning();
      setInsufficientItem(item);
      return;
    }

    setPurchasingId(item.id);
    haptics.medium();

    try {
      if (item.type === 'time' && item.minutes) {
        const durationMs = item.minutes * 60 * 1000;
        const now = new Date();
        const targetEpoch = Date.now() + durationMs;

        const result = await userRepository.purchaseScreenTimeAtomically(
          item.cost,
          {
            packageName: 'ALL_APPS',
            appName: 'Screen Time Pass',
            durationMs,
            startTime: now.toISOString(),
            endTime: new Date(targetEpoch).toISOString(),
            targetEndEpoch: targetEpoch,
            status: 'ACTIVE',
          },
          `Unlocked ${item.minutes}m Screen Time`
        );

        if (!result.success) {
          setInsufficientItem(item);
          return;
        }

        // 1. Start UI countdown timer
        screenTimerService.startSessionTimer(durationMs, `Screen Time (${item.minutes}m)`);
        // 2. Temporarily unblock native monitor overlay for duration
        appBlockerService.temporaryUnlock?.(durationMs);
      } else {
        const success = await userRepository.spendCoins(item.cost, `Purchased ${item.name}`);
        if (!success) {
          setInsufficientItem(item);
          return;
        }
      }

      await loadProfile();
      sound.play('purchase');
      haptics.heavy();
      try {
        voiceCoach.speak(`Purchase confirmed! ${item.name} activated.`);
      } catch {}

      setSuccessItem(item);
    } catch (e) {
      console.warn('Purchase error:', e);
      showIOSAlert('Purchase Error', 'Could not complete transaction.');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleSelectCashoutTier = (tier: CashoutTier) => {
    haptics.medium();
    if (currentCoins < tier.cost) {
      haptics.warning();
      Alert.alert(
        'Insufficient Coins',
        `You need ${tier.cost.toLocaleString()} coins for ₹${tier.amountInr} UPI Cashout.\n\nYour current balance: ${currentCoins.toLocaleString()} coins.\n\nPerform physical workout reps & focus sessions to earn more coins!`
      );
      return;
    }
    setSelectedTier(tier);
    setIsUpiModalOpen(true);
  };

  const handleConfirmWithdrawal = async () => {
    if (!selectedTier || !upiInput.trim()) {
      Alert.alert('Required', 'Please enter your UPI ID (e.g. 9876543210@paytm or name@upi)');
      return;
    }

    const cleanUpi = upiInput.trim();
    if (!cleanUpi.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID containing "@" (e.g. mobile@paytm, name@okhdfcbank)');
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const success = await payoutRepository.createRequest(
        selectedTier.amountInr,
        selectedTier.cost,
        cleanUpi
      );

      if (success) {
        sound.play('quest_complete');
        haptics.success();
        setIsUpiModalOpen(false);
        setUpiInput('');
        await loadProfile();
        const history = await payoutRepository.getUserRequests();
        setPayoutHistory(history);
        Alert.alert(
          'Withdrawal Queued! 🎉',
          `₹${selectedTier.amountInr} payout to "${cleanUpi}" has been recorded.\n\nYour transfer will be sent within 24 to 48 hours via UPI.`
        );
      } else {
        haptics.warning();
        Alert.alert('Insufficient Balance', 'You do not have enough coins for this tier.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shop</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111218', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: '#1C1E2A' }}>
            <Coins size={16} color="#F59E0B" />
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#F59E0B' }}>{currentCoins.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Tabs Filter: UPI Cashout | Screen Time | Boosters | Themes */}
          <View style={styles.tabBar}>
            {[
              { id: 'cashout', label: 'UPI Cashout' },
              { id: 'time', label: 'Screen Time' },
              { id: 'boosters', label: 'Boosters' },
              { id: 'themes', label: 'Themes' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => {
                    haptics.light();
                    setActiveTab(tab.id as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TAB 1: UPI CASHOUT VAULT */}
          {activeTab === 'cashout' && (
            <View style={styles.cashoutSection}>
              {/* Hero Banner */}
              <GlassCard variant="elevated" style={styles.cashoutHeroCard}>
                <View style={styles.cashoutHeroTopRow}>
                  <View style={styles.cashoutHeroIconWrap}>
                    <Wallet size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedText}>INSTANT UPI TRANSFER</Text>
                  </View>
                </View>
                <Text style={styles.cashoutHeroTitle}>Discipline Cashout Vault</Text>
                <Text style={styles.cashoutHeroSub}>
                  Convert physical workout reps & focus coins into real money transferred directly to your PhonePe, Google Pay, or Paytm.
                </Text>
              </GlassCard>

              {/* Tiers List */}
              <Text style={styles.sectionTitle}>Select Cashout Tier</Text>
              <View style={styles.cashoutGrid}>
                {CASHOUT_TIERS.map((tier) => {
                  const canAfford = currentCoins >= tier.cost;
                  return (
                    <GlassCard key={tier.id} variant="elevated" style={styles.cashoutCard}>
                      <View style={styles.cashoutCardTop}>
                        {tier.badge ? (
                          <View style={styles.tierBadge}>
                            <Text style={styles.tierBadgeText}>{tier.badge}</Text>
                          </View>
                        ) : <View />}
                        <Banknote size={20} color="#F59E0B" />
                      </View>

                      <Text style={styles.cashoutAmountText}>₹{tier.amountInr}</Text>
                      <Text style={styles.cashoutAmountSub}>Direct to any UPI ID</Text>

                      <View style={styles.cashoutDivider} />

                      <View style={styles.cashoutFooterRow}>
                        <View style={styles.coinCostWrap}>
                          <Coins size={14} color="#F59E0B" />
                          <Text style={styles.coinCostText}>{tier.cost.toLocaleString()}</Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.redeemBtn,
                            { backgroundColor: canAfford ? '#F59E0B' : '#1F212E' },
                          ]}
                          onPress={() => handleSelectCashoutTier(tier)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.redeemBtnText,
                              { color: canAfford ? '#000000' : '#8E8E93' },
                            ]}
                          >
                            REDEEM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>

              {/* Cashout History */}
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Withdrawal History</Text>
                {payoutHistory.length === 0 ? (
                  <GlassCard style={styles.emptyHistoryCard}>
                    <Text style={styles.emptyHistoryTitle}>No withdrawal requests yet</Text>
                    <Text style={styles.emptyHistorySub}>
                      Complete physical workouts to earn coins and request your first UPI transfer!
                    </Text>
                  </GlassCard>
                ) : (
                  payoutHistory.map((item) => {
                    const isPaid = item.status === 'PAID';
                    const isRejected = item.status === 'REJECTED';
                    return (
                      <GlassCard key={item.id} style={styles.historyItemCard}>
                        <View style={styles.historyLeft}>
                          <Text style={styles.historyAmount}>₹{item.amountInr} UPI Transfer</Text>
                          <Text style={styles.historyUpi}>{item.upiId}</Text>
                          <Text style={styles.historyDate}>
                            {new Date(item.createdAt).toLocaleDateString()} • {item.coinsSpent.toLocaleString()} Coins
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: isPaid
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isRejected
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                              borderColor: isPaid
                                ? '#10B981'
                                : isRejected
                                ? '#EF4444'
                                : '#F59E0B',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              {
                                color: isPaid
                                  ? '#10B981'
                                  : isRejected
                                  ? '#EF4444'
                                  : '#F59E0B',
                              },
                            ]}
                          >
                            {isPaid ? 'PAID ✅' : isRejected ? 'REFUNDED ❌' : 'PENDING ⏳'}
                          </Text>
                        </View>
                      </GlassCard>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* TAB 2: SCREEN TIME PASSES */}
          {activeTab === 'time' && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Screen Time Passes</Text>
              </View>

              <View style={styles.itemsList}>
                {timeUnlockList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handlePurchase(item)}
                    activeOpacity={0.8}
                  >
                    <GlassCard style={styles.shopItemCard}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemIconCircle}>
                          <Clock size={22} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemDesc}>{item.desc}</Text>
                        </View>
                      </View>

                      <View style={styles.priceChip}>
                        <Coins size={13} color={colors.primary} strokeWidth={2.5} />
                        <Text style={styles.priceChipText}>{item.cost}</Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* TAB 3: BOOSTERS */}
          {activeTab === 'boosters' && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Game Boosters</Text>
              </View>

              <View style={styles.itemsList}>
                {boostersList.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handlePurchase(item)}
                      activeOpacity={0.8}
                    >
                      <GlassCard style={styles.shopItemCard}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconCircle}>
                            <IconComp size={22} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemDesc}>{item.desc}</Text>
                          </View>
                        </View>

                        <View style={styles.priceChip}>
                          <Coins size={13} color={colors.primary} strokeWidth={2.5} />
                          <Text style={styles.priceChipText}>{item.cost}</Text>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 4: THEMES & AVATARS */}
          {activeTab === 'themes' && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>Themes & Avatars</Text>
              <View style={styles.itemsList}>
                {[...themesList, ...avatarsList].map((item) => {
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handlePurchase(item)}
                      activeOpacity={0.8}
                    >
                      <GlassCard style={styles.shopItemCard}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconCircle}>
                            <IconComp size={22} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemDesc}>{item.desc}</Text>
                          </View>
                        </View>

                        <View style={styles.priceChip}>
                          <Coins size={13} color={colors.primary} strokeWidth={2.5} />
                          <Text style={styles.priceChipText}>{item.cost}</Text>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Purchase Success Modal */}
        <Modal
          visible={!!successItem}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSuccessItem(null)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard variant="glow" style={styles.dialogCard}>
              <View style={styles.dialogIconCircle}>
                <CheckCircle2 size={36} color={colors.primary} />
              </View>
              <Text style={styles.dialogTitle}>Unlocked & Active!</Text>
              <Text style={styles.dialogDesc}>
                {successItem?.name} has been activated on your device.
              </Text>
              <GlassButton
                title="DONE"
                onPress={() => setSuccessItem(null)}
                variant="primary"
                style={{ width: '100%', marginTop: 8 }}
              />
            </GlassCard>
          </View>
        </Modal>

        {/* Insufficient Coins Modal */}
        <Modal
          visible={!!insufficientItem}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setInsufficientItem(null)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.dialogCard}>
              <View style={[styles.dialogIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <AlertCircle size={36} color={colors.danger} />
              </View>
              <Text style={styles.dialogTitle}>Insufficient Coins</Text>
              <Text style={styles.dialogDesc}>
                You need {insufficientItem?.cost} Coins (Balance: {currentCoins}). Complete push-ups or focus sessions to earn more!
              </Text>
              <GlassButton
                title="EARN COINS"
                onPress={() => {
                  setInsufficientItem(null);
                  router.push('/(tabs)/quests');
                }}
                variant="primary"
                style={{ width: '100%', marginTop: 8 }}
              />
            </GlassCard>
          </View>
        </Modal>

        {/* UPI Cashout Input Modal */}
        <Modal
          visible={isUpiModalOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsUpiModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard variant="elevated" style={styles.upiModalCard}>
              <View style={styles.upiModalHeader}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.upiModalTitle}>
                    Redeem ₹{selectedTier?.amountInr} UPI Transfer
                  </Text>
                  <Text style={styles.upiModalSub}>
                    Cost: {selectedTier?.cost.toLocaleString()} Coins
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsUpiModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>ENTER YOUR UPI ID</Text>
              <TextInput
                style={styles.upiTextInput}
                placeholder="e.g. 9876543210@paytm or name@upi"
                placeholderTextColor="#64748B"
                value={upiInput}
                onChangeText={setUpiInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.upiDisclaimer}>
                ⚡ Money is transferred directly to your bank account via UPI within 24 to 48 hours. Ensure your UPI ID is accurate.
              </Text>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsUpiModalOpen(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { opacity: isSubmittingPayout ? 0.6 : 1 }]}
                  onPress={handleConfirmWithdrawal}
                  disabled={isSubmittingPayout}
                >
                  <Text style={styles.modalConfirmText}>
                    {isSubmittingPayout ? 'Submitting...' : 'CONFIRM WITHDRAWAL'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
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
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
    paddingTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1E2A',
    paddingBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabBtnActive: {},
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -5,
    height: 2,
    width: '60%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
  },
  featuredLeft: {
    flex: 1,
    gap: 4,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  featuredBonus: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  featuredDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginVertical: 4,
  },
  featuredPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  featuredPriceText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#050505',
  },
  featuredArtworkWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionWrap: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  itemsList: {
    gap: 10,
  },
  shopItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  itemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111218',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  itemDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111218',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  priceChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
  },
  dialogIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  dialogDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  cashoutSection: {
    gap: 16,
  },
  cashoutHeroCard: {
    padding: 20,
    borderRadius: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: '#121118',
  },
  cashoutHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashoutHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  cashoutHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cashoutHeroSub: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 17,
  },
  cashoutGrid: {
    gap: 12,
  },
  cashoutCard: {
    padding: 18,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    backgroundColor: '#111218',
  },
  cashoutCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  cashoutAmountText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cashoutAmountSub: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  cashoutDivider: {
    height: 1,
    backgroundColor: '#1C1E2A',
    marginVertical: 4,
  },
  cashoutFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  coinCostWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinCostText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F59E0B',
  },
  redeemBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  redeemBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  historySection: {
    gap: 10,
    marginTop: 8,
  },
  emptyHistoryCard: {
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyHistorySub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },
  historyItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  historyLeft: {
    flex: 1,
    gap: 3,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  historyUpi: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 10,
    color: '#555866',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  upiModalCard: {
    width: '100%',
    padding: 22,
    borderRadius: 24,
    gap: 14,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#232638',
  },
  upiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  upiModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  upiModalSub: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  upiTextInput: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#232638',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  upiDisclaimer: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1A1C28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
