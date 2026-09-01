import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';

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
  return (
    <View
      style={[
        styles.base,
        variant === 'glow' && styles.glow,
        variant === 'active' && styles.active,
        variant === 'subtle' && styles.subtle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  glow: {
    borderColor: 'rgba(209, 255, 0, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  active: {
    borderColor: colors.primary,
    backgroundColor: '#181A10',
  },
  subtle: {
    backgroundColor: '#121212',
    borderColor: '#1C1C1C',
  },
});
