import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Gear,
  Shield,
  DeviceMobile,
  Info,
  CaretRight,
  DownloadSimple,
  Camera,
  PencilSimple,
  Barbell,
  Fire,
  Coins,
  ShieldCheck,
} from 'phosphor-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { GlassButton } from '../../src/components/ios/GlassButton';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { XPBar } from '../../src/components/design-system/XPBar';
import { AboutAriseSheet } from '../../src/components/ui/AboutAriseSheet';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { backupService } from '../../src/services/backupService';
import { SwipeableTabScreen } from '../../src/components/navigation/SwipeableTabScreen';
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
  const xpNeeded = Math.max(100, level * 100);
  const xpPercent = Math.min(100, Math.round((currentXP / xpNeeded) * 100));
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState(false);

  const coins = profile?.coins || 0;
  const streak = profile?.currentStreak || 0;
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';

  const handleExportBackup = async () => {
    haptics.medium();
    const success = await backupService.exportBackup();
    if (success) {
      haptics.success();
      showIOSAlert('Backup Created', 'Your local ARISE database was exported successfully.');
    } else {
      showIOSAlert('Export Failed', 'Could not create offline backup file.');
    }
  };

  const sections = [
    {
      title: 'IDENTITY & TRANSFORMATION',
      items: [
        {
          title: 'Edit Callsign & Bio',
          sub: 'Change display name, manifesto & avatar',
          icon: PencilSimple,
          color: colors.primary,
          action: () => router.push('/settings/profile-edit' as any),
        },
        {
          title: 'Physique Transformation Photos',
          sub: 'Private 100% on-device daily check-in photos',
          icon: Camera,
          color: '#EC4899',
          action: () => router.push('/photos' as any),
        },
        {
          title: 'Redeem Vault & Shop',
          sub: 'Convert coins to screen passes & cashouts',
          icon: Coins,
          color: '#F59E0B',
          action: () => {
            haptics.light();
            router.push('/shop' as any);
          },
        },
      ],
    },
    {
      title: 'DISCIPLINE & SHIELD PROTOCOLS',
      items: [
        {
          title: 'Gym Workout Protocol',
          sub: 'Custom splits, weekly schedules & 200+ exercises',
          icon: Barbell,
          color: colors.danger,
          action: () => router.push('/(tabs)/progress'),
        },
        {
          title: 'Blocked Distraction Apps',
          sub: 'Real installed Android apps locked behind focus',
          icon: DeviceMobile,
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
      ],
    },
    {
      title: 'SYSTEM & PREFERENCES',
      items: [
        {
          title: 'Appearance, Sound & Settings',
          sub: 'Themes (Dark/Light/System), SFX & ambient music',
          icon: Gear,
          color: colors.textPrimary,
          action: () => router.push('/settings'),
        },
        {
          title: 'Export Offline Backup',
          sub: 'Save progress, PRs and streak history to JSON',
          icon: DownloadSimple,
          color: colors.textSecondary,
          action: handleExportBackup,
        },
        {
          title: 'About ARISE System',
          sub: 'Architecture telemetry, version & policies',
          icon: Info,
          color: colors.textMuted,
          action: () => {
            haptics.light();
            setIsAboutSheetOpen(true);
          },
        },
      ],
    },
  ];

  return (
    <SwipeableTabScreen prevTab="/(tabs)/progress" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#232532' : '#E5E7EB' }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>WARRIOR IDENTITY</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={[styles.headerIconBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Gear size={18} color={colors.textPrimary} />
          </TouchableOpacity>
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
                  <View style={[styles.levelBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.1)' }]}>
                    <Text style={[styles.levelBadgeText, { color: colors.primary }]}>LV. {level}</Text>
                  </View>
                </View>

                <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {profile?.bio || 'Disciplined warrior in training.'}
                </Text>

                <View style={styles.statPillsRow}>
                  <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2' }]}>
                    <Fire size={13} color="#EF4444" weight="fill" />
                    <Text style={[styles.statPillText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>{streak}d Streak</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7' }]}>
                    <Coins size={13} color="#F59E0B" weight="fill" />
                    <Text style={[styles.statPillText, { color: isDark ? '#FCD34D' : '#D97706' }]}>{coins.toLocaleString()} Coins</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* XP Progress Indicator */}
            <View style={styles.xpSection}>
              <View style={styles.xpMetaRow}>
                <Text style={[styles.xpLabel, { color: colors.textMuted }]}>EXPERIENCE PROGRESS</Text>
                <Text style={[styles.xpValue, { color: colors.textPrimary }]}>
                  {currentXP} / {xpNeeded} XP ({xpPercent}%)
                </Text>
              </View>
              <XPBar progress={xpPercent} />
            </View>

            <GlassButton
              title="EDIT CALLSIGN & BIO"
              onPress={() => router.push('/settings/profile-edit' as any)}
              variant="outline"
              size="sm"
              icon={<PencilSimple size={14} color={colors.primary} weight="bold" />}
            />
          </GlassCard>

          {/* On-Device Privacy Architecture Card (No external links) */}
          <GlassCard variant="elevated" style={styles.privacyCard}>
            <View style={styles.privacyTopRow}>
              <View style={[styles.shieldBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : '#EFF6FF' }]}>
                <ShieldCheck size={22} color="#0A84FF" weight="duotone" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>
                  Private On-Device Architecture
                </Text>
                <Text style={[styles.privacySubtitle, { color: colors.textSecondary }]}>
                  Zero Cloud Telemetry • Offline SQLite SSOT • Hardware ML Kit
                </Text>
              </View>
            </View>

            <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>
              All workout telemetry, biometric camera tracking, and discipline records are strictly computed and stored locally on your device. Your data never leaves your phone.
            </Text>
          </GlassCard>

          {/* Grouped System Protocols Menu */}
          {sections.map((section) => (
            <View key={section.title} style={styles.sectionGroup}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>{section.title}</Text>
              <GlassCard variant="default" style={styles.groupedCard}>
                {section.items.map((item, idx) => {
                  const IconComp = item.icon;
                  const isLast = idx === section.items.length - 1;
                  return (
                    <React.Fragment key={item.title}>
                      <TouchableOpacity
                        style={styles.menuRow}
                        onPress={item.action}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.menuIconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
                          <IconComp size={18} color={item.color} weight="duotone" />
                        </View>

                        <View style={styles.menuTextCol}>
                          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                          <Text style={[styles.menuSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                        </View>

                        <CaretRight size={16} color={colors.textMuted} weight="bold" />
                      </TouchableOpacity>
                      {!isLast && <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />}
                    </React.Fragment>
                  );
                })}
              </GlassCard>
            </View>
          ))}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Stitch v2 Custom About ARISE Bottom Sheet */}
        <AboutAriseSheet
          visible={isAboutSheetOpen}
          onClose={() => setIsAboutSheetOpen(false)}
        />
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 16,
  },
  profileHeroCard: {
    padding: 18,
    borderRadius: 22,
    gap: 14,
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
    fontSize: 9.5,
    fontWeight: '900',
  },
  bioText: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  statPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  xpSection: {
    gap: 6,
    width: '100%',
  },
  xpMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  xpValue: {
    fontSize: 10,
    fontWeight: '700',
  },
  privacyCard: {
    padding: 16,
    borderRadius: 22,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  privacySubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  privacyDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  sectionGroup: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  groupedCard: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 0,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 10.5,
  },
  menuDivider: {
    height: 1,
    marginLeft: 64,
    marginRight: 16,
  },
});
