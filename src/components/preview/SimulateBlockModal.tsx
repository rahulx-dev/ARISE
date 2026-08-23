import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../ui/Button';

interface SimulateBlockModalProps {
  visible: boolean;
  blockedAppName?: string;
  onDismiss: () => void;
  onOpenShop?: () => void;
}

export function SimulateBlockModal({
  visible,
  blockedAppName = 'Instagram',
  onDismiss,
  onOpenShop,
}: SimulateBlockModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.hudHeader}>
          <View style={styles.hudBadge}>
            <View style={styles.hudDot} />
            <Text style={styles.hudText}>ARISE ENFORCEMENT PROTOCOL</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-lock-outline" size={56} color="#00F0FF" />
          </View>

          <Text style={styles.title}>TIME LOCKED</Text>
          <Text style={styles.appName}>[{blockedAppName.toUpperCase()} IS RESTRICTED]</Text>

          <Text style={styles.description}>
            Access to this app is restricted by ARISE. Earn Coins by completing real-world exercises or deep focus sessions to unlock screen time.
          </Text>

          <View style={styles.actionButtons}>
            {onOpenShop && (
              <Button
                title="Open Time Shop"
                variant="gold"
                size="lg"
                fullWidth
                onPress={() => {
                  onDismiss();
                  onOpenShop();
                }}
                icon={<MaterialCommunityIcons name="clock-outline" size={20} color="#0A0E1A" />}
              />
            )}
            <Button
              title="Return to Safety (Home)"
              variant="primary"
              size="lg"
              fullWidth
              onPress={onDismiss}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
  },
  hudText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00F0FF',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00F0FF',
    letterSpacing: 2,
  },
  appName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  actionButtons: {
    width: '100%',
    marginTop: 16,
  },
});
