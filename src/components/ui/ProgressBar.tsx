import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/borderRadius';
import { spacing } from '../../theme/spacing';
import { Label } from './Typography';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  showPercentage?: boolean;
  animated?: boolean;
  glowing?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar = ({
  progress,
  color = colors.primary,
  height = 8,
  showPercentage = false,
  animated = true,
  glowing = false,
  style,
}: ProgressBarProps) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const progressValue = useSharedValue(clampedProgress);

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(clampedProgress, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%` as any,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              height,
              shadowColor: glowing ? color : undefined,
              shadowRadius: glowing ? 8 : 0,
              shadowOpacity: glowing ? 0.8 : 0,
              elevation: glowing ? 4 : 0,
            },
            animatedStyle,
          ]}
        />
      </View>
      {showPercentage && (
        <Label style={styles.percentageText}>
          {Math.round(clampedProgress * 100)}%
        </Label>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  track: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.pill,
  },
  percentageText: {
    marginLeft: spacing.md,
    minWidth: 40,
    textAlign: 'right',
  },
});
