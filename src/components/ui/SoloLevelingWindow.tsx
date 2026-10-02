import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Clipboard,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  X,
  RotateCw,
  Copy,
  ArrowRight,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SystemWindowButton {
  text: string;
  onPress?: () => void;
  style?: 'primary' | 'cancel' | 'destructive' | 'default';
  icon?: React.ReactNode;
}

export interface SoloLevelingWindowProps {
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'quest' | 'success';
  accentColor?: string;
  tag?: string;
  subtag?: string;
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  buttons?: SystemWindowButton[];
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  errorDetails?: string;
  errorCode?: string;
  footerNote?: string;
}

export function SoloLevelingWindow({
  variant = 'default',
  accentColor: customAccentColor,
  tag = 'SYSTEM NOTIFICATION',
  subtag = 'ARISE OS',
  title,
  message,
  icon,
  children,
  buttons,
  onClose,
  style,
  contentStyle,
  errorDetails,
  errorCode,
  footerNote,
}: SoloLevelingWindowProps) {
  const { isDark } = useTheme();

  // Determine variant styling
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';
  const isQuest = variant === 'quest';

  const getIconConfig = () => {
    if (icon) return { component: icon, bg: isDark ? 'rgba(10, 132, 255, 0.15)' : '#E0F2FE' };

    if (isDanger) {
      return {
        component: <AlertTriangle size={38} color="#EF4444" strokeWidth={2.3} />,
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FFF1F2',
      };
    }
    if (isWarning) {
      return {
        component: <AlertCircle size={38} color="#F59E0B" strokeWidth={2.3} />,
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      };
    }
    if (isSuccess) {
      return {
        component: <CheckCircle2 size={38} color="#059669" strokeWidth={2.3} />,
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      };
    }
    if (isQuest) {
      return {
        component: <Sparkles size={38} color="#0A84FF" strokeWidth={2.3} />,
        bg: isDark ? 'rgba(10, 132, 255, 0.15)' : '#E0F2FE',
      };
    }
    return {
      component: <Info size={38} color="#0A84FF" strokeWidth={2.3} />,
      bg: isDark ? 'rgba(10, 132, 255, 0.15)' : '#E0F2FE',
    };
  };

  const iconConfig = getIconConfig();
  const hasTwoButtons = buttons && buttons.length === 2;

  const handleCopyCode = () => {
    if (errorDetails || errorCode) {
      try {
        Clipboard.setString(errorDetails || errorCode || '');
      } catch {}
    }
  };

  return (
    <View
      style={[
        styles.modalCard,
        {
          backgroundColor: isDark ? '#111218' : '#FFFFFF',
          borderColor: isDark ? '#1C1E2A' : '#F1F5F9',
        },
        style,
      ]}
    >
      {/* Top Header Bar */}
      {onClose && (
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            style={styles.closeBtn}
          >
            <X size={18} color={isDark ? '#8E8E93' : '#64748B'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Center Hero Icon */}
      <View style={[styles.heroIconCircle, { backgroundColor: iconConfig.bg }]}>
        {iconConfig.component}
      </View>

      {/* Title & Message */}
      <View style={[styles.contentBody, contentStyle]}>
        {title ? (
          <Text
            style={[
              styles.titleText,
              { color: isDark ? '#FFFFFF' : '#0F172A' },
            ]}
          >
            {title}
          </Text>
        ) : null}

        {message ? (
          <Text
            style={[
              styles.messageText,
              { color: isDark ? '#8E8E93' : '#64748B' },
            ]}
          >
            {message}
          </Text>
        ) : null}

        {/* Optional Error Details Box */}
        {(errorDetails || errorCode) && (
          <View
            style={[
              styles.detailsBox,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.08)'
                  : '#FFF1F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
              },
            ]}
          >
            <View style={styles.detailsHeaderRow}>
              <Text style={styles.detailsTag}>ERROR DETAILS</Text>
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.7}
                style={styles.copyRow}
              >
                {errorCode ? (
                  <Text style={styles.codeText}>CODE: {errorCode}</Text>
                ) : null}
                <Copy size={13} color="#EF4444" />
              </TouchableOpacity>
            </View>
            {errorDetails ? (
              <Text style={styles.errorBodyText} numberOfLines={4}>
                {errorDetails}
              </Text>
            ) : null}
          </View>
        )}

        {children}
      </View>

      {/* Action Buttons */}
      {buttons && buttons.length > 0 && (
        <View
          style={[
            styles.buttonsContainer,
            hasTwoButtons ? styles.buttonsRow : styles.buttonsColumn,
          ]}
        >
          {buttons.map((btn, idx) => {
            const isCancel = btn.style === 'cancel';
            const isDestructive = btn.style === 'destructive';
            const isPrimary =
              btn.style === 'primary' || (!isCancel && !isDestructive);

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.actionBtn,
                  hasTwoButtons && styles.actionBtnHalf,
                  isPrimary && styles.actionBtnPrimary,
                  isCancel && [
                    styles.actionBtnCancel,
                    {
                      backgroundColor: isDark ? '#1C1E2A' : '#F1F5F9',
                      borderColor: isDark ? '#2A2D3D' : '#E2E8F0',
                    },
                  ],
                  isDestructive && styles.actionBtnDestructive,
                ]}
                onPress={btn.onPress || onClose}
                activeOpacity={0.85}
              >
                {btn.icon ? (
                  btn.icon
                ) : isPrimary && isDanger ? (
                  <RotateCw size={16} color="#FFFFFF" />
                ) : null}
                <Text
                  style={[
                    styles.actionBtnText,
                    isPrimary && styles.actionBtnTextPrimary,
                    isCancel && [
                      styles.actionBtnTextCancel,
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ],
                    isDestructive && styles.actionBtnTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Bottom Helper Divider Note */}
      <View style={styles.footerNoteRow}>
        <View
          style={[
            styles.dividerLine,
            { backgroundColor: isDark ? '#1C1E2A' : '#E2E8F0' },
          ]}
        />
        <Text
          style={[
            styles.footerNoteText,
            { color: isDark ? '#6B7280' : '#94A3B8' },
          ]}
        >
          {footerNote ||
            (isDanger
              ? 'If this keeps happening, try restarting the app.'
              : 'System Notification')}
        </Text>
        <View
          style={[
            styles.dividerLine,
            { backgroundColor: isDark ? '#1C1E2A' : '#E2E8F0' },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    marginBottom: -8,
  },
  closeBtn: {
    padding: 4,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  contentBody: {
    alignItems: 'center',
    width: '100%',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 14,
  },
  messageText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 6,
  },
  detailsBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsTag: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: '#EF4444',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  errorBodyText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 18,
    gap: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  actionBtn: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  actionBtnHalf: {
    flex: 1,
  },
  actionBtnPrimary: {
    backgroundColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnCancel: {
    borderWidth: 1,
  },
  actionBtnDestructive: {
    backgroundColor: '#DC2626',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
  },
  actionBtnTextCancel: {
    fontWeight: '700',
  },
  actionBtnTextDestructive: {
    color: '#FFFFFF',
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  footerNoteText: {
    fontSize: 11,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
