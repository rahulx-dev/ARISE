import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';

interface SegmentedControlProps<T extends string> {
  values: T[];
  labels?: Record<T, string>;
  selectedValue: T;
  onChange: (value: T) => void;
}

/**
 * Authentic Apple iOS 18 Segmented Control (Pill switcher) with adaptive light/dark theme
 */
export function IOSSegmentedControl<T extends string>({
  values,
  labels,
  selectedValue,
  onChange,
}: SegmentedControlProps<T>) {
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)',
        },
      ]}
    >
      {values.map((val) => {
        const isSelected = val === selectedValue;
        const displayLabel = labels ? labels[val] : val;

        return (
          <TouchableOpacity
            key={val}
            style={[
              styles.segmentBtn,
              isSelected && [
                styles.segmentBtnActive,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  shadowOpacity: isDark ? 0.35 : 0.1,
                },
              ],
            ]}
            onPress={() => {
              if (!isSelected) {
                haptics.light();
                onChange(val);
              }
            }}
            activeOpacity={0.7}
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
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
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
