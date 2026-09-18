import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Coins,
  QrCode,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Shield,
  History,
  Gift,
  Play,
  ArrowRightLeft,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Lock,
  AlertTriangle,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { crystalRepository, CrystalRedemptionItem } from '../../src/database/repositories/crystalRepository';
import { coinService } from '../../src/services/coinService';
import { gateSpawnService } from '../../src/services/gateSpawnService';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { useTheme } from '../../src/hooks/useTheme';

const CRYSTALS_PER_INR = 10; // 10 Mana Crystals = ₹1.00 INR
const MIN_CASHOUT_INR = 25;
const MAX_CASHOUT_INR = 2000;
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}$/;
const POPULAR_UPI_HANDLES = ['@okhdfcbank', '@okicici', '@oksbi', '@paytm', '@ybl', '@axl'];

interface QuickTier {
  inr: number;
  label?: string;
}

const CASHOUT_TIERS: QuickTier[] = [
  { inr: 25, label: 'MIN' },
  { inr: 50 },
  { inr: 100 },
  { inr: 250 },
  { inr: 500 },
  { inr: 1000, label: 'MAX' },
];

export default function RedeemScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();
  const { colors, isDark } = useTheme();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [manaBalance, setManaBalance] = useState<number>(0);
  const [activeMethod, setActiveMethod] = useState<'UPI' | 'AMAZON' | 'GOOGLE_PLAY' | 'COINS'>('UPI');
  const [selectedInr, setSelectedInr] = useState<number>(50);
  const [customInrInput, setCustomInrInput] = useState<string>('50');
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [confirmDestinationInput, setConfirmDestinationInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<CrystalRedemptionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'redeem' | 'history'>('redeem');

  // Security Verification Dialog State
  const [securityModalVisible, setSecurityModalVisible] = useState<boolean>(false);
  const [securityAgreed, setSecurityAgreed] = useState<boolean>(false);

  // System Notification Dialog
  const [systemModal, setSystemModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const loadCrystalData = useCallback(async () => {
    try {
      await loadProfile();
      const bal = await crystalRepository.getBalance();
      setManaBalance(bal);
      const hist = await crystalRepository.getRedemptions();
      setHistoryList(hist);
    } catch (e) {
      console.warn('Failed to load crystal redemption data:', e);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadCrystalData();
  }, [loadCrystalData]);

  const crystalsRequired = selectedInr * CRYSTALS_PER_INR;
  const hasEnoughCrystals = manaBalance >= crystalsRequired;

  const handleSelectTier = (inr: number) => {
    haptics.light();
    setSelectedInr(inr);
    setCustomInrInput(String(inr));
  };

  const handleCustomInrChange = (val: string) => {
    setCustomInrInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedInr(parsed);
    }
  };

  const handleSelectHandleChip = (handle: string) => {
    haptics.light();
    const current = destinationInput.trim();
    if (!current) {
      setDestinationInput(`hunter${handle}`);
      return;
    }
    if (current.includes('@')) {
      const prefix = current.split('@')[0];
      setDestinationInput(`${prefix}${handle}`);
    } else {
      setDestinationInput(`${current}${handle}`);
    }
  };

  // Step 1: Pre-validation before showing Security Confirmation Modal
  const handleInitiateCashout = async () => {
    if (selectedInr < MIN_CASHOUT_INR) {
      haptics.warning();
      setSystemModal({
        visible: true,
        title: 'LIMIT ERROR',
        message: `Minimum cashout threshold is ₹${MIN_CASHOUT_INR} INR (${MIN_CASHOUT_INR * CRYSTALS_PER_INR} Mana Crystals).`,
        type: 'danger',
      });
      return;
    }

    if (selectedInr > MAX_CASHOUT_INR) {
      haptics.warning();
      setSystemModal({
        visible: true,
        title: 'LIMIT ERROR',
        message: `Maximum single extraction limit is ₹${MAX_CASHOUT_INR} INR.`,
        type: 'danger',
      });
      return;
    }

    if (!hasEnoughCrystals) {
      haptics.warning();
      setSystemModal({
        visible: true,
        title: 'INSUFFICIENT MANA CRYSTALS',
        message: `You require ${crystalsRequired.toLocaleString()} Mana Crystals for ₹${selectedInr} INR. Current balance is ${manaBalance.toLocaleString()} Crystals. Raid more Dungeon Gates to extract crystals!`,
        type: 'danger',
      });
      return;
    }

    // Anti-cheat verification: Verify user completed at least 1 legitimate gate recon mission
    if (activeMethod !== 'COINS') {
      const completedMissions = await gateSpawnService.getCompletedMissionsCount();
      if (completedMissions === 0) {
        haptics.warning();
        setSystemModal({
          visible: true,
          title: 'SECURITY CLEARANCE REQUIRED',
          message:
            'Zero verified Dungeon Recon missions detected on this device. Under Hunter Association security regulations, Mana Crystals can only be liquidated after completing authentic gate inquests. Clear at least 1 Dungeon Gate mission to verify your account.',
          type: 'danger',
        });
        return;
      }
    }

    const finalDest = destinationInput.trim();
    const confirmDest = confirmDestinationInput.trim();

    if (activeMethod === 'UPI') {
      if (!UPI_REGEX.test(finalDest)) {
        haptics.warning();
        setSystemModal({
          visible: true,
          title: 'INVALID UPI ID FORMAT',
          message: 'Please enter a valid UPI VPA address in the format: username@bank (e.g. hunter@okhdfcbank or 9876543210@paytm).',
          type: 'danger',
        });
        return;
      }

      if (finalDest.toLowerCase() !== confirmDest.toLowerCase()) {
        haptics.warning();
        setSystemModal({
          visible: true,
          title: 'UPI ADDRESS MISMATCH',
          message: 'Primary UPI ID and Confirmation UPI ID do not match. Please ensure both fields are identical to prevent financial loss.',
          type: 'danger',
        });
        return;
      }
    } else if (activeMethod === 'AMAZON' || activeMethod === 'GOOGLE_PLAY') {
      if (!finalDest.includes('@') && finalDest.length < 10) {
        haptics.warning();
        setSystemModal({
          visible: true,
          title: 'INVALID DESTINATION',
          message: 'Please provide a valid delivery Email Address or 10-digit Phone Number.',
          type: 'danger',
        });
        return;
      }
    }

    // If Coins exchange, skip modal and execute immediately
    if (activeMethod === 'COINS') {
      handleExecuteCashout();
      return;
    }

    // Open Security Confirmation Modal
    haptics.medium();
    sound.play('unlock');
    setSecurityAgreed(false);
    setSecurityModalVisible(true);
  };

  // Step 2: Final Authorized Cashout Execution
  const handleExecuteCashout = async () => {
    setSecurityModalVisible(false);
    let finalDest = destinationInput.trim().toLowerCase();
    if (activeMethod === 'COINS') {
      finalDest = 'Hunter System Vault';
    }

    setIsSubmitting(true);
    haptics.heavy();
    sound.play('quest_complete');

    try {
      const result = await crystalRepository.requestRedemption({
        amountInr: selectedInr,
        crystalsSpent: crystalsRequired,
        method: activeMethod,
        destination: finalDest,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit extraction');
      }

      // If instant coin exchange, credit coins immediately
      if (activeMethod === 'COINS') {
        const coinsAwarded = selectedInr * 100; // ₹1 INR = 100 Coins
        await coinService.addCoins(coinsAwarded, `Converted ${crystalsRequired} Crystals`, 'crystal_exchange');
      }

      sound.play('purchase');
      haptics.success();
      await loadCrystalData();

      setSystemModal({
        visible: true,
        title: activeMethod === 'COINS' ? 'EXCHANGE COMPLETE' : 'CASHOUT REQUEST SUBMITTED',
        message:
          activeMethod === 'COINS'
            ? `Successfully converted ${crystalsRequired.toLocaleString()} Mana Crystals into ${(selectedInr * 100).toLocaleString()} Coins!`
            : `Extraction of ₹${selectedInr} INR initiated via ${activeMethod} to ${finalDest}. Dispatch verification completes within 24-48 hours.`,
        type: 'success',
      });

      setDestinationInput('');
      setConfirmDestinationInput('');
    } catch (e: any) {
      haptics.warning();
      setSystemModal({
        visible: true,
        title: 'TRANSACTION FAILED',
        message: e?.message || 'Failed to process mana crystal extraction. Please try again.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTag}>MONETIZATION PROTOCOL</Text>
          <Text style={styles.headerTitle}>MANA CRYSTAL VAULT</Text>
        </View>

        <View style={styles.crystalCapsule}>
          <ManaCrystalIcon size={16} color="#00D2EE" secondaryColor="#0284C7" />
          <Text style={styles.crystalCountText}>{manaBalance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Dual Tabs: [CASHOUT VAULT] vs [REQUEST HISTORY] */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'redeem' && styles.tabBtnActive]}
          onPress={() => {
            haptics.light();
            setActiveTab('redeem');
          }}
          activeOpacity={0.8}
        >
          <Zap size={14} color={activeTab === 'redeem' ? '#00D2EE' : '#8E8E93'} />
          <Text style={[styles.tabBtnText, activeTab === 'redeem' && styles.tabBtnTextActive]}>
            CASHOUT VAULT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => {
            haptics.light();
            setActiveTab('history');
          }}
          activeOpacity={0.8}
        >
          <History size={14} color={activeTab === 'history' ? '#00D2EE' : '#8E8E93'} />
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            HISTORY ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'redeem' ? (
          <>
            {/* Mana Crystal Balance Card */}
            <View style={styles.balanceHeroCard}>
              <View style={styles.balanceIconRow}>
                <ManaCrystalIcon size={38} color="#00D2EE" secondaryColor="#0284C7" />
                <View>
                  <Text style={styles.balanceSub}>TOTAL MINED MANA CRYSTALS</Text>
                  <Text style={styles.balanceMain}>{manaBalance.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.balanceDivider} />

              <View style={styles.exchangeRateRow}>
                <View style={styles.rateCol}>
                  <Text style={styles.rateLabel}>EXCHANGE RATE</Text>
                  <Text style={styles.rateValue}>10 Crystals = ₹1.00 INR</Text>
                </View>
                <View style={styles.rateCol}>
                  <Text style={styles.rateLabel}>ESTIMATED VALUE</Text>
                  <Text style={[styles.rateValue, { color: '#00D2EE' }]}>
                    ₹{(manaBalance / CRYSTALS_PER_INR).toFixed(2)} INR
                  </Text>
                </View>
              </View>
            </View>

            {/* Method Selector */}
            <Text style={styles.sectionHeader}>SELECT CASHOUT GATEWAY</Text>
            <View style={styles.methodGrid}>
              <TouchableOpacity
                style={[styles.methodCard, activeMethod === 'UPI' && styles.methodCardActive]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('UPI');
                }}
                activeOpacity={0.8}
              >
                <QrCode size={22} color={activeMethod === 'UPI' ? '#00D2EE' : '#8E8E93'} />
                <Text style={[styles.methodTitle, activeMethod === 'UPI' && styles.methodTitleActive]}>
                  DIRECT UPI
                </Text>
                <Text style={styles.methodSub}>GPay / PhonePe / Paytm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, activeMethod === 'AMAZON' && styles.methodCardActive]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('AMAZON');
                }}
                activeOpacity={0.8}
              >
                <Gift size={22} color={activeMethod === 'AMAZON' ? '#F59E0B' : '#8E8E93'} />
                <Text style={[styles.methodTitle, activeMethod === 'AMAZON' && styles.methodTitleActive]}>
                  AMAZON PAY
                </Text>
                <Text style={styles.methodSub}>Gift Voucher Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, activeMethod === 'GOOGLE_PLAY' && styles.methodCardActive]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('GOOGLE_PLAY');
                }}
                activeOpacity={0.8}
              >
                <Play size={22} color={activeMethod === 'GOOGLE_PLAY' ? '#10B981' : '#8E8E93'} />
                <Text style={[styles.methodTitle, activeMethod === 'GOOGLE_PLAY' && styles.methodTitleActive]}>
                  GOOGLE PLAY
                </Text>
                <Text style={styles.methodSub}>Recharge Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, activeMethod === 'COINS' && styles.methodCardActive]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('COINS');
                }}
                activeOpacity={0.8}
              >
                <Coins size={22} color={activeMethod === 'COINS' ? '#F59E0B' : '#8E8E93'} />
                <Text style={[styles.methodTitle, activeMethod === 'COINS' && styles.methodTitleActive]}>
                  EXCHANGE COINS
                </Text>
                <Text style={styles.methodSub}>Instant 1:10 System Coins</Text>
              </TouchableOpacity>
            </View>

            {/* Cashout Amount Selection */}
            <Text style={styles.sectionHeader}>SELECT AMOUNT (INR)</Text>
            <View style={styles.tiersGrid}>
              {CASHOUT_TIERS.map((tier) => {
                const isSelected = selectedInr === tier.inr;
                const cost = tier.inr * CRYSTALS_PER_INR;
                const canAfford = manaBalance >= cost;

                return (
                  <TouchableOpacity
                    key={tier.inr}
                    style={[
                      styles.tierBtn,
                      isSelected && styles.tierBtnSelected,
                      !canAfford && styles.tierBtnDisabled,
                    ]}
                    onPress={() => handleSelectTier(tier.inr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tierInrText, isSelected && styles.tierInrTextSelected]}>
                      ₹{tier.inr}
                    </Text>
                    <View style={styles.tierCostRow}>
                      <ManaCrystalIcon size={12} color={isSelected ? '#00D2EE' : '#8E8E93'} secondaryColor="#0284C7" />
                      <Text style={[styles.tierCostText, isSelected && styles.tierCostTextSelected]}>
                        {cost}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Amount Input */}
            <View style={styles.customAmountBox}>
              <Text style={styles.customAmountLabel}>CUSTOM AMOUNT (₹{MIN_CASHOUT_INR} - ₹{MAX_CASHOUT_INR}):</Text>
              <View style={styles.customInputRow}>
                <Text style={styles.rupeePrefix}>₹</Text>
                <TextInput
                  style={styles.customTextInput}
                  value={customInrInput}
                  onChangeText={handleCustomInrChange}
                  keyboardType="numeric"
                  placeholder="50"
                  placeholderTextColor="#475569"
                />
                <View style={styles.customCostBadge}>
                  <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                  <Text style={styles.customCostText}>{crystalsRequired.toLocaleString()} Crystals</Text>
                </View>
              </View>
            </View>

            {/* Destination Input (unless Coins) */}
            {activeMethod !== 'COINS' && (
              <View style={styles.destBox}>
                <View style={styles.destHeaderRow}>
                  <Text style={styles.destLabel}>
                    {activeMethod === 'UPI'
                      ? 'RECEIVING UPI ID / VPA ADDRESS:'
                      : activeMethod === 'AMAZON'
                      ? 'DELIVERY EMAIL OR PHONE FOR AMAZON VOUCHER:'
                      : 'DELIVERY EMAIL OR PHONE FOR GOOGLE PLAY CODE:'}
                  </Text>
                  {activeMethod === 'UPI' && destinationInput.trim().length > 0 && (
                    <View
                      style={[
                        styles.vpaStatusBadge,
                        UPI_REGEX.test(destinationInput.trim())
                          ? styles.vpaStatusBadgeValid
                          : styles.vpaStatusBadgeInvalid,
                      ]}
                    >
                      {UPI_REGEX.test(destinationInput.trim()) ? (
                        <>
                          <Check size={10} color="#10B981" />
                          <Text style={styles.vpaStatusTextValid}>VALID FORMAT</Text>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={10} color="#EF4444" />
                          <Text style={styles.vpaStatusTextInvalid}>INVALID VPA</Text>
                        </>
                      )}
                    </View>
                  )}
                </View>

                <TextInput
                  style={styles.destInput}
                  value={destinationInput}
                  onChangeText={setDestinationInput}
                  placeholder={
                    activeMethod === 'UPI'
                      ? 'e.g. hunter@okhdfcbank'
                      : 'e.g. hunter@gmail.com / 9876543210'
                  }
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Popular UPI Handles Fast-Fill Chips */}
                {activeMethod === 'UPI' && (
                  <View style={styles.chipsContainer}>
                    <Text style={styles.chipsLabel}>FAST-SELECT BANK HANDLE:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                      {POPULAR_UPI_HANDLES.map((handle) => (
                        <TouchableOpacity
                          key={handle}
                          style={styles.chipBtn}
                          onPress={() => handleSelectHandleChip(handle)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.chipText}>{handle}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Confirm UPI ID Field */}
                {activeMethod === 'UPI' && (
                  <View style={{ marginTop: 14 }}>
                    <View style={styles.destHeaderRow}>
                      <Text style={styles.destLabel}>CONFIRM RECEIVING UPI ID:</Text>
                      {confirmDestinationInput.trim().length > 0 && (
                        <View
                          style={[
                            styles.vpaStatusBadge,
                            destinationInput.trim().toLowerCase() === confirmDestinationInput.trim().toLowerCase()
                              ? styles.vpaStatusBadgeValid
                              : styles.vpaStatusBadgeInvalid,
                          ]}
                        >
                          {destinationInput.trim().toLowerCase() === confirmDestinationInput.trim().toLowerCase() ? (
                            <>
                              <Check size={10} color="#10B981" />
                              <Text style={styles.vpaStatusTextValid}>MATCHED</Text>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={10} color="#EF4444" />
                              <Text style={styles.vpaStatusTextInvalid}>MISMATCH</Text>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.destInput}
                      value={confirmDestinationInput}
                      onChangeText={setConfirmDestinationInput}
                      placeholder="Re-enter identical UPI address to confirm"
                      placeholderTextColor="#475569"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Extraction Action Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!hasEnoughCrystals || isSubmitting) && styles.submitBtnDisabled,
              ]}
              onPress={handleInitiateCashout}
              disabled={isSubmitting || !hasEnoughCrystals}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <ManaCrystalIcon size={18} color="#000000" secondaryColor="#0284C7" />
                  <Text style={styles.submitBtnText}>
                    {activeMethod === 'COINS'
                      ? `CONVERT FOR ${crystalsRequired.toLocaleString()} CRYSTALS`
                      : `REQUEST CASHOUT (₹${selectedInr} INR)`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.guaranteeRow}>
              <Shield size={13} color="#00D2EE" />
              <Text style={styles.guaranteeText}>
                Encrypted Transaction // Payout verified and dispatched within 24-48 hours
              </Text>
            </View>
          </>
        ) : (
          /* Request History Tab */
          <View style={styles.historyContainer}>
            {historyList.length === 0 ? (
              <View style={styles.emptyHistory}>
                <History size={40} color="#334155" />
                <Text style={styles.emptyHistoryTitle}>NO CASHOUT REQUESTS FOUND</Text>
                <Text style={styles.emptyHistorySub}>
                  Complete Recon Inquests in Dungeon Gates to mine Mana Crystals and initiate your first real withdrawal.
                </Text>
              </View>
            ) : (
              historyList.map((item) => {
                const isPaid = item.status === 'PAID';
                const isPending = item.status === 'PENDING';
                const isRejected = item.status === 'REJECTED';

                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyCardTop}>
                      <View style={styles.historyMethodBadge}>
                        <Text style={styles.historyMethodText}>{item.method}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isPaid && styles.statusBadgePaid,
                          isPending && styles.statusBadgePending,
                          isRejected && styles.statusBadgeRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isPaid && { color: '#10B981' },
                            isPending && { color: '#F59E0B' },
                            isRejected && { color: '#EF4444' },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyMainRow}>
                      <View>
                        <Text style={styles.historyInrText}>₹{item.amountInr} INR</Text>
                        <Text style={styles.historyDestText} numberOfLines={1}>
                          To: {item.destination}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ManaCrystalIcon size={12} color="#00D2EE" secondaryColor="#0284C7" />
                          <Text style={styles.historySpentText}>-{item.crystalsSpent}</Text>
                        </View>
                        <Text style={styles.historyDateText}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Hunter Security Authorization Modal (Pre-Cashout Anti-Fraud Audit) */}
      <Modal visible={securityModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.securityCard}>
              <View style={styles.securityHeaderRow}>
                <ShieldCheck size={20} color="#00D2EE" />
                <View>
                  <Text style={styles.securityTag}>[ SYSTEM SECURITY PROTOCOL ]</Text>
                  <Text style={styles.securityTitle}>CASHOUT AUTHORIZATION</Text>
                </View>
              </View>

              {/* Transaction Summary Box */}
              <View style={styles.securitySummaryBox}>
                <View style={styles.securitySummaryRow}>
                  <Text style={styles.securitySummaryLabel}>HUNTER:</Text>
                  <Text style={styles.securitySummaryVal}>
                    {profile?.displayName || 'Hunter'} (Lv. {profile?.level || 1})
                  </Text>
                </View>
                <View style={styles.securitySummaryRow}>
                  <Text style={styles.securitySummaryLabel}>CASHOUT AMOUNT:</Text>
                  <Text style={[styles.securitySummaryVal, { color: '#10B981', fontWeight: '900' }]}>
                    ₹{selectedInr} INR
                  </Text>
                </View>
                <View style={styles.securitySummaryRow}>
                  <Text style={styles.securitySummaryLabel}>CRYSTALS TO BURN:</Text>
                  <Text style={[styles.securitySummaryVal, { color: '#00D2EE' }]}>
                    {crystalsRequired.toLocaleString()} Crystals
                  </Text>
                </View>
                <View style={styles.securitySummaryRow}>
                  <Text style={styles.securitySummaryLabel}>PAYOUT DESTINATION:</Text>
                  <Text style={[styles.securitySummaryVal, { color: '#F59E0B' }]} numberOfLines={1}>
                    {destinationInput.trim().toLowerCase()}
                  </Text>
                </View>
              </View>

              {/* Anti-Fraud Telemetry Notice */}
              <View style={styles.securityNoticeBox}>
                <AlertTriangle size={15} color="#F59E0B" style={{ marginTop: 2 }} />
                <Text style={styles.securityNoticeText}>
                  ANTI-FRAUD AUDIT: Payouts are dispatched directly via IMPS to this verified address. Accounts flagged for automated bots, glitch abuse, or simulated telemetry will be permanently blacklisted.
                </Text>
              </View>

              {/* Agreement Checkbox */}
              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => {
                  haptics.light();
                  setSecurityAgreed((prev) => !prev);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, securityAgreed && styles.checkboxBoxChecked]}>
                  {securityAgreed && <Check size={14} color="#000000" />}
                </View>
                <Text style={styles.agreementText}>
                  I certify that this {activeMethod} destination belongs to me and authorize burning {crystalsRequired.toLocaleString()} Mana Crystals.
                </Text>
              </TouchableOpacity>

              {/* Modal Action Buttons */}
              <View style={styles.securityBtnRow}>
                <TouchableOpacity
                  style={styles.securityCancelBtn}
                  onPress={() => {
                    haptics.light();
                    setSecurityModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.securityCancelBtnText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.securityConfirmBtn,
                    !securityAgreed && styles.securityConfirmBtnDisabled,
                  ]}
                  onPress={handleExecuteCashout}
                  disabled={!securityAgreed}
                  activeOpacity={0.85}
                >
                  <ShieldCheck size={16} color={securityAgreed ? '#000000' : '#64748B'} />
                  <Text
                    style={[
                      styles.securityConfirmBtnText,
                      !securityAgreed && { color: '#64748B' },
                    ]}
                  >
                    AUTHORIZE & CASHOUT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* System Alert Dialog Modal */}
      <Modal visible={systemModal.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View
              style={[
                styles.modalCard,
                systemModal.type === 'success' && { borderColor: '#00D2EE' },
                systemModal.type === 'danger' && { borderColor: '#EF4444' },
              ]}
            >
              <View style={styles.modalTagRow}>
                {systemModal.type === 'success' ? (
                  <CheckCircle2 size={16} color="#00D2EE" />
                ) : (
                  <AlertCircle size={16} color="#EF4444" />
                )}
                <Text
                  style={[
                    styles.modalTagText,
                    systemModal.type === 'success' ? { color: '#00D2EE' } : { color: '#EF4444' },
                  ]}
                >
                  [ SYSTEM NOTICE // {systemModal.title} ]
                </Text>
              </View>

              <Text style={styles.modalSub}>{systemModal.message}</Text>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  systemModal.type === 'success' ? { backgroundColor: '#00D2EE' } : { backgroundColor: '#1E293B' },
                ]}
                onPress={() => setSystemModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.modalConfirmBtnText,
                    systemModal.type === 'success' ? { color: '#000000' } : { color: '#FFFFFF' },
                  ]}
                >
                  ACKNOWLEDGE
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  crystalCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#082f49',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  crystalCountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00D2EE',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0B0D14',
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  tabBtnActive: {
    backgroundColor: '#082f49',
    borderColor: '#00D2EE',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: '#00D2EE',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  balanceHeroCard: {
    backgroundColor: '#061320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0284C7',
    padding: 16,
    marginBottom: 18,
  },
  balanceIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  balanceSub: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  balanceMain: {
    fontSize: 30,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#0E3A5A',
    marginVertical: 14,
  },
  exchangeRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateCol: {},
  rateLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  methodCard: {
    width: '48%',
    backgroundColor: '#0B0D14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 12,
  },
  methodCardActive: {
    backgroundColor: '#082f49',
    borderColor: '#00D2EE',
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  methodTitleActive: {
    color: '#00D2EE',
  },
  methodSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  tiersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tierBtn: {
    width: '31%',
    backgroundColor: '#0B0D14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBtnSelected: {
    backgroundColor: '#082f49',
    borderColor: '#00D2EE',
  },
  tierBtnDisabled: {
    opacity: 0.4,
  },
  tierInrText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tierInrTextSelected: {
    color: '#00D2EE',
  },
  tierCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  tierCostText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  tierCostTextSelected: {
    color: '#00D2EE',
  },
  customAmountBox: {
    backgroundColor: '#0B0D14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 12,
    marginBottom: 14,
  },
  customAmountLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeePrefix: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00D2EE',
    marginRight: 6,
  },
  customTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    paddingVertical: 4,
  },
  customCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#082f49',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customCostText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00D2EE',
  },
  destBox: {
    backgroundColor: '#0B0D14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 12,
    marginBottom: 18,
  },
  destLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
  },
  destInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D2EE',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  guaranteeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  historyContainer: {
    gap: 10,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
    marginTop: 12,
  },
  emptyHistorySub: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#0B0D14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 14,
  },
  historyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyMethodBadge: {
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyMethodText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePaid: {
    backgroundColor: '#064e3b',
  },
  statusBadgePending: {
    backgroundColor: '#78350f',
  },
  statusBadgeRejected: {
    backgroundColor: '#7f1d1d',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  historyMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  historyInrText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  historyDestText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 180,
  },
  historySpentText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00D2EE',
  },
  historyDateText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSafe: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#0B0D14',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1C1E2A',
    padding: 20,
  },
  modalTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalTagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSub: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalConfirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Enhanced UPI Validation & Chips
  destHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vpaStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  vpaStatusBadgeValid: {
    backgroundColor: '#064e3b',
    borderColor: '#10B981',
  },
  vpaStatusBadgeInvalid: {
    backgroundColor: '#7f1d1d',
    borderColor: '#EF4444',
  },
  vpaStatusTextValid: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  vpaStatusTextInvalid: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  chipsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D2EE',
  },
  // Security Modal Styles
  securityCard: {
    backgroundColor: '#080C14',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    padding: 20,
    shadowColor: '#00D2EE',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  securityTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  securitySummaryBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  securitySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securitySummaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  securitySummaryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    maxWidth: '65%',
  },
  securityNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#271A06',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 10,
    marginBottom: 14,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 10,
    color: '#FEF3C7',
    lineHeight: 15,
    fontWeight: '600',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#00D2EE',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#00D2EE',
  },
  agreementText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  securityBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  securityCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  securityCancelBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  securityConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#00D2EE',
  },
  securityConfirmBtnDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.6,
  },
  securityConfirmBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
});
