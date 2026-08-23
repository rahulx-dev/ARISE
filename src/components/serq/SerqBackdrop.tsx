import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface SerqBackdropProps {
  children?: React.ReactNode;
  showEmeraldAura?: boolean;
}

export function SerqBackdrop({ children, showEmeraldAura = true }: SerqBackdropProps) {
  return (
    <View style={styles.container}>
      {/* Matte Obsidian Carbon Gradient Base */}
      <LinearGradient
        colors={['#171E22', '#0F1416', '#0A0D0E']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle Electric Emerald Glow Aura */}
      {showEmeraldAura && (
        <View style={styles.emeraldAura} pointerEvents="none" />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  emeraldAura: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 90,
    elevation: 0,
  },
});
