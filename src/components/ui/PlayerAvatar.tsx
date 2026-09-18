import React from 'react';
import { View, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import { User } from 'lucide-react-native';
import { AVATAR_ICONS, AVATAR_IMAGES } from '../profile/AvatarPicker';
import { colors } from '../../theme/colors';

interface PlayerAvatarProps {
  iconId?: string;
  imageSource?: ImageSourcePropType | string;
  glowColor?: string;
  size?: number;
  glow?: boolean;
  style?: ViewStyle;
}

export function PlayerAvatar({
  iconId = 'user',
  imageSource,
  glowColor = colors.primary,
  size = 64,
  glow = true,
  style,
}: PlayerAvatarProps) {
  const normalizedId =
    typeof iconId === 'string' && iconId.startsWith('pfp_')
      ? `img_${iconId}`
      : typeof iconId === 'string' && iconId.startsWith('img_')
      ? iconId
      : iconId;

  const imageConfig = AVATAR_IMAGES.find(
    (i) =>
      i.id === iconId ||
      i.id === normalizedId ||
      (typeof iconId === 'string' && i.id === `img_${iconId}`) ||
      (typeof iconId === 'string' && i.id.replace('img_', '') === iconId)
  );
  const iconConfig = AVATAR_ICONS.find((i) => i.id === iconId);
  const IconComponent = iconConfig ? iconConfig.component : User;
  const innerIconSize = Math.round(size * 0.48);

  const resolvedSource =
    imageSource ??
    (imageConfig
      ? imageConfig.source
      : typeof iconId === 'string' &&
        (iconId.startsWith('http') ||
          iconId.startsWith('file:') ||
          iconId.startsWith('data:'))
      ? { uri: iconId }
      : null);

  const isCustomImage = Boolean(resolvedSource);

  return (
    <View
      style={[
        styles.outerRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: glowColor,
        },
        glow && {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 14,
          elevation: 6,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.innerCircle,
          {
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2,
            overflow: 'hidden',
          },
        ]}
      >
        {isCustomImage && resolvedSource ? (
          <Image
            source={resolvedSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <IconComponent size={innerIconSize} color={glowColor} strokeWidth={2.2} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
