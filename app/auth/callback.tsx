import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { ShieldCheck, AlertCircle, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { googleAuthService, GoogleAuthUser } from '../../src/services/googleAuthService';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { getIsOnboardingCompleted, setIsOnboardingCompletedSync } from '../../src/services/appStateService';

type CallbackStatus = 'authenticating' | 'syncing' | 'success' | 'error';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();

  const [status, setStatus] = useState<CallbackStatus>('authenticating');
  const [headline, setHeadline] = useState('AUTHENTICATING HUNTER');
  const [subline, setSubline] = useState('Connecting to Hunter Guild Cloud...');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkedUser, setLinkedUser] = useState<GoogleAuthUser | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasProcessedRef = useRef(false);

  // Subtle breathing pulse for authentication portal
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    let isMounted = true;

    async function processAuth(passedUrl?: string) {
      if (hasProcessedRef.current && !passedUrl) return;
      hasProcessedRef.current = true;

      try {
        // Collect URL from all possible sources
        let currentUrl: string | null = passedUrl || null;
        if (!currentUrl) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            currentUrl = window.location.href;
          } else {
            currentUrl = await Linking.getInitialURL();
          }
        }

        const mergedParams = {
          ...globalParams,
          ...localParams,
        };

        console.log('[AuthCallback] Processing OAuth redirect. URL:', currentUrl ? currentUrl.substring(0, 50) + '...' : 'none');

        const result = await googleAuthService.handleOAuthCallback(currentUrl, mergedParams);

        if (!isMounted) return;

        if (result.success && result.user) {
          setLinkedUser(result.user);
          setStatus('syncing');
          setHeadline('WARRIOR VERIFIED');
          setSubline(
            result.restored
              ? 'Hunter save file & stats restored from Cloud.'
              : 'Google Account successfully linked to System.'
          );

          try {
            haptics.success();
            sound.play('level_up');
          } catch {}

          // Refresh profile in SQLite & store
          await usePlayerStore.getState().loadProfile();

          // Check if onboarding was already done or restored
          const wasOnboarded = getIsOnboardingCompleted() || useSettingsStore.getState().onboardingCompleted || result.restored;

          if (result.restored) {
            useSettingsStore.setState({ onboardingCompleted: true });
            setIsOnboardingCompletedSync(true);
          }

          setStatus('success');

          // Smooth redirect after visual confirmation
          setTimeout(() => {
            if (!isMounted) return;
            if (wasOnboarded) {
              router.replace('/(tabs)');
            } else {
              router.replace('/(onboarding)');
            }
          }, 900);
        } else {
          setStatus('error');
          setHeadline('AUTHENTICATION FAILED');
          setErrorMessage(result.error || 'Failed to authenticate Google account.');
          haptics.warning();
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setHeadline('SYSTEM ERROR');
        setErrorMessage(err?.message || 'Unexpected failure while validating token.');
        haptics.warning();
      }
    }

    processAuth();

    // In case incoming link arrives dynamically while screen is mounted
    const sub = Linking.addEventListener('url', (event) => {
      if (event.url && (event.url.includes('auth/callback') || event.url.includes('access_token') || event.url.includes('code'))) {
        hasProcessedRef.current = false;
        processAuth(event.url);
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const handleManualProceed = () => {
    haptics.light();
    const wasOnboarded = getIsOnboardingCompleted() || useSettingsStore.getState().onboardingCompleted;
    if (wasOnboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(onboarding)');
    }
  };

  const handleRetry = () => {
    haptics.light();
    router.replace('/(onboarding)');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8F9FC' }]}>
      <Animated.View
        style={[
          styles.glowCircle,
          {
            transform: [{ scale: pulseAnim }],
            borderColor:
              status === 'error'
                ? '#EF4444'
                : status === 'success'
                ? '#10B981'
                : colors.primary || '#0A84FF',
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                status === 'error'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : status === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(10, 132, 255, 0.12)',
            },
          ]}
        >
          {status === 'error' ? (
            <AlertCircle size={40} color="#EF4444" />
          ) : status === 'success' ? (
            <CheckCircle2 size={40} color="#10B981" />
          ) : (
            <ShieldCheck size={40} color={colors.primary || '#0A84FF'} />
          )}
        </View>
      </Animated.View>

      <View style={styles.textBlock}>
        <Text style={[styles.headlineText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          {headline}
        </Text>
        <Text style={[styles.sublineText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {status === 'error' ? errorMessage : subline}
        </Text>

        {linkedUser?.displayName && (
          <View
            style={[
              styles.userBadge,
              {
                backgroundColor: isDark ? '#11131A' : '#FFFFFF',
                borderColor: isDark ? '#1F2433' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.userNameText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {linkedUser.displayName}
            </Text>
            <Text style={styles.userEmailText}>{linkedUser.email}</Text>
          </View>
        )}
      </View>

      {(status === 'authenticating' || status === 'syncing') && (
        <View style={styles.spinnerRow}>
          <ActivityIndicator size="small" color={colors.primary || '#0A84FF'} />
          <Text style={[styles.spinnerText, { color: colors.primary || '#0A84FF' }]}>
            {status === 'authenticating' ? 'Verifying OAuth Token...' : 'Synchronizing Vault...'}
          </Text>
        </View>
      )}

      {status === 'success' && (
        <TouchableOpacity
          style={[styles.proceedButton, { backgroundColor: colors.primary || '#0A84FF' }]}
          onPress={handleManualProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.proceedButtonText}>Enter System</Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {status === 'error' && (
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={[styles.proceedButton, { backgroundColor: '#1F2433' }]}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.proceedButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestLink}
            onPress={handleManualProceed}
            activeOpacity={0.7}
          >
            <Text style={[styles.guestLinkText, { color: colors.primary || '#0A84FF' }]}>
              Continue to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  glowCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
    maxWidth: 320,
  },
  headlineText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  sublineText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '400',
  },
  userBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  spinnerText: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 180,
  },
  proceedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  errorActions: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  guestLink: {
    paddingVertical: 8,
  },
  guestLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
