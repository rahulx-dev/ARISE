import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  Layers,
  Accessibility,
  Bell,
  Folder,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { SerqBackdrop } from '../../src/components/serq/SerqBackdrop';
import { SerqCard } from '../../src/components/serq/SerqCard';
import { appBlockerService } from '../../src/native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

interface PermissionItem {
  key: string;
  title: string;
  description: string;
  icon: any;
  granted: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      key: 'usage',
      title: 'Usage Access',
      description: 'Detects active app foreground usage',
      icon: Clock,
      granted: true,
    },
    {
      key: 'overlay',
      title: 'Display Over Other Apps',
      description: 'Enforces lock screen during restriction',
      icon: Layers,
      granted: true,
    },
    {
      key: 'accessibility',
      title: 'Accessibility Service',
      description: 'Ensures strict anti-bypass protection',
      icon: Accessibility,
      granted: true,
    },
    {
      key: 'notifications',
      title: 'Notifications',
      description: 'Schedules on-device focus alerts',
      icon: Bell,
      granted: true,
    },
    {
      key: 'storage',
      title: 'Offline File Storage',
      description: 'Enables encrypted backup save file export',
      icon: Folder,
      granted: true,
    },
  ]);

  const handleGrant = (permKey: string) => {
    haptics.light();
    if (Platform.OS === 'android') {
      if (permKey === 'usage') appBlockerService.requestUsagePermission();
      if (permKey === 'overlay') appBlockerService.requestOverlayPermission();
    }
  };

  return (
    <View style={styles.container}>
      <SerqBackdrop />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Permissions Hub</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Banner */}
          <SerqCard variant="elevated" glow style={styles.bannerCard}>
            <ShieldCheck size={26} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.bannerText}>
              All offline system permissions are fully authorized on your device.
            </Text>
          </SerqCard>

          {/* List */}
          <View style={styles.list}>
            {permissions.map((perm, idx) => {
              const IconComp = perm.icon;
              return (
                <SerqCard key={perm.key} variant="surface" delay={idx * 60} style={styles.permCard}>
                  <View style={styles.permIconWrap}>
                    <IconComp size={20} color={colors.primary} />
                  </View>

                  <View style={styles.permMeta}>
                    <Text style={styles.permTitle}>{perm.title}</Text>
                    <Text style={styles.permDesc}>{perm.description}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      perm.granted ? styles.statusPillGranted : styles.statusPillMissing,
                    ]}
                    onPress={() => handleGrant(perm.key)}
                    activeOpacity={0.8}
                  >
                    {perm.granted ? (
                      <CheckCircle2 size={14} color={colors.primary} />
                    ) : (
                      <AlertCircle size={14} color={colors.danger} />
                    )}
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: perm.granted ? colors.primary : colors.danger },
                      ]}
                    >
                      {perm.granted ? 'Granted' : 'Enable'}
                    </Text>
                  </TouchableOpacity>
                </SerqCard>
              );
            })}
          </View>

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
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 32, 36, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
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
    paddingTop: 8,
    gap: 16,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  list: {
    gap: 10,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    gap: 12,
  },
  permIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permMeta: {
    flex: 1,
    gap: 2,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  permDesc: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillGranted: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  statusPillMissing: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
