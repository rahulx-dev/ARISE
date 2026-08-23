import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/borderRadius';
import { Typography } from './Typography';
import { spacing } from '../../theme/spacing';

interface BadgeProps {
  label: string;
  color?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  variant?: 'filled' | 'outlined';
  style?: StyleProp<ViewStyle>;
}

export const Badge = ({
  label,
  color = colors.primary,
  icon,
  size = 'md',
  variant = 'filled',
  style,
}: BadgeProps) => {
  const getContainerStyles = () => {
    const sizeStyle =
      size === 'sm'
        ? { paddingHorizontal: 8, paddingVertical: 3 }
        : { paddingHorizontal: 12, paddingVertical: 5 };

    const variantStyle =
      variant === 'filled'
        ? { backgroundColor: `${color}20`, borderColor: `${color}40`, borderWidth: 1 }
        : { backgroundColor: 'transparent', borderColor: color, borderWidth: 1 };

    return [sizeStyle, variantStyle];
  };

  return (
    <View style={[styles.container, getContainerStyles(), style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Typography
        variant="caption"
        color={color}
        style={{
          fontSize: size === 'sm' ? 10 : 11,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
});
