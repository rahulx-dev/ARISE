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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  LayoutGrid,
  Check,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { appBlockerService } from '../../src/native';
import { db } from '../../src/database/client';
import { appRestriction } from '../../src/database/schema';
import { eq } from 'drizzle-orm';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

interface AppItem {
  packageName: string;
  appName: string;
  isRestricted: boolean;
}

export default function SelectAppsScreen() {
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

      const nonSystemApps = installed.filter((a) => !a.isSystemApp);
      const targetApps = nonSystemApps.length > 0 ? nonSystemApps : installed;

      const merged: AppItem[] = targetApps.map((app) => ({
        packageName: app.packageName,
        appName: app.appName,
        isRestricted: restrictedSet.has(app.packageName),
      }));

      // Sort alphabetically by appName
      merged.sort((a, b) => a.appName.localeCompare(b.appName));
      setAllApps(merged);
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

  const toggleAppRestriction = (packageName: string) => {
    haptics.light();
    setAllApps((prev) =>
      prev.map((app) =>
        app.packageName === packageName
          ? { ...app, isRestricted: !app.isRestricted }
          : app
      )
    );
  };

  const restrictedCount = useMemo(() => {
    return allApps.filter((a) => a.isRestricted).length;
  }, [allApps]);

  const handleSave = async () => {
    haptics.medium();
    try {
      for (const app of allApps) {
        const existing = await db
          .select()
          .from(appRestriction)
          .where(eq(appRestriction.packageName, app.packageName))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(appRestriction)
            .set({
              isRestricted: app.isRestricted ? 1 : 0,
            })
            .where(eq(appRestriction.packageName, app.packageName));
        } else if (app.isRestricted) {
          await db.insert(appRestriction).values({
            packageName: app.packageName,
            appName: app.appName,
            isRestricted: 1,
          });
        }
      }

      const restrictedPkgs = allApps
        .filter((a) => a.isRestricted)
        .map((a) => a.packageName);

      if (restrictedPkgs.length > 0) {
        appBlockerService.startMonitoring(restrictedPkgs);
      } else {
        appBlockerService.stopMonitoring();
      }

      haptics.success();
      router.back();
    } catch (e) {
      console.error('Error saving app restrictions:', e);
    }
  };

  const handleSelectAll = () => {
    haptics.light();
    setAllApps((prev) => prev.map((a) => ({ ...a, isRestricted: true })));
  };

  const handleClearAll = () => {
    haptics.light();
    setAllApps((prev) => prev.map((a) => ({ ...a, isRestricted: false })));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header: ← Select Apps */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Apps</Text>
          <TouchableOpacity onPress={loadApps} style={styles.circleBtn}>
            <RefreshCw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Permission Warnings if missing */}
        {(!hasUsagePerm || !hasOverlayPerm) && (
          <View style={styles.permWarningBox}>
            <ShieldAlert size={20} color={colors.accentGold} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.permWarningTitle}>Permissions Required</Text>
              <Text style={styles.permWarningDesc}>
                {!hasUsagePerm && !hasOverlayPerm
                  ? 'Usage Access & Display Overlay needed to lock apps.'
                  : !hasUsagePerm
                  ? 'Usage Access needed to detect active apps.'
                  : 'Display Overlay needed to show lock screen.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.permFixBtn}
              onPress={() => {
                haptics.medium();
                if (!hasUsagePerm) {
                  appBlockerService.requestUsagePermission();
                } else {
                  appBlockerService.requestOverlayPermission();
                }
              }}
            >
              <Text style={styles.permFixBtnText}>FIX</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar & Quick Toggles */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search installed apps..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Quick Action Pill Row */}
        <View style={styles.quickActionRow}>
          <Text style={styles.appCountLabel}>
            {filteredApps.length} Apps ({restrictedCount} restricted)
          </Text>
          <View style={styles.quickPills}>
            <TouchableOpacity style={styles.pillBtn} onPress={handleSelectAll}>
              <Text style={styles.pillBtnText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillBtn} onPress={handleClearAll}>
              <Text style={styles.pillBtnText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Scanning device for installed apps...</Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Smartphone size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching apps found</Text>
              <Text style={styles.emptyDesc}>Try adjusting your search query</Text>
            </View>
          ) : (
            <View style={styles.appsList}>
              {filteredApps.map((app) => (
                <TouchableOpacity
                  key={app.packageName}
                  style={styles.appRow}
                  onPress={() => toggleAppRestriction(app.packageName)}
                  activeOpacity={0.8}
                >
                  <View style={styles.appIconCircle}>
                    <Smartphone size={20} color={app.isRestricted ? colors.primary : colors.textMuted} />
                  </View>

                  <View style={styles.appMeta}>
                    <Text style={styles.appName}>{app.appName}</Text>
                    <Text style={styles.appPackage} numberOfLines={1}>
                      {app.packageName}
                    </Text>
                  </View>

                  {/* Square Green Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      app.isRestricted && styles.checkboxActive,
                    ]}
                  >
                    {app.isRestricted && (
                      <Check size={14} color="#0A0A0A" strokeWidth={3} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Sticky Bottom Button: [ Save Selection (5) ] */}
        <View style={styles.footer}>
          <MasterButton
            title={`Save Selection (${restrictedCount})`}
            onPress={handleSave}
            variant="green"
          />
        </View>
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
    paddingVertical: 12,
  },
  circleBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  gridBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  appsList: {
    gap: 14,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  appIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appMeta: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  appPackage: {
    fontSize: 11,
    color: colors.textMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2E2E2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  permWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E190A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A3A10',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  permWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accentGold,
  },
  permWarningDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  permFixBtn: {
    backgroundColor: colors.accentGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permFixBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A0A0A',
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  appCountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  quickPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    backgroundColor: '#181818',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#282828',
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
