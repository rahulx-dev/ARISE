import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Settings,
  Shield,
  Smartphone,
  HelpCircle,
  Info,
  ChevronRight,
  Download,
  Camera,
  Edit3,
  Dumbbell,
  Moon,
  Sparkles,
  Flame,
  Award,
  Coins,
  Code2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { XPBar } from '../../src/components/design-system/XPBar';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { backupService } from '../../src/services/backupService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function ProfileTab() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    loadProfile();
  }, []);

  const level = profile?.level || 1;
  const displayName = profile?.displayName || 'Warrior';
  const currentXP = profile?.currentXP || 0;
  const coins = profile?.coins || 0;
  const streak = profile?.currentStreak || 0;
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';

  const handleOpenGitHub = async () => {
    haptics.light();
    try {
      await Linking.openURL('https://github.com/rahulx-dev/ARISE');
    } catch {
      Alert.alert('Link Error', 'Could not open GitHub repository URL.');
    }
  };

  const handleExportBackup = async () => {
    haptics.medium();
    const success = await backupService.exportBackup();
    if (success) {
      haptics.success();
      Alert.alert('Backup Created', 'Your local ARISE database was exported successfully.');
    } else {
      Alert.alert('Export Failed', 'Could not create offline backup file.');
    }
  };

  const menuItems = [
    {
      title: 'Edit Callsign & Bio',
      sub: 'Change display name, manifesto & avatar',
      icon: Edit3,
      color: colors.primary,
      action: () => router.push('/settings/profile-edit' as any),
    },
    {
      title: 'Open Source Source Code',
      sub: 'Inspect privacy, SQLite schema & contribute on GitHub',
      icon: Code2,
      color: colors.secondary,
      action: handleOpenGitHub,
    },
    {
      title: 'Physique Transformation Photos',
      sub: 'Private 100% on-device daily check-in photos',
      icon: Camera,
      color: colors.accentGold,
      action: () => router.push('/photos' as any),
    },
    {
      title: 'Gym Workout Protocol',
      sub: 'Custom splits, weekly schedules & 200+ exercises',
      icon: Dumbbell,
      color: colors.danger,
      action: () => router.push('/(tabs)/progress'),
    },
    {
      title: 'Blocked Distraction Apps',
      sub: 'Real installed Android apps locked behind focus',
      icon: Smartphone,
      color: '#A855F7',
      action: () => router.push('/settings/apps'),
    },
    {
      title: 'Permissions Hub',
      sub: 'Usage access, overlay shield & camera',
      icon: Shield,
      color: colors.secondary,
      action: () => router.push('/permissions' as any),
    },
    {
      title: 'Appearance, Sound & Settings',
      sub: 'Themes (Dark/Light/System), SFX & ambient music',
      icon: Settings,
      color: colors.textPrimary,
      action: () => router.push('/settings'),
    },
    {
      title: 'Export Offline Backup',
      sub: 'Save progress, PRs and streak history to JSON',
      icon: Download,
      color: colors.textSecondary,
      action: handleExportBackup,
    },
    {
      title: 'About ARISE System',
      sub: 'Architecture telemetry & engine info',
      icon: Info,
      color: colors.textMuted,
      action: () =>
        Alert.alert(
          'ARISE Engine v1.0.0',
          'Production-grade hardware-accelerated discipline OS.\n100% Offline SQLite architecture.\nOn-device Google ML Kit Pose Detection.\nAuthor: Rahul (github.com/rahulx-dev)'
        ),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>WARRIOR IDENTITY</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Profile Card */}
          <GlassCard variant="glow" style={styles.profileHeroCard}>
            <View style={styles.avatarRow}>
              <PlayerAvatar
                iconId={avatarIcon}
                size={76}
                glow={true}
                glowColor={colors.primary}
              />

              <View style={styles.profileMeta}>
                <View style={styles.nameBadgeRow}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={[styles.levelBadge, { backgroundColor: isDark ? 'rgba(209, 255, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.levelBadgeText, { color: colors.primary }]}>LV. {level}</Text>
                  </View>
                </View>

                <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {profile?.bio || 'Disciplined warrior in training.'}
                </Text>

                <View style={styles.statPillsRow}>
                  <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Flame size={13} color={colors.danger} />
                    <Text style={[styles.statPillText, { color: colors.textPrimary }]}>{streak}d Streak</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Coins size={13} color={colors.accentGold} />
                    <Text style={[styles.statPillText, { color: colors.textPrimary }]}>{coins} Coins</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ width: '100%', marginTop: 4 }}>
              <XPBar progress={Math.min(100, Math.round((currentXP / Math.max(1, level * 100)) * 100))} />
            </View>

            <GlassButton
              title="EDIT CALLSIGN & BIO"
              onPress={() => router.push('/settings/profile-edit' as any)}
              variant="outline"
              size="sm"
              icon={<Edit3 size={14} color={colors.primary} />}
            />
          </GlassCard>

          {/* GitHub Source Code & Privacy Verification Card */}
          <GlassCard variant="accent" style={styles.privacyVerificationCard}>
            <View style={styles.privacyTopRow}>
              <View style={[styles.shieldBadge, { backgroundColor: isDark ? 'rgba(0, 240, 255, 0.15)' : 'rgba(2, 132, 199, 0.15)' }]}>
                <ShieldCheck size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>
                  100% Open Source & Privacy Verified
                </Text>
                <Text style={[styles.privacySubtitle, { color: colors.textSecondary }]}>
                  Zero cloud telemetry • Offline SQLite SSOT • On-device ML Kit
                </Text>
              </View>
            </View>

            <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>
              ARISE is completely open-source. Anyone can inspect the codebase to verify that no personal data, camera frames, or usage stats ever leave your phone.
            </Text>

            <TouchableOpacity
              onPress={handleOpenGitHub}
              style={[
                styles.githubButton,
                {
                  backgroundColor: isDark ? '#1C1D24' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Code2 size={16} color={colors.primary} />
              <Text style={[styles.githubBtnText, { color: colors.textPrimary }]}>
                github.com/rahulx-dev/ARISE
              </Text>
              <ExternalLink size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </GlassCard>

          {/* System Protocols Menu List */}
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>SYSTEM PROTOCOLS</Text>
          <View style={styles.menuList}>
            {menuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.title}
                  style={[styles.menuRow, { backgroundColor: isDark ? 'rgba(22, 22, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)', borderColor: colors.border }]}
                  onPress={item.action}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuIconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <IconComp size={18} color={item.color} />
                  </View>

                  <View style={styles.menuTextCol}>
                    <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.menuSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                  </View>

                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
  },
  profileHeroCard: {
    padding: 16,
    borderRadius: 22,
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  bioText: {
    fontSize: 11,
    lineHeight: 14,
  },
  statPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  privacyVerificationCard: {
    padding: 16,
    borderRadius: 20,
    gap: 10,
  },
  privacyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  privacySubtitle: {
    fontSize: 10,
  },
  privacyDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  githubBtnText: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  menuList: {
    gap: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  menuSub: {
    fontSize: 10,
  },
});
