import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  User,
  Shield,
  Zap,
  Flame,
  Crown,
  Swords,
  Brain,
  Target,
  Dumbbell,
  Trophy,
  Ghost,
  Rocket,
  Gem,
  Cpu,
  Heart,
  Star,
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';

export interface AvatarIconOption {
  id: string;
  name: string;
  component: any;
}

export const AVATAR_ICONS: AvatarIconOption[] = [
  { id: 'user', name: 'Warrior', component: User },
  { id: 'shield', name: 'Vanguard', component: Shield },
  { id: 'zap', name: 'Cyber Zap', component: Zap },
  { id: 'flame', name: 'Phoenix', component: Flame },
  { id: 'crown', name: 'Sovereign', component: Crown },
  { id: 'swords', name: 'Blade', component: Swords },
  { id: 'brain', name: 'Mastermind', component: Brain },
  { id: 'target', name: 'Sniper', component: Target },
  { id: 'dumbbell', name: 'Titan', component: Dumbbell },
  { id: 'trophy', name: 'Champion', component: Trophy },
  { id: 'ghost', name: 'Shadow', component: Ghost },
  { id: 'rocket', name: 'Velocity', component: Rocket },
  { id: 'gem', name: 'Diamond', component: Gem },
  { id: 'cpu', name: 'Bionic', component: Cpu },
  { id: 'heart', name: 'Vitality', component: Heart },
  { id: 'star', name: 'Ascended', component: Star },
];

export const AVATAR_COLORS = [
  { id: 'green', color: '#00FF6A', label: 'Neon Green' },
  { id: 'purple', color: '#8A2BE2', label: 'Cyber Purple' },
  { id: 'cyan', color: '#00F0FF', label: 'Electric Cyan' },
  { id: 'gold', color: '#FFB800', label: 'Solar Gold' },
  { id: 'red', color: '#EF4444', label: 'Crimson Fury' },
];

interface AvatarPickerProps {
  selectedIconId: string;
  selectedColor: string;
  onSelectIcon: (iconId: string) => void;
  onSelectColor: (colorHex: string) => void;
}

export function AvatarPicker({
  selectedIconId,
  selectedColor,
  onSelectIcon,
  onSelectColor,
}: AvatarPickerProps) {
  const haptics = useHaptics();

  return (
    <View style={styles.container}>
      {/* 1. Color Palette Selector */}
      <Text style={styles.sectionTitle}>AURA GLOW COLOR</Text>
      <View style={styles.colorsRow}>
        {AVATAR_COLORS.map((c) => {
          const isSelected = selectedColor.toLowerCase() === c.color.toLowerCase();
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.colorDot,
                { backgroundColor: c.color },
                isSelected && styles.colorDotSelected,
              ]}
              onPress={() => {
                haptics.light();
                onSelectColor(c.color);
              }}
              activeOpacity={0.8}
            />
          );
        })}
      </View>

      {/* 2. Free Vector Icon Grid */}
      <Text style={[styles.sectionTitle, { marginTop: 14 }]}>CHOOSE WARRIOR ICON</Text>
      <View style={styles.iconsGrid}>
        {AVATAR_ICONS.map((item) => {
          const isSelected = selectedIconId === item.id;
          const IconComp = item.component;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.iconBox,
                isSelected && {
                  borderColor: selectedColor,
                  backgroundColor: `${selectedColor}18`,
                  shadowColor: selectedColor,
                  shadowOpacity: 0.6,
                  shadowRadius: 10,
                  elevation: 4,
                },
              ]}
              onPress={() => {
                haptics.medium();
                onSelectIcon(item.id);
              }}
              activeOpacity={0.8}
            >
              <IconComp
                size={22}
                color={isSelected ? selectedColor : colors.textSecondary}
                strokeWidth={isSelected ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.iconLabel,
                  isSelected && { color: selectedColor, fontWeight: '900' },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBox: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  iconLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
