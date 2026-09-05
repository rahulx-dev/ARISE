import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Shield, FileText, Scales, ArrowSquareOut, Code } from 'phosphor-react-native';
import { ARISEBottomSheet } from './ARISEModal';
import { AriseLogo } from './AriseLogo';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../ios/GlassCard';
import { showIOSAlert } from '../ios/IOSAlertModal';
import { useHaptics } from '../../hooks/useHaptics';

interface AboutAriseSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Stitch v2 Kinetic Glass "About ARISE" Bottom Sheet with Phosphor Icons
 */
export function AboutAriseSheet({ visible, onClose }: AboutAriseSheetProps) {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const handleOpenLink = (url: string) => {
    haptics.light();
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ARISEBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <AriseLogo size={48} glow={true} />
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>ARISE</Text>
          <Text style={[styles.tagline, { color: colors.primary }]}>
            "Build discipline. Earn your time."
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.12)' }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>VERSION 3.3.0 (RELEASE)</Text>
          </View>
        </View>

        {/* About Info Card */}
        <GlassCard variant="default" style={styles.infoCard}>
          <Text style={[styles.infoHeading, { color: colors.textPrimary }]}>About ARISE</Text>
          <Text style={[styles.infoBody, { color: colors.textSecondary }]}>
            ARISE is an offline-first, performance-driven discipline operating system that replaces distraction with earned screen time. Built with local SQLite database storage, Google ML Kit pose detection, and hardware-accelerated soundscapes.
          </Text>
        </GlassCard>

        {/* Legal & Policy Rows */}
        <View style={styles.linksGroup}>
          <TouchableOpacity
            style={[styles.linkRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              showIOSAlert(
                'Privacy Architecture',
                'ARISE operates strictly on-device. Pose detection camera frames are processed in volatile memory and immediately recycled. All workout history and screen time metrics are stored locally in your private SQLite database.'
              );
            }}
            activeOpacity={0.7}
          >
            <Shield size={18} color={colors.secondary} weight="duotone" />
            <Text style={[styles.linkText, { color: colors.textPrimary }]}>Privacy Policy</Text>
            <ArrowSquareOut size={14} color={colors.textMuted} weight="bold" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              showIOSAlert(
                'Terms of Service',
                'By using ARISE protocols, you agree that physical exercise, workouts, and discipline goals are undertaken responsibly. Ensure proper form and consult fitness professionals as appropriate.'
              );
            }}
            activeOpacity={0.7}
          >
            <FileText size={18} color={colors.primary} weight="duotone" />
            <Text style={[styles.linkText, { color: colors.textPrimary }]}>Terms of Service</Text>
            <ArrowSquareOut size={14} color={colors.textMuted} weight="bold" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.border }]}
            onPress={() => {
              haptics.light();
              showIOSAlert(
                'Software Licenses',
                'ARISE is engineered with React Native, Expo SDK 54, Google ML Kit, Phosphor Icons, and SQLite. All third-party libraries comply with their respective open-source licenses.'
              );
            }}
            activeOpacity={0.7}
          >
            <Scales size={18} color={colors.textSecondary} weight="duotone" />
            <Text style={[styles.linkText, { color: colors.textPrimary }]}>Third-Party Licenses</Text>
            <ArrowSquareOut size={14} color={colors.textMuted} weight="bold" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
          Crafted with discipline • 100% On-Device & Private Architecture
        </Text>
      </View>
    </ARISEBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 16,
  },
  brandHeader: {
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 4,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    gap: 6,
  },
  infoHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  linksGroup: {
    gap: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  copyrightText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
