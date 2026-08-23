import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';

interface SerqButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'emerald' | 'subtle' | 'white';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  showArrow?: boolean;
}

export function SerqButton({
  title,
  onPress,
  variant = 'emerald',
  style,
  disabled = false,
  showArrow = true,
}: SerqButtonProps) {
  const haptics = useHaptics();

  const handlePress = () => {
    if (disabled) return;
    haptics.medium();
    onPress();
  };

  const isEmerald = variant === 'emerald';
  const isWhite = variant === 'white';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.btn,
        isEmerald && styles.btnEmerald,
        isWhite && styles.btnWhite,
        !isEmerald && !isWhite && styles.btnSubtle,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isEmerald && styles.textDark,
          isWhite && styles.textDark,
          !isEmerald && !isWhite && styles.textWhite,
        ]}
      >
        {title}
      </Text>

      {showArrow && (
        <View
          style={[
            styles.arrowCircle,
            isEmerald && styles.arrowCircleDark,
            isWhite && styles.arrowCircleDark,
            !isEmerald && !isWhite && styles.arrowCircleEmerald,
          ]}
        >
          <ArrowRight
            size={16}
            color={isEmerald || isWhite ? '#00E676' : '#0B0E10'}
            strokeWidth={2.5}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 24,
    paddingRight: 10,
    borderRadius: 32,
  },
  btnEmerald: {
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 6,
  },
  btnWhite: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSubtle: {
    backgroundColor: 'rgba(24, 32, 36, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textDark: {
    color: '#070D10',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleDark: {
    backgroundColor: '#070D10',
  },
  arrowCircleEmerald: {
    backgroundColor: '#00E676',
  },
});
