import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';

export interface SystemWindowButton {
  text: string;
  onPress?: () => void;
  style?: 'primary' | 'cancel' | 'destructive' | 'default';
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
}

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3.5;

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
}: SoloLevelingWindowProps) {
  // Variant accent colors
  const getAccentColor = () => {
    if (customAccentColor) return customAccentColor;
    switch (variant) {
      case 'danger':
        return '#FF3B30';
      case 'warning':
        return '#FF9F0A';
      case 'success':
        return '#30D158';
      case 'quest':
        return '#0A84FF';
      case 'default':
      case 'info':
      default:
        return '#00F2FE';
    }
  };

  const accentColor = getAccentColor();
  const isHorizontalButtons = buttons && buttons.length === 2;

  return (
    <View style={[styles.outerContainer, { shadowColor: accentColor }, style]}>
      {/* 4 Iconic Solo Leveling Thick Corner Brackets */}
      <View
        style={[
          styles.cornerBracket,
          styles.topLeft,
          { borderColor: accentColor },
        ]}
      />
      <View
        style={[
          styles.cornerBracket,
          styles.topRight,
          { borderColor: accentColor },
        ]}
      />
      <View
        style={[
          styles.cornerBracket,
          styles.bottomLeft,
          { borderColor: accentColor },
        ]}
      />
      <View
        style={[
          styles.cornerBracket,
          styles.bottomRight,
          { borderColor: accentColor },
        ]}
      />

      {/* Decorative Corner Dots with Chromatic Aberration */}
      <View style={[styles.cornerDot, styles.dotTopLeft, { backgroundColor: '#8B5CF6' }]} />
      <View style={[styles.cornerDot, styles.dotTopRight, { backgroundColor: accentColor }]} />
      <View style={[styles.cornerDot, styles.dotBottomLeft, { backgroundColor: accentColor }]} />
      <View style={[styles.cornerDot, styles.dotBottomRight, { backgroundColor: '#8B5CF6' }]} />

      {/* High-Tech HUD Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor:
              variant === 'danger'
                ? 'rgba(255, 59, 48, 0.12)'
                : variant === 'warning'
                ? 'rgba(255, 159, 10, 0.12)'
                : 'rgba(0, 242, 254, 0.09)',
            borderBottomColor:
              variant === 'danger'
                ? 'rgba(255, 59, 48, 0.25)'
                : 'rgba(0, 242, 254, 0.25)',
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.exclamationCircle, { borderColor: accentColor }]}>
            <Text style={[styles.exclamationText, { color: accentColor }]}>!</Text>
          </View>
          <Text
            style={[
              styles.tagText,
              {
                color: accentColor,
                textShadowColor: accentColor,
              },
            ]}
          >
            {tag.toUpperCase()}
          </Text>
        </View>

        {subtag ? (
          <Text style={styles.subtagText}>[ {subtag.toUpperCase()} ]</Text>
        ) : null}
      </View>

      {/* Glowing System Divider */}
      <View
        style={[
          styles.dividerLine,
          {
            backgroundColor:
              variant === 'danger'
                ? 'rgba(255, 59, 48, 0.35)'
                : 'rgba(0, 242, 254, 0.3)',
          },
        ]}
      />

      {/* Main Content Body */}
      <View style={[styles.contentBody, contentStyle]}>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

        {title ? (
          <Text
            style={[
              styles.titleText,
              {
                textShadowColor:
                  variant === 'danger'
                    ? 'rgba(255, 59, 48, 0.4)'
                    : 'rgba(0, 242, 254, 0.4)',
              },
            ]}
          >
            {title}
          </Text>
        ) : null}

        {message ? (
          <Text style={styles.messageText}>{message}</Text>
        ) : null}

        {children}
      </View>

      {/* Cyber Action Buttons */}
      {buttons && buttons.length > 0 && (
        <View
          style={[
            styles.buttonsContainer,
            isHorizontalButtons ? styles.buttonsRow : styles.buttonsColumn,
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
                  styles.cyberBtn,
                  isHorizontalButtons && styles.cyberBtnHalf,
                  isPrimary && [
                    styles.cyberBtnPrimary,
                    {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                      shadowColor: accentColor,
                    },
                  ],
                  isCancel && styles.cyberBtnCancel,
                  isDestructive && styles.cyberBtnDestructive,
                ]}
                onPress={btn.onPress || onClose}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.cyberBtnText,
                    isPrimary && styles.cyberBtnTextPrimary,
                    isCancel && styles.cyberBtnTextCancel,
                    isDestructive && styles.cyberBtnTextDestructive,
                  ]}
                >
                  [ {btn.text.toUpperCase()} ]
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#050811',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.28)',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 20,
    position: 'relative',
  },

  // 4 Thick Geometric Corner Brackets
  cornerBracket: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    zIndex: 10,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },

  // Micro Corner Accent Dots
  cornerDot: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    zIndex: 11,
    opacity: 0.8,
  },
  dotTopLeft: { top: 6, left: 6 },
  dotTopRight: { top: 6, right: 6 },
  dotBottomLeft: { bottom: 6, left: 6 },
  dotBottomRight: { bottom: 6, right: 6 },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exclamationCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exclamationText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  beaconDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    shadowRadius: 6,
    shadowOpacity: 0.9,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtagText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dividerLine: {
    height: 1,
    width: '100%',
  },

  // Content
  contentBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  messageText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // Buttons
  buttonsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    gap: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  cyberBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  cyberBtnHalf: {
    flex: 1,
  },
  cyberBtnPrimary: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: '#00F2FE',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  cyberBtnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cyberBtnDestructive: {
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    borderColor: '#FF453A',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  cyberBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cyberBtnTextPrimary: {
    color: '#FFFFFF',
  },
  cyberBtnTextCancel: {
    color: '#8E8E93',
  },
  cyberBtnTextDestructive: {
    color: '#FFFFFF',
  },
});
