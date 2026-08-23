import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface SparkleBannerProps {
  category?: string;
  message: string;
  onPress?: () => void;
}

export function SparkleBanner({
  category = 'ARISE Protocol',
  message,
  onPress,
}: SparkleBannerProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.container}
    >
      {/* Glowing Star Sparkle Icon */}
      <View style={styles.sparkleIconCircle}>
        <MaterialCommunityIcons name="star-four-points" size={20} color="#FFFFFF" />
      </View>

      {/* Message Content */}
      <View style={styles.textGroup}>
        <Text style={styles.categoryText}>{category}</Text>
        <Text style={styles.messageText} numberOfLines={2}>
          {message}
        </Text>
      </View>

      {/* Right Chevron */}
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 38, 64, 0.55)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 12,
    marginVertical: 6,
  },
  sparkleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
