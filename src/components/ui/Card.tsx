import React from 'react';
import { View, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glow';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Card = ({ children, variant = 'default', style, onPress }: CardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'glow':
        return styles.glow;
      case 'default':
      default:
        return styles.default;
    }
  };

  const content = (
    <View style={[styles.base, getVariantStyles(), style]}>
      {children}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
};

const styles = StyleSheet.create({
  base: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 0.5,
  },
  elevated: {
    backgroundColor: colors.surfaceLight,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  glow: {
    backgroundColor: colors.surface,
    borderColor: `${colors.primary}4D`,
    borderWidth: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
});
