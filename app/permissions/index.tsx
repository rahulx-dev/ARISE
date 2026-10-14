import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Zap,
} from 'lucide-react-native';
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';
import { Icon3D, Icon3DName } from '../../src/components/ui/Icon3D';
import { ARISEModal } from '../../src/components/ui/ARISEModal';
import { appBlockerService } from '../../src/native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';
import { fontFamilies } from '../../src/theme/typography';

interface PendingPerm {
  id: 'usage' | 'overlay' | 'battery' | 'camera' | 'notif';
  title: string;
  explanation: string;
  icon3DName: Icon3DName;
  action: () => Promise<void> | void;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  const [usageGranted, setUsageGranted] = useState<boolean>(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(false);
  const [batteryGranted, setBatteryGranted] = useState<boolean>(false);
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

      // 3. Battery optimization exemption
      const battery = await appBlockerService.hasBatteryOptimizationExemption?.() ?? true;
      setBatteryGranted(battery);

      // 4. Camera permission
      const cam = await Camera.getCameraPermissionsAsync();
      setCameraGranted(cam.granted);

      // 5. Notifications permission
      const notif = await Notifications.getPermissionsAsync();
      setNotifGranted(notif.granted);
    } catch (e) {
      console.warn('Error checking permissions:', e);
    }
  };

  const permPollRef = useRef<any>(null);

  const startFastPermissionPolling = (type: 'battery' | 'usage' | 'overlay') => {
    if (permPollRef.current) clearInterval(permPollRef.current);
    const startTime = Date.now();
    permPollRef.current = setInterval(async () => {
      try {
        if (type === 'battery') {
          const granted = (await appBlockerService.hasBatteryOptimizationExemption?.()) ?? false;
          if (granted) {
            setBatteryGranted(true);
            haptics.success();
            if (permPollRef.current) {
              clearInterval(permPollRef.current);
              permPollRef.current = null;
            }
          }
        } else if (type === 'usage') {
          const granted = await appBlockerService.hasUsagePermission();
          if (granted) {
            setUsageGranted(true);
            haptics.success();
            if (permPollRef.current) {
              clearInterval(permPollRef.current);
              permPollRef.current = null;
            }
          }
        } else if (type === 'overlay') {
          const granted = await appBlockerService.hasOverlayPermission();
          if (granted) {
            setOverlayGranted(true);
            haptics.success();
            if (permPollRef.current) {
              clearInterval(permPollRef.current);
              permPollRef.current = null;
            }
          }
        }
        if (Date.now() - startTime > 25000) {
          if (permPollRef.current) {
            clearInterval(permPollRef.current);
            permPollRef.current = null;
          }
        }
      } catch (e) {
        // ignore
      }
    }, 400);
  };

  useFocusEffect(
    useCallback(() => {
      checkAllPermissions();
      const heartbeat = setInterval(() => {
        checkAllPermissions();
      }, 1500);
      return () => {
        clearInterval(heartbeat);
        if (permPollRef.current) {
          clearInterval(permPollRef.current);
          permPollRef.current = null;
        }
      };
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
      if (permPollRef.current) {
        clearInterval(permPollRef.current);
        permPollRef.current = null;
      }
    };
  }, []);

  const triggerNativeUsage = () => {
    if (Platform.OS === 'android') {
      appBlockerService.requestUsagePermission();
      startFastPermissionPolling('usage');
    }
  };

  const triggerNativeOverlay = () => {
    if (Platform.OS === 'android') {
      appBlockerService.requestOverlayPermission();
      startFastPermissionPolling('overlay');
    }
  };

  const triggerNativeBattery = () => {
    if (Platform.OS === 'android') {
      appBlockerService.requestBatteryOptimizationExemption?.();
      startFastPermissionPolling('battery');
    }
  };

  const triggerNativeCamera = async () => {
    const res = await Camera.requestCameraPermissionsAsync();
    setCameraGranted(res.granted);
    checkAllPermissions();
  };

  const triggerNativeNotif = async () => {
    const res = await Notifications.requestPermissionsAsync();
    setNotifGranted(res.granted);
    checkAllPermissions();
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
      icon3DName: 'clock_green',
      action: triggerNativeUsage,
    },
    {
      id: 'overlay',
      title: 'Display Over Apps (Lock Shield)',
      explanation: 'ARISE displays the lock overlay on top of restricted apps when your time limit expires. This allows you to perform workouts to earn back your screen time.',
      icon3DName: 'layers_purple',
      action: triggerNativeOverlay,
    },
    {
      id: 'battery',
      title: 'Background Shield (Unrestricted Battery)',
      explanation: 'Device makers (Xiaomi, Samsung, OnePlus, Vivo) aggressively freeze background services. Granting unrestricted battery exemption ensures ARISE continuously protects your screen time without being killed.',
      icon3DName: 'battery_green',
      action: triggerNativeBattery,
    },
    {
      id: 'camera',
      title: 'Camera Access (AI Pose Tracker)',
      explanation: 'ARISE uses your phone camera for real-time on-device Google ML Kit body joint tracking. Camera frames are processed 100% in RAM and are never recorded or uploaded.',
      icon3DName: 'camera_dark',
      action: triggerNativeCamera,
    },
    {
      id: 'notif',
      title: 'Notifications (Session Alerts)',
      explanation: 'ARISE notifies you when your screen time passes expire, quest targets are achieved, or daily streaks are in danger of resetting.',
      icon3DName: 'bell_gold',
      action: triggerNativeNotif,
    },
  ];

  const getGrantedState = (id: string) => {
    if (id === 'usage') return usageGranted;
    if (id === 'overlay') return overlayGranted;
    if (id === 'battery') return batteryGranted;
    if (id === 'camera') return cameraGranted;
    return notifGranted;
  };

  const allGranted = usageGranted && overlayGranted && batteryGranted && cameraGranted && notifGranted;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <NeumorphicCircleButton
            size={38}
            onPress={() => router.back()}
            icon={<ArrowLeft size={18} color={colors.textPrimary} strokeWidth={2.5} />}
          />

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Permissions Hub</Text>

          <NeumorphicCircleButton
            size={38}
            onPress={() => {
              haptics.light();
              checkAllPermissions();
            }}
            icon={<RefreshCw size={17} color="#E53935" strokeWidth={2.5} />}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Overview Card */}
          <NeumorphicCard style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <View style={styles.shieldWrap}>
                <Icon3D name={allGranted ? 'checkmark_green' : 'padlock_red'} size={32} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrowTag}>SYSTEM PROTOCOL</Text>
                <Text style={[styles.overviewTitle, { color: colors.textPrimary }]}>
                  {allGranted ? 'System Shield Fully Active' : 'System Protection Required'}
                </Text>
                <Text style={[styles.overviewSubtitle, { color: colors.textSecondary }]}>
                  100% Offline & Private on your device
                </Text>
              </View>
            </View>
            <Text style={[styles.overviewDesc, { color: colors.textSecondary }]}>
              Android requires specific permissions to monitor app usage, enforce the screen-time lock, and detect body workouts. Tap any permission below to configure.
            </Text>
          </NeumorphicCard>

          {/* Permissions List */}
          <View style={styles.permList}>
            {permissionList.map((item) => {
              const isGranted = getGrantedState(item.id);

              return (
                <NeumorphicCard key={item.id} style={styles.permCard}>
                  <View style={styles.permCardHeader}>
                    <View style={styles.permIconWrap}>
                      <Icon3D name={item.icon3DName} size={36} />
                    </View>

                    <View style={styles.permCardText}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.permTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            isGranted ? styles.statusBadgeGranted : styles.statusBadgeRequired,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isGranted ? '#10B981' : '#E53935' },
                            ]}
                          >
                            {isGranted ? 'ACTIVE' : 'REQUIRED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.permDesc, { color: colors.textSecondary }]}>{item.explanation}</Text>
                    </View>
                  </View>

                  {!isGranted && (
                    <TouchableOpacity
                      style={styles.grantBtn}
                      onPress={() => requestWithExplanation(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.grantBtnText}>CONFIGURE PERMISSION</Text>
                      <ExternalLink size={14} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </NeumorphicCard>
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
                style={styles.modalActionBtn}
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
    paddingVertical: 10,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 19,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  overviewCard: {
    padding: 18,
    borderRadius: 22,
    gap: 12,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F6F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowTag: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#E53935',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  overviewTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  overviewSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  overviewDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  permList: {
    gap: 12,
  },
  permCard: {
    padding: 16,
    borderRadius: 22,
    gap: 14,
  },
  permCardHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  permIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F6F4EF',
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
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeGranted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeRequired: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  permDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    lineHeight: 16,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#E53935',
  },
  grantBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalActionBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
