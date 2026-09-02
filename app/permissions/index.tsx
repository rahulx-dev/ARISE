import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import {
  ArrowLeft,
  Shield,
  Clock,
  Layers,
  Bell,
  Camera as CameraIcon,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { ARISEModal } from '../../src/components/ui/ARISEModal';
import { appBlockerService } from '../../src/native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

interface PendingPerm {
  id: 'usage' | 'overlay' | 'camera' | 'notif';
  title: string;
  explanation: string;
  icon: any;
  action: () => Promise<void> | void;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  const [usageGranted, setUsageGranted] = useState<boolean>(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(false);
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);

  const [pendingPerm, setPendingPerm] = useState<PendingPerm | null>(null);

  const checkAllPermissions = async () => {
    try {
      // 1. Usage stats permission
      const usage = await appBlockerService.hasUsagePermission();
      setUsageGranted(usage);

      // 2. Overlay permission
      const overlay = await appBlockerService.hasOverlayPermission();
      setOverlayGranted(overlay);

      // 3. Camera permission
      const cam = await Camera.getCameraPermissionsAsync();
      setCameraGranted(cam.granted);

      // 4. Notifications permission
      const notif = await Notifications.getPermissionsAsync();
      setNotifGranted(notif.granted);
    } catch (e) {
      console.warn('Error checking permissions:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkAllPermissions();
    }, [])
  );

  useEffect(() => {
    checkAllPermissions();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const triggerNativeUsage = () => {
    if (Platform.OS === 'android') {
      appBlockerService.requestUsagePermission();
    }
  };

  const triggerNativeOverlay = () => {
    if (Platform.OS === 'android') {
      appBlockerService.requestOverlayPermission();
    }
  };

  const triggerNativeCamera = async () => {
    const res = await Camera.requestCameraPermissionsAsync();
    setCameraGranted(res.granted);
  };

  const triggerNativeNotif = async () => {
    const res = await Notifications.requestPermissionsAsync();
    setNotifGranted(res.granted);
  };

  const requestWithExplanation = (perm: PendingPerm) => {
    haptics.medium();
    setPendingPerm(perm);
  };

  const handleConfirmExplanation = async () => {
    if (!pendingPerm) return;
    const action = pendingPerm.action;
    setPendingPerm(null);
    haptics.heavy();
    setTimeout(async () => {
      await action();
    }, 150);
  };

  const permissionList: PendingPerm[] = [
    {
      id: 'usage',
      title: 'Usage Access (App Monitor)',
      explanation: 'ARISE detects when you open distraction apps in real-time so it can enforce your focus rules. No private messages or browsing history are ever accessed or sent anywhere.',
      icon: Clock,
      action: triggerNativeUsage,
    },
    {
      id: 'overlay',
      title: 'Display Over Apps (Lock Shield)',
      explanation: 'ARISE displays the lock overlay on top of restricted apps when your time limit expires. This allows you to perform workouts to earn back your screen time.',
      icon: Layers,
      action: triggerNativeOverlay,
    },
    {
      id: 'camera',
      title: 'Camera Access (AI Pose Tracker)',
      explanation: 'ARISE uses your phone camera for real-time on-device Google ML Kit body joint tracking. Camera frames are processed 100% in RAM and are never recorded or uploaded.',
      icon: CameraIcon,
      action: triggerNativeCamera,
    },
    {
      id: 'notif',
      title: 'Notifications (Session Alerts)',
      explanation: 'ARISE notifies you when your screen time passes expire, quest targets are achieved, or daily streaks are in danger of resetting.',
      icon: Bell,
      action: triggerNativeNotif,
    },
  ];

  const getGrantedState = (id: string) => {
    if (id === 'usage') return usageGranted;
    if (id === 'overlay') return overlayGranted;
    if (id === 'camera') return cameraGranted;
    return notifGranted;
  };

  const allGranted = usageGranted && overlayGranted && cameraGranted && notifGranted;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Permissions Hub</Text>

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              checkAllPermissions();
            }}
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Overview Card */}
          <GlassCard variant={allGranted ? 'glow' : 'elevated'} style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Shield size={24} color={allGranted ? colors.primary : colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.overviewTitle, { color: colors.textPrimary }]}>
                  {allGranted ? 'System Shield Fully Active' : 'System Protection Protocol'}
                </Text>
                <Text style={[styles.overviewSubtitle, { color: colors.textMuted }]}>
                  100% Offline & Private on your device.
                </Text>
              </View>
            </View>
            <Text style={[styles.overviewDesc, { color: colors.textSecondary }]}>
              Android requires specific permissions to monitor app usage, enforce the screen-time lock, and detect body workouts. Tap any permission below to configure.
            </Text>
          </GlassCard>

          {/* Permissions List */}
          <View style={styles.permList}>
            {permissionList.map((item) => {
              const IconComp = item.icon;
              const isGranted = getGrantedState(item.id);

              return (
                <GlassCard key={item.id} variant="default" style={styles.permCard}>
                  <View style={styles.permCardHeader}>
                    <View
                      style={[
                        styles.permIconWrap,
                        {
                          backgroundColor: isGranted
                            ? isDark
                              ? 'rgba(204, 255, 0, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      ]}
                    >
                      <IconComp size={20} color={isGranted ? colors.primary : colors.textMuted} />
                    </View>

                    <View style={styles.permCardText}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.permTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isGranted
                                ? isDark
                                  ? 'rgba(204, 255, 0, 0.15)'
                                  : 'rgba(16, 185, 129, 0.15)'
                                : isDark
                                ? 'rgba(255, 180, 171, 0.15)'
                                : 'rgba(220, 38, 38, 0.1)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isGranted ? colors.primary : colors.danger },
                            ]}
                          >
                            {isGranted ? 'GRANTED' : 'REQUIRED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.permDesc, { color: colors.textSecondary }]}>{item.explanation}</Text>
                    </View>
                  </View>

                  {!isGranted && (
                    <TouchableOpacity
                      style={[styles.grantBtn, { backgroundColor: colors.primary }]}
                      onPress={() => requestWithExplanation(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.grantBtnText}>CONFIGURE PERMISSION</Text>
                      <ExternalLink size={14} color="#000000" />
                    </TouchableOpacity>
                  )}
                </GlassCard>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ARISE Pre-Permission Explanation Modal */}
        {pendingPerm && (
          <ARISEModal
            visible={!!pendingPerm}
            onClose={() => setPendingPerm(null)}
            title={pendingPerm.title}
            subtitle="Android System Permission"
          >
            <View style={{ gap: 14 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                {pendingPerm.explanation}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                Tap continue to open the Android system dialog or settings screen.
              </Text>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmExplanation}
                activeOpacity={0.85}
              >
                <Text style={styles.modalActionBtnText}>Continue to Android Request</Text>
              </TouchableOpacity>
            </View>
          </ARISEModal>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  overviewCard: {
    padding: 18,
    borderRadius: 22,
    gap: 10,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  overviewSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  overviewDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  permList: {
    gap: 12,
  },
  permCard: {
    padding: 16,
    borderRadius: 20,
    gap: 14,
  },
  permCardHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  permIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCardText: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  permDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  grantBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
});
