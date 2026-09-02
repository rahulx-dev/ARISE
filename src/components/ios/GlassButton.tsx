import React, { ReactNode, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
} from 'react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Solid Modern Action Button with Smooth Spring Press Animation
 */
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

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
            backgroundColor: '#FF5500',
            borderColor: '#FF5500',
            shadowColor: '#FF5500',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '900',
          },
        };

      case 'secondary':
        return {
          btn: {
            backgroundColor: isDark ? '#2E1065' : '#EDE9FE',
            borderColor: isDark ? '#4C1D95' : '#DDD6FE',
          },
          text: {
            color: isDark ? '#C4B5FD' : '#6D28D9',
            fontWeight: '800',
          },
        };

      case 'success':
        return {
          btn: {
            backgroundColor: '#10B981',
            borderColor: '#10B981',
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '900',
          },
        };

      case 'outline':
        return {
          btn: {
            backgroundColor: isDark ? '#14151C' : '#FFFFFF',
            borderColor: isDark ? '#282A36' : '#E5E7EB',
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '800',
          },
        };

      case 'danger':
        return {
          btn: {
            backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
            borderColor: isDark ? '#7F1D1D' : '#FECACA',
          },
          text: {
            color: isDark ? '#FCA5A5' : '#DC2626',
            fontWeight: '900',
          },
        };

      case 'glass':
      default:
        return {
          btn: {
            backgroundColor: isDark ? '#1C1E27' : '#F3F4F6',
            borderColor: isDark ? '#2B2D3A' : '#E5E7EB',
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
          btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
          text: { fontSize: 11, letterSpacing: 0.4 },
        };
      case 'lg':
        return {
          btn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16 },
          text: { fontSize: 14, letterSpacing: 0.8 },
        };
      case 'md':
      default:
        return {
          btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
          text: { fontSize: 12, letterSpacing: 0.6 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.85}
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
    </Animated.View>
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
