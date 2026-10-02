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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Coins,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Shield,
  History,
  Gift,
  Play,
  Check,
  ChevronRight,
  ShieldCheck,
  Lock,
  User,
  AlertTriangle,
} from 'lucide-react-native';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { crystalRepository, CrystalRedemptionItem } from '../../src/database/repositories/crystalRepository';
import { coinService } from '../../src/services/coinService';
import { gateSpawnService } from '../../src/services/gateSpawnService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { useTheme } from '../../src/hooks/useTheme';
import { fontFamilies } from '../../src/theme/typography';
import { APP_3D_ASSETS } from '../../src/constants/assets';

const CRYSTALS_PER_INR = 10; // 10 Mana Crystals = ₹1.00 INR
const MIN_CASHOUT_INR = 25;
const MAX_CASHOUT_INR = 2000;
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}$/;
const POPULAR_UPI_HANDLES = ['@okhdfcbank', '@okicici', '@oksbi', '@paytm', '@ybl', '@axl'];

interface QuickTier {
  inr: number;
}

const CASHOUT_TIERS: QuickTier[] = [
  { inr: 25 },
  { inr: 50 },
  { inr: 100 },
  { inr: 250 },
  { inr: 500 },
  { inr: 1000 },
];

export default function RedeemScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();
  const { colors, isDark } = useTheme();

  // Active theme accents:
  // In Dark mode: Coral / Crimson Red (#EF4444) matches dark mode screenshot 1:1
  // In Light mode: Royal Electric Blue (#0A84FF) matches light mode screenshot 1:1
  const activeAccent = isDark ? '#EF4444' : '#0A84FF';
  const activeAccentBg = isDark ? 'rgba(239, 68, 68, 0.12)' : '#F0F7FF';
  const activeAccentBorder = isDark ? '#EF4444' : '#0A84FF';

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [manaBalance, setManaBalance] = useState<number>(0);
  const [activeMethod, setActiveMethod] = useState<'UPI' | 'AMAZON' | 'GOOGLE_PLAY' | 'COINS'>('UPI');
  const [selectedInr, setSelectedInr] = useState<number>(50);
  const [customInrInput, setCustomInrInput] = useState<string>('50');
  const [destinationInput, setDestinationInput] = useState<string>('hunter@okhdfcbank');
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

    // Anti-cheat verification
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

      if (confirmDest.length > 0 && finalDest.toLowerCase() !== confirmDest.toLowerCase()) {
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

    if (activeMethod === 'COINS') {
      handleExecuteCashout();
      return;
    }

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

      setDestinationInput('hunter@okhdfcbank');
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
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#07080D' : colors.background },
      ]}
      edges={['top', 'bottom']}
    >
      {/* 1. TOP HEADER (1:1 with Screenshot) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? '#161822' : colors.card,
              borderColor: isDark ? '#232738' : colors.border,
            },
          ]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={19} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerProtocol, { color: isDark ? '#71788E' : colors.textSecondary }]}>
            MONETIZATION PROTOCOL
          </Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mana Crystal Vault</Text>
        </View>

        <View
          style={[
            styles.crystalCapsule,
            {
              backgroundColor: isDark ? '#161822' : colors.card,
              borderColor: isDark ? '#232738' : colors.border,
            },
          ]}
        >
          <Image source={APP_3D_ASSETS.manaCrystal} style={{ width: 17, height: 17 }} resizeMode="contain" />
          <Text style={[styles.crystalCapsuleCount, { color: isDark ? '#38BDF8' : '#0A84FF' }]}>
            {manaBalance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 2. DUAL SEGMENT TABS ([Cashout Vault] vs [History]) */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabSegmentWrap, { backgroundColor: isDark ? '#13151F' : '#F1F3F9' }]}>
          <TouchableOpacity
            style={[
              styles.tabSegmentBtn,
              activeTab === 'redeem' && [
                styles.tabSegmentBtnActive,
                { backgroundColor: activeAccent },
              ],
            ]}
            onPress={() => {
              haptics.light();
              setActiveTab('redeem');
            }}
            activeOpacity={0.85}
          >
            <Zap
              size={15}
              color={activeTab === 'redeem' ? '#FFFFFF' : isDark ? '#71788E' : colors.textSecondary}
              fill={activeTab === 'redeem' ? '#FFFFFF' : 'none'}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'redeem' ? '#FFFFFF' : isDark ? '#71788E' : colors.textSecondary },
              ]}
            >
              Cashout Vault
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSegmentBtn,
              activeTab === 'history' && [
                styles.tabSegmentBtnActive,
                { backgroundColor: activeAccent },
              ],
            ]}
            onPress={() => {
              haptics.light();
              setActiveTab('history');
            }}
            activeOpacity={0.85}
          >
            <Clock
              size={15}
              color={activeTab === 'history' ? '#FFFFFF' : isDark ? '#71788E' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'history' ? '#FFFFFF' : isDark ? '#71788E' : colors.textSecondary },
              ]}
            >
              History ({historyList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'redeem' ? (
          <>
            {/* 3. HERO FROST CARD (1:1 with Screenshot) */}
            <View
              style={[
                styles.heroFrostCard,
                {
                  backgroundColor: isDark ? '#0F121C' : '#F0F9FF',
                  borderColor: isDark ? '#1C2130' : '#E0F2FE',
                },
              ]}
            >
              {/* Frost mountain artwork background fading on the right */}
              <Image
                source={require('../../assets/dungeons/dungeon_c_frost.jpg')}
                style={styles.heroFrostBgImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  isDark ? 'rgba(15, 18, 28, 0.98)' : 'rgba(240, 249, 255, 0.95)',
                  isDark ? 'rgba(15, 18, 28, 0.82)' : 'rgba(240, 249, 255, 0.75)',
                  isDark ? 'rgba(15, 18, 28, 0.15)' : 'rgba(240, 249, 255, 0.15)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Main Total Crystals Balance Content */}
              <View style={styles.heroMainRow}>
                <Image
                  source={APP_3D_ASSETS.manaCrystal}
                  style={styles.hero3DCrystal}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                    TOTAL MANA CRYSTALS
                  </Text>
                  <Text style={[styles.heroBigCount, { color: isDark ? '#FFFFFF' : '#0A84FF' }]}>
                    {manaBalance.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.heroDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E0F2FE' },
                ]}
              />

              {/* Bottom Exchange Rate Row */}
              <View style={styles.heroFooterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rateLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                    EXCHANGE RATE
                  </Text>
                  <Text style={[styles.rateValue, { color: colors.textPrimary }]}>
                    10 Crystals = ₹1.00 INR
                  </Text>
                </View>

                <View
                  style={[
                    styles.heroVerticalLine,
                    { backgroundColor: isDark ? '#1C2130' : 'rgba(224, 242, 254, 0.6)' },
                  ]}
                />

                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={[styles.rateLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                    ESTIMATED VALUE
                  </Text>
                  <Text style={[styles.rateValue, { color: isDark ? '#00D2EE' : '#0A84FF' }]}>
                    ₹{(manaBalance / CRYSTALS_PER_INR).toFixed(2)} INR
                  </Text>
                </View>
              </View>
            </View>

            {/* 4. SELECT CASHOUT GATEWAY */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select Cashout Gateway</Text>
            </View>

            <View style={styles.gatewayListWrap}>
              {/* Row 1: Direct UPI */}
              <TouchableOpacity
                style={[
                  styles.gatewayRow,
                  {
                    backgroundColor: activeMethod === 'UPI' ? activeAccentBg : isDark ? '#12141D' : colors.card,
                    borderColor: activeMethod === 'UPI' ? activeAccentBorder : isDark ? '#1D212E' : colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('UPI');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.gwIconWrap, { backgroundColor: isDark ? '#1A1D29' : '#F1F5F9' }]}>
                  <View style={styles.upiIconGraphic}>
                    <View style={styles.upiRibbonGreen} />
                    <View style={styles.upiRibbonOrange} />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.gwTitle, { color: colors.textPrimary }]}>Direct UPI</Text>
                </View>

                <View style={styles.gwRightAction}>
                  {activeMethod === 'UPI' ? (
                    <View style={[styles.radioActiveCircle, { backgroundColor: activeAccent }]}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.radioInactiveCircle, { borderColor: isDark ? '#33384C' : '#CBD5E1' }]} />
                  )}
                  <ChevronRight size={16} color={isDark ? '#71788E' : colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Row 2: Amazon Pay */}
              <TouchableOpacity
                style={[
                  styles.gatewayRow,
                  {
                    backgroundColor: activeMethod === 'AMAZON' ? activeAccentBg : isDark ? '#12141D' : colors.card,
                    borderColor: activeMethod === 'AMAZON' ? activeAccentBorder : isDark ? '#1D212E' : colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('AMAZON');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.gwIconWrap, { backgroundColor: isDark ? '#1A1D29' : '#F1F5F9' }]}>
                  <Gift size={20} color="#FF9900" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.gwTitle, { color: colors.textPrimary }]}>Amazon Pay</Text>
                </View>

                <View style={styles.gwRightAction}>
                  {activeMethod === 'AMAZON' ? (
                    <View style={[styles.radioActiveCircle, { backgroundColor: activeAccent }]}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.radioInactiveCircle, { borderColor: isDark ? '#33384C' : '#CBD5E1' }]} />
                  )}
                  <ChevronRight size={16} color={isDark ? '#71788E' : colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Row 3: Google Play */}
              <TouchableOpacity
                style={[
                  styles.gatewayRow,
                  {
                    backgroundColor: activeMethod === 'GOOGLE_PLAY' ? activeAccentBg : isDark ? '#12141D' : colors.card,
                    borderColor: activeMethod === 'GOOGLE_PLAY' ? activeAccentBorder : isDark ? '#1D212E' : colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('GOOGLE_PLAY');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.gwIconWrap, { backgroundColor: isDark ? '#1A1D29' : '#F1F5F9' }]}>
                  <Play size={18} color="#10B981" fill="#10B981" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.gwTitle, { color: colors.textPrimary }]}>Google Play</Text>
                </View>

                <View style={styles.gwRightAction}>
                  {activeMethod === 'GOOGLE_PLAY' ? (
                    <View style={[styles.radioActiveCircle, { backgroundColor: activeAccent }]}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.radioInactiveCircle, { borderColor: isDark ? '#33384C' : '#CBD5E1' }]} />
                  )}
                  <ChevronRight size={16} color={isDark ? '#71788E' : colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Row 4: Exchange Coins */}
              <TouchableOpacity
                style={[
                  styles.gatewayRow,
                  {
                    backgroundColor: activeMethod === 'COINS' ? activeAccentBg : isDark ? '#12141D' : colors.card,
                    borderColor: activeMethod === 'COINS' ? activeAccentBorder : isDark ? '#1D212E' : colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveMethod('COINS');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.gwIconWrap, { backgroundColor: isDark ? '#1A1D29' : '#F1F5F9' }]}>
                  <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.gwTitle, { color: colors.textPrimary }]}>Exchange Coins</Text>
                </View>

                <View style={styles.gwRightAction}>
                  {activeMethod === 'COINS' ? (
                    <View style={[styles.radioActiveCircle, { backgroundColor: activeAccent }]}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.radioInactiveCircle, { borderColor: isDark ? '#33384C' : '#CBD5E1' }]} />
                  )}
                  <ChevronRight size={16} color={isDark ? '#71788E' : colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* 5. SELECT AMOUNT (INR) */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select Amount (INR)</Text>
            </View>

            <View style={styles.tiersRow}>
              {CASHOUT_TIERS.map((tier) => {
                const isSelected = selectedInr === tier.inr;
                const cost = tier.inr * CRYSTALS_PER_INR;
                const canAfford = manaBalance >= cost;

                return (
                  <TouchableOpacity
                    key={tier.inr}
                    style={[
                      styles.tierPillCard,
                      {
                        backgroundColor: isSelected ? activeAccentBg : isDark ? '#12141D' : colors.card,
                        borderColor: isSelected ? activeAccentBorder : isDark ? '#1D212E' : colors.border,
                      },
                      !canAfford && { opacity: 0.5 },
                    ]}
                    onPress={() => handleSelectTier(tier.inr)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tierInrNum,
                        { color: isSelected ? activeAccent : colors.textPrimary },
                      ]}
                    >
                      ₹{tier.inr}
                    </Text>
                    <View style={styles.tierCrystalRow}>
                      <Image
                        source={APP_3D_ASSETS.manaCrystal}
                        style={{ width: 11, height: 11 }}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.tierCostText,
                          { color: isSelected ? activeAccent : isDark ? '#71788E' : colors.textSecondary },
                        ]}
                      >
                        {cost}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 6. CUSTOM AMOUNT CARD */}
            <View
              style={[
                styles.customCard,
                {
                  backgroundColor: isDark ? '#12141D' : colors.card,
                  borderColor: isDark ? '#1D212E' : colors.border,
                },
              ]}
            >
              <Text style={[styles.customCardLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                Custom Amount
              </Text>
              <View style={styles.customCardRow}>
                <View style={styles.customInputSide}>
                  <Text style={[styles.rupeeSign, { color: activeAccent }]}>₹</Text>
                  <TextInput
                    style={[styles.customInputField, { color: colors.textPrimary }]}
                    value={customInrInput}
                    onChangeText={handleCustomInrChange}
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor={isDark ? '#71788E' : colors.textSecondary}
                  />
                </View>

                <View
                  style={[
                    styles.customCrystalPill,
                    {
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F7FF',
                      borderColor: isDark ? 'rgba(14, 165, 233, 0.25)' : '#BAE6FD',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Image source={APP_3D_ASSETS.manaCrystal} style={{ width: 13, height: 13 }} resizeMode="contain" />
                  <Text style={styles.customCrystalPillText}>
                    {crystalsRequired.toLocaleString()} Crystals
                  </Text>
                </View>
              </View>
            </View>

            {/* 7. RECEIVING DETAILS FORM CARD */}
            {activeMethod !== 'COINS' && (
              <View
                style={[
                  styles.formCard,
                  {
                    backgroundColor: isDark ? '#12141D' : colors.card,
                    borderColor: isDark ? '#1D212E' : colors.border,
                  },
                ]}
              >
                {/* Field 1: Primary Destination */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabelRow}>
                    <Text style={[styles.formLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                      {activeMethod === 'UPI'
                        ? 'Receiving UPI ID / VPA Address'
                        : activeMethod === 'AMAZON'
                        ? 'Delivery Email or Phone for Amazon Voucher'
                        : 'Delivery Email or Phone for Google Play Code'}
                    </Text>
                    {activeMethod === 'UPI' && destinationInput.trim().length > 0 && (
                      <View
                        style={[
                          styles.vpaBadge,
                          UPI_REGEX.test(destinationInput.trim())
                            ? styles.vpaBadgeValid
                            : styles.vpaBadgeInvalid,
                        ]}
                      >
                        {UPI_REGEX.test(destinationInput.trim()) ? (
                          <>
                            <Check size={9} color="#10B981" strokeWidth={3} />
                            <Text style={styles.vpaBadgeValidText}>Valid Format</Text>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={9} color="#EF4444" />
                            <Text style={styles.vpaBadgeInvalidText}>Invalid VPA</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? '#0A0C14' : '#F8FAFC',
                        borderColor: isDark ? '#1D212E' : colors.border,
                      },
                    ]}
                  >
                    <User size={16} color={isDark ? '#71788E' : colors.textSecondary} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      value={destinationInput}
                      onChangeText={setDestinationInput}
                      placeholder={
                        activeMethod === 'UPI'
                          ? 'e.g. hunter@okhdfcbank'
                          : 'e.g. hunter@gmail.com / 9876543210'
                      }
                      placeholderTextColor={isDark ? '#50566A' : colors.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Field 2: Fast-Select Bank Handles (for UPI) */}
                {activeMethod === 'UPI' && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                      Fast-select bank handle
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsScroll}
                    >
                      {POPULAR_UPI_HANDLES.map((handle) => {
                        const isSelected = destinationInput.toLowerCase().includes(handle.toLowerCase());
                        return (
                          <TouchableOpacity
                            key={handle}
                            style={[
                              styles.chipPill,
                              {
                                backgroundColor: isSelected
                                  ? activeAccentBg
                                  : isDark ? '#161924' : '#F1F5F9',
                                borderColor: isSelected
                                  ? activeAccentBorder
                                  : isDark ? '#222636' : colors.border,
                              },
                            ]}
                            onPress={() => handleSelectHandleChip(handle)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.chipPillText,
                                {
                                  color: isSelected
                                    ? activeAccent
                                    : isDark ? '#71788E' : colors.textSecondary,
                                },
                              ]}
                            >
                              {handle}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Field 3: Confirm UPI Address */}
                {activeMethod === 'UPI' && (
                  <View style={styles.formGroup}>
                    <View style={styles.formLabelRow}>
                      <Text style={[styles.formLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                        Confirm Receiving UPI ID
                      </Text>
                      {confirmDestinationInput.trim().length > 0 && (
                        <View
                          style={[
                            styles.vpaBadge,
                            destinationInput.trim().toLowerCase() === confirmDestinationInput.trim().toLowerCase()
                              ? styles.vpaBadgeValid
                              : styles.vpaBadgeInvalid,
                          ]}
                        >
                          {destinationInput.trim().toLowerCase() === confirmDestinationInput.trim().toLowerCase() ? (
                            <>
                              <Check size={9} color="#10B981" strokeWidth={3} />
                              <Text style={styles.vpaBadgeValidText}>Matched</Text>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={9} color="#EF4444" />
                              <Text style={styles.vpaBadgeInvalidText}>Mismatch</Text>
                            </>
                          )}
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: isDark ? '#0A0C14' : '#F8FAFC',
                          borderColor: isDark ? '#1D212E' : colors.border,
                        },
                      ]}
                    >
                      <Lock size={16} color={isDark ? '#71788E' : colors.textSecondary} />
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        value={confirmDestinationInput}
                        onChangeText={setConfirmDestinationInput}
                        placeholder="Re-enter identical UPI address to confirm"
                        placeholderTextColor={isDark ? '#50566A' : colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 8. CRIMSON RED ACTION CTA BUTTON (1:1 with Screenshot) */}
            <TouchableOpacity
              onPress={handleInitiateCashout}
              disabled={isSubmitting || !hasEnoughCrystals}
              activeOpacity={0.88}
              style={[
                styles.submitBtnTouch,
                (!hasEnoughCrystals || isSubmitting) && { opacity: 0.6 },
              ]}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Image
                      source={APP_3D_ASSETS.manaCrystal}
                      style={{ width: 22, height: 22 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.submitBtnText}>
                      {activeMethod === 'COINS'
                        ? `Convert for ${crystalsRequired.toLocaleString()} Crystals`
                        : `Request Cashout (₹${selectedInr} INR)`}
                    </Text>
                    <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.4} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* 9. SECURITY GUARANTEE FOOTER */}
            <View style={styles.guaranteeRow}>
              <Shield size={14} color={isDark ? '#38BDF8' : '#0A84FF'} />
              <Text style={[styles.guaranteeText, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                Encrypted transaction • Payout verified and dispatched within 24-48 hours
              </Text>
            </View>
          </>
        ) : (
          /* ======================= HISTORY TAB ======================= */
          <View style={styles.historyContainer}>
            {historyList.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Clock size={40} color={isDark ? '#71788E' : colors.textSecondary} />
                <Text style={[styles.emptyHistoryTitle, { color: colors.textPrimary }]}>No Cashout Requests Found</Text>
                <Text style={[styles.emptyHistorySub, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                  Clear Dungeon Gates to earn Mana Crystals.
                </Text>
              </View>
            ) : (
              historyList.map((item) => {
                const isPaid = item.status === 'PAID';
                const isPending = item.status === 'PENDING';
                const isRejected = item.status === 'REJECTED';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: isDark ? '#12141D' : colors.card,
                        borderColor: isDark ? '#1D212E' : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.historyCardTop}>
                      <View
                        style={[
                          styles.historyMethodBadge,
                          { backgroundColor: isDark ? '#1A1D29' : '#F1F5F9' },
                        ]}
                      >
                        <Text style={[styles.historyMethodText, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                          {item.method}
                        </Text>
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
                        <Text style={[styles.historyInrText, { color: colors.textPrimary }]}>₹{item.amountInr} INR</Text>
                        <Text style={[styles.historyDestText, { color: isDark ? '#71788E' : colors.textSecondary }]} numberOfLines={1}>
                          To: {item.destination}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Image
                            source={APP_3D_ASSETS.manaCrystal}
                            style={{ width: 13, height: 13 }}
                            resizeMode="contain"
                          />
                          <Text style={[styles.historySpentText, { color: isDark ? '#38BDF8' : '#0A84FF' }]}>
                            -{item.crystalsSpent}
                          </Text>
                        </View>
                        <Text style={[styles.historyDateText, { color: isDark ? '#71788E' : colors.textSecondary }]}>
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
            <View
              style={[
                styles.securityCard,
                {
                  backgroundColor: isDark ? '#12141D' : colors.card,
                  borderColor: isDark ? '#EF4444' : colors.border,
                },
              ]}
            >
              <View style={[styles.securityHeaderRow, { borderBottomColor: isDark ? '#1D212E' : colors.border }]}>
                <ShieldCheck size={20} color={activeAccent} />
                <View>
                  <Text style={[styles.securityTag, { color: activeAccent }]}>[ SYSTEM SECURITY PROTOCOL ]</Text>
                  <Text style={[styles.securityTitle, { color: colors.textPrimary }]}>CASHOUT AUTHORIZATION</Text>
                </View>
              </View>

              {/* Transaction Summary Box */}
              <View
                style={[
                  styles.securitySummaryBox,
                  {
                    backgroundColor: isDark ? '#0A0C14' : '#F8FAFC',
                    borderColor: isDark ? '#1D212E' : colors.border,
                  },
                ]}
              >
                <View style={styles.securitySummaryRow}>
                  <Text style={[styles.securitySummaryLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>CASHOUT AMOUNT:</Text>
                  <Text style={[styles.securitySummaryVal, { color: '#10B981' }]}>
                    ₹{selectedInr} INR
                  </Text>
                </View>
                <View style={styles.securitySummaryRow}>
                  <Text style={[styles.securitySummaryLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>CRYSTALS TO BURN:</Text>
                  <Text style={[styles.securitySummaryVal, { color: isDark ? '#38BDF8' : '#0A84FF' }]}>
                    {crystalsRequired.toLocaleString()} Crystals
                  </Text>
                </View>
                <View style={styles.securitySummaryRow}>
                  <Text style={[styles.securitySummaryLabel, { color: isDark ? '#71788E' : colors.textSecondary }]}>PAYOUT DESTINATION:</Text>
                  <Text style={[styles.securitySummaryVal, { color: '#F59E0B' }]} numberOfLines={1}>
                    {destinationInput.trim().toLowerCase()}
                  </Text>
                </View>
              </View>

              {/* Anti-Fraud Telemetry Notice */}
              <View
                style={[
                  styles.securityNoticeBox,
                  { backgroundColor: isDark ? '#271A06' : '#FEF3C7', borderColor: '#F59E0B' },
                ]}
              >
                <AlertTriangle size={15} color="#F59E0B" style={{ marginTop: 2 }} />
                <Text style={[styles.securityNoticeText, { color: isDark ? '#FEF3C7' : '#92400E' }]}>
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
                <View style={[styles.checkboxBox, securityAgreed && [styles.checkboxBoxChecked, { backgroundColor: activeAccent, borderColor: activeAccent }]]}>
                  {securityAgreed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.agreementText, { color: isDark ? '#71788E' : colors.textSecondary }]}>
                  I certify that this {activeMethod} destination belongs to me and authorize burning {crystalsRequired.toLocaleString()} Mana Crystals.
                </Text>
              </TouchableOpacity>

              {/* Modal Action Buttons */}
              <View style={styles.securityBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.securityCancelBtn,
                    { backgroundColor: isDark ? '#1A1D29' : '#F1F5F9' },
                  ]}
                  onPress={() => {
                    haptics.light();
                    setSecurityModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.securityCancelBtnText, { color: isDark ? '#71788E' : colors.textSecondary }]}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.securityConfirmBtn,
                    { backgroundColor: activeAccent },
                    !securityAgreed && styles.securityConfirmBtnDisabled,
                  ]}
                  onPress={handleExecuteCashout}
                  disabled={!securityAgreed}
                  activeOpacity={0.85}
                >
                  <ShieldCheck size={16} color={securityAgreed ? '#FFFFFF' : isDark ? '#71788E' : colors.textSecondary} />
                  <Text
                    style={[
                      styles.securityConfirmBtnText,
                      !securityAgreed && { color: isDark ? '#71788E' : colors.textSecondary },
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
                {
                  backgroundColor: isDark ? '#12141D' : colors.card,
                  borderColor: isDark ? '#1D212E' : colors.border,
                },
                systemModal.type === 'success' && { borderColor: '#10B981' },
                systemModal.type === 'danger' && { borderColor: '#EF4444' },
              ]}
            >
              <View style={styles.modalTagRow}>
                {systemModal.type === 'success' ? (
                  <CheckCircle2 size={16} color="#10B981" />
                ) : (
                  <AlertCircle size={16} color="#EF4444" />
                )}
                <Text
                  style={[
                    styles.modalTagText,
                    systemModal.type === 'success' ? { color: '#10B981' } : { color: '#EF4444' },
                  ]}
                >
                  [ SYSTEM NOTICE // {systemModal.title} ]
                </Text>
              </View>

              <Text style={[styles.modalSub, { color: isDark ? '#71788E' : colors.textSecondary }]}>{systemModal.message}</Text>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  systemModal.type === 'success' ? { backgroundColor: '#10B981' } : { backgroundColor: activeAccent },
                ]}
                onPress={() => setSystemModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.modalConfirmBtnText,
                    { color: '#FFFFFF' },
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
  },
  // Top Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerProtocol: {
    fontSize: 9.5,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fontFamilies.semiBold,
    marginTop: 1,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    marginTop: 1,
  },
  crystalCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  crystalCapsuleCount: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },

  // Dual Segment Tabs
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabSegmentWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabSegmentBtnActive: {},
  tabSegmentText: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Hero Frost Card
  heroFrostCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    marginBottom: 18,
    position: 'relative',
  },
  heroFrostBgImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    opacity: 0.35,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  hero3DCrystal: {
    width: 48,
    height: 48,
  },
  heroLabel: {
    fontSize: 9.5,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 1,
  },
  heroBigCount: {
    fontSize: 32,
    fontFamily: fontFamilies.semiBold,
    marginVertical: 1,
  },
  heroSmallSub: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  heroDivider: {
    height: 1,
    marginBottom: 12,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroVerticalLine: {
    width: 1,
    height: 28,
  },
  rateLabel: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },

  // Section Headers
  sectionHeaderWrap: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.semiBold,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontFamily: fontFamilies.medium,
    marginTop: 2,
  },

  // Gateway Stacked List Rows (1:1 with dark mode screenshot)
  gatewayListWrap: {
    gap: 8,
    marginBottom: 18,
  },
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  gwIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gwTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },
  gwSub: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  gwRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioActiveCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInactiveCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  upiIconGraphic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  upiRibbonGreen: {
    width: 9,
    height: 16,
    backgroundColor: '#10B981',
    transform: [{ skewX: '-25deg' }],
    borderRadius: 2,
  },
  upiRibbonOrange: {
    width: 9,
    height: 16,
    backgroundColor: '#F59E0B',
    transform: [{ skewX: '-25deg' }],
    borderRadius: 2,
    marginLeft: 1,
  },

  // Tiers Row (All 6 cards neatly across row)
  tiersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
  },
  tierPillCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tierInrNum: {
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },
  tierCrystalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tierCostText: {
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
  },

  // Custom Amount Card
  customCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  customCardLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    marginBottom: 6,
  },
  customCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customInputSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rupeeSign: {
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    marginRight: 6,
  },
  customInputField: {
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    flex: 1,
    paddingVertical: 2,
  },
  customCrystalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  customCrystalPillText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
    color: '#00D2EE',
  },

  // Form Card
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 18,
  },
  formGroup: {
    gap: 6,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  vpaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vpaBadgeValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  vpaBadgeInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  vpaBadgeValidText: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    color: '#10B981',
  },
  vpaBadgeInvalidText: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    color: '#EF4444',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilies.medium,
    paddingVertical: 9,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chipPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipPillText: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
  },

  // Submit CTA Button
  submitBtnTouch: {
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 26,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: fontFamilies.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Guarantee Row
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  guaranteeText: {
    fontSize: 10.5,
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
  },

  // History Tab Styles
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
    fontFamily: fontFamilies.semiBold,
    marginTop: 12,
  },
  emptyHistorySub: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  historyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyMethodText: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusBadgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0.5,
  },
  historyMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  historyInrText: {
    fontSize: 18,
    fontFamily: fontFamilies.semiBold,
  },
  historyDestText: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    marginTop: 2,
    maxWidth: 180,
  },
  historySpentText: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
  },
  historyDateText: {
    fontSize: 10,
    fontFamily: fontFamilies.medium,
    marginTop: 2,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSafe: {
    width: '100%',
  },
  securityCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  securityTag: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0.5,
  },
  securitySummaryBox: {
    borderRadius: 12,
    borderWidth: 1,
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
    fontFamily: fontFamilies.semiBold,
  },
  securitySummaryVal: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
    maxWidth: '65%',
  },
  securityNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: fontFamilies.semiBold,
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
    borderColor: '#71788E',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {},
  agreementText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fontFamilies.medium,
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
  },
  securityCancelBtnText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
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
  },
  securityConfirmBtnDisabled: {
    opacity: 0.6,
  },
  securityConfirmBtnText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1.5,
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
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 1,
  },
  modalSub: {
    fontSize: 13,
    fontFamily: fontFamilies.medium,
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
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0.5,
  },
});
