import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Alert as RNAlert,
} from 'react-native';

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
 * Global drop-in replacement for Alert.alert with Solo Leveling System UI aesthetic
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
    buttons: [{ text: 'CONFIRM', style: 'primary' }],
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig({
      title: options.title,
      message: options.message,
      buttons: options.buttons && options.buttons.length > 0
        ? options.buttons
        : [{ text: 'CONFIRM', style: 'primary' }],
    });
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  globalShowAlert = showAlert;

  // Intercept standard React Native Alert.alert across the entire app
  useEffect(() => {
    RNAlert.alert = (title: string, message?: string, buttons?: any[]) => {
      showAlert({ title, message, buttons });
    };
  }, [showAlert]);

  const handleButtonPress = (btn: AlertButton) => {
    setVisible(false);
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  const buttons = alertConfig.buttons || [{ text: 'CONFIRM', style: 'primary' }];
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
              <View style={styles.systemWindow}>
                {/* Tech Header Bar */}
                <View style={styles.systemHeaderBar}>
                  <View style={styles.headerLeftTag}>
                    <View style={styles.systemDot} />
                    <Text style={styles.systemTagText}>SYSTEM NOTIFICATION</Text>
                  </View>
                  <Text style={styles.systemLevelText}>[ ARISE OS ]</Text>
                </View>

                {/* Main Content Area */}
                <View style={styles.contentContainer}>
                  <Text style={styles.titleText}>{alertConfig.title}</Text>
                  {!!alertConfig.message && (
                    <Text style={styles.messageText}>{alertConfig.message}</Text>
                  )}
                </View>

                {/* Solo Leveling Glowing Separator */}
                <View style={styles.systemDivider} />

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
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.alertButton,
                          isHorizontalButtons && styles.alertButtonHalf,
                          isPrimary && styles.alertButtonPrimary,
                          isCancel && styles.alertButtonCancel,
                          isDestructive && styles.alertButtonDestructive,
                        ]}
                        onPress={() => handleButtonPress(btn)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            isPrimary && styles.buttonTextPrimary,
                            isCancel && styles.buttonTextCancel,
                            isDestructive && styles.buttonTextDestructive,
                          ]}
                        >
                          {btn.text.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  systemWindow: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#070A14',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0A84FF',
    overflow: 'hidden',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 20,
  },
  systemHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 132, 255, 0.25)',
  },
  headerLeftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  systemDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowRadius: 4,
    shadowOpacity: 0.9,
  },
  systemTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00F0FF',
    letterSpacing: 1.2,
  },
  systemLevelText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(10, 132, 255, 0.8)',
    letterSpacing: 0.8,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
  },
  systemDivider: {
    height: 1,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    width: '100%',
  },
  buttonsContainer: {
    padding: 12,
    gap: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  alertButton: {
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertButtonHalf: {
    flex: 1,
  },
  alertButtonPrimary: {
    backgroundColor: '#0A84FF',
    shadowColor: '#0A84FF',
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  alertButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  alertButtonDestructive: {
    backgroundColor: '#FF453A',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#8E8E93',
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
});
