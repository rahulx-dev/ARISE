import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { fontFamilies } from '../../src/theme/typography';
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';
import { Icon3D } from '../../src/components/ui/Icon3D';

/**
 * Emergency Override Screen
 * Follows the 1:1 Light Neumorphic Design Language of the ARISE Lock Screen.
 * Delegates to the camera/pose tracker to verify genuine physical movement.
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F4EF" />

      {/* HEADER ROW */}
      <View style={styles.header}>
        <NeumorphicCircleButton
          size={42}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#1A1A1A" strokeWidth={2.5} />
        </NeumorphicCircleButton>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>EMERGENCY OVERRIDE</Text>
          <Text style={styles.headerSubtitle}>DISCIPLINE GATEWAY</Text>
        </View>

        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SUBHEADER ROW */}
        <View style={styles.subHeaderRow}>
          <View>
            <Text style={styles.subHeaderEyebrow}>FOCUS MODE</Text>
            <Text style={styles.subHeaderCaption}>DISCIPLINE TODAY</Text>
          </View>
          <View style={styles.subHeaderRight}>
            <View style={styles.redBar} />
            <Text style={styles.subHeaderRightText}>A BETTER YOU TOMORROW</Text>
          </View>
        </View>

        {/* HERO COMPOSITION: CONCENTRIC RINGS & REPS */}
        <View style={styles.heroWrapper}>
          <View style={styles.outerRing}>
            <View style={styles.innerArcCircle}>
              <View style={styles.centerBadgeCircle}>
                <Icon3D name="dumbbell_white" size={48} />
              </View>
            </View>
          </View>

          <Text style={styles.heroCount}>{targetReps}</Text>
          <Text style={styles.heroEyebrow}>CAMERA-VERIFIED PUSHUPS</Text>
          <Text style={styles.heroSubtext}>Physical movement required to lift lockout</Text>
        </View>

        {/* INFO CARD: ALLOWANCE EXHAUSTED */}
        <NeumorphicCard style={styles.infoCard} padding={16}>
          <View style={styles.infoCardRow}>
            <View style={styles.infoIconBox}>
              <Icon3D name="padlock_red" size={32} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoCardTitle}>Daily Allowance Exhausted</Text>
              <Text style={styles.infoCardBody}>
                Standard screen time has expired. Complete this physical trial to earn an emergency unlock pass.
              </Text>
            </View>
          </View>
        </NeumorphicCard>

        {/* PROTOCOL CARD: AI CAMERA TRACKED */}
        <NeumorphicCard style={styles.protocolCard} padding={16}>
          <View style={styles.infoCardRow}>
            <View style={styles.cameraIconBox}>
              <Icon3D name="camera_dark" size={32} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.protocolEyebrow}>AI MOTION SENSOR</Text>
              <Text style={styles.infoCardTitle}>Full Range of Motion Required</Text>
              <Text style={styles.infoCardBody}>
                Your camera and on-device ML Kit pose detector track every rep. Both full depth and lockout must register.
              </Text>
            </View>
          </View>
        </NeumorphicCard>
      </ScrollView>

      {/* FOOTER CTA */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={startVerifiedExercise}
          activeOpacity={0.88}
        >
          <View style={styles.ctaLeft}>
            <View style={styles.ctaIconCircle}>
              <Icon3D name="dumbbell_white" size={20} />
            </View>
            <View style={styles.ctaTextGroup}>
              <Text style={styles.ctaEyebrow}>EXECUTE TRIAL</Text>
              <Text style={styles.ctaTitle}>START {targetReps} PUSHUPS</Text>
            </View>
          </View>

          <View style={styles.ctaArrowCircle}>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
    letterSpacing: 1,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 120,
    gap: 16,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  subHeaderEyebrow: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 1.2,
  },
  subHeaderCaption: {
    fontSize: 10,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  subHeaderRight: {
    alignItems: 'flex-end',
  },
  redBar: {
    width: 28,
    height: 3,
    backgroundColor: '#E53935',
    borderRadius: 2,
    marginBottom: 3,
  },
  subHeaderRightText: {
    fontSize: 9,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
    letterSpacing: 0.8,
  },
  heroWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E4DC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  innerArcCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 4,
    borderColor: '#E53935',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  heroCount: {
    fontSize: 48,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    marginTop: 14,
    lineHeight: 52,
  },
  heroEyebrow: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  heroSubtext: {
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
    marginTop: 4,
  },
  infoCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
  },
  protocolCard: {},
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 46,
    backgroundColor: '#E8E4DC',
    marginHorizontal: 14,
  },
  infoTextContainer: {
    flex: 1,
    gap: 3,
  },
  protocolEyebrow: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 0.8,
  },
  infoCardTitle: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
  },
  infoCardBody: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
    lineHeight: 16,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: '#F6F4EF',
    borderTopWidth: 1,
    borderTopColor: '#E8E4DC',
  },
  ctaButton: {
    backgroundColor: '#E53935',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextGroup: {
    gap: 1,
  },
  ctaEyebrow: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
  },
  ctaTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ctaArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
