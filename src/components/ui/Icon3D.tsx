import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const ICON_MAP = {
  // Core Lock Screen Icons
  padlock_red: require('../../../assets/3d-icons/icon_3d_padlock_red.png'),
  padlock_locked: require('../../../assets/3d-icons/icon_3d_padlock_red.png'),
  padlock: require('../../../assets/3d-icons/icon_3d_padlock_red.png'),
  dumbbell_white: require('../../../assets/3d-icons/icon_3d_dumbbell_white.png'),
  dumbbell: require('../../../assets/3d-icons/icon_3d_dumbbell_white.png'),
  play_amber: require('../../../assets/3d-icons/icon_3d_play_amber.png'),
  play: require('../../../assets/3d-icons/icon_3d_play_amber.png'),
  cart_purple: require('../../../assets/3d-icons/icon_3d_cart_purple.png'),
  cart: require('../../../assets/3d-icons/icon_3d_cart_purple.png'),
  clock_green: require('../../../assets/3d-icons/icon_3d_clock_green.png'),
  clock: require('../../../assets/3d-icons/icon_3d_clock_green.png'),
  prohibition_slash: require('../../../assets/3d-icons/badge_prohibition_slash.png'),
  prohibition: require('../../../assets/3d-icons/badge_prohibition_slash.png'),

  // Rewards & Streaks
  flame_orange: require('../../../assets/3d-icons/icon_3d_flame_orange.png'),
  flame: require('../../../assets/3d-icons/icon_3d_flame_orange.png'),
  coin_gold: require('../../../assets/3d-icons/icon_3d_coin_gold.png'),
  coin: require('../../../assets/3d-icons/icon_3d_coin_gold.png'),
  coins: require('../../../assets/3d-icons/icon_3d_coin_gold.png'),
  trophy_gold: require('../../../assets/3d-icons/icon_3d_trophy_gold.png'),
  trophy: require('../../../assets/3d-icons/icon_3d_trophy_gold.png'),
  lightning_yellow: require('../../../assets/3d-icons/icon_3d_lightning_yellow.png'),
  lightning_gold: require('../../../assets/3d-icons/icon_3d_lightning_yellow.png'),
  lightning: require('../../../assets/3d-icons/icon_3d_lightning_yellow.png'),
  gift_red: require('../../../assets/3d-icons/icon_3d_gift_red.png'),
  gift_capsule: require('../../../assets/3d-icons/icon_3d_gift_red.png'),
  gift: require('../../../assets/3d-icons/icon_3d_gift_red.png'),
  crown_gold: require('../../../assets/3d-icons/icon_3d_crown_gold.png'),
  crown: require('../../../assets/3d-icons/icon_3d_crown_gold.png'),

  // Fitness & Running
  sneaker_blue: require('../../../assets/3d-icons/icon_3d_sneaker_blue.png'),
  sneaker: require('../../../assets/3d-icons/icon_3d_sneaker_blue.png'),
  stopwatch_silver: require('../../../assets/3d-icons/icon_3d_stopwatch_silver.png'),
  stopwatch: require('../../../assets/3d-icons/icon_3d_stopwatch_silver.png'),
  footprints_orange: require('../../../assets/3d-icons/icon_3d_footprints_orange.png'),
  footprints: require('../../../assets/3d-icons/icon_3d_footprints_orange.png'),
  speedometer_red: require('../../../assets/3d-icons/icon_3d_speedometer_red.png'),
  speedometer: require('../../../assets/3d-icons/icon_3d_speedometer_red.png'),
  checkmark_green: require('../../../assets/3d-icons/icon_3d_checkmark_green.png'),
  checkmark: require('../../../assets/3d-icons/icon_3d_checkmark_green.png'),
  dumbbell_red: require('../../../assets/3d-icons/icon_3d_dumbbell_white.png'),

  // Dungeon / Gates
  portal_purple: require('../../../assets/3d-icons/icon_3d_portal_purple.png'),
  portal: require('../../../assets/3d-icons/icon_3d_portal_purple.png'),
  skull_bone: require('../../../assets/3d-icons/icon_3d_skull_bone.png'),
  skull: require('../../../assets/3d-icons/icon_3d_skull_bone.png'),
  swords_steel: require('../../../assets/3d-icons/icon_3d_swords_steel.png'),
  swords_crossed: require('../../../assets/3d-icons/icon_3d_swords_steel.png'),
  swords: require('../../../assets/3d-icons/icon_3d_swords_steel.png'),
  scroll_parchment: require('../../../assets/3d-icons/icon_3d_scroll_parchment.png'),
  scroll: require('../../../assets/3d-icons/icon_3d_scroll_parchment.png'),
  crystal_cyan: require('../../../assets/3d-icons/icon_3d_crystal_cyan.png'),
  crystal_blue: require('../../../assets/3d-icons/icon_3d_crystal_cyan.png'),
  crystal: require('../../../assets/3d-icons/icon_3d_crystal_cyan.png'),

  // Vault / Focus
  safe_gray: require('../../../assets/3d-icons/icon_3d_safe_gray.png'),
  safe: require('../../../assets/3d-icons/icon_3d_safe_gray.png'),
  shield_blue: require('../../../assets/3d-icons/icon_3d_shield_blue.png'),
  shield_red: require('../../../assets/3d-icons/icon_3d_shield_blue.png'),
  shield: require('../../../assets/3d-icons/icon_3d_shield_blue.png'),
  ice_blue: require('../../../assets/3d-icons/icon_3d_ice_blue.png'),
  ice: require('../../../assets/3d-icons/icon_3d_ice_blue.png'),
  ticket_gold: require('../../../assets/3d-icons/icon_3d_ticket_gold.png'),
  ticket: require('../../../assets/3d-icons/icon_3d_ticket_gold.png'),
  hourglass_amber: require('../../../assets/3d-icons/icon_3d_hourglass_amber.png'),
  hourglass: require('../../../assets/3d-icons/icon_3d_hourglass_amber.png'),

  // Permissions & Settings
  camera_dark: require('../../../assets/3d-icons/icon_3d_camera_dark.png'),
  camera: require('../../../assets/3d-icons/icon_3d_camera_dark.png'),
  battery_green: require('../../../assets/3d-icons/icon_3d_battery_green.png'),
  battery: require('../../../assets/3d-icons/icon_3d_battery_green.png'),
  layers_purple: require('../../../assets/3d-icons/icon_3d_layers_purple.png'),
  layers: require('../../../assets/3d-icons/icon_3d_layers_purple.png'),
  chart_blue: require('../../../assets/3d-icons/icon_3d_chart_blue.png'),
  chart: require('../../../assets/3d-icons/icon_3d_chart_blue.png'),
  bell_gold: require('../../../assets/3d-icons/icon_3d_lightning_yellow.png'),
  bell: require('../../../assets/3d-icons/icon_3d_lightning_yellow.png'),

  // Bottom Navigation
  nav_home_active: require('../../../assets/3d-icons/nav_home_active.png'),
  nav_home_inactive: require('../../../assets/3d-icons/nav_home_inactive.png'),
  nav_quests_active: require('../../../assets/3d-icons/nav_quests_active.png'),
  nav_quests_inactive: require('../../../assets/3d-icons/nav_quests_inactive.png'),
  nav_gates_active: require('../../../assets/3d-icons/nav_gates_active.png'),
  nav_gates_inactive: require('../../../assets/3d-icons/nav_gates_inactive.png'),
  nav_gym_active: require('../../../assets/3d-icons/nav_gym_active.png'),
  nav_gym_inactive: require('../../../assets/3d-icons/nav_gym_inactive.png'),
  nav_profile_active: require('../../../assets/3d-icons/nav_profile_active.png'),
  nav_profile_inactive: require('../../../assets/3d-icons/nav_profile_inactive.png'),
} as const;

export type Icon3DName = keyof typeof ICON_MAP;

interface Icon3DProps {
  name: Icon3DName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch';
}

export const Icon3D: React.FC<Icon3DProps> = ({
  name,
  size = 28,
  style,
  resizeMode = 'contain',
}) => {
  const source = ICON_MAP[name];

  if (!source) {
    return null;
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode={resizeMode}
    />
  );
};
