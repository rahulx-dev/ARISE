import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, CircleDot, Circle } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface SerqProgressItemProps {
  stepNumber: number;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  onPress?: () => void;
}

export function SerqProgressItem({
  stepNumber,
  title,
  status,
  onPress,
}: SerqProgressItemProps) {
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.row,
        isCompleted && styles.rowCompleted,
        isInProgress && styles.rowInProgress,
      ]}
    >
      <View style={styles.leftMeta}>
        <Text style={[styles.titleText, (isCompleted || isInProgress) && styles.titleTextActive]}>
          {stepNumber}. {title}
        </Text>
        <Text
          style={[
            styles.statusLabel,
            isCompleted && styles.statusCompleted,
            isInProgress && styles.statusInProgress,
          ]}
        >
          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
        </Text>
      </View>

      <View style={styles.iconWrap}>
        {isCompleted && <CheckCircle2 size={20} color={colors.primary} strokeWidth={2.5} />}
        {isInProgress && <CircleDot size={20} color={colors.primary} strokeWidth={2.5} />}
        {!isCompleted && !isInProgress && (
          <Circle size={20} color="rgba(255, 255, 255, 0.2)" strokeWidth={2} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 24, 27, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowCompleted: {
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  rowInProgress: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: colors.primary,
  },
  leftMeta: {
    gap: 3,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  titleTextActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  statusCompleted: {
    color: colors.primaryLight,
  },
  statusInProgress: {
    color: colors.primary,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
