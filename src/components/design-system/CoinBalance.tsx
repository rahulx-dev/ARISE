import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Plus, Coins } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';

interface CoinBalanceProps {
  amount: number;
  onPressAdd?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CoinBalance({ amount, onPressAdd, style }: CoinBalanceProps) {
  const haptics = useHaptics();

  const handlePress = () => {
    if (onPressAdd) {
      haptics.light();
      onPressAdd();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={onPressAdd ? 0.8 : 1}
    >
      <View style={styles.coinCircle}>
        <Coins size={14} color="#050505" strokeWidth={3} />
      </View>
      <Text style={styles.amountText}>{amount.toLocaleString()}</Text>
      {onPressAdd && (
        <View style={styles.plusCircle}>
          <Plus size={12} color="#050505" strokeWidth={3} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 8,
  },
  coinCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary, // #D1FF00 circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  plusCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
