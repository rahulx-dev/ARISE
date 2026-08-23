import React from 'react';
import { ViewStyle } from 'react-native';
import { GlowIcon, GlowIntensity } from './GlowIcon';
import { colors } from '../../theme/colors';

export type AriseIconName =
  | 'coin'
  | 'xp'
  | 'level'
  | 'streak'
  | 'strength'
  | 'discipline'
  | 'focus'
  | 'health'
  | 'knowledge'
  | 'timer'
  | 'achievement'
  | 'quest'
  | 'shop'
  | 'lock'
  | 'unlock'
  | 'settings'
  | 'camera'
  | 'photo'
  | 'shield'
  | 'warning'
  | 'check'
  | 'calendar'
  | 'play'
  | 'pause'
  | 'stop';

export interface AriseIconProps {
  name: AriseIconName;
  size?: number;
  color?: string;
  glowIntensity?: GlowIntensity;
  active?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const ICON_CONFIG: Record<
  AriseIconName,
  { icon: string; family: 'material' | 'ionicons' | 'feather'; defaultColor: string }
> = {
  coin: {
    icon: 'circle-multiple-outline',
    family: 'material',
    defaultColor: colors.accentGold,
  },
  xp: {
    icon: 'lightning-bolt-outline',
    family: 'material',
    defaultColor: colors.primaryLight,
  },
  level: {
    icon: 'shield-star-outline',
    family: 'material',
    defaultColor: colors.primary,
  },
  streak: {
    icon: 'fire',
    family: 'material',
    defaultColor: colors.warning,
  },
  strength: {
    icon: 'dumbbell',
    family: 'material',
    defaultColor: colors.stats.strength,
  },
  discipline: {
    icon: 'shield-sword-outline',
    family: 'material',
    defaultColor: colors.stats.discipline,
  },
  focus: {
    icon: 'crosshairs-gps',
    family: 'material',
    defaultColor: colors.stats.focus,
  },
  health: {
    icon: 'heart-pulse',
    family: 'material',
    defaultColor: colors.stats.health,
  },
  knowledge: {
    icon: 'book-open-page-variant-outline',
    family: 'material',
    defaultColor: colors.stats.knowledge,
  },
  timer: {
    icon: 'timer-outline',
    family: 'material',
    defaultColor: colors.secondary,
  },
  achievement: {
    icon: 'trophy-award',
    family: 'material',
    defaultColor: colors.accentGold,
  },
  quest: {
    icon: 'sword-cross',
    family: 'material',
    defaultColor: colors.secondary,
  },
  shop: {
    icon: 'storefront-outline',
    family: 'material',
    defaultColor: colors.accent,
  },
  lock: {
    icon: 'shield-lock-outline',
    family: 'material',
    defaultColor: colors.danger,
  },
  unlock: {
    icon: 'lock-open-variant-outline',
    family: 'material',
    defaultColor: colors.success,
  },
  shield: {
    icon: 'shield-check-outline',
    family: 'material',
    defaultColor: colors.secondary,
  },
  settings: {
    icon: 'cog-outline',
    family: 'material',
    defaultColor: colors.textSecondary,
  },
  camera: {
    icon: 'camera-outline',
    family: 'material',
    defaultColor: colors.secondary,
  },
  photo: {
    icon: 'image-multiple-outline',
    family: 'material',
    defaultColor: colors.primaryLight,
  },
  warning: {
    icon: 'alert-rhombus-outline',
    family: 'material',
    defaultColor: colors.warning,
  },
  check: {
    icon: 'check-decagram-outline',
    family: 'material',
    defaultColor: colors.success,
  },
  calendar: {
    icon: 'calendar-month-outline',
    family: 'material',
    defaultColor: colors.textSecondary,
  },
  play: {
    icon: 'play-outline',
    family: 'material',
    defaultColor: colors.success,
  },
  pause: {
    icon: 'pause',
    family: 'material',
    defaultColor: colors.warning,
  },
  stop: {
    icon: 'stop',
    family: 'material',
    defaultColor: colors.danger,
  },
};

export function AriseIcon({
  name,
  size = 22,
  color,
  glowIntensity = 'subtle',
  active = true,
  disabled = false,
  style,
}: AriseIconProps) {
  const config = ICON_CONFIG[name] || ICON_CONFIG.quest;
  const iconColor = color || config.defaultColor;

  return (
    <GlowIcon
      name={config.icon}
      family={config.family}
      size={size}
      color={iconColor}
      glowColor={iconColor}
      glowIntensity={glowIntensity}
      active={active}
      disabled={disabled}
      containerStyle={style}
    />
  );
}
