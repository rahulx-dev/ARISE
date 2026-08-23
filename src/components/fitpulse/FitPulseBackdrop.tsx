import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

interface FitPulseBackdropProps {
  children?: React.ReactNode;
  showAura?: boolean;
}

export function FitPulseBackdrop({ children, showAura = true }: FitPulseBackdropProps) {
  return (
    <View style={styles.container}>
      {/* Deep Cobalt Midnight Gradient Base */}
      <LinearGradient
        colors={['#16284F', '#0D1A36', '#070D1E']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle Cyan-Blue Rim Light Aura */}
      {showAura && (
        <View style={styles.blueAuraOrb} pointerEvents="none" />
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
  blueAuraOrb: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
    elevation: 0,
  },
});
