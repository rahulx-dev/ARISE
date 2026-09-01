import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useHaptics } from '../../hooks/useHaptics';

interface SegmentedControlProps<T extends string> {
  values: T[];
  labels?: Record<T, string>;
  selectedValue: T;
  onChange: (value: T) => void;
}

/**
 * Authentic Apple iOS 18 Segmented Control (Pill switcher)
 */
export function IOSSegmentedControl<T extends string>({
  values,
  labels,
  selectedValue,
  onChange,
}: SegmentedControlProps<T>) {
  const haptics = useHaptics();

  return (
    <View style={styles.container}>
      {values.map((val) => {
        const isSelected = val === selectedValue;
        const displayLabel = labels ? labels[val] : val;

        return (
          <TouchableOpacity
            key={val}
            style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
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
                isSelected && styles.segmentTextActive,
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
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
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
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
