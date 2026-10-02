import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { motion } from '../../theme/motion';

interface SegmentedControlProps<T extends string> {
  values: T[];
  labels?: Record<T, string>;
  selectedValue: T;
  onChange: (value: T) => void;
}

/**
 * Authentic Apple iOS 18 Segmented Control with UI-thread sliding indicator (Section 7)
 */
export function IOSSegmentedControl<T extends string>({
  values,
  labels,
  selectedValue,
  onChange,
}: SegmentedControlProps<T>) {
  const haptics = useHaptics();
  const { isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const selectedIndex = Math.max(0, values.indexOf(selectedValue));
  const translateX = useSharedValue(0);

  const padding = 3;
  const tabWidth = containerWidth > 0 ? (containerWidth - padding * 2) / values.length : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      translateX.value = withSpring(selectedIndex * tabWidth, motion.spring.snappy);
    }
    return () => {
      cancelAnimation(translateX);
    };
  }, [selectedIndex, tabWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      const initialTabWidth = (width - padding * 2) / values.length;
      translateX.value = selectedIndex * initialTabWidth;
    }
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)',
        },
      ]}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: tabWidth,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              shadowOpacity: isDark ? 0.35 : 0.1,
            },
            indicatorStyle,
          ]}
        />
      )}
      {values.map((val) => {
        const isSelected = val === selectedValue;
        const displayLabel = labels ? labels[val] : val;

        return (
          <TouchableOpacity
            key={val}
            style={styles.segmentBtn}
            onPress={() => {
              if (!isSelected) {
                haptics.light();
                onChange(val);
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: isDark ? '#8E8E93' : '#687076' },
                isSelected && [
                  styles.segmentTextActive,
                  { color: isDark ? '#FFFFFF' : '#000000' },
                ],
              ]}
              numberOfLines={1}
            >
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 3,
    width: '100%',
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  segmentTextActive: {
    fontWeight: '700',
  },
});
