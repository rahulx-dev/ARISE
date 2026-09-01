import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'glow' | 'accent';
  glowColor?: string;
}

export const GlassCard = React.memo(function GlassCard({
  children,
  style,
  variant = 'default',
  glowColor,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    const defaultBg = isDark ? 'rgba(22, 22, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)';
    const defaultBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: isDark ? 'rgba(30, 30, 36, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 12,
          elevation: 4,
        };

      case 'glow':
        return {
          backgroundColor: isDark ? 'rgba(20, 24, 18, 0.8)' : 'rgba(240, 253, 244, 0.9)',
          borderColor: glowColor || (isDark ? 'rgba(209, 255, 0, 0.35)' : 'rgba(16, 185, 129, 0.3)'),
          shadowColor: glowColor || colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.3 : 0.15,
          shadowRadius: 12,
          elevation: 3,
        };

      case 'accent':
        return {
          backgroundColor: isDark ? 'rgba(18, 26, 32, 0.8)' : 'rgba(240, 249, 255, 0.9)',
          borderColor: isDark ? 'rgba(0, 240, 255, 0.35)' : 'rgba(2, 132, 199, 0.3)',
          shadowColor: colors.secondary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 2,
        };

      default:
        return {
          backgroundColor: defaultBg,
          borderColor: defaultBorder,
        };
    }
  };

  return (
    <View style={[styles.cardBase, getVariantStyles(), style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
