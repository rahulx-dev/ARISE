import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';

interface SwipeableTabScreenProps {
  children: React.ReactNode;
  prevTab?: string;
  nextTab?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * High-performance horizontal swipe-to-switch tab wrapper
 * Allows fluid gesture navigation across main tabs like Instagram & Snapchat
 */
export function SwipeableTabScreen({
  children,
  prevTab,
  nextTab,
  style,
}: SwipeableTabScreenProps) {
  const haptics = useHaptics();

  const handleNavigate = (target: string) => {
    haptics.light();
    router.push(target as any);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-18, 18])
    .onEnd((e) => {
      // Swiping Left (finger moves left) -> Move to Next Tab
      if (e.translationX < -60 && nextTab && Math.abs(e.velocityX) > 150) {
        runOnJS(handleNavigate)(nextTab);
      }
      // Swiping Right (finger moves right) -> Move to Previous Tab
      else if (e.translationX > 60 && prevTab && Math.abs(e.velocityX) > 150) {
        runOnJS(handleNavigate)(prevTab);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
