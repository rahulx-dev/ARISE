import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

let globalShowAlert: ((options: AlertOptions) => void) | null = null;

/**
 * Global drop-in replacement for Alert.alert with true iOS aesthetic
 */
export function showIOSAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (globalShowAlert) {
    globalShowAlert({ title, message, buttons });
  }
}

export function IOSAlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertOptions>({
    title: '',
    message: '',
    buttons: [{ text: 'OK', style: 'primary' }],
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig({
      title: options.title,
      message: options.message,
      buttons: options.buttons && options.buttons.length > 0
        ? options.buttons
        : [{ text: 'OK', style: 'primary' }],
    });
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  globalShowAlert = showAlert;

  const handleButtonPress = (btn: AlertButton) => {
    setVisible(false);
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  const buttons = alertConfig.buttons || [{ text: 'OK', style: 'primary' }];
  const isHorizontalButtons = buttons.length === 2;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hideAlert}
      >
        <TouchableWithoutFeedback onPress={hideAlert}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.alertCard}>
                {/* Header Content */}
                <View style={styles.contentContainer}>
                  <Text style={styles.titleText}>{alertConfig.title}</Text>
                  {!!alertConfig.message && (
                    <Text style={styles.messageText}>{alertConfig.message}</Text>
                  )}
                </View>

                {/* iOS Hairline Divider */}
                <View style={styles.horizontalDivider} />

                {/* Buttons Container */}
                <View
                  style={[
                    styles.buttonsContainer,
                    isHorizontalButtons ? styles.buttonsRow : styles.buttonsColumn,
                  ]}
                >
                  {buttons.map((btn, index) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    const isPrimary = btn.style === 'primary' || (!isCancel && !isDestructive);

                    return (
                      <React.Fragment key={index}>
                        {index > 0 && isHorizontalButtons && (
                          <View style={styles.verticalDivider} />
                        )}
                        {index > 0 && !isHorizontalButtons && (
                          <View style={styles.horizontalDivider} />
                        )}
                        <TouchableOpacity
                          style={[
                            styles.alertButton,
                            isHorizontalButtons && styles.alertButtonHalf,
                          ]}
                          onPress={() => handleButtonPress(btn)}
                          activeOpacity={0.65}
                        >
                          <Text
                            style={[
                              styles.buttonText,
                              isPrimary && styles.buttonTextPrimary,
                              isCancel && styles.buttonTextCancel,
                              isDestructive && styles.buttonTextDestructive,
                            ]}
                          >
                            {btn.text}
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useIOSAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    return {
      showAlert: showIOSAlert,
      hideAlert: () => {},
    };
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  alertCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(30, 32, 38, 0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(235, 235, 245, 0.75)',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  horizontalDivider: {
    height: StyleSheet.hairlineWidth || 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    width: '100%',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth || 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    height: '100%',
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    height: 48,
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  alertButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  alertButtonHalf: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  buttonTextPrimary: {
    color: '#D1FF00',
    fontWeight: '700',
  },
  buttonTextCancel: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  buttonTextDestructive: {
    color: '#FF453A',
    fontWeight: '700',
  },
});
