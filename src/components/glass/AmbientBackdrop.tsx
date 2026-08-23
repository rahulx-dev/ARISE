import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

// 12 subtle ambient star sparkle positions
const STARS = [
  { top: '8%', left: '12%', size: 3, opacity: 0.6 },
  { top: '14%', right: '18%', size: 4, opacity: 0.8 },
  { top: '22%', left: '8%', size: 2, opacity: 0.4 },
  { top: '28%', right: '10%', size: 3, opacity: 0.7 },
  { top: '38%', left: '20%', size: 3, opacity: 0.5 },
  { top: '44%', right: '14%', size: 2, opacity: 0.4 },
  { top: '56%', left: '10%', size: 4, opacity: 0.75 },
  { top: '64%', right: '22%', size: 3, opacity: 0.6 },
  { top: '72%', left: '16%', size: 2, opacity: 0.35 },
  { top: '80%', right: '8%', size: 4, opacity: 0.7 },
  { top: '88%', left: '24%', size: 3, opacity: 0.5 },
  { top: '92%', right: '16%', size: 2, opacity: 0.4 },
];

interface AmbientBackdropProps {
  children?: React.ReactNode;
}

export function AmbientBackdrop({ children }: AmbientBackdropProps) {
  return (
    <View style={styles.container}>
      {/* Background Starlight Sparkles */}
      {STARS.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: star.top as any,
              left: (star as any).left,
              right: (star as any).right,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 2,
  },
});
