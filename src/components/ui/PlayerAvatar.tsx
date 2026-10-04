import React from 'react';
import { View, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import { User } from 'lucide-react-native';
import { AVATAR_ICONS, AVATAR_IMAGES } from '../profile/AvatarPicker';
import { ALL_AVATARS } from '../../constants/avatars';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { colors } from '../../theme/colors';

export interface PlayerAvatarProps {
  iconId?: string | null;
  imageSource?: ImageSourcePropType | string;
  profileImageUri?: string | null;
  glowColor?: string;
  size?: number;
  glow?: boolean;
  style?: ViewStyle;
}

export function PlayerAvatar({
  iconId,
  imageSource,
  profileImageUri,
  glowColor = colors.primary,
  size = 64,
  glow = true,
  style,
}: PlayerAvatarProps) {
  const storeProfile = usePlayerStore((s) => s.profile);
  const activeIconId = iconId ?? storeProfile?.avatarIcon ?? 'pfp_01';
  const isCustomOrUri =
    activeIconId === 'custom' ||
    (typeof activeIconId === 'string' &&
      (activeIconId.startsWith('file:') ||
        activeIconId.startsWith('content:') ||
        activeIconId.startsWith('http://') ||
        activeIconId.startsWith('https://') ||
        activeIconId.startsWith('data:')));

  const activeImageUri =
    profileImageUri ??
    (isCustomOrUri ? storeProfile?.profileImageUri : null);

  // 1. Resolve image source
  let resolvedSource: any = null;

  if (imageSource) {
    resolvedSource = typeof imageSource === 'string' ? { uri: imageSource } : imageSource;
  } else if (activeImageUri && typeof activeImageUri === 'string' && activeImageUri.trim().length > 0) {
    resolvedSource = { uri: activeImageUri };
  } else if (
    typeof activeIconId === 'string' &&
    (activeIconId.startsWith('file:') ||
      activeIconId.startsWith('content:') ||
      activeIconId.startsWith('http://') ||
      activeIconId.startsWith('https://') ||
      activeIconId.startsWith('data:'))
  ) {
    resolvedSource = { uri: activeIconId };
  } else if (activeIconId === 'custom' && storeProfile?.profileImageUri) {
    resolvedSource = { uri: storeProfile.profileImageUri };
  } else {
    // Match in ALL_AVATARS (pfp_01 to pfp_39, with or without img_ or avatar_ prefix)
    const cleanId =
      typeof activeIconId === 'string' ? activeIconId.replace('img_', '').replace('avatar_', '') : '';
    const avatarMatch = ALL_AVATARS.find((a) => a.id === activeIconId || a.id === cleanId);
    if (avatarMatch) {
      resolvedSource = avatarMatch.source;
    } else {
      const imgMatch = AVATAR_IMAGES.find((i) => i.id === activeIconId || i.id === `img_${cleanId}`);
      if (imgMatch) {
        resolvedSource = imgMatch.source;
      }
    }
  }

  // 2. Icon fallback for explicit non-user lucide icons (shield, flame, etc.)
  const isLucideIcon =
    !resolvedSource &&
    typeof activeIconId === 'string' &&
    activeIconId !== 'user' &&
    activeIconId !== 'custom' &&
    AVATAR_ICONS.some((i) => i.id === activeIconId);

  const iconConfig = isLucideIcon ? AVATAR_ICONS.find((i) => i.id === activeIconId) : null;
  const IconComponent = iconConfig ? iconConfig.component : User;
  const innerIconSize = Math.round(size * 0.48);

  // If no source and no lucide icon, default to ALL_AVATARS[0].source (pfp_01 - Levi)
  if (!resolvedSource && !iconConfig) {
    resolvedSource = ALL_AVATARS[0].source;
  }

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
