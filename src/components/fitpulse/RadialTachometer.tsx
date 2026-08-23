import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface RadialTachometerProps {
  progressPercent: number; // 0 to 100
  size?: number;
  centerLabel?: string;
  subLabel?: string;
}

export function RadialTachometer({
  progressPercent = 50,
  size = 260,
  centerLabel,
  subLabel = 'Progress',
}: RadialTachometerProps) {
  const totalTicks = 42;
  const radius = size * 0.42;
  const tickLength = 14;
  const cx = size / 2;
  const cy = size * 0.55;

  const startAngle = 180; // Left horizontal
  const sweepAngle = 180; // Semi-circle to right horizontal

  const activeTicksCount = Math.round((Math.max(0, Math.min(100, progressPercent)) / 100) * totalTicks);

  const ticks = [];
  for (let i = 0; i < totalTicks; i++) {
    const fraction = i / (totalTicks - 1);
    const angleDeg = startAngle + fraction * sweepAngle;
    const angleRad = (angleDeg * Math.PI) / 180;

    const x1 = cx + (radius - tickLength) * Math.cos(angleRad);
    const y1 = cy + (radius - tickLength) * Math.sin(angleRad);
    const x2 = cx + radius * Math.cos(angleRad);
    const y2 = cy + radius * Math.sin(angleRad);

    const isActive = i <= activeTicksCount;

    ticks.push({
      x1,
      y1,
      x2,
      y2,
      isActive,
      isIndicator: i === activeTicksCount,
    });
  }

  const indicatorAngle = (startAngle + (activeTicksCount / (totalTicks - 1)) * sweepAngle * Math.PI) / 180;
  const indicatorDotX = cx + (radius - 20) * Math.cos((startAngle + (activeTicksCount / (totalTicks - 1)) * sweepAngle) * Math.PI / 180);
  const indicatorDotY = cy + (radius - 20) * Math.sin((startAngle + (activeTicksCount / (totalTicks - 1)) * sweepAngle) * Math.PI / 180);

  return (
    <View style={[styles.container, { width: size, height: size * 0.72 }]}>
      <Svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        {ticks.map((t, idx) => (
          <Line
            key={idx}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isActive ? colors.primaryLight : 'rgba(100, 116, 139, 0.28)'}
            strokeWidth={t.isActive ? 2.5 : 1.8}
            strokeLinecap="round"
          />
        ))}

        {/* Small Active Neon Dot on Arc */}
        <Circle
          cx={indicatorDotX}
          cy={indicatorDotY}
          r={4.5}
          fill={colors.neonGreen}
        />
      </Svg>

      {/* Center Percentage & Label */}
      <View style={[styles.centerTextGroup, { top: size * 0.26 }]}>
        <Text style={styles.percentageText}>
          {centerLabel || `${Math.round(progressPercent)}%`}
        </Text>
        <Text style={styles.subLabelText}>{subLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 8,
  },
  centerTextGroup: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  subLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: -4,
  },
});
