import React from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Typography } from './Typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: 'transparent', borderColor: colors.secondary, borderWidth: 1 };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: colors.danger };
      case 'gold':
        return { backgroundColor: colors.accent };
      case 'primary':
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'secondary':
        return colors.secondary;
      case 'ghost':
        return colors.textSecondary;
      case 'danger':
        return colors.textPrimary;
      case 'gold':
      case 'primary':
      default:
        return colors.background;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { minHeight: 36, paddingHorizontal: spacing.md };
      case 'lg':
        return { minHeight: 52, paddingHorizontal: spacing.xl };
      case 'md':
      default:
        return { minHeight: 44, paddingHorizontal: spacing.lg };
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Typography
            variant={size === 'sm' ? 'buttonSmall' : 'button'}
            color={getTextColor()}
          >
            {title}
          </Typography>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 48,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
});
