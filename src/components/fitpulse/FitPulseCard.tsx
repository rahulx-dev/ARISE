import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';

interface FitPulseCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'elevated' | 'subtle';
  glow?: boolean;
}

export function FitPulseCard({
  children,
  style,
  variant = 'surface',
  glow = false,
}: FitPulseCardProps) {
  const getBg = () => {
    switch (variant) {
      case 'elevated':
        return 'rgba(28, 48, 86, 0.82)';
      case 'subtle':
        return 'rgba(16, 28, 54, 0.55)';
      case 'surface':
      default:
        return 'rgba(22, 38, 70, 0.72)';
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBg() },
        glow && {
          borderColor: colors.primaryLight,
          shadowColor: colors.primaryLight,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
          elevation: 6,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    padding: 16,
  },
});
