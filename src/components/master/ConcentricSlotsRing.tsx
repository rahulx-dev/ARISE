import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface ConcentricSlotsRingProps {
  size?: number;
  timeStart?: string;
  timeEnd?: string;
}

export function ConcentricSlotsRing({
  size = 240,
  timeStart = '9:00 AM',
  timeEnd = '9:50 AM',
}: ConcentricSlotsRingProps) {
  const center = size / 2;
  const strokeWidth = 8;

  // 3 Concentric Radii
  const r1 = size * 0.42; // Outer Green
  const r2 = size * 0.34; // Middle Purple
  const r3 = size * 0.26; // Inner Cyan

  const circ1 = 2 * Math.PI * r1;
  const circ2 = 2 * Math.PI * r2;
  const circ3 = 2 * Math.PI * r3;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track Rings */}
        <Circle cx={center} cy={center} r={r1} stroke="#1C1C1C" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={center} cy={center} r={r2} stroke="#1C1C1C" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={center} cy={center} r={r3} stroke="#1C1C1C" strokeWidth={strokeWidth} fill="none" />

        {/* Outer Ring: Work Slot (Neon Green) */}
        <Circle
          cx={center}
          cy={center}
          r={r1}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circ1 * 0.65} ${circ1}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Middle Ring: Break Slot (Neon Purple) */}
        <Circle
          cx={center}
          cy={center}
          r={r2}
          stroke={colors.primaryPurple}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circ2 * 0.45} ${circ2}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(45 ${center} ${center})`}
        />

        {/* Inner Ring: Available (Cyan) */}
        <Circle
          cx={center}
          cy={center}
          r={r3}
          stroke={colors.secondary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circ3 * 0.75} ${circ3}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(130 ${center} ${center})`}
        />
      </Svg>

      {/* Center Digital Clock Display */}
      <View style={styles.centerClock}>
        <Text style={styles.timeStartText}>{timeStart}</Text>
        <Text style={styles.timeEndText}>{timeEnd}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  centerClock: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeStartText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  timeEndText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
