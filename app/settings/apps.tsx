import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  AppState,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Lock,
  Unlock,
  HelpCircle,
  ShieldAlert,
  Smartphone,
} from 'lucide-react-native';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { appBlockerService, InstalledAppItem } from '../../src/native';
import { db } from '../../src/database/client';
import { appRestriction } from '../../src/database/schema';
import { eq } from 'drizzle-orm';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

interface AppItem {
  packageName: string;
  appName: string;
  isRestricted: boolean;
  appIconBase64?: string;
}

export default function LockedAppsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const [loading, setLoading] = useState<boolean>(true);
  const [hasUsagePerm, setHasUsagePerm] = useState<boolean>(true);
  const [hasOverlayPerm, setHasOverlayPerm] = useState<boolean>(true);
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadApps();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadApps();
      }
    });

    return () => sub.remove();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const [usagePerm, overlayPerm] = await Promise.all([
        appBlockerService.hasUsagePermission(),
        appBlockerService.hasOverlayPermission(),
      ]);
      setHasUsagePerm(usagePerm);
      setHasOverlayPerm(overlayPerm);

      const installed = await appBlockerService.getInstalledApps();
      const saved = await db.select().from(appRestriction);
      const restrictedSet = new Set(
        saved.filter((r) => r.isRestricted === 1).map((r) => r.packageName)
      );

      if (installed.length > 0) {
        const merged: AppItem[] = installed
          .filter((a) => !a.isSystemApp || restrictedSet.has(a.packageName))
          .map((app) => ({
            packageName: app.packageName,
            appName: app.appName,
            isRestricted: restrictedSet.has(app.packageName),
            appIconBase64: app.appIconBase64,
          }));
        merged.sort((a, b) => (b.isRestricted ? 1 : 0) - (a.isRestricted ? 1 : 0));
        setAllApps(merged);
      } else {
        // Only on Web preview fallback if no native apps found
        if (Platform.OS === 'web') {
          const webDemo = [
            { packageName: 'com.instagram.android', appName: 'Instagram', isRestricted: restrictedSet.has('com.instagram.android') },
            { packageName: 'com.google.android.youtube', appName: 'YouTube', isRestricted: restrictedSet.has('com.google.android.youtube') },
            { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', isRestricted: restrictedSet.has('com.zhiliaoapp.musically') },
          ];
          setAllApps(webDemo);
        } else {
          setAllApps([]);
        }
      }
    } catch (e) {
      console.error('Error loading apps:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return allApps;
    const q = searchQuery.toLowerCase();
    return allApps.filter(
      (app) =>
        app.appName.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q)
    );
  }, [allApps, searchQuery]);

  const toggleAppRestriction = async (item: AppItem) => {
    haptics.medium();
    const newStatus = !item.isRestricted;

    // Optimistic UI update
    setAllApps((prev) =>
      prev.map((a) =>
        a.packageName === item.packageName
          ? { ...a, isRestricted: newStatus }
          : a
      )
    );

    try {
      const existing = await db
        .select()
        .from(appRestriction)
        .where(eq(appRestriction.packageName, item.packageName));

      if (existing.length > 0) {
        await db
          .update(appRestriction)
          .set({ isRestricted: newStatus ? 1 : 0 })
          .where(eq(appRestriction.packageName, item.packageName));
      } else {
        await db.insert(appRestriction).values({
          packageName: item.packageName,
          appName: item.appName,
          isRestricted: newStatus ? 1 : 0,
        });
      }

      // Sync active restricted packages with native monitor
      const updatedSaved = await db.select().from(appRestriction);
      const restrictedPackages = updatedSaved
        .filter((r) => r.isRestricted === 1)
        .map((r) => r.packageName);

      appBlockerService.setRestrictedPackages(restrictedPackages);
    } catch (e) {
      console.error('Error updating app restriction:', e);
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
            <Text style={styles.headerTitle}>Locked Apps</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                Alert.alert(
                  'Locked Apps Protocol',
                  'Apps with lock enabled require screen-time tokens earned from physical exercise and focus sessions to open.'
                )
              }
              activeOpacity={0.8}
            >
              <HelpCircle size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Permission Alert if missing */}
          {(!hasUsagePerm || !hasOverlayPerm) && (
            <TouchableOpacity
              style={styles.permBanner}
              onPress={() => router.push('/permissions' as any)}
              activeOpacity={0.8}
            >
              <ShieldAlert size={22} color={colors.accentGold} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.permBannerTitle}>Permissions Required</Text>
                <Text style={styles.permBannerDesc}>
                  Grant Usage Access and Display Over Apps for instant lock enforcement.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search installed apps..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* App List */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Scanning device for installed applications...</Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Smartphone size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Applications Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No apps match your search query.'
                  : 'Grant Usage Access permission to view and lock installed apps.'}
              </Text>
            </View>
          ) : (
            <View style={styles.appList}>
              {filteredApps.map((item) => (
                <TouchableOpacity
                  key={item.packageName}
                  onPress={() => toggleAppRestriction(item)}
                  activeOpacity={0.8}
                >
                  <GlowCard
                    variant={item.isRestricted ? 'glow' : 'default'}
                    style={styles.appCard}
                  >
                    <View style={styles.appLeft}>
                      <View
                        style={[
                          styles.appIconCircle,
                          item.isRestricted && styles.appIconCircleLocked,
                        ]}
                      >
                        {item.appIconBase64 ? (
                          <Image
                            source={{ uri: item.appIconBase64 }}
                            style={styles.appIconImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <Smartphone
                            size={20}
                            color={item.isRestricted ? colors.primary : colors.textSecondary}
                          />
                        )}
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.appName}>{item.appName}</Text>
                        <Text style={styles.appPkg} numberOfLines={1}>
                          {item.packageName}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.lockBadge,
                        item.isRestricted && styles.lockBadgeActive,
                      ]}
                    >
                      {item.isRestricted ? (
                        <Lock size={18} color={colors.primary} />
                      ) : (
                        <Unlock size={18} color={colors.textMuted} />
                      )}
                    </View>
                  </GlowCard>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 16,
    paddingTop: 4,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E190A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A3A10',
    padding: 14,
  },
  permBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accentGold,
  },
  permBannerDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161616',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#242424',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 16,
  },
  appList: {
    gap: 10,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appIconCircleLocked: {
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
  },
  appIconImg: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  appName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  appPkg: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  lockBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadgeActive: {
    backgroundColor: 'rgba(209, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.3)',
  },
});
