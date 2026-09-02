import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'glow' | 'accent';
  glowColor?: string;
}

/**
 * Solid Surface Container (No Glassmorphism, No Blur, No Translucency)
 * High-contrast solid dark surface with subtle border and crisp shadow
 */
export const GlassCard = React.memo(function GlassCard({
  children,
  style,
  variant = 'default',
  glowColor,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: isDark ? '#181A22' : '#FFFFFF',
          borderColor: isDark ? '#282A36' : '#E5E7EB',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 12,
          elevation: 4,
        };

      case 'glow':
        return {
          backgroundColor: isDark ? '#14151C' : '#FFFFFF',
          borderColor: glowColor || (isDark ? 'rgba(255, 85, 0, 0.4)' : '#FF5500'),
          shadowColor: glowColor || colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 10,
          elevation: 3,
        };

      case 'accent':
        return {
          backgroundColor: isDark ? '#161324' : '#F9F5FF',
          borderColor: isDark ? '#3B2D60' : '#DDD6FE',
          shadowColor: colors.secondary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 2,
        };

      default:
        return {
          backgroundColor: isDark ? '#14151C' : '#FFFFFF',
          borderColor: isDark ? '#22242E' : '#E5E7EB',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 6,
          elevation: 2,
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
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
