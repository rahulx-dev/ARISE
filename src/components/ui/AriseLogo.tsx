import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export interface AriseLogoProps {
  size?: number;
  color?: string;
  glow?: boolean;
  style?: ViewStyle;
}

export function AriseLogo({
  size = 36,
  color = colors.secondary,
  glow = true,
  style,
}: AriseLogoProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        glow && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 5,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="chevron-triple-up"
        size={size}
        color={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
