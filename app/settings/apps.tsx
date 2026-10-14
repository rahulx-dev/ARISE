import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ArrowLeft,
  Search,
  Lock,
  ShieldAlert,
  Shield,
  Clock,
  ChevronRight,
  X,
  Smartphone,
} from "lucide-react-native";
import { appBlockerService } from "../../src/native";
import { db } from "../../src/database/client";
import { appRestriction } from "../../src/database/schema";
import { eq } from "drizzle-orm";
import { useHaptics } from "../../src/hooks/useHaptics";
import { useTheme } from "../../src/hooks/useTheme";
import { showIOSAlert } from "../../src/components/ios/IOSAlertModal";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { fontFamilies } from "../../src/theme/typography";
import { NeumorphicCard, NeumorphicCircleButton } from "../../src/components/ui/NeumorphicCard";
import { Icon3D } from "../../src/components/ui/Icon3D";

interface AppItem {
  packageName: string;
  appName: string;
  isRestricted: boolean;
  appIconBase64?: string;
}

export default function LockedAppsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();
  const { dailyBudgetMinutes, updateSetting } = useSettingsStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [hasUsagePerm, setHasUsagePerm] = useState<boolean>(true);
  const [hasOverlayPerm, setHasOverlayPerm] = useState<boolean>(true);
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCustomTimeModal, setShowCustomTimeModal] =
    useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>("");

  useEffect(() => {
    loadApps();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
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

      // Fetch ONLY real installed apps from phone's PackageManager
      const installed = await appBlockerService.getInstalledApps();
      const saved = await db.select().from(appRestriction);
      const restrictedSet = new Set(
        saved
          .filter(
            (r: { isRestricted: number; packageName: string }) =>
              r.isRestricted === 1
          )
          .map((r: { packageName: string }) => r.packageName)
      );

      if (installed && installed.length > 0) {
        const merged: AppItem[] = installed.map((app) => ({
          packageName: app.packageName,
          appName: app.appName,
          isRestricted: restrictedSet.has(app.packageName),
          appIconBase64: app.appIconBase64,
        }));
        merged.sort(
          (a, b) => (b.isRestricted ? 1 : 0) - (a.isRestricted ? 1 : 0)
        );
        setAllApps(merged);
      } else {
        // No fake/default apps â€” show empty list if nothing installed on platform
        setAllApps([]);
      }
    } catch (e) {
      console.error("Error loading apps:", e);
      setAllApps([]);
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
    const nextRestrictedPackages = allApps
      .map((app) =>
        app.packageName === item.packageName
          ? { ...app, isRestricted: newStatus }
          : app
      )
      .filter((app) => app.isRestricted)
      .map((app) => app.packageName);

    // Optimistic UI update
    setAllApps((prev) => {
      return prev.map((a) =>
        a.packageName === item.packageName
          ? { ...a, isRestricted: newStatus }
          : a
      );
    });

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

      // Sync active restrictions to native daemon using the latest optimistic state.
      if (nextRestrictedPackages.length > 0) {
        appBlockerService.startMonitoring(nextRestrictedPackages);
      } else {
        appBlockerService.stopMonitoring();
      }
    } catch (e) {
      console.error("Failed to toggle app restriction:", e);
      // Revert optimistic update
      setAllApps((prev) =>
        prev.map((a) =>
          a.packageName === item.packageName
            ? { ...a, isRestricted: item.isRestricted }
            : a
        )
      );
      showIOSAlert("Database Error", "Could not update app lock status.");
    }
  };

  const totalRestrictedCount = allApps.filter((a) => a.isRestricted).length;

  const handleCustomTimeSubmit = () => {
    const parsed = parseInt(customMinutesInput, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      haptics.success();
      applyDailyBudget(parsed);
      setShowCustomTimeModal(false);
      setCustomMinutesInput("");
    } else {
      haptics.warning();
    }
  };

  const isPresetSelected = (mins: number) => dailyBudgetMinutes === mins;
  const isCustomSelected = ![0, 15, 30, 45, 60, 120].includes(
    dailyBudgetMinutes
  );

  const applyDailyBudget = (minutes: number) => {
    updateSetting("dailyBudgetMinutes", minutes);
    appBlockerService.setAppBudget?.(null, minutes);
    appBlockerService.setRestrictedPackages(
      allApps.filter((app) => app.isRestricted).map((app) => app.packageName)
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* 1. Header Row (1:1 with reference) */}
      <View style={styles.topHeader}>
        <NeumorphicCircleButton
          size={38}
          onPress={() => router.back()}
          icon={<ArrowLeft size={18} color={colors.textPrimary} strokeWidth={2.5} />}
        />

        <View style={styles.headerCenterCol}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Locked Apps
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Focus Shield Protocol
          </Text>
        </View>

        <View style={styles.lockedBadgePill}>
          <Icon3D name="padlock_red" size={16} />
          <Text style={styles.lockedBadgeText}>
            {totalRestrictedCount} Locked
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Permissions Banner (if missing) */}
        {(!hasUsagePerm || !hasOverlayPerm) && (
          <View
            style={[
              styles.permCard,
              {
                backgroundColor: isDark ? "#1A1215" : "#FFF5F5",
                borderColor: isDark ? "#3D1C22" : "#FFE4E6",
              },
            ]}
          >
            <View style={styles.permIconCircle}>
              <ShieldAlert size={20} color="#EF4444" />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.permTitle,
                  { color: isDark ? "#FFFFFF" : "#0F172A" },
                ]}
              >
                Permissions Required
              </Text>
              <Text
                style={[
                  styles.permDesc,
                  { color: isDark ? "#8E8E93" : "#64748B" },
                ]}
              >
                App blocker requires system permissions to lock apps during focus.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.permGrantBtn}
              onPress={() => router.push("/permissions" as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.permGrantBtnText}>Grant</Text>
              <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Daily Screen Time Allowance Card */}
        <NeumorphicCard style={styles.allowanceCard}>
          <View style={styles.allowanceHeaderRow}>
            <View style={styles.clockIconCircle}>
              <Icon3D name="clock_green" size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.allowanceTitle, { color: colors.textPrimary }]}>
                Daily Screen Time Allowance
              </Text>
              <Text style={[styles.allowanceSubtitle, { color: colors.textSecondary }]}>
                Free minutes per app before lockdown triggers.
              </Text>
            </View>
          </View>

          {/* Row 1 Presets */}
          <View style={styles.pillsRow}>
            {[
              { mins: 0, label: "0m\n(Immediate)" },
              { mins: 15, label: "15 mins" },
              { mins: 30, label: "30 mins" },
              { mins: 45, label: "45 mins" },
            ].map((item) => {
              const isSelected = isPresetSelected(item.mins);
              return (
                <TouchableOpacity
                  key={item.mins}
                  style={[
                    styles.allowancePill,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? "rgba(239, 68, 68, 0.15)"
                          : "#FFF5F5"
                        : isDark
                        ? "#161822"
                        : "#F1F5F9",
                      borderColor: isSelected ? "#EF4444" : "transparent",
                    },
                  ]}
                  onPress={() => {
                    haptics.light();
                    applyDailyBudget(item.mins);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.allowancePillText,
                      {
                        color: isSelected
                          ? "#EF4444"
                          : isDark
                          ? "#FFFFFF"
                          : "#0F172A",
                        fontFamily: isSelected ? fontFamilies.semiBold : fontFamilies.medium,
                        fontWeight: isSelected ? "600" : "500",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Row 2 Presets */}
          <View style={styles.pillsRow}>
            {[
              { mins: 60, label: "60 mins" },
              { mins: 120, label: "120 mins" },
            ].map((item) => {
              const isSelected = isPresetSelected(item.mins);
              return (
                <TouchableOpacity
                  key={item.mins}
                  style={[
                    styles.allowancePillWide,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? "rgba(239, 68, 68, 0.15)"
                          : "#FFF5F5"
                        : isDark
                        ? "#161822"
                        : "#F1F5F9",
                      borderColor: isSelected ? "#EF4444" : "transparent",
                    },
                  ]}
                  onPress={() => {
                    haptics.light();
                    applyDailyBudget(item.mins);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.allowancePillText,
                      {
                        color: isSelected
                          ? "#EF4444"
                          : isDark
                          ? "#FFFFFF"
                          : "#0F172A",
                        fontFamily: isSelected ? fontFamilies.semiBold : fontFamilies.medium,
                        fontWeight: isSelected ? "600" : "500",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom Button */}
            <TouchableOpacity
              style={[
                styles.allowancePillWide,
                {
                  backgroundColor: isCustomSelected
                    ? isDark
                      ? "rgba(239, 68, 68, 0.15)"
                      : "#FFF5F5"
                    : isDark
                    ? "#161822"
                    : "#F1F5F9",
                  borderColor: isCustomSelected ? "#EF4444" : "transparent",
                },
              ]}
              onPress={() => {
                haptics.light();
                setShowCustomTimeModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.allowancePillText,
                  {
                    color: isCustomSelected
                      ? "#EF4444"
                      : isDark
                      ? "#FFFFFF"
                      : "#0F172A",
                    fontFamily: isCustomSelected ? fontFamilies.semiBold : fontFamilies.medium,
                    fontWeight: isCustomSelected ? "600" : "500",
                  },
                ]}
              >
                {isCustomSelected ? `${dailyBudgetMinutes} mins` : "Custom"}
              </Text>
            </TouchableOpacity>
          </View>
        </NeumorphicCard>

        {/* 4. Search Bar */}
        <View style={styles.searchBarWrap}>
          <Search size={18} color="#6B7280" />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.textPrimary },
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search installed apps..."
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Section Header */}
        <View style={styles.listSectionHeader}>
          <Text
            style={[
              styles.listSectionTitle,
              { color: colors.textPrimary },
            ]}
          >
            All Installed Apps ({filteredApps.length})
          </Text>
          <Text
            style={[
              styles.listSectionSub,
              { color: colors.textSecondary },
            ]}
          >
            Tap to lock
          </Text>
        </View>

        {/* 6. Apps List Container */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E53935" />
            <Text
              style={[
                styles.loadingText,
                { color: colors.textSecondary },
              ]}
            >
              Scanning installed apps...
            </Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <NeumorphicCard style={styles.emptyStateCard}>
            <Smartphone size={36} color="#9CA3AF" />
            <Text
              style={[
                styles.emptyStateTitle,
                { color: colors.textPrimary },
              ]}
            >
              {searchQuery ? "No matching apps found" : "No installed apps detected"}
            </Text>
            <Text
              style={[
                styles.emptyStateDesc,
                { color: colors.textSecondary },
              ]}
            >
              {searchQuery
                ? "Try searching for a different package or app name."
                : "Real installed applications from your device will appear here."}
            </Text>
          </NeumorphicCard>
        ) : (
          <NeumorphicCard style={styles.appsListCard} padding={0}>
            {filteredApps.map((item, index) => {
              const isLocked = item.isRestricted;
              const isLast = index === filteredApps.length - 1;

              return (
                <View key={item.packageName}>
                  <TouchableOpacity
                    style={styles.appRow}
                    onPress={() => toggleAppRestriction(item)}
                    activeOpacity={0.7}
                  >
                    {/* App Icon */}
                    {item.appIconBase64 && item.appIconBase64.trim() ? (
                      <Image
                        source={{
                          uri: item.appIconBase64.startsWith('data:')
                            ? item.appIconBase64
                            : `data:image/png;base64,${item.appIconBase64}`,
                        }}
                        style={styles.appIconImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <View
                        style={[
                          styles.appIconPlaceholder,
                          {
                            backgroundColor: isDark ? "#1C1E2A" : "#EEF2FF",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.appIconInitial,
                            { color: isDark ? "#8E8E93" : "#4F46E5" },
                          ]}
                        >
                          {item.appName ? item.appName.charAt(0).toUpperCase() : "A"}
                        </Text>
                      </View>
                    )}

                    {/* App Name & Package */}
                    <View style={styles.appMetaCol}>
                      <Text
                        style={[
                          styles.appNameText,
                          { color: isDark ? "#FFFFFF" : "#0F172A" },
                        ]}
                        numberOfLines={1}
                      >
                        {item.appName}
                      </Text>
                      <Text
                        style={[
                          styles.appPackageText,
                          { color: isDark ? "#8E8E93" : "#64748B" },
                        ]}
                        numberOfLines={1}
                      >
                        {item.packageName}
                      </Text>
                    </View>

                    {/* Lock Toggle Pill */}
                    <View
                      style={[
                        styles.lockStatusPill,
                        isLocked
                          ? styles.lockStatusPillLocked
                          : {
                              backgroundColor: isDark
                                ? "#1C1E2A"
                                : "#F1F5F9",
                            },
                      ]}
                    >
                      <Lock
                        size={13}
                        color={isLocked ? "#FFFFFF" : isDark ? "#8E8E93" : "#64748B"}
                        strokeWidth={2.4}
                      />
                      <Text
                        style={[
                          styles.lockStatusText,
                          {
                            color: isLocked
                              ? "#FFFFFF"
                              : isDark
                              ? "#8E8E93"
                              : "#64748B",
                          },
                        ]}
                      >
                        {isLocked ? "LOCKED" : "OFF"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {!isLast && (
                    <View
                      style={[
                        styles.appRowDivider,
                        {
                          backgroundColor: isDark ? "#1C1E2A" : "#F8FAFC",
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </NeumorphicCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Allowance Modal */}
      <Modal
        visible={showCustomTimeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCustomTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.customModalCard,
              {
                backgroundColor: isDark ? "#111218" : "#FFFFFF",
                borderColor: isDark ? "#1C1E2A" : "#F1F5F9",
              },
            ]}
          >
            <View style={styles.customModalHeader}>
              <Text
                style={[
                  styles.customModalTitle,
                  { color: isDark ? "#FFFFFF" : "#0F172A" },
                ]}
              >
                Custom Time Allowance
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomTimeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={isDark ? "#8E8E93" : "#64748B"} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.customModalDesc,
                { color: isDark ? "#8E8E93" : "#64748B" },
              ]}
            >
              Enter daily free usage limit in minutes per locked app:
            </Text>

            <TextInput
              style={[
                styles.customInput,
                {
                  backgroundColor: isDark ? "#161822" : "#F1F5F9",
                  borderColor: isDark ? "#232A38" : "#E2E8F0",
                  color: isDark ? "#FFFFFF" : "#0F172A",
                },
              ]}
              value={customMinutesInput}
              onChangeText={setCustomMinutesInput}
              placeholder="e.g. 20"
              placeholderTextColor={isDark ? "#8E8E93" : "#94A3B8"}
              keyboardType="number-pad"
              autoFocus
            />

            <View style={styles.customModalActions}>
              <TouchableOpacity
                style={[
                  styles.customCancelBtn,
                  { backgroundColor: isDark ? "#1C1E2A" : "#F1F5F9" },
                ]}
                onPress={() => setShowCustomTimeModal(false)}
              >
                <Text
                  style={[
                    styles.customCancelBtnText,
                    { color: isDark ? "#FFFFFF" : "#0F172A" },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.customSaveBtn}
                onPress={handleCustomTimeSubmit}
              >
                <Text style={styles.customSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 40,
  },

  // 1. Top Header Row
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCenterCol: {
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  lockedBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  lockedBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: "#E53935",
  },

  // 2. Permissions Required Banner
  permCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    padding: 16,
    gap: 12,
  },
  permIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  permTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 14.5,
  },
  permDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    lineHeight: 15,
  },
  permGrantBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E53935",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  permGrantBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  // 3. Daily Screen Time Allowance Card
  allowanceCard: {
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  allowanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F4EF',
    alignItems: "center",
    justifyContent: "center",
  },
  allowanceTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
  },
  allowanceSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginTop: 1,
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  allowancePill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#FFFFFF',
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  allowancePillWide: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#FFFFFF',
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  allowancePillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    textAlign: "center",
  },

  // 4. Search Bar
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },

  // 5. Section Header
  listSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
  },
  listSectionSub: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // 6. Apps List Card
  appsListCard: {
    borderRadius: 22,
    overflow: "hidden",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
  },
  appIconImg: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  appIconPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appIconInitial: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: "600",
  },
  appMetaCol: {
    flex: 1,
    gap: 2,
  },
  appNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14.5,
    fontWeight: "600",
  },
  appPackageText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: "400",
  },
  lockStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  lockStatusPillLocked: {
    backgroundColor: "#E53935",
  },
  lockStatusText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  appRowDivider: {
    height: 1,
    marginLeft: 72,
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  emptyStateCard: {
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    gap: 10,
  },
  emptyStateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  emptyStateDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Custom Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  customModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 14,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  customModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customModalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
  },
  customModalDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  customInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    backgroundColor: '#F6F4EF',
    paddingHorizontal: 14,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
  },
  customModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  customCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#F3F4F6',
  },
  customCancelBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: '#6B7280',
  },
  customSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
  },
  customSaveBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
});
