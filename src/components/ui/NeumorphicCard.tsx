import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';

interface NeumorphicCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
  borderColor?: string;
  onPress?: (event: GestureResponderEvent) => void;
  activeOpacity?: number;
  borderRadius?: number;
  padding?: number;
}

export const NeumorphicCard: React.FC<NeumorphicCardProps> = ({
  children,
  style,
  tint,
  borderColor,
  onPress,
  activeOpacity = 0.85,
  borderRadius = 22,
  padding = 16,
}) => {
  const containerStyle: ViewStyle = {
    borderRadius,
    padding,
    backgroundColor: tint || '#FFFFFF',
    borderColor: borderColor || '#E8E4DC',
    borderWidth: 1,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={[containerStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
};

interface NeumorphicCircleButtonProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  onPress?: (event: GestureResponderEvent) => void;
  activeOpacity?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const NeumorphicCircleButton: React.FC<NeumorphicCircleButtonProps> = ({
  children,
  icon,
  size = 48,
  style,
  backgroundColor = '#FFFFFF',
  borderColor = '#E8E4DC',
  onPress,
  activeOpacity = 0.8,
  disabled = false,
  accessibilityLabel,
}) => {
  const buttonStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    borderColor,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    opacity: disabled ? 0.45 : 1,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={[buttonStyle, style]}
    >
      {icon || children}
    </TouchableOpacity>
  );
};
