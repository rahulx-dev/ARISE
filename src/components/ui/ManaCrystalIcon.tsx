import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface ManaCrystalIconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
  style?: StyleProp<ImageStyle>;
}

const MANA_CRYSTAL_3D_PNG = require('../../../assets/3d/mana-crystal.png');

export function ManaCrystalIcon({
  size = 20,
  style,
}: ManaCrystalIconProps) {
  return (
    <Image
      source={MANA_CRYSTAL_3D_PNG}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
      resizeMode="contain"
    />
  );
}
