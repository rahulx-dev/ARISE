import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { colors } from '../../theme/colors';

export interface AriseLogoProps {
  size?: number;
  color?: string;
  glow?: boolean;
  style?: ViewStyle;
}

export function AriseLogo({
  size = 40,
  color = colors.primary,
  glow = true,
  style,
}: AriseLogoProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        glow && {
          shadowColor: color || colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="ariseGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00F0FF" />
            <Stop offset="50%" stopColor="#D1FF00" />
            <Stop offset="100%" stopColor="#00FF6A" />
          </LinearGradient>
          <LinearGradient id="ariseGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00F0FF" />
            <Stop offset="100%" stopColor="#D1FF00" />
          </LinearGradient>
        </Defs>
        <G>
          {/* Central Ascending Spearhead Apex */}
          <Path
            d="M50 12 L58 35 L50 48 L42 35 Z"
            fill="url(#ariseGrad1)"
            stroke="#00F0FF"
            strokeWidth="1.5"
          />
          {/* Left Wing / Left A-Leg */}
          <Path
            d="M44 42 L22 84 L32 84 L47 54 Z"
            fill="url(#ariseGrad1)"
          />
          {/* Right Wing / Right A-Leg */}
          <Path
            d="M56 42 L78 84 L68 84 L53 54 Z"
            fill="url(#ariseGrad1)"
          />
          {/* Futuristic Cyber Crossbar */}
          <Path
            d="M34 66 L66 66 L62 72 L38 72 Z"
            fill="url(#ariseGrad2)"
          />
          {/* Left Angular Wing Flairs */}
          <Path
            d="M15 32 L36 48 L28 52 L12 40 Z"
            fill="#00F0FF"
            opacity={0.9}
          />
          <Path
            d="M20 54 L36 64 L30 67 L16 59 Z"
            fill="#D1FF00"
            opacity={0.8}
          />
          {/* Right Angular Wing Flairs */}
          <Path
            d="M85 32 L64 48 L72 52 L88 40 Z"
            fill="#00F0FF"
            opacity={0.9}
          />
          <Path
            d="M80 54 L64 64 L70 67 L84 59 Z"
            fill="#D1FF00"
            opacity={0.8}
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
