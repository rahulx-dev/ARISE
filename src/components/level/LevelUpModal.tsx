import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  Crown,
  Coins,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useHaptics } from '../../hooks/useHaptics';
import { useSound } from '../../hooks/useSound';
import { SoloLevelingWindow } from '../ui/SoloLevelingWindow';
import { motion } from '../../theme/motion';

const { width } = Dimensions.get('window');

export function LevelUpModal() {
  const levelUpData = usePlayerStore((s) => s.levelUpData);
  const dismissLevelUp = usePlayerStore((s) => s.dismissLevelUp);
  const haptics = useHaptics();
  const sound = useSound();

  // Reanimated shared values
  const cardScale = useSharedValue(0.4);
  const cardOpacity = useSharedValue(0);
  const rayRotation = useSharedValue(0);
  const shakeOffset = useSharedValue(0);
  const glowPulse = useSharedValue(0.2);
  const bannerScale = useSharedValue(0);

  const [displayedLevel, setDisplayedLevel] = useState(1);

  useEffect(() => {
    let timer: any = null;

    if (levelUpData) {
      setDisplayedLevel(levelUpData.oldLevel);

      // Play audio & visceral haptic feedback sequence
      sound.play('level_up');
      haptics.heavy();
      setTimeout(() => {
        haptics.success();
      }, 350);

      // Card entrance with subtle, controlled scale
      cardScale.value = withSequence(
        withTiming(1.04, { duration: motion.timing.modal, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: motion.timing.quick })
      );
      cardOpacity.value = withTiming(1, { duration: motion.timing.screen });

      // Screen impact shake: refined low-amplitude settle (5px)
      shakeOffset.value = withSequence(
        withTiming(5, { duration: 40 }),
        withTiming(-5, { duration: 40 }),
        withTiming(3, { duration: 40 }),
        withTiming(-3, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );

      // Controlled 360 rotation of aura rays
      rayRotation.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );

      // Ambient aura pulse
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Rank Breakthrough banner entrance
      bannerScale.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1.08, { duration: 250, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: motion.timing.quick })
      );

      // Roll up level number smoothly
      timer = setTimeout(() => {
        setDisplayedLevel(levelUpData.newLevel);
        haptics.light();
      }, 450);
    } else {
      cancelAnimation(rayRotation);
      cancelAnimation(glowPulse);
      cancelAnimation(cardScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(shakeOffset);
      cancelAnimation(bannerScale);
      cardScale.value = 0.4;
      cardOpacity.value = 0;
      shakeOffset.value = 0;
      bannerScale.value = 0;
    }

    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimation(rayRotation);
      cancelAnimation(glowPulse);
      cancelAnimation(cardScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(shakeOffset);
      cancelAnimation(bannerScale);
    };
  }, [levelUpData]);

  // Animated styles - MUST be called unconditionally at top-level
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateX: shakeOffset.value },
    ],
  }));

  const animatedRaysStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rayRotation.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [{ scale: interpolate(glowPulse.value, [0.25, 0.7], [0.96, 1.08]) }],
  }));

  const animatedBannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bannerScale.value }],
  }));

  const handleClaim = () => {
    cancelAnimation(rayRotation);
    cancelAnimation(glowPulse);
    haptics.heavy();
    sound.play('coin_earn');
    cardScale.value = withTiming(0.85, { duration: motion.timing.quick });
    cardOpacity.value = withTiming(0, { duration: motion.timing.quick });
    setTimeout(() => {
      dismissLevelUp();
    }, motion.timing.quick + 20);
  };

  if (!levelUpData) return null;

  const auraColor = levelUpData.auraColor || '#0A84FF';

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClaim}>
      <View style={styles.overlay}>
        {/* Continuous Rotating Sunburst Rays */}
        <Animated.View style={[styles.rayRingContainer, animatedRaysStyle]}>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <View
              key={deg}
              style={[
                styles.rayBeam,
                {
                  transform: [{ rotate: `${deg}deg` }],
                  backgroundColor: auraColor,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Ambient Pulsing Aura Glow */}
        <Animated.View
          style={[
            styles.ambientGlow,
            { backgroundColor: auraColor },
            animatedGlowStyle,
          ]}
        />

        {/* Main Modal Card */}
        <Animated.View style={[styles.modalContainer, animatedCardStyle]}>
          <SoloLevelingWindow
            variant="default"
            accentColor={auraColor}
            tag="SYSTEM NOTIFICATION"
            subtag="ARISE OS // HUNTER ASCENSION"
            style={styles.systemWindow}
            contentStyle={styles.windowContent}
            buttons={[
              {
                text: 'CONTINUE',
                onPress: handleClaim,
                style: 'primary',
              },
            ]}
          >
            {/* Solo Leveling Glitch / Pulse Level Up Title */}
            <Animated.View style={[styles.levelUpHeaderWrap, animatedBannerStyle]}>
              <Text style={[styles.levelUpGlitchTitle, { color: auraColor }]}>LEVEL UP!</Text>
              <Text style={styles.levelUpSubMsg}>
                You have leveled up! All physical parameters have strengthened and stamina is restored.
              </Text>
            </Animated.View>

            {/* Level Transition Indicator */}
            <View style={styles.levelRow}>
              <View style={styles.levelCircle}>
                <Text style={styles.levelCircleLabel}>OLD LVL</Text>
                <Text style={styles.levelCircleNumOld}>{levelUpData.oldLevel}</Text>
              </View>

              <View style={[styles.levelArrowWrap, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                <ArrowRight size={22} color={auraColor} strokeWidth={3} />
              </View>

              <View
                style={[
                  styles.levelCircle,
                  styles.levelCircleNew,
                  { borderColor: auraColor, backgroundColor: 'rgba(2, 132, 199, 0.2)' },
                ]}
              >
                <Text style={[styles.levelCircleLabel, { color: auraColor }]}>NEW LVL</Text>
                <Text style={[styles.levelCircleNumNew, { color: auraColor }]}>
                  {displayedLevel}
                </Text>
              </View>
            </View>

            {/* +5 Stat Points Allocation Badge */}
            <View style={[styles.statPointsBadge, { borderColor: auraColor }]}>
              <Zap size={14} color={auraColor} />
              <Text style={[styles.statPointsBadgeText, { color: auraColor }]}>
                +5 STAT POINTS ALLOCATED
              </Text>
            </View>

            {/* Rank Breakthrough Title */}
            <Animated.View style={[styles.transformSection, animatedBannerStyle]}>
              <Text style={styles.transformPreLabel}>HUNTER RANK ADVANCEMENT</Text>
              <Text style={[styles.transformRankTitle, { color: auraColor }]}>
                {levelUpData.transformationName}
              </Text>
              <View style={[styles.rankPillBadge, { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: auraColor }]}>
                <Crown size={14} color={auraColor} />
                <Text style={[styles.rankPillText, { color: auraColor }]}>
                  {levelUpData.rankTitle.toUpperCase()}
                </Text>
              </View>
            </Animated.View>

            {/* Reward Box */}
            <View style={styles.rewardBox}>
              <View style={styles.rewardIconWrap}>
                <Coins size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rewardTitle}>ASCENSION REWARD BOUNTY</Text>
                <Text style={styles.rewardSub}>Registered directly to treasury vault</Text>
              </View>
              <Text style={styles.rewardAmount}>+{levelUpData.rewardCoins} COINS</Text>
            </View>
          </SoloLevelingWindow>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rayRingContainer: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rayBeam: {
    position: 'absolute',
    width: 3,
    height: width * 1.4,
    opacity: 0.15,
    borderRadius: 2,
  },
  ambientGlow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  systemWindow: {
    width: '100%',
    maxWidth: 380,
  },
  windowContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  levelUpHeaderWrap: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  levelUpGlitchTitle: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
  levelUpSubMsg: {
    fontSize: 11.5,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  statPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
  },
  statPointsBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 4,
  },
  levelCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#333848',
    backgroundColor: '#141620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCircleNew: {
    borderWidth: 2.5,
  },
  levelCircleLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  levelCircleNumOld: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
  },
  levelCircleNumNew: {
    fontSize: 24,
    fontWeight: '600',
  },
  levelArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transformSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  transformPreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  transformRankTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  rankPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    marginTop: 2,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 10,
  },
  rewardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  rewardSub: {
    fontSize: 10,
    color: '#8E8E93',
  },
  rewardAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
