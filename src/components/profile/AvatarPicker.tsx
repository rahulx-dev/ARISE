import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
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
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';

export interface AvatarIconOption {
  id: string;
  name: string;
  component: any;
}

export interface AvatarImageOption {
  id: string;
  name: string;
  source: any;
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

export const AVATAR_IMAGES: AvatarImageOption[] = [
  { id: 'img_pfp_01', name: 'Anime Boy', source: require('../../../assets/img/pfp_01.jpg') },
  { id: 'img_pfp_02', name: 'AI Character', source: require('../../../assets/img/pfp_02.jpg') },
  { id: 'img_pfp_03', name: 'Cool Avatar', source: require('../../../assets/img/pfp_03.jpg') },
  { id: 'img_pfp_04', name: 'Cyber Warrior', source: require('../../../assets/img/pfp_04.jpg') },
  { id: 'img_pfp_05', name: 'Shadow Hunter', source: require('../../../assets/img/pfp_05.jpg') },
  { id: 'img_pfp_06', name: 'Neon Rider', source: require('../../../assets/img/pfp_06.jpg') },
  { id: 'img_pfp_07', name: 'Dark Knight', source: require('../../../assets/img/pfp_07.jpg') },
  { id: 'img_pfp_08', name: 'Storm Mage', source: require('../../../assets/img/pfp_08.jpg') },
  { id: 'img_pfp_09', name: 'Iron Wolf', source: require('../../../assets/img/pfp_09.jpg') },
  { id: 'img_pfp_10', name: 'Pixel King', source: require('../../../assets/img/pfp_10.jpg') },
  { id: 'img_pfp_11', name: 'Void Walker', source: require('../../../assets/img/pfp_11.jpg') },
  { id: 'img_pfp_12', name: 'Ghost Blade', source: require('../../../assets/img/pfp_12.jpg') },
  { id: 'img_pfp_13', name: 'Tech Samurai', source: require('../../../assets/img/pfp_13.jpg') },
  { id: 'img_pfp_14', name: 'Night Hawk', source: require('../../../assets/img/pfp_14.jpg') },
  { id: 'img_pfp_15', name: 'Fire Lord', source: require('../../../assets/img/pfp_15.jpg') },
  { id: 'img_pfp_16', name: 'Ice Phantom', source: require('../../../assets/img/pfp_16.jpg') },
  { id: 'img_pfp_17', name: 'Rune Master', source: require('../../../assets/img/pfp_17.jpg') },
  { id: 'img_pfp_18', name: 'Steel Titan', source: require('../../../assets/img/pfp_18.jpg') },
  { id: 'img_pfp_19', name: 'Anime Style', source: require('../../../assets/img/pfp_19.jpg') },
  { id: 'img_pfp_20', name: 'Cat Gamer', source: require('../../../assets/img/pfp_20.jpg') },
  { id: 'img_pfp_21', name: 'Family Guy', source: require('../../../assets/img/pfp_21.jpg') },
  { id: 'img_pfp_22', name: 'Jerry Cool', source: require('../../../assets/img/pfp_22.jpg') },
  { id: 'img_pfp_23', name: 'Vihaan PFP', source: require('../../../assets/img/pfp_23.jpg') },
  { id: 'img_pfp_24', name: 'Spider Hero', source: require('../../../assets/img/pfp_24.jpg') },
  { id: 'img_pfp_25', name: 'Who Cares', source: require('../../../assets/img/pfp_25.jpg') },
  { id: 'img_pfp_26', name: 'Imagination', source: require('../../../assets/img/pfp_26.jpg') },
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
  const [activeTab, setActiveTab] = useState<'icons' | 'images'>('images');

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

      {/* 2. Toggle: Icons vs Images */}
      {AVATAR_IMAGES.length > 0 && (
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'icons' && styles.tabToggleBtnActive]}
            onPress={() => setActiveTab('icons')}
          >
            <Sparkles size={14} color={activeTab === 'icons' ? '#000000' : colors.textSecondary} />
            <Text
              style={[
                styles.tabToggleText,
                activeTab === 'icons' && styles.tabToggleTextActive,
              ]}
            >
              Vector Icons
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'images' && styles.tabToggleBtnActive]}
            onPress={() => setActiveTab('images')}
          >
            <ImageIcon size={14} color={activeTab === 'images' ? '#000000' : colors.textSecondary} />
            <Text
              style={[
                styles.tabToggleText,
                activeTab === 'images' && styles.tabToggleTextActive,
              ]}
            >
              Custom Images
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Free Vector Icon Grid */}
      {activeTab === 'icons' ? (
        <>
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
                      isSelected && { color: selectedColor, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        /* Custom Images Grid */
        <View style={styles.iconsGrid}>
          {AVATAR_IMAGES.map((item) => {
            const isSelected = selectedIconId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.iconBox,
                  { padding: 0, overflow: 'hidden' },
                  isSelected && {
                    borderColor: selectedColor,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  haptics.medium();
                  onSelectIcon(item.id);
                }}
                activeOpacity={0.8}
              >
                <Image source={item.source} style={{ width: '100%', height: '100%' }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
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
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 3,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#242424',
    gap: 4,
  },
  tabToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  tabToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabToggleTextActive: {
    color: '#000000',
    fontWeight: '600',
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
