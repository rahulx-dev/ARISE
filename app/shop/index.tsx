import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Hourglass,
  Coins,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { screenTimerService } from '../../src/native';
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

  useEffect(() => {
    loadProfile();
  }, []);

  const currentCoins = profile?.coins || 0;

  const handlePurchase = async (item: ShopItem) => {
    if (purchasingId) return;

    if (currentCoins < item.cost) {
      haptics.warning();
      Alert.alert(
        'Insufficient Coins',
        `You need ${item.cost} Coins for ${item.minutes} Minutes. Complete workouts or focus sprints to earn coins!`
      );
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
        Alert.alert('Purchase Failed', result.error || 'Could not complete purchase.');
        return;
      }

      screenTimerService.startSessionTimer(durationMs, `Screen Time (${item.minutes}m)`);
      await loadProfile();

      sound.play('purchase');
      haptics.success();
      Alert.alert(
        'Screen Time Unlocked!',
        `Successfully unlocked ${item.minutes} minutes of unrestricted app access.`
      );
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

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            Use Coins to unlock screen time for selected apps.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  coinPill: {
    backgroundColor: '#181818',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242424',
  },
  coinPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accentGold,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
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
    borderRadius: 20,
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
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  coinGlyph: {
    fontSize: 14,
  },
  footerNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
});
