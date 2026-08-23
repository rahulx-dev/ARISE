import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { runtimeConfig } from '../../config/runtimeConfig';

export function PreviewBadge() {
  const isPreview = runtimeConfig.previewModeActive;

  return (
    <View style={[styles.badge, isPreview ? styles.badgePreview : styles.badgeNative]}>
      <View style={[styles.dot, isPreview ? styles.dotPreview : styles.dotNative]} />
      <Text style={[styles.text, isPreview ? styles.textPreview : styles.textNative]}>
        {isPreview ? 'PREVIEW MODE (EXPO GO)' : 'NATIVE ENGINE ACTIVE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  badgePreview: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeNative: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPreview: {
    backgroundColor: '#F59E0B',
  },
  dotNative: {
    backgroundColor: '#10B981',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textPreview: {
    color: '#F59E0B',
  },
  textNative: {
    color: '#10B981',
  },
});
