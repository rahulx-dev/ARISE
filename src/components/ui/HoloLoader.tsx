import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface HoloLoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'small' | 'medium' | 'large';
}

export function HoloLoader({
  message,
  subMessage,
  size = 'medium',
}: HoloLoaderProps) {
  const indicatorSize = size === 'small' ? 'small' : 'large';

  return (
    <View style={styles.wrapper}>
      <ActivityIndicator size={indicatorSize} color="#E53935" />
      {message ? (
        <View style={styles.textBlock}>
          <Text style={styles.statusText}>{message}</Text>
          {subMessage ? <Text style={styles.subText}>{subMessage}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  textBlock: {
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  subText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});
