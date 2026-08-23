import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type IconFamily = 'material' | 'ionicons' | 'feather';
export type GlowIntensity = 'none' | 'subtle' | 'medium' | 'strong';

export interface GlowIconProps {
  name: string;
  family?: IconFamily;
  size?: number;
  color?: string;
  glowColor?: string;
  glowIntensity?: GlowIntensity;
  active?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export function GlowIcon({
  name,
  family = 'material',
  size = 22,
  color = colors.primary,
  glowColor,
  glowIntensity = 'subtle',
  active = true,
  disabled = false,
  containerStyle,
}: GlowIconProps) {
  const effectiveColor = disabled
    ? colors.textMuted
    : active
    ? color
    : colors.textSecondary;

  const shadowColor = glowColor || effectiveColor;

  const getGlowStyle = (): ViewStyle => {
    if (disabled || glowIntensity === 'none') {
      return {};
    }

    const radius =
      glowIntensity === 'strong' ? 14 : glowIntensity === 'medium' ? 8 : 4;
    const opacity =
      glowIntensity === 'strong' ? 0.75 : glowIntensity === 'medium' ? 0.5 : 0.25;

    return {
      shadowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: radius,
      // Elevation for Android
      elevation: glowIntensity === 'strong' ? 6 : glowIntensity === 'medium' ? 3 : 1,
    };
  };

  const renderIcon = () => {
    switch (family) {
      case 'ionicons':
        return <Ionicons name={name as any} size={size} color={effectiveColor} />;
      case 'feather':
        return <Feather name={name as any} size={size} color={effectiveColor} />;
      case 'material':
      default:
        return (
          <MaterialCommunityIcons
            name={name as any}
            size={size}
            color={effectiveColor}
          />
        );
    }
  };

  return (
    <View style={[styles.wrapper, getGlowStyle(), containerStyle]}>
      {renderIcon()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
