import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';

export interface AriseLogoProps {
  size?: number;
  color?: string;
  glow?: boolean;
  style?: ViewStyle;
}

export function AriseLogo({
  size = 40,
  glow = true,
  style,
}: AriseLogoProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        glow && {
          shadowColor: '#0A84FF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      <Image
        source={require('../../../assets/icon.png')}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
        }}
        resizeMode="cover"
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

