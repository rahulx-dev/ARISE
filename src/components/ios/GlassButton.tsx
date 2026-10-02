import React, { ReactNode } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { useScalePress } from '../../hooks/useMotion';
import { motion } from '../../theme/motion';

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
 * Ultra-Premium Solid Action Button with Reanimated UI-thread Spring Scale Feedback
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
  const { handlePressIn, handlePressOut, animatedStyle } = useScalePress(motion.scale.pressedButton);

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
            backgroundColor: '#0A84FF',
            borderColor: '#0A84FF',
            shadowColor: '#0A84FF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '600',
          },
        };

      case 'secondary':
        return {
          btn: {
            backgroundColor: isDark ? '#141A29' : '#EFF6FF',
            borderColor: isDark ? '#1E2D4A' : '#BFDBFE',
          },
          text: {
            color: isDark ? '#60A5FA' : '#1D4ED8',
            fontWeight: '600',
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
            fontWeight: '600',
          },
        };

      case 'outline':
        return {
          btn: {
            backgroundColor: isDark ? '#121216' : '#FFFFFF',
            borderColor: isDark ? '#1F1F27' : '#E5E5EA',
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '600',
          },
        };

      case 'danger':
        return {
          btn: {
            backgroundColor: isDark ? '#3D0D0D' : '#FEE2E2',
            borderColor: isDark ? '#661414' : '#FECACA',
          },
          text: {
            color: isDark ? '#FCA5A5' : '#DC2626',
            fontWeight: '600',
          },
        };

      case 'glass':
      default:
        return {
          btn: {
            backgroundColor: isDark ? '#18181F' : '#F2F2F7',
            borderColor: isDark ? '#262630' : '#E5E5EA',
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '600',
          },
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
          text: { fontSize: 11, letterSpacing: 0.3 },
        };
      case 'lg':
        return {
          btn: { paddingVertical: 15, paddingHorizontal: 24, borderRadius: 16 },
          text: { fontSize: 14, letterSpacing: 0.6 },
        };
      case 'md':
      default:
        return {
          btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
          text: { fontSize: 12, letterSpacing: 0.5 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
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
      </Pressable>
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
