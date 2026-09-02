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
 * Ultra-Premium Solid Slate Charcoal Surface (Apple Pro & Linear Tier)
 * Solid high-contrast surface with crisp subtle hairline borders
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
          backgroundColor: isDark ? '#161822' : '#FFFFFF',
          borderColor: isDark ? '#232636' : '#E5E5EA',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.06,
          shadowRadius: 10,
          elevation: 4,
        };

      case 'glow':
        return {
          backgroundColor: isDark ? '#111218' : '#FFFFFF',
          borderColor: glowColor || (isDark ? '#0A84FF' : '#007AFF'),
          shadowColor: glowColor || colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        };

      case 'accent':
        return {
          backgroundColor: isDark ? '#0D111A' : '#F0F7FF',
          borderColor: isDark ? '#1B2338' : '#D0E3FF',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 2,
        };

      default:
        return {
          backgroundColor: isDark ? '#111218' : '#FFFFFF',
          borderColor: isDark ? '#1C1E2A' : '#E5E5EA',
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
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
