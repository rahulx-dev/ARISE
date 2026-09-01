import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
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
} from 'lucide-react-native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { CoinBalance } from '../../src/components/design-system/CoinBalance';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { screenTimerService, appBlockerService } from '../../src/native';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
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

export default function ShopScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [activeTab, setActiveTab] = useState<'all' | 'boosters' | 'themes' | 'avatars'>('all');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);
  const [insufficientItem, setInsufficientItem] = useState<ShopItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  useEffect(() => {
    loadProfile();
  }, []);

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
      Alert.alert('Purchase Error', 'Could not complete transaction.');
    } finally {
      setPurchasingId(null);
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

          <CoinBalance amount={currentCoins} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Tabs Filter: All | Boosters | Themes | Avatars */}
          <View style={styles.tabBar}>
            {(['all', 'boosters', 'themes', 'avatars'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => {
                    haptics.light();
                    setActiveTab(tab);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hero Featured Card */}
          {(activeTab === 'all' || activeTab === 'boosters') && (
            <GlowCard variant="glow" style={styles.featuredCard}>
              <View style={styles.featuredLeft}>
                <Text style={styles.featuredTitle}>Extra Focus Time</Text>
                <Text style={styles.featuredBonus}>+30 min</Text>
                <Text style={styles.featuredDesc}>
                  Spend your coins to get extra focus time and flow state
                </Text>

                <TouchableOpacity
                  style={styles.featuredPriceBtn}
                  onPress={() =>
                    handlePurchase({
                      id: 'extra_focus_30m',
                      name: 'Extra Focus Time (+30 min)',
                      desc: '30m bonus flow state',
                      cost: 500,
                      type: 'boost',
                      icon: Hourglass,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Coins size={14} color="#050505" strokeWidth={3} />
                  <Text style={styles.featuredPriceText}>500</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.featuredArtworkWrap}>
                <Hourglass size={56} color={colors.primary} />
              </View>
            </GlowCard>
          )}

          {/* Boosters Section */}
          {(activeTab === 'all' || activeTab === 'boosters') && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Boosters</Text>
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
                      <GlowCard style={styles.shopItemCard}>
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
                      </GlowCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* App Unlocks Section */}
          {(activeTab === 'all' || activeTab === 'boosters') && (
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
                    <GlowCard style={styles.shopItemCard}>
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
                    </GlowCard>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Themes Tab */}
          {(activeTab === 'all' || activeTab === 'themes') && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>Themes & Auras</Text>
              <View style={styles.itemsList}>
                {themesList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handlePurchase(item)}
                    activeOpacity={0.8}
                  >
                    <GlowCard style={styles.shopItemCard}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemIconCircle}>
                          <Palette size={22} color={colors.primary} />
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
                    </GlowCard>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Avatars Tab */}
          {(activeTab === 'all' || activeTab === 'avatars') && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>Exclusive Avatars</Text>
              <View style={styles.itemsList}>
                {avatarsList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handlePurchase(item)}
                    activeOpacity={0.8}
                  >
                    <GlowCard style={styles.shopItemCard}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemIconCircle}>
                          <User size={22} color={colors.primary} />
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
                    </GlowCard>
                  </TouchableOpacity>
                ))}
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
            <GlowCard variant="glow" style={styles.dialogCard}>
              <View style={styles.dialogIconCircle}>
                <CheckCircle2 size={36} color={colors.primary} />
              </View>
              <Text style={styles.dialogTitle}>Unlocked & Active!</Text>
              <Text style={styles.dialogDesc}>
                {successItem?.name} has been activated on your device.
              </Text>
              <GlowButton
                title="DONE"
                onPress={() => setSuccessItem(null)}
                variant="primary"
                style={{ width: '100%', marginTop: 8 }}
              />
            </GlowCard>
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
            <GlowCard style={styles.dialogCard}>
              <View style={[styles.dialogIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <AlertCircle size={36} color={colors.danger} />
              </View>
              <Text style={styles.dialogTitle}>Insufficient Coins</Text>
              <Text style={styles.dialogDesc}>
                You need {insufficientItem?.cost} Coins (Balance: {currentCoins}). Complete push-ups or focus sessions to earn more!
              </Text>
              <GlowButton
                title="EARN COINS"
                onPress={() => {
                  setInsufficientItem(null);
                  router.push('/(tabs)/quests');
                }}
                variant="primary"
                style={{ width: '100%', marginTop: 8 }}
              />
            </GlowCard>
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
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
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
    borderBottomColor: '#1F1F1F',
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
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
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
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#262626',
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
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
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
});
