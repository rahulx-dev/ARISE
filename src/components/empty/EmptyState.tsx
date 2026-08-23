import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { H3, Body, Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <H3 style={styles.title}>{title}</H3>
      <Body color={colors.textSecondary} align="center" style={styles.message}>
        {message}
      </Body>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    marginBottom: spacing.xl,
  },
  actionButton: {
    minWidth: 160,
  },
});
