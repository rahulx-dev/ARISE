import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface CognitiveLineChartProps {
  widthSize?: number;
  heightSize?: number;
}

export function CognitiveLineChart({
  widthSize = width - 72,
  heightSize = 130,
}: CognitiveLineChartProps) {
  // 7 Points for the weekly cognitive trend
  const points = [
    { x: 10, y: 80 },
    { x: widthSize * 0.18, y: 70 },
    { x: widthSize * 0.35, y: 95 },
    { x: widthSize * 0.52, y: 65 },
    { x: widthSize * 0.70, y: 40 },
    { x: widthSize * 0.85, y: 55 },
    { x: widthSize - 10, y: 20 },
  ];

  // Build SVG path
  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  const areaD = `${pathD} L ${widthSize - 10} ${heightSize} L 10 ${heightSize} Z`;

  return (
    <View style={[styles.container, { width: widthSize, height: heightSize }]}>
      <Svg width={widthSize} height={heightSize} viewBox={`0 0 ${widthSize} ${heightSize}`}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Gradient Fill under the curve */}
        <Path d={areaD} fill="url(#chartGradient)" />

        {/* Glowing Green Line */}
        <Path
          d={pathD}
          fill="none"
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Nodes */}
        {points.map((p, idx) => (
          <Circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 5 : 3.5}
            fill={idx === points.length - 1 ? colors.primary : '#141414'}
            stroke={colors.primary}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginVertical: 6,
  },
});
