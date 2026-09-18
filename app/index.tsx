import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { AriseLogo } from '../src/components/ui/AriseLogo';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { getIsOnboardingCompleted } from '../src/services/appStateService';
import { useHaptics } from '../src/hooks/useHaptics';

const { width } = Dimensions.get('window');
const LETTERS = ['A', 'R', 'I', 'S', 'E'];

function AnimatedLetter({ char, index }: { char: string; index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    const delay = index * 120 + 80;
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
      scale.value = withSpring(1, { damping: 12, stiffness: 140 });
    }, delay);
    return () => clearTimeout(timer);
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.letterText, animatedStyle]}>
      {char}
    </Animated.Text>
  );
}

export default function RootIndex() {
  const router = useRouter();
  const haptics = useHaptics();

  const resolveInitialRoute = (): string => {
    try {
      const isStoreDone = useSettingsStore.getState().onboardingCompleted;
      if (isStoreDone) return '/(tabs)';
      const isSqliteDone = getIsOnboardingCompleted();
      if (isSqliteDone) {
        useSettingsStore.setState({ onboardingCompleted: true });
        return '/(tabs)';
      }
      return '/(onboarding)';
    } catch {
      return '/(onboarding)';
    }
  };

  const targetRouteRef = useRef<string>(resolveInitialRoute());
  const hasNavigated = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Shared Animation Values
  const screenFade = useSharedValue(1);
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const auraPulse = useSharedValue(0.3);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(8);

  const finishIntro = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace(targetRouteRef.current as any);
  };

  useEffect(() => {
    // Play intro sound
    const playIntroSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/audio/intro_whoosh.mp3'),
          { shouldPlay: true, volume: 1.0 }
        );
        soundRef.current = sound;
      } catch (e) {}
    };

    playIntroSound();
    haptics.heavy();

    // 1. Logo Entrance
    logoScale.value = withSpring(1.0, { damping: 12, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 400 });

    // 2. Cosmic Aura Pulse
    auraPulse.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3. Subtitle Entrance after letters appear
    const subTimer = setTimeout(() => {
      subtitleOpacity.value = withTiming(1, { duration: 400 });
      subtitleTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, 750);

    // 4. Smooth Exit Transition after 1.4 seconds
    const exitTimer = setTimeout(() => {
      screenFade.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(finishIntro)();
      });
    }, 1400);

    const failsafe = setTimeout(() => {
      finishIntro();
    }, 2000);

    return () => {
      clearTimeout(subTimer);
      clearTimeout(exitTimer);
      clearTimeout(failsafe);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: screenFade.value,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const animatedAuraStyle = useAnimatedStyle(() => ({
    opacity: auraPulse.value,
    transform: [{ scale: 1.05 + auraPulse.value * 0.15 }],
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={finishIntro}
      style={styles.touchContainer}
    >
      <StatusBar barStyle="light-content" backgroundColor="#02040A" translucent />

      <Animated.View style={[styles.container, animatedScreenStyle]}>
        {/* Background Ambient Radial Glow */}
        <Animated.View style={[styles.cosmicAura, animatedAuraStyle]} />

        {/* Center Content */}
        <View style={styles.centerContainer}>
          {/* Glowing App Insignia */}
          <Animated.View style={[styles.logoWrap, animatedLogoStyle]}>
            <AriseLogo size={100} glow={true} />
          </Animated.View>

          {/* Letter-By-Letter ARISE Reveal */}
          <View style={styles.lettersRow}>
            {LETTERS.map((letter, idx) => (
              <AnimatedLetter key={idx} char={letter} index={idx} />
            ))}
          </View>

          {/* Clean Cinematic Subtitle */}
          <Animated.View style={[styles.subtitleWrap, animatedSubtitleStyle]}>
            <Text style={styles.subtitleText}>BUILD DISCIPLINE. EARN YOUR TIME.</Text>
            <View style={styles.subAccentBar} />
          </Animated.View>
        </View>

        {/* Skip Tip */}
        <View style={styles.skipHintWrap}>
          <Text style={styles.skipHintText}>TAP ANYWHERE TO SKIP</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchContainer: {
    flex: 1,
    backgroundColor: '#02040A',
  },
  container: {
    flex: 1,
    backgroundColor: '#02040A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cosmicAura: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 80,
    elevation: 20,
  },
  centerContainer: {
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  logoWrap: {
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 8,
  },
  letterText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 210, 238, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitleWrap: {
    alignItems: 'center',
    gap: 8,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  subAccentBar: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#00D2EE',
  },
  skipHintWrap: {
    position: 'absolute',
    bottom: 32,
  },
  skipHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.25)',
    letterSpacing: 2,
  },
});
