import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Hourglass,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { screenTimerService } from '../../src/native';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { colors } from '../../src/theme/colors';

interface ShopItem {
  id: string;
  minutes: number;
  cost: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: '5m', minutes: 5, cost: 20 },
  { id: '10m', minutes: 10, cost: 40 },
  { id: '20m', minutes: 20, cost: 80 },
  { id: '30m', minutes: 30, cost: 120 },
  { id: '60m', minutes: 60, cost: 200 },
];

export default function TimeShopScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);
  const [insufficientItem, setInsufficientItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const currentCoins = profile?.coins || 0;

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
        `Unlocked ${item.minutes} min Screen Time`
      );

      if (!result.success) {
        setInsufficientItem(item);
        return;
      }

      screenTimerService.startSessionTimer(durationMs, `Screen Time (${item.minutes}m)`);
      await loadProfile();

      sound.play('purchase');
      haptics.success();
      voiceCoach.speak(`Screen time unlocked! ${item.minutes} minutes granted.`);
      setSuccessItem(item);
    } catch (e) {
      console.error('Purchase error:', e);
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header: Time Shop + Coins */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Time Shop</Text>

          <View style={styles.coinPill}>
            <Text style={styles.coinPillText}>🟡 {currentCoins}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Shop Items List */}
          <View style={styles.itemsList}>
            {SHOP_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handlePurchase(item)}
                activeOpacity={0.82}
              >
                <MasterCard style={styles.itemCard}>
                  <View style={styles.itemLeft}>
                    <View style={styles.hourglassCircle}>
                      <Hourglass size={20} color={colors.primary} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.itemTitle}>{item.minutes} Minutes</Text>
                  </View>

                  <View style={styles.costBadge}>
                    <Text style={styles.costText}>{item.cost}</Text>
                    <Text style={styles.coinGlyph}>🟡</Text>
                  </View>
                </MasterCard>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subtitle Description Card */}
          <MasterCard style={styles.descCard}>
            <Text style={styles.descTitle}>Exchange Coins for Screen Time</Text>
            <Text style={styles.descText}>
              Use Coins earned from physical exercise and focus mode to unlock temporary screen time passes for restricted apps.
            </Text>
          </MasterCard>

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Success Modal */}
      <Modal
        visible={successItem !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSuccessItem(null)}
      >
        <View style={styles.modalOverlay}>
          <MasterCard style={styles.dialogCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={44} color={colors.primary} />
            </View>
            <Text style={styles.dialogTitle}>Screen Time Unlocked!</Text>
            <Text style={styles.dialogDesc}>
              {successItem?.minutes} minutes of unrestricted app access has been activated. Active timer is running in notification tray.
            </Text>

            <MasterButton
              title="CONTINUE"
              onPress={() => setSuccessItem(null)}
              variant="green"
              style={{ width: '100%', marginTop: 8 }}
            />
          </MasterCard>
        </View>
      </Modal>

      {/* Insufficient Coins Modal */}
      <Modal
        visible={insufficientItem !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setInsufficientItem(null)}
      >
        <View style={styles.modalOverlay}>
          <MasterCard style={styles.dialogCard}>
            <View style={[styles.successIconWrap, { borderColor: `${colors.danger}40` }]}>
              <AlertCircle size={44} color={colors.danger} />
            </View>
            <Text style={styles.dialogTitle}>Insufficient Coins</Text>
            <Text style={styles.dialogDesc}>
              You need {insufficientItem?.cost} Coins for {insufficientItem?.minutes} Minutes. Complete push-ups, squats, or focus sprints to earn coins!
            </Text>

            <MasterButton
              title="EARN COINS (EXERCISE)"
              onPress={() => {
                setInsufficientItem(null);
                router.push('/exercise/PUSHUP');
              }}
              variant="green"
              style={{ width: '100%', marginTop: 8 }}
            />
          </MasterCard>
        </View>
      </Modal>
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
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  coinPill: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  coinPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.accentGold,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 16,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hourglassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  costText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accentGold,
  },
  coinGlyph: {
    fontSize: 13,
  },
  descCard: {
    padding: 18,
    gap: 8,
    marginTop: 8,
  },
  descTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  descText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#181818',
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
