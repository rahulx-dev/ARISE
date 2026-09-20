import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  AppState,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import {
  BarChart2,
  Layers,
  BatteryCharging,
  Camera as CameraIcon,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { appBlockerService } from "../../native";
import { useHaptics } from "../../hooks/useHaptics";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { setIsOnboardingCompletedSync } from "../../services/appStateService";
import { useTheme } from "../../hooks/useTheme";

interface PermissionsGateModalProps {
  onAllGranted: () => void;
  onSkip?: () => void;
}

export function PermissionsGateModal({
  onAllGranted,
  onSkip,
}: PermissionsGateModalProps) {
  const haptics = useHaptics();
  const { isDark, colors } = useTheme();

  const [usageGranted, setUsageGranted] = useState<boolean>(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(false);
  const [batteryGranted, setBatteryGranted] = useState<boolean>(false);
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);

  const checkPermissions = async () => {
    try {
      const usage =
        Platform.OS === "android"
          ? await appBlockerService.hasUsagePermission()
          : true;
      setUsageGranted(usage);

      const overlay =
        Platform.OS === "android"
          ? await appBlockerService.hasOverlayPermission()
          : true;
      setOverlayGranted(overlay);

      const battery =
        Platform.OS === "android"
          ? ((await appBlockerService.hasBatteryOptimizationExemption?.()) ??
            true)
          : true;
      setBatteryGranted(battery);

      const cam = await Camera.getCameraPermissionsAsync();
      setCameraGranted(cam.granted);
    } catch (e) {
      console.warn("[PermissionsGate] Check error:", e);
    }
  };

  const permPollRef = useRef<any>(null);

  const startFastPermissionPolling = (
    type: "battery" | "usage" | "overlay",
  ) => {
    if (permPollRef.current) clearInterval(permPollRef.current);
    const startTime = Date.now();
    permPollRef.current = setInterval(async () => {
      try {
        if (type === "battery") {
          const granted =
            (await appBlockerService.hasBatteryOptimizationExemption?.()) ??
            false;
          if (granted) {
            setBatteryGranted(true);
            haptics.success();
            if (permPollRef.current) {
              clearInterval(permPollRef.current);
              permPollRef.current = null;
            }
          }
        } else if (type === "usage") {
          const granted = await appBlockerService.hasUsagePermission();
          if (granted) {
            setUsageGranted(true);
            haptics.success();
            if (permPollRef.current) {
              clearInterval(permPollRef.current);
              permPollRef.current = null;
            }
          }
        } else if (type === "overlay") {
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

  useEffect(() => {
    checkPermissions();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPermissions();
      }
    });

    const heartbeat = setInterval(() => {
      checkPermissions();
    }, 1500);

    return () => {
      sub.remove();
      clearInterval(heartbeat);
      if (permPollRef.current) {
        clearInterval(permPollRef.current);
        permPollRef.current = null;
      }
    };
  }, []);

  const allGranted =
    usageGranted && overlayGranted && batteryGranted && cameraGranted;

  const handleGrantUsage = () => {
    haptics.medium();
    if (Platform.OS === "android") {
      appBlockerService.requestUsagePermission();
      startFastPermissionPolling("usage");
    }
  };

  const handleGrantOverlay = () => {
    haptics.medium();
    if (Platform.OS === "android") {
      appBlockerService.requestOverlayPermission();
      startFastPermissionPolling("overlay");
    }
  };

  const handleGrantBattery = () => {
    haptics.medium();
    if (Platform.OS === "android") {
      appBlockerService.requestBatteryOptimizationExemption?.();
      startFastPermissionPolling("battery");
    }
  };

  const handleGrantCamera = async () => {
    haptics.medium();
    const res = await Camera.requestCameraPermissionsAsync();
    setCameraGranted(res.granted);
    checkPermissions();
  };

  const handleProceed = () => {
    haptics.success();
    try {
      useSettingsStore.setState({ onboardingCompleted: true });
      setIsOnboardingCompletedSync(true);
    } catch (e) {
      console.warn("Error setting onboarding completed:", e);
    }
    onAllGranted();
  };

  const permissions = [
    {
      id: "usage",
      title: "App Usage Access",
      subtitle: "Monitor distraction app screen time and usage.",
      granted: usageGranted,
      action: handleGrantUsage,
      icon: BarChart2,
      iconBgLight: "#FFF1F2",
      iconBgDark: "rgba(239, 68, 68, 0.15)",
      iconColor: "#EF4444",
    },
    {
      id: "overlay",
      title: "Display Over Other Apps",
      subtitle: "Show the lock screen when your limit is reached.",
      granted: overlayGranted,
      action: handleGrantOverlay,
      icon: Layers,
      iconBgLight: "#E0F2FE",
      iconBgDark: "rgba(2, 132, 199, 0.15)",
      iconColor: "#0284C7",
    },
    {
      id: "battery",
      title: "Background Activity",
      subtitle: "Keep blocking active in background to ensure consistency.",
      granted: batteryGranted,
      action: handleGrantBattery,
      icon: BatteryCharging,
      iconBgLight: "#DCFCE7",
      iconBgDark: "rgba(22, 163, 74, 0.15)",
      iconColor: "#16A34A",
    },
    {
      id: "camera",
      title: "Camera",
      subtitle: "Required for AI exercise tracking and form analysis.",
      granted: cameraGranted,
      action: handleGrantCamera,
      icon: CameraIcon,
      iconBgLight: "#EDE9FE",
      iconBgDark: "rgba(139, 92, 246, 0.15)",
      iconColor: "#8B5CF6",
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000000" : "#F8FAFC" },
      ]}
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onSkip || handleProceed}
          activeOpacity={0.7}
          style={styles.navBtn}
        >
          <ChevronLeft
            size={24}
            color={isDark ? "#FFFFFF" : "#0F172A"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSkip || handleProceed}
          activeOpacity={0.7}
          style={styles.navBtn}
        >
          <Text
            style={[
              styles.skipText,
              { color: isDark ? "#8E8E93" : "#64748B" },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Title */}
        <View style={styles.brandHeader}>
          <View style={styles.logoSquare}>
            <Image
              source={require("../../../assets/icon.png")}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <Text
            style={[
              styles.brandText,
              { color: isDark ? "#FFFFFF" : "#0F172A" },
            ]}
          >
            A R I S E
          </Text>

          <Text
            style={[
              styles.mainTitle,
              { color: isDark ? "#FFFFFF" : "#0F172A" },
            ]}
          >
            System Permissions
          </Text>
          <Text
            style={[
              styles.mainSubtitle,
              { color: isDark ? "#8E8E93" : "#64748B" },
            ]}
          >
            Allow these permissions to unlock the full experience.
          </Text>
        </View>

        {/* 4 Permission Cards */}
        <View style={styles.cardList}>
          {permissions.map((p) => {
            const IconComp = p.icon;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={p.granted ? undefined : p.action}
                activeOpacity={p.granted ? 1 : 0.75}
                style={[
                  styles.permCard,
                  {
                    backgroundColor: isDark ? "#111218" : "#FFFFFF",
                    borderColor: isDark ? "#1C1E2A" : "#F1F5F9",
                  },
                ]}
              >
                {/* Left Icon Box */}
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDark ? p.iconBgDark : p.iconBgLight,
                    },
                  ]}
                >
                  <IconComp
                    size={22}
                    color={p.iconColor}
                    strokeWidth={2.4}
                  />
                </View>

                {/* Center Text Info */}
                <View style={styles.textCol}>
                  <Text
                    style={[
                      styles.permTitle,
                      { color: isDark ? "#FFFFFF" : "#0F172A" },
                    ]}
                  >
                    {p.title}
                  </Text>
                  <Text
                    style={[
                      styles.permSubtitle,
                      { color: isDark ? "#8E8E93" : "#64748B" },
                    ]}
                  >
                    {p.subtitle}
                  </Text>
                </View>

                {/* Right Status Badge / Action */}
                <View style={styles.rightAction}>
                  {p.granted ? (
                    <View
                      style={[
                        styles.activeBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(16, 185, 129, 0.15)"
                            : "#E6F4EA",
                        },
                      ]}
                    >
                      <CheckCircle2
                        size={13}
                        color="#059669"
                        fill="#059669"
                      />
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.allowBtn}
                      onPress={p.action}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.allowBtnText}>Allow</Text>
                    </TouchableOpacity>
                  )}
                  <ChevronRight
                    size={16}
                    color={isDark ? "#4B5563" : "#94A3B8"}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sticky Continue CTA */}
      <View
        style={[
          styles.footerSection,
          { backgroundColor: isDark ? "#000000" : "#F8FAFC" },
        ]}
      >
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleProceed}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>

        {/* Privacy Note */}
        <View style={styles.privacyRow}>
          <Lock size={14} color={isDark ? "#6B7280" : "#94A3B8"} />
          <Text
            style={[
              styles.privacyText,
              { color: isDark ? "#8E8E93" : "#64748B" },
            ]}
          >
            Your data stays on your device. We only use these permissions to power core features.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navBtn: {
    padding: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 20,
  },
  brandHeader: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  logoSquare: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "#111218",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  logoImg: {
    width: 68,
    height: 68,
    borderRadius: 18,
  },
  brandText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 6,
    marginTop: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 16,
    textAlign: "center",
  },
  mainSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  cardList: {
    gap: 12,
  },
  permCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  permTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  permSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  rightAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  activeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  allowBtn: {
    backgroundColor: "#E53935",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  allowBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  footerSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 14 : 20,
    gap: 12,
  },
  continueBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  privacyText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    flex: 1,
  },
});
