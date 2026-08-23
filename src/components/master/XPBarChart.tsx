import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export function XPBarChart() {
  const days = [
    { label: 'M', heightPercent: 20 },
    { label: 'T', heightPercent: 45 },
    { label: 'W', heightPercent: 35 },
    { label: 'T', heightPercent: 75 },
    { label: 'F', heightPercent: 95, active: true },
    { label: 'S', heightPercent: 55 },
    { label: 'S', heightPercent: 30 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {days.map((d, idx) => (
          <View key={idx} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${d.heightPercent}%` },
                  d.active && styles.barFillActive,
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, d.active && styles.dayLabelActive]}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 120,
    justifyContent: 'flex-end',
    marginVertical: 6,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  barTrack: {
    width: 22,
    height: 80,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primaryPurple,
    borderRadius: 8,
  },
  barFillActive: {
    backgroundColor: '#9D4EDD',
    shadowColor: colors.primaryPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayLabelActive: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
});
