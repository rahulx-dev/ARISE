import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import {
  ShieldCheck,
  Clock,
  Layers,
  Zap,
  Camera as CameraIcon,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react-native";
import { GlassCard } from "../ios/GlassCard";
import { GlassButton } from "../ios/GlassButton";
import { AriseLogo } from "../ui/AriseLogo";
import { appBlockerService } from "../../native";
import { useHaptics } from "../../hooks/useHaptics";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { setIsOnboardingCompletedSync } from "../../services/appStateService";

interface PermissionsGateModalProps {
  onAllGranted: () => void;
}

export function PermissionsGateModal({
  onAllGranted,
}: PermissionsGateModalProps) {
  const haptics = useHaptics();

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

  const permissions = [
    {
      id: "usage",
      title: "1. App Usage Access",
      subtitle: "Required to monitor distraction app screen time",
      granted: usageGranted,
      action: handleGrantUsage,
      icon: Clock,
    },
    {
      id: "overlay",
      title: "2. Display Over Other Apps",
      subtitle: "Required to show lock shield when limit is reached",
      granted: overlayGranted,
      action: handleGrantOverlay,
      icon: Layers,
    },
    {
      id: "battery",
      title: "3. Background Shield (Battery)",
      subtitle: "Prevents phone from killing blocker in background",
      granted: batteryGranted,
      action: handleGrantBattery,
      icon: Zap,
    },
    {
      id: "camera",
      title: "4. Camera (AI Form Tracking)",
      subtitle: "Required for real-time rep counting in RAM",
      granted: cameraGranted,
      action: handleGrantCamera,
      icon: CameraIcon,
    },
  ];

  const grantedCount = [
    usageGranted,
    overlayGranted,
    batteryGranted,
    cameraGranted,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <AriseLogo size={68} glow={true} />
          <Text style={styles.title}>SYSTEM PERMISSIONS GATE</Text>
          <Text style={styles.subtitle}>
            ARISE requires all 4 core Android permissions to lock distraction
            apps and track physical workouts.
          </Text>

          {/* Progress Pill */}
          <View
            style={[
              styles.progressPill,
              { borderColor: "#0A84FF" },
            ]}
          >
            <Text
              style={[
                styles.progressText,
                { color: "#0A84FF" },
              ]}
            >
              {allGranted
                ? "ALL PROTOCOLS ACTIVE (4/4)"
                : `PERMISSIONS GRANTED: ${grantedCount} / 4`}
            </Text>
          </View>
        </View>

        {/* Permissions Cards */}
        <View style={styles.cardList}>
          {permissions.map((p) => {
            const IconComp = p.icon;
            return (
              <GlassCard
                key={p.id}
                variant={p.granted ? "elevated" : "glow"}
                style={[
                  styles.permCard,
                  p.granted && { borderColor: "rgba(10, 132, 255, 0.4)" },
                ]}
              >
                <View style={styles.permRow}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: "rgba(10, 132, 255, 0.15)",
                      },
                    ]}
                  >
                    <IconComp
                      size={22}
                      color="#0A84FF"
                    />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.permTitle}>{p.title}</Text>
                    <Text style={styles.permSubtitle}>{p.subtitle}</Text>
                  </View>

                  {p.granted ? (
                    <View style={styles.grantedBadge}>
                      <CheckCircle2 size={16} color="#0A84FF" />
                      <Text style={styles.grantedText}>ACTIVE</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.grantBtn}
                      onPress={p.action}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.grantBtnText}>GRANT</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            );
          })}
        </View>

        {/* Enter Button */}
        <View style={styles.actionWrap}>
          <TouchableOpacity
            style={[
              styles.enterBtn,
              { backgroundColor: allGranted ? "#0A84FF" : "#1C1E2A" },
            ]}
            onPress={() => {
              if (allGranted) {
                haptics.success();
                try {
                  useSettingsStore.setState({ onboardingCompleted: true });
                  setIsOnboardingCompletedSync(true);
                } catch (e) {
                  console.warn('Error setting onboarding completed:', e);
                }
                onAllGranted();
              } else {
                haptics.warning();
              }
            }}
            disabled={!allGranted}
            activeOpacity={0.85}
          >
            {allGranted ? (
              <>
                <Text style={[styles.enterBtnText, { color: "#FFFFFF" }]}>
                  ENTER ARISE PROTOCOL
                </Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            ) : (
              <>
                <Lock size={16} color="#8E8E93" />
                <Text style={[styles.enterBtnText, { color: "#8E8E93" }]}>
                  GRANT ALL 4 PERMISSIONS TO PROCEED
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  progressPill: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: "#111218",
  },
  progressText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  cardList: {
    gap: 12,
  },
  permCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1C1E2A",
    backgroundColor: "#111218",
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  permTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  permSubtitle: {
    fontSize: 11,
    color: "#8E8E93",
    lineHeight: 15,
  },
  grantedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10, 132, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(10, 132, 255, 0.3)",
  },
  grantedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0A84FF",
  },
  grantBtn: {
    backgroundColor: "#0A84FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  grantBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  actionWrap: {
    marginTop: 10,
    marginBottom: 20,
  },
  enterBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  enterBtnText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
