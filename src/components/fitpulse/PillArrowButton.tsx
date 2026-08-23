import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHaptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';

interface PillArrowButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'white' | 'dark' | 'cyan';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function PillArrowButton({
  title,
  onPress,
  variant = 'white',
  style,
  disabled = false,
}: PillArrowButtonProps) {
  const haptics = useHaptics();

  const handlePress = () => {
    if (disabled) return;
    haptics.medium();
    onPress();
  };

  const isWhite = variant === 'white';
  const isCyan = variant === 'cyan';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        isWhite && styles.containerWhite,
        isCyan && styles.containerCyan,
        !isWhite && !isCyan && styles.containerDark,
        disabled && styles.containerDisabled,
        style,
      ]}
    >
      {/* Button Text */}
      <Text
        style={[
          styles.text,
          isWhite && styles.textWhite,
          isCyan && styles.textCyan,
          !isWhite && !isCyan && styles.textDark,
        ]}
      >
        {title}
      </Text>

      {/* Circular Arrow Badge */}
      <View
        style={[
          styles.arrowCircle,
          isWhite && styles.arrowCircleBlack,
          isCyan && styles.arrowCircleBlack,
          !isWhite && !isCyan && styles.arrowCircleWhite,
        ]}
      >
        <MaterialCommunityIcons
          name="arrow-right"
          size={18}
          color={isWhite || isCyan ? '#FFFFFF' : '#070D1E'}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 24,
    paddingRight: 10,
    borderRadius: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  containerWhite: {
    backgroundColor: '#FFFFFF',
  },
  containerCyan: {
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.4,
  },
  containerDark: {
    backgroundColor: 'rgba(28, 48, 86, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  textWhite: {
    color: '#070D1E',
  },
  textCyan: {
    color: '#070D1E',
  },
  textDark: {
    color: '#FFFFFF',
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleBlack: {
    backgroundColor: '#070D1E',
  },
  arrowCircleWhite: {
    backgroundColor: '#FFFFFF',
  },
});
