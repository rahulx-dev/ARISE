import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  glowColor?: string;
  variant?: 'surface' | 'elevated' | 'subtle';
}

export function GlassCard({
  children,
  style,
  glow = false,
  glowColor = colors.primary,
  variant = 'surface',
}: GlassCardProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return 'rgba(22, 28, 48, 0.85)';
      case 'subtle':
        return 'rgba(18, 24, 40, 0.45)';
      case 'surface':
      default:
        return 'rgba(20, 26, 44, 0.65)';
    }
  };

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: getBackgroundColor() },
        glow && {
          borderColor: glowColor,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
          elevation: 6,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
