import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface GlowCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glow' | 'active' | 'subtle';
  style?: StyleProp<ViewStyle>;
}

export function GlowCard({
  children,
  variant = 'default',
  style,
}: GlowCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isDark ? '#111218' : '#FFFFFF',
          borderColor: isDark ? '#1C1E2A' : '#E5E5EA',
        },
        variant === 'glow' && [
          styles.glow,
          { borderColor: colors.primary, shadowColor: colors.primary },
        ],
        variant === 'active' && [
          styles.active,
          { borderColor: colors.primary, backgroundColor: isDark ? '#161822' : '#F0F7FF' },
        ],
        variant === 'subtle' && {
          backgroundColor: isDark ? '#0A0D14' : '#F8F9FA',
          borderColor: isDark ? '#161922' : '#E5E7EB',
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  glow: {
    borderColor: 'rgba(10, 132, 255, 0.4)',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  active: {
    borderColor: '#0A84FF',
    backgroundColor: '#181A10',
  },
  subtle: {
    backgroundColor: '#121212',
    borderColor: '#1C1C1C',
  },
});
