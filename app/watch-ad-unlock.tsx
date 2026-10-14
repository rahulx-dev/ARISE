import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { adMobService } from '../src/services/adMobService';
import { coinService } from '../src/services/coinService';
import { appBlockerService } from '../src/native';
import { usePlayerStore } from '../src/stores/usePlayerStore';
import { useHaptics } from '../src/hooks/useHaptics';
import { useSound } from '../src/hooks/useSound';
import { fontFamilies } from '../src/theme/typography';
import { NeumorphicCard, NeumorphicCircleButton } from '../src/components/ui/NeumorphicCard';
import { Icon3D } from '../src/components/ui/Icon3D';

const { width } = Dimensions.get('window');

export default function WatchAdUnlockScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [status, setStatus] = useState<'LOADING' | 'SHOWING' | 'REWARDED' | 'FAILED'>('LOADING');
  const [earnedCoins, setEarnedCoins] = useState<number>(25);
  const isHandledRef = useRef(false);

  useEffect(() => {
    let timer: any = null;
    let pollInterval: any = null;
    let showTimer: any = null;
    let mounted = true;

    const executeAdFlow = () => {
      if (!mounted || isHandledRef.current) return;

      const attemptShow = () => {
        if (!mounted || isHandledRef.current) return;

        if (adMobService.isRewardedLoaded) {
          clearInterval(pollInterval);
          clearTimeout(timer);
          if (!mounted) return;
          setStatus('SHOWING');

          const adShown = adMobService.showRewardedAd(async (coins: number) => {
            if (!mounted || isHandledRef.current) return;
            isHandledRef.current = true;

            const coinsAwarded = coins || 25;
            if (mounted) {
              setEarnedCoins(coinsAwarded);
              setStatus('REWARDED');
            }

            // 1. Award coins to player's SQLite vault
            await coinService.addCoins(coinsAwarded, 'Sponsor Pass: Video Ad', 'ad');

            // 2. Temporarily unlock apps for 15 minutes
            appBlockerService.temporaryUnlock?.(15 * 60 * 1000);

            // 3. Reload profile
            await loadProfile();

            if (mounted) {
              haptics.success();
              sound.play('quest_complete');
            }
          });

          if (!adShown) {
            adMobService.preloadRewarded();
          }
        }
      };

      // Try immediately
      if (adMobService.isRewardedLoaded) {
        showTimer = setTimeout(attemptShow, 400);
      } else {
        adMobService.preloadRewarded();
        // Poll every 800ms for up to 6 seconds
        pollInterval = setInterval(attemptShow, 800);

        timer = setTimeout(() => {
          clearInterval(pollInterval);
          if (mounted && !isHandledRef.current) {
            setStatus('FAILED');
          }
        }, 6500);
      }
    };

    executeAdFlow();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (timer) clearTimeout(timer);
      if (showTimer) clearTimeout(showTimer);
    };
  }, []);

  const handleFinishAndReturn = () => {
    haptics.light();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F4EF" />

      {/* Header */}
      <View style={styles.header}>
        <NeumorphicCircleButton
          size={38}
          onPress={() => router.replace('/(tabs)')}
          icon={<ArrowLeft size={18} color="#1A1A1A" strokeWidth={2.5} />}
        />
        <View style={styles.headerCenterCol}>
          <Text style={styles.headerEyebrow}>UNRESTRICTED ACCESS</Text>
          <Text style={styles.headerTitle}>SPONSOR PASS (+15 MINS)</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {status === 'LOADING' && (
          <NeumorphicCard style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon3D name="play_amber" size={54} />
            </View>
            <Text style={styles.eyebrowTag}>SPONSOR STREAM</Text>
            <Text style={styles.title}>Connecting to Stream</Text>
            <Text style={styles.subtitle}>
              Calibrating verified sponsor video stream to grant your temporary 15-minute screen time pass...
            </Text>
            <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 14 }} />
          </NeumorphicCard>
        )}

        {status === 'SHOWING' && (
          <NeumorphicCard style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon3D name="play_amber" size={54} />
            </View>
            <Text style={styles.eyebrowTag}>SESSION ACTIVE</Text>
            <Text style={styles.title}>Sponsor Video In Progress</Text>
            <Text style={styles.subtitle}>
              Watch the full sponsor video to claim your temporary 15-minute pass and +25 Gold Coins.
            </Text>
          </NeumorphicCard>
        )}

        {status === 'REWARDED' && (
          <NeumorphicCard style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon3D name="checkmark_green" size={54} />
            </View>
            <Text style={styles.eyebrowTag}>VERIFIED UNLOCK</Text>
            <Text style={[styles.title, { color: '#10B981' }]}>15-Minute Pass Granted!</Text>
            <Text style={styles.subtitle}>
              Sponsor protocol verified! Your restricted apps are unlocked for the next 15 minutes.
            </Text>

            <View style={styles.bountyRow}>
              <View style={styles.bountyPill}>
                <Icon3D name="coin_gold" size={16} />
                <Text style={styles.bountyText}>+{earnedCoins} COINS</Text>
              </View>
              <View style={[styles.bountyPill, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
                <Icon3D name="ticket_gold" size={16} />
                <Text style={[styles.bountyText, { color: '#047857' }]}>15M PASS ACTIVE</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleFinishAndReturn}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>PROCEED TO APPS</Text>
            </TouchableOpacity>
          </NeumorphicCard>
        )}

        {status === 'FAILED' && (
          <NeumorphicCard style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon3D name="safe_gray" size={54} />
            </View>
            <Text style={styles.eyebrowTag}>BUFFERING STREAM</Text>
            <Text style={styles.title}>Sponsor Stream Calibrating</Text>
            <Text style={styles.subtitle}>
              No sponsor video stream is available at this moment. You can still do 10 pushups to unlock immediately.
            </Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleFinishAndReturn}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>RETURN TO DASHBOARD</Text>
            </TouchableOpacity>
          </NeumorphicCard>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerCenterCol: {
    alignItems: 'center',
    gap: 2,
  },
  headerEyebrow: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#E53935',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F6F4EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  eyebrowTag: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: '#E53935',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  bountyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  bountyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bountyText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#92400E',
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  actionBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
