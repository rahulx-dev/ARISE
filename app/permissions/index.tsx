import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { appBlockerService } from '../../src/native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

export default function PermissionsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const [usageGranted, setUsageGranted] = useState<boolean>(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(false);
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);

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
    React.useCallback(() => {
      checkAllPermissions();
    }, [])
  );

  useEffect(() => {
    checkAllPermissions();

    // Check again whenever user returns from Android Settings
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleGrantUsage = () => {
    haptics.medium();
    if (Platform.OS === 'android') {
      appBlockerService.requestUsagePermission();
    }
  };

  const handleGrantOverlay = () => {
    haptics.medium();
    if (Platform.OS === 'android') {
      appBlockerService.requestOverlayPermission();
    }
  };

  const handleGrantCamera = async () => {
    haptics.medium();
    const res = await Camera.requestCameraPermissionsAsync();
    setCameraGranted(res.granted);
  };

  const handleGrantNotif = async () => {
    haptics.medium();
    const res = await Notifications.requestPermissionsAsync();
    setNotifGranted(res.granted);
  };

  const permissionList = [
    {
      id: 'usage',
      title: 'Usage Access (App Monitor)',
      desc: 'Detects foreground restricted apps in real-time to enforce time limits.',
      icon: Clock,
      granted: usageGranted,
      onGrant: handleGrantUsage,
      actionLabel: 'OPEN SETTINGS',
    },
    {
      id: 'overlay',
      title: 'Display Over Apps (Lock Screen)',
      desc: 'Enforces the ARISE full-screen discipline overlay when time expires.',
      icon: Layers,
      granted: overlayGranted,
      onGrant: handleGrantOverlay,
      actionLabel: 'OPEN SETTINGS',
    },
    {
      id: 'camera',
      title: 'Camera Access (AI Rep Tracker)',
      desc: 'Powers real-time computer vision body joint tracking for push-ups & squats.',
      icon: CameraIcon,
      granted: cameraGranted,
      onGrant: handleGrantCamera,
      actionLabel: 'ALLOW CAMERA',
    },
    {
      id: 'notif',
      title: 'Notifications (Session Alerts)',
      desc: 'Displays active countdown chronometer and streak deadline reminders.',
      icon: Bell,
      granted: notifGranted,
      onGrant: handleGrantNotif,
      actionLabel: 'ALLOW ALERTS',
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Permissions Hub</Text>

          <TouchableOpacity
            style={styles.backBtn}
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
          <MasterCard style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Shield size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewTitle}>System Protection Protocol</Text>
                <Text style={styles.overviewSubtitle}>
                  100% Offline & Private on your device.
                </Text>
              </View>
            </View>
            <Text style={styles.overviewDesc}>
              Android requires special permissions to monitor app usage and display the screen-time lock. Tap below to grant required permissions.
            </Text>
          </MasterCard>

          {/* Permissions List */}
          <View style={styles.permList}>
            {permissionList.map((item) => {
              const IconComp = item.icon;
              return (
                <MasterCard key={item.id} style={styles.permCard}>
                  <View style={styles.permCardHeader}>
                    <View style={styles.permIconWrap}>
                      <IconComp
                        size={22}
                        color={item.granted ? colors.primary : colors.textMuted}
                      />
                    </View>

                    <View style={styles.permMetaWrap}>
                      <Text style={styles.permTitle}>{item.title}</Text>
                      <Text style={styles.permDesc}>{item.desc}</Text>
                    </View>
                  </View>

                  <View style={styles.permActionRow}>
                    {item.granted ? (
                      <View style={styles.grantedBadge}>
                        <CheckCircle2 size={16} color={colors.primary} />
                        <Text style={styles.grantedBadgeText}>PERMISSION GRANTED</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.grantActionBtn}
                        onPress={item.onGrant}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.grantActionBtnText}>{item.actionLabel}</Text>
                        <ExternalLink size={14} color="#000000" />
                      </TouchableOpacity>
                    )}
                  </View>
                </MasterCard>
              );
            })}
          </View>

          <MasterButton
            title="SAVE & RETURN"
            onPress={() => router.back()}
            variant="green"
            style={{ marginTop: 8 }}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  overviewCard: {
    padding: 18,
    gap: 10,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  overviewSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  overviewDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  permList: {
    gap: 12,
  },
  permCard: {
    padding: 16,
    gap: 12,
  },
  permCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  permIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permMetaWrap: {
    flex: 1,
    gap: 4,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  permDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  permActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 4,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 106, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  grantedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  grantActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  grantActionBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
});
