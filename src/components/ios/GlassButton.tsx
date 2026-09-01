import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const GlassButton = React.memo(function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: GlassButtonProps) {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const handlePress = () => {
    if (disabled || loading) return;
    haptics.light();
    onPress();
  };

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          btn: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
          text: {
            color: '#000000',
            fontWeight: '900',
          },
        };

      case 'secondary':
        return {
          btn: {
            backgroundColor: isDark ? 'rgba(0, 240, 255, 0.15)' : 'rgba(2, 132, 199, 0.15)',
            borderColor: colors.secondary,
          },
          text: {
            color: colors.secondary,
            fontWeight: '800',
          },
        };

      case 'outline':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderColor: colors.border,
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '800',
          },
        };

      case 'danger':
        return {
          btn: {
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderColor: colors.danger,
          },
          text: {
            color: colors.danger,
            fontWeight: '900',
          },
        };

      case 'glass':
      default:
        return {
          btn: {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '800',
          },
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
          text: { fontSize: 11, letterSpacing: 0.5 },
        };
      case 'lg':
        return {
          btn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 18 },
          text: { fontSize: 14, letterSpacing: 1 },
        };
      case 'md':
      default:
        return {
          btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
          text: { fontSize: 12, letterSpacing: 0.8 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.buttonBase,
        vStyles.btn,
        sStyles.btn,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vStyles.text.color} />
      ) : (
        <>
          {icon}
          <Text style={[styles.textBase, vStyles.text, sStyles.text, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  textBase: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
