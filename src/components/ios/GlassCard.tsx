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
 * Stitch v2 Kinetic Glass Panel
 * Level 1 elevation (40% opacity obsidian with inner-glow border)
 */
export const GlassCard = React.memo(function GlassCard({
  children,
  style,
  variant = 'default',
  glowColor,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    // Dark: Stitch v2 Surface Container (rgba(39, 54, 71, 0.4))
    // Light: Pure Apple White Glass (rgba(255, 255, 255, 0.94))
    const defaultBg = isDark ? 'rgba(39, 54, 71, 0.45)' : 'rgba(255, 255, 255, 0.95)';
    const defaultBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: isDark ? 'rgba(28, 43, 60, 0.75)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.1)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 16,
          elevation: 4,
        };

      case 'glow':
        return {
          backgroundColor: isDark ? 'rgba(20, 36, 44, 0.65)' : 'rgba(240, 253, 244, 0.95)',
          borderColor: glowColor || (isDark ? 'rgba(195, 244, 0, 0.4)' : 'rgba(16, 185, 129, 0.35)'),
          shadowColor: glowColor || colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.35 : 0.15,
          shadowRadius: 14,
          elevation: 3,
        };

      case 'accent':
        return {
          backgroundColor: isDark ? 'rgba(40, 15, 65, 0.6)' : 'rgba(245, 240, 255, 0.95)',
          borderColor: isDark ? 'rgba(221, 183, 255, 0.35)' : 'rgba(124, 58, 237, 0.25)',
          shadowColor: colors.secondary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 2,
        };

      default:
        return {
          backgroundColor: defaultBg,
          borderColor: defaultBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 8,
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
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
