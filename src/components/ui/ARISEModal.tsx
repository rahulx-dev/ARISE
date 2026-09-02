import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, CheckCircle2, AlertCircle, Info, Flame } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../ios/GlassCard';

const { width, height } = Dimensions.get('window');

interface ARISEModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Standard ARISE v2 Frosted Glass Modal
 */
export function ARISEModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  icon,
}: ARISEModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCardWrapper, { maxWidth: Math.min(width - 32, 400) }]}>
              <GlassCard variant="elevated" style={styles.modalCard}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleWrap}>
                    {icon && <View style={styles.iconWrap}>{icon}</View>}
                    <View style={{ flex: 1 }}>
                      {title && (
                        <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                          {title}
                        </Text>
                      )}
                      {subtitle && (
                        <Text style={[styles.modalSubtitleText, { color: colors.textMuted }]}>
                          {subtitle}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.closeBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.modalContent}>{children}</View>
              </GlassCard>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface ARISEBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * ARISE v2 Bottom Sheet (iOS-style slide up)
 */
export function ARISEBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  icon,
}: ARISEBottomSheetProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <GlassCard variant="elevated" style={styles.sheetCard}>
          {/* Grab handle bar */}
          <View style={styles.dragHandleWrap}>
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' },
              ]}
            />
          </View>

          {/* Header */}
          {(title || subtitle) && (
            <View style={styles.sheetHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                {icon && <View style={styles.iconWrap}>{icon}</View>}
                <View style={{ flex: 1 }}>
                  {title && (
                    <Text style={[styles.modalTitleText, { color: colors.textPrimary }]}>
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text style={[styles.modalSubtitleText, { color: colors.textMuted }]}>
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={{ maxHeight: height * 0.7 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCardWrapper: {
    width: '100%',
  },
  modalCard: {
    padding: 20,
    borderRadius: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: 12,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
});
