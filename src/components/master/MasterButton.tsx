import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';

interface MasterButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'green' | 'dark' | 'outline' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  showArrow?: boolean;
  icon?: React.ReactNode;
}

export function MasterButton({
  title,
  onPress,
  variant = 'green',
  style,
  disabled = false,
  showArrow = false,
  icon,
}: MasterButtonProps) {
  const haptics = useHaptics();

  const handlePress = () => {
    if (disabled) return;
    haptics.medium();
    onPress();
  };

  if (variant === 'green') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        disabled={disabled}
        style={[styles.wrapper, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={['#00FF6A', '#00C853']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBtn}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.textGreen}>{title}</Text>
          {showArrow && <ArrowRight size={18} color="#0A0A0A" strokeWidth={2.5} />}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.solidBtn,
        variant === 'dark' && styles.btnDark,
        variant === 'outline' && styles.btnOutline,
        variant === 'danger' && styles.btnDanger,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text
        style={[
          styles.textDark,
          variant === 'outline' && styles.textOutline,
          variant === 'danger' && styles.textDanger,
        ]}
      >
        {title}
      </Text>
      {showArrow && <ArrowRight size={18} color={colors.textPrimary} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#00FF6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    borderRadius: 28,
  },
  solidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
  },
  btnDark: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  btnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    marginRight: 2,
  },
  textGreen: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
  textDark: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  textOutline: {
    color: colors.textSecondary,
  },
  textDanger: {
    color: colors.danger,
    fontWeight: '800',
  },
});
