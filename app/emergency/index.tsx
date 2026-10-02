import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldAlert, Dumbbell, Camera } from 'lucide-react-native';
import { SerqBackdrop } from '../../src/components/serq/SerqBackdrop';
import { SerqCard } from '../../src/components/serq/SerqCard';
import { SerqButton } from '../../src/components/serq/SerqButton';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

/**
 * The emergency entry point intentionally delegates to the same camera/pose
 * tracker used by every other exercise.  It must not maintain a second timer or
 * synthetic rep counter that can grant an unlock without verified movement.
 */
export default function EmergencyOverrideScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const targetReps = 20;

  const startVerifiedExercise = () => {
    haptics.heavy();
    router.push({
      pathname: '/exercise/[type]',
      params: {
        type: 'PUSHUP',
        target: String(targetReps),
        sets: '1',
        source: 'emergency',
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <SerqBackdrop />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Override</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SerqCard variant="elevated" glow style={styles.infoBanner}>
            <View style={styles.alertIconWrap}>
              <ShieldAlert size={24} color={colors.danger} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoTitle}>Verified Override Required</Text>
              <Text style={styles.infoSubtitle}>
                Complete {targetReps} camera-verified push-ups to request an emergency
                screen-time pass. The standard ARISE AI tracker will verify every rep.
              </Text>
            </View>
          </SerqCard>

          <View style={styles.counterContainer}>
            <View style={styles.outerGlowRing}>
              <View style={styles.innerCounterCircle}>
                <Dumbbell size={42} color={colors.primary} />
                <Text style={styles.counterBigNumber}>{targetReps}</Text>
                <Text style={styles.counterTargetFraction}>VERIFIED REPS</Text>
              </View>
            </View>
          </View>

          <SerqCard variant="elevated" style={styles.protocolCard}>
            <Camera size={20} color={colors.primary} />
            <View style={styles.protocolTextGroup}>
              <Text style={styles.protocolTitle}>AI FORM-TRACKED PROTOCOL</Text>
              <Text style={styles.protocolSubtitle}>
                Your phone camera and the existing pose validator must detect valid
                full-body movement before the exercise can be completed.
              </Text>
            </View>
          </SerqCard>
        </ScrollView>

        <View style={styles.footer}>
          <SerqButton
            title="START VERIFIED PUSH-UPS"
            onPress={startVerifiedExercise}
            variant="emerald"
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
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 32, 36, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
    alignItems: 'center',
    gap: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  alertIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextGroup: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  infoSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  counterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  outerGlowRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
  },
  innerCounterCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBigNumber: {
    fontSize: 64,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  counterTargetFraction: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: -4,
    letterSpacing: 1,
  },
  protocolCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
  },
  protocolTextGroup: {
    flex: 1,
    gap: 4,
  },
  protocolTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  protocolSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
});
