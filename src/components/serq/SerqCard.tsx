import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface SerqCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'elevated' | 'subtle';
  glow?: boolean;
  animate?: boolean;
  delay?: number;
}

export function SerqCard({
  children,
  style,
  variant = 'surface',
  glow = false,
  animate = true,
  delay = 0,
}: SerqCardProps) {
  const getBg = () => {
    switch (variant) {
      case 'elevated':
        return 'rgba(24, 32, 36, 0.88)';
      case 'subtle':
        return 'rgba(14, 18, 20, 0.65)';
      case 'surface':
      default:
        return 'rgba(18, 24, 27, 0.78)';
    }
  };

  const cardContent = (
    <View
      style={[
        styles.card,
        { backgroundColor: getBg() },
        glow && {
          borderColor: colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 18,
          elevation: 6,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (animate) {
    return (
      <Animated.View entering={FadeInDown.delay(delay).duration(350).springify()}>
        {cardContent}
      </Animated.View>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.22)',
    padding: 16,
  },
});
