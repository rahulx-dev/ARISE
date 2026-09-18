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
import { ShieldCheck, Video, ArrowLeft, Zap, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { adMobService } from '../src/services/adMobService';
import { coinService } from '../src/services/coinService';
import { appBlockerService } from '../src/native';
import { usePlayerStore } from '../src/stores/usePlayerStore';
import { useHaptics } from '../src/hooks/useHaptics';
import { useSound } from '../src/hooks/useSound';

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

    const executeAdFlow = () => {
      if (isHandledRef.current) return;

      const attemptShow = () => {
        if (isHandledRef.current) return;

        if (adMobService.isRewardedLoaded) {
          clearInterval(pollInterval);
          clearTimeout(timer);
          setStatus('SHOWING');

          const adShown = adMobService.showRewardedAd(async (coins: number) => {
            if (isHandledRef.current) return;
            isHandledRef.current = true;

            const coinsAwarded = coins || 25;
            setEarnedCoins(coinsAwarded);
            setStatus('REWARDED');

            // 1. Award coins to player's SQLite vault
            await coinService.addCoins(coinsAwarded, 'Sponsor Pass: Video Ad', 'ad');

            // 2. Temporarily unlock apps for 15 minutes
            appBlockerService.temporaryUnlock?.(15 * 60 * 1000);

            // 3. Reload profile
            await loadProfile();

            haptics.success();
            sound.play('quest_complete');
          });

          if (!adShown) {
            adMobService.preloadRewarded();
          }
        }
      };

      // Try immediately
      if (adMobService.isRewardedLoaded) {
        setTimeout(attemptShow, 400);
      } else {
        adMobService.preloadRewarded();
        // Poll every 800ms for up to 6 seconds
        pollInterval = setInterval(attemptShow, 800);

        timer = setTimeout(() => {
          clearInterval(pollInterval);
          if (!isHandledRef.current) {
            setStatus('FAILED');
          }
        }, 6500);
      }
    };

    executeAdFlow();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleGrantCourtesyPass = () => {
    haptics.medium();
    appBlockerService.temporaryUnlock?.(5 * 60 * 1000);
    router.replace('/(tabs)');
  };

  const handleFinishAndReturn = () => {
    haptics.light();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#02040A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTag}>[ SYSTEM // SPONSOR PROTOCOL ]</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {status === 'LOADING' && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Video size={36} color="#00D2EE" />
            </View>
            <Text style={styles.title}>CONNECTING TO SPONSOR MAINFRAME</Text>
            <Text style={styles.subtitle}>
              Calibrating verified sponsor video stream to unlock your 15-minute screen pass...
            </Text>
            <ActivityIndicator size="large" color="#0A84FF" style={{ marginTop: 14 }} />
          </View>
        )}

        {status === 'SHOWING' && (
          <View style={styles.card}>
            <View style={[styles.iconCircle, { borderColor: '#0A84FF' }]}>
              <Zap size={36} color="#0A84FF" />
            </View>
            <Text style={styles.title}>SPONSOR VIDEO IN PROGRESS</Text>
            <Text style={styles.subtitle}>
              Watch the full video to claim your temporary 15-minute screen pass and +25 Gold Coins.
            </Text>
          </View>
        )}

        {status === 'REWARDED' && (
          <View style={[styles.card, { borderColor: '#10B981' }]}>
            <View style={[styles.iconCircle, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <CheckCircle2 size={42} color="#10B981" />
            </View>
            <Text style={[styles.title, { color: '#10B981' }]}>ACCESS GRANTED</Text>
            <Text style={styles.subtitle}>
              Sponsor protocol verified! Your locked apps are unlocked for the next 15 minutes.
            </Text>

            <View style={styles.bountyRow}>
              <View style={styles.bountyPill}>
                <Sparkles size={14} color="#F59E0B" />
                <Text style={styles.bountyText}>+{earnedCoins} COINS ADDED</Text>
              </View>
              <View style={[styles.bountyPill, { borderColor: '#00D2EE' }]}>
                <ShieldCheck size={14} color="#00D2EE" />
                <Text style={[styles.bountyText, { color: '#00D2EE' }]}>15M PASS ACTIVE</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleFinishAndReturn}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>PROCEED TO SYSTEM</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'FAILED' && (
          <View style={[styles.card, { borderColor: '#F59E0B' }]}>
            <View style={[styles.iconCircle, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <ShieldCheck size={40} color="#F59E0B" />
            </View>
            <Text style={[styles.title, { color: '#F59E0B' }]}>SPONSOR NETWORK CALIBRATING</Text>
            <Text style={styles.subtitle}>
              No sponsor video was available right now. As a courtesy for your patience, claim a free 5-minute emergency screen pass!
            </Text>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
              onPress={handleGrantCourtesyPass}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { color: '#000000' }]}>CLAIM FREE 5-MIN PASS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>RETURN TO HOME</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040A',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A0E1A',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 1.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0A0E1A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 210, 238, 0.1)',
    borderWidth: 1.5,
    borderColor: '#00D2EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
  },
  bountyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  bountyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bountyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
});
