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
  ArrowLeft,
  Search,
  Lock,
  LockOpen,
  ShieldAlert,
  Smartphone,
  Check,
  Shield,
  Sparkles,
  Sliders,
  X,
} from "lucide-react-native";
import { appBlockerService } from "../../src/native";
import { db } from "../../src/database/client";
import { appRestriction } from "../../src/database/schema";
import { eq } from "drizzle-orm";
import { useHaptics } from "../../src/hooks/useHaptics";
import { useTheme } from "../../src/hooks/useTheme";
import { showIOSAlert } from "../../src/components/ios/IOSAlertModal";
import { HoloLoader } from "../../src/components/ui/HoloLoader";
import { useSettingsStore } from "../../src/stores/useSettingsStore";

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

      const installed = await appBlockerService.getInstalledApps();
      const saved = await db.select().from(appRestriction);
      const restrictedSet = new Set(
        saved
          .filter(
            (r: { isRestricted: number; packageName: string }) =>
              r.isRestricted === 1,
          )
          .map((r: { packageName: string }) => r.packageName),
      );

      if (installed.length > 0) {
        const merged: AppItem[] = installed.map((app) => ({
          packageName: app.packageName,
          appName: app.appName,
          isRestricted: restrictedSet.has(app.packageName),
          appIconBase64: app.appIconBase64,
        }));
        merged.sort(
          (a, b) => (b.isRestricted ? 1 : 0) - (a.isRestricted ? 1 : 0),
        );
        setAllApps(merged);
      } else {
        if (Platform.OS === "web") {
          const webDemo = [
            {
              packageName: "com.instagram.android",
              appName: "Instagram",
              isRestricted: restrictedSet.has("com.instagram.android"),
            },
            {
              packageName: "com.google.android.youtube",
              appName: "YouTube",
              isRestricted: restrictedSet.has("com.google.android.youtube"),
            },
            {
              packageName: "com.zhiliaoapp.musically",
              appName: "TikTok",
              isRestricted: restrictedSet.has("com.zhiliaoapp.musically"),
            },
          ];
          setAllApps(webDemo);
        } else {
          setAllApps([]);
        }
      }
    } catch (e) {
      console.error("Error loading apps:", e);
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
        app.packageName.toLowerCase().includes(q),
    );
  }, [allApps, searchQuery]);

  const restrictedApps = useMemo(
    () => filteredApps.filter((a) => a.isRestricted),
    [filteredApps],
  );
  const availableApps = useMemo(
    () => filteredApps.filter((a) => !a.isRestricted),
    [filteredApps],
  );

  const toggleAppRestriction = async (item: AppItem) => {
    haptics.medium();
    const newStatus = !item.isRestricted;

    // Optimistic UI update
    setAllApps((prev) =>
      prev.map((a) =>
        a.packageName === item.packageName
          ? { ...a, isRestricted: newStatus }
          : a,
      ),
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

      // Sync active restrictions to native daemon
      const updatedRestricted = allApps
        .map((a) =>
          a.packageName === item.packageName
            ? { ...a, isRestricted: newStatus }
            : a,
        )
        .filter((a) => a.isRestricted)
        .map((a) => a.packageName);

      if (updatedRestricted.length > 0) {
        appBlockerService.startMonitoring(updatedRestricted);
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
            : a,
        ),
      );
      showIOSAlert("Database Error", "Could not update app lock status.");
    }
  };

  const totalRestrictedCount = allApps.filter((a) => a.isRestricted).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={19} color={colors.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                LOCKED APPS
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Focus Shield Protocol
              </Text>
            </View>
          </View>

          <View style={styles.activeCountBadge}>
            <Shield size={13} color="#0A84FF" />
            <Text style={styles.activeCountText}>
              {totalRestrictedCount} LOCKED
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Permission Banner if missing */}
          {(!hasUsagePerm || !hasOverlayPerm) && (
            <TouchableOpacity
              style={styles.permBanner}
              onPress={() => router.push("/permissions" as any)}
              activeOpacity={0.85}
            >
              <ShieldAlert size={20} color="#F59E0B" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.permBannerTitle}>PERMISSIONS REQUIRED</Text>
                <Text style={styles.permBannerDesc}>
                  App blocker requires system permissions to lock apps during
                  focus.
                </Text>
              </View>
              <View style={styles.permBannerBtn}>
                <Text style={styles.permBannerBtnText}>GRANT</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Daily Screen Time Budget Allowance Card */}
          <View
            style={[
              styles.budgetBox,
              {
                backgroundColor: isDark ? "#0D0F17" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ gap: 2 }}>
              <Text
                style={[
                  styles.budgetHeaderTitle,
                  { color: colors.textPrimary },
                ]}
              >
                DAILY SCREEN TIME ALLOWANCE
              </Text>
              <Text
                style={[
                  styles.budgetHeaderSub,
                  { color: colors.textSecondary },
                ]}
              >
                Free minutes per app before lockdown quarantine triggers:
              </Text>
            </View>
            <View style={styles.budgetPillsRow}>
              {[
                { mins: 0, label: "0m (Immediate)" },
                { mins: 15, label: "15 Mins" },
                { mins: 30, label: "30 Mins" },
                { mins: 45, label: "45 Mins" },
                { mins: 60, label: "60 Mins" },
                { mins: 120, label: "120 Mins" },
              ].map((b) => {
                const isSelected = dailyBudgetMinutes === b.mins;
                return (
                  <TouchableOpacity
                    key={b.mins}
                    style={[
                      styles.budgetPillBtn,
                      {
                        backgroundColor: isSelected
                          ? "rgba(10, 132, 255, 0.18)"
                          : isDark
                            ? "#161926"
                            : "#F1F5F9",
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      updateSetting("dailyBudgetMinutes", b.mins);
                      appBlockerService.setAppBudget?.(null, b.mins);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: isSelected ? "800" : "600",
                        color: isSelected ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Custom Time Option Button */}
              {(() => {
                const isCustom = ![0, 15, 30, 45, 60, 120].includes(
                  dailyBudgetMinutes,
                );
                return (
                  <TouchableOpacity
                    style={[
                      styles.budgetPillBtn,
                      {
                        backgroundColor: isCustom
                          ? "rgba(10, 132, 255, 0.18)"
                          : isDark
                            ? "#161926"
                            : "#F1F5F9",
                        borderColor: isCustom ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setCustomMinutesInput(String(dailyBudgetMinutes || 25));
                      setShowCustomTimeModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: isCustom ? "800" : "600",
                        color: isCustom ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {isCustom
                        ? `${dailyBudgetMinutes}m (Custom)`
                        : "+ Custom"}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? "#0C101A" : colors.surfaceLight,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search apps..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    fontWeight: "700",
                  }}
                >
                  CLEAR
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* App List */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <HoloLoader
                message="SCANNING INSTALLED APPS"
                subMessage="DETECTING APPLICATION PACKAGES..."
              />
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Smartphone size={40} color="#334155" />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Apps Found
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                {searchQuery
                  ? "No application matches your search keyword."
                  : "No installed apps detected on this system."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 22 }}>
              {/* 1. RESTRICTED / SHIELDED APPS GROUP */}
              {restrictedApps.length > 0 && (
                <View style={styles.groupSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View style={styles.activeDot} />
                      <Text
                        style={[
                          styles.sectionHeaderTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        LOCKED APPS ({restrictedApps.length})
                      </Text>
                    </View>
                    <Text
                      style={[styles.sectionHeaderSub, { color: "#0A84FF" }]}
                    >
                      10 Pushups to unlock
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.groupedCard,
                      {
                        backgroundColor: isDark ? "#0A0D15" : colors.card,
                        borderColor: "#1E293B",
                      },
                    ]}
                  >
                    {restrictedApps.map((item, idx) => (
                      <View key={item.packageName}>
                        <TouchableOpacity
                          style={[styles.appRow, styles.appRowRestricted]}
                          onPress={() => toggleAppRestriction(item)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.appRowLeft}>
                            <View style={styles.appIconWrapper}>
                              {item.appIconBase64 ? (
                                <Image
                                  source={{ uri: item.appIconBase64 }}
                                  style={styles.appIconImg}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Smartphone size={24} color="#0A84FF" />
                              )}
                            </View>

                            <View style={{ flex: 1, gap: 3 }}>
                              <Text
                                style={[
                                  styles.appRowTitle,
                                  { color: colors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {item.appName}
                              </Text>
                              <Text
                                style={[
                                  styles.appRowPkg,
                                  { color: colors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {item.packageName}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.lockedPillActive}>
                            <Lock size={14} color="#0A84FF" />
                            <Text style={styles.lockedPillActiveText}>
                              LOCKED
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {idx < restrictedApps.length - 1 && (
                          <View
                            style={[
                              styles.divider,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 2. AVAILABLE / UNLOCKED APPS GROUP */}
              {availableApps.length > 0 && (
                <View style={styles.groupSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text
                      style={[
                        styles.sectionHeaderTitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      ALL INSTALLED APPS ({availableApps.length})
                    </Text>
                    <Text
                      style={[
                        styles.sectionHeaderSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Tap to lock
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.groupedCard,
                      {
                        backgroundColor: isDark ? "#0A0D15" : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {availableApps.map((item, idx) => (
                      <View key={item.packageName}>
                        <TouchableOpacity
                          style={styles.appRow}
                          onPress={() => toggleAppRestriction(item)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.appRowLeft}>
                            <View style={styles.appIconWrapperMuted}>
                              {item.appIconBase64 ? (
                                <Image
                                  source={{ uri: item.appIconBase64 }}
                                  style={styles.appIconImg}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Smartphone size={24} color="#64748B" />
                              )}
                            </View>

                            <View style={{ flex: 1, gap: 3 }}>
                              <Text
                                style={[
                                  styles.appRowTitleMuted,
                                  { color: colors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {item.appName}
                              </Text>
                              <Text
                                style={[
                                  styles.appRowPkg,
                                  { color: colors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {item.packageName}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.lockedPillInactive,
                              {
                                backgroundColor: isDark
                                  ? "#111522"
                                  : colors.surfaceLight,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <LockOpen size={13} color={colors.textSecondary} />
                            <Text
                              style={[
                                styles.lockedPillInactiveText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              OFF
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {idx < availableApps.length - 1 && (
                          <View
                            style={[
                              styles.divider,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Custom Budget Time Modal */}
      <Modal
        visible={showCustomTimeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCustomTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.customModalSheet,
              {
                backgroundColor: isDark ? "#111218" : "#FFFFFF",
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Sliders size={22} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Custom Screen Time Allowance
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomTimeModal(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Enter daily free minutes per locked app before focus workout
              quarantine activates:
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: isDark ? "#181A20" : "#F1F5F9",
                },
              ]}
              value={customMinutesInput}
              onChangeText={setCustomMinutesInput}
              keyboardType="number-pad"
              placeholder="e.g. 66"
              placeholderTextColor="#64748B"
              maxLength={4}
              autoFocus
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={[
                  styles.modalBtnCancel,
                  { backgroundColor: isDark ? "#1E2330" : "#E2E8F0" },
                ]}
                onPress={() => setShowCustomTimeModal(false)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: colors.textSecondary,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnSave,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  const mins = parseInt(customMinutesInput, 10);
                  if (!isNaN(mins) && mins >= 0) {
                    haptics.success();
                    updateSetting("dailyBudgetMinutes", mins);
                    appBlockerService.setAppBudget?.(null, mins);
                    setShowCustomTimeModal(false);
                  }
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "800", color: "#000000" }}
                >
                  Save Limit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#121722",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#101420",
    borderWidth: 1,
    borderColor: "#1C263B",
    justifyContent: "center",
    alignItems: "center",
  },
  activeCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: "rgba(10, 132, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(10, 132, 255, 0.35)",
  },
  activeCountText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0A84FF",
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A1308",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    padding: 14,
  },
  permBannerTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F59E0B",
    letterSpacing: 0.5,
  },
  permBannerDesc: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 15,
  },
  permBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
  },
  permBannerBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0C101A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1C2436",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    padding: 0,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 16,
  },

  // Grouped Inset Sections
  groupSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0A84FF",
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  sectionHeaderSub: {
    fontSize: 11,
    fontWeight: "700",
  },
  groupedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 70,
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appRowRestricted: {
    backgroundColor: "rgba(229, 57, 53, 0.04)",
  },
  appRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  appIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "rgba(229, 57, 53, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  appIconWrapperMuted: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  appIconImg: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  appRowTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.2,
  },
  appRowTitleMuted: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.2,
  },
  appRowPkg: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  lockedPillActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  lockedPillActiveText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  lockedPillInactive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  lockedPillInactiveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  budgetBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  budgetHeaderTitle: {
    fontSize: 12.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  budgetHeaderSub: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  budgetPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  budgetPillBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  customModalSheet: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
