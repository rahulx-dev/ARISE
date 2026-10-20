import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Database, Trash2, UserX, ShieldAlert } from "lucide-react-native";
import { useHaptics } from "../../src/hooks/useHaptics";
import { useTheme } from "../../src/hooks/useTheme";
import { showIOSAlert } from "../../src/components/ios/IOSAlertModal";
import { fontFamilies } from "../../src/theme/typography";
import { userRepository } from "../../src/database/repositories/userRepository";
import { googleAuthService } from "../../src/services/googleAuthService";
import { supabase, isSupabaseConfigured } from "../../src/services/supabaseClient";
import { setIsOnboardingCompletedSync } from "../../src/services/appStateService";
import { useSettingsStore } from "../../src/stores/useSettingsStore";

/**
 * Settings → Storage & Data (H22).
 * This is the REAL screen the Privacy Policy points to. Previously the
 * policy claimed "Settings → Storage / Clear App Data" existed, but no
 * such screen existed — the deletion path was fake.
 *
 * Clear App Data: wipes ALL local data (progression, quests, photos,
 * guilds, settings, KV store) and signs out, then returns to onboarding.
 * Delete Account: calls the delete_account_secure RPC (Batch 5E #3),
 * which deletes the caller's cloud save, wallet, ledgers, leaderboard
 * row, redemptions, payout requests, postback log AND the Supabase
 * login itself; local data is wiped only after the server confirms.
 *
 * Documented policy: payout requests that are still PENDING are
 * deleted with the account — deleting forfeits any pending payout.
 */
export default function StorageSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const [busy, setBusy] = useState(false);

  const signOutAndRestart = async () => {
    try {
      await googleAuthService.signOutGoogle();
    } catch {}
    setIsOnboardingCompletedSync(false);
    useSettingsStore.setState({ onboardingCompleted: false });
    router.replace("/(onboarding)" as any);
  };

  const handleClearData = () => {
    haptics.medium();
    showIOSAlert(
      "Clear App Data?",
      "This permanently deletes ALL local data: progression, coins, crystals, quests, workouts, photos, guilds, and settings. Your cloud save (if any) is NOT deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await userRepository.wipeAllLocalData();
              await signOutAndRestart();
            } catch (e: any) {
              setBusy(false);
              showIOSAlert("Clear Failed", e?.message || "Could not clear app data.", undefined, { variant: "danger" });
            }
          },
        },
      ],
      { variant: "danger" },
    );
  };

  const handleDeleteAccount = () => {
    haptics.medium();
    showIOSAlert(
      "Delete My Account?",
      "This permanently deletes your account: ALL local data, your cloud save, wallet, transaction history, leaderboard entry, and your login itself — immediately and completely. Any payout request still pending is forfeited. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              // 1. Server-side deletion FIRST (fail-closed): the
              // delete_account_secure RPC removes every cloud row for
              // the caller plus the auth user. Local data is wiped ONLY
              // after the server confirms — if the RPC fails, nothing
              // is deleted anywhere and the user sees the error.
              if (!isSupabaseConfigured() || !supabase) {
                setBusy(false);
                showIOSAlert(
                  "Delete Failed",
                  "Cloud account deletion is unavailable (cloud is not configured). Your account and data were NOT deleted.",
                  undefined,
                  { variant: "danger" },
                );
                return;
              }
              const { data, error } = await supabase.rpc("delete_account_secure");
              if (error || !(data as any)?.success) {
                setBusy(false);
                showIOSAlert(
                  "Delete Failed",
                  error?.message || (data as any)?.error || "The server could not delete your account. Nothing was deleted.",
                  undefined,
                  { variant: "danger" },
                );
                return;
              }
              // 2. Server confirmed: local wipe + sign out + onboarding.
              await userRepository.wipeAllLocalData();
              await signOutAndRestart();
            } catch (e: any) {
              setBusy(false);
              showIOSAlert("Delete Failed", e?.message || "Could not delete account.", undefined, { variant: "danger" });
            }
          },
        },
      ],
      { variant: "danger" },
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ChevronLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Storage &amp; Data</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Database size={20} color="#0A84FF" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Your progression, workouts, photos, and settings are stored on this device.
            Cloud saves (if you signed in with Google) live in Supabase. Use the
            actions below to erase local data or delete your account.
          </Text>
        </View>

        {/* Clear App Data */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>LOCAL DATA</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.75}
            disabled={busy}
            onPress={handleClearData}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? "#2D1414" : "#FEE2E2" }]}>
              <Trash2 size={18} color="#DC2626" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Clear App Data</Text>
              <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
                Delete all local data and return to onboarding
              </Text>
            </View>
            {busy ? <ActivityIndicator size="small" color="#DC2626" /> : null}
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.75}
            disabled={busy}
            onPress={handleDeleteAccount}
          >
            <View style={[styles.iconCircle, { backgroundColor: isDark ? "#2D1414" : "#FEE2E2" }]}>
              <UserX size={18} color="#DC2626" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Delete My Account</Text>
              <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
                Permanently delete your account, all cloud data, and your login
              </Text>
            </View>
            {busy ? <ActivityIndicator size="small" color="#DC2626" /> : null}
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ShieldAlert size={20} color="#F59E0B" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Account deletion is immediate and complete: when you delete your
            account, the server deletes your cloud save, wallet, transaction
            history, leaderboard entry, and your login in one step — nothing
            is kept for later removal. Payout requests that are still pending
            are deleted with the account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: fontFamilies.bold,
  },
  content: { padding: 16, gap: 16 },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: -8,
  },
  cardGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextCol: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: "600" },
  menuDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});
