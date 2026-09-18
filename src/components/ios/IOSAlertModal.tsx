import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert as RNAlert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SoloLevelingWindow } from '../ui/SoloLevelingWindow';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'quest' | 'success';
  tag?: string;
  subtag?: string;
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
export function showIOSAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: {
    variant?: 'default' | 'info' | 'warning' | 'danger' | 'quest' | 'success';
    tag?: string;
    subtag?: string;
  }
) {
  if (globalShowAlert) {
    globalShowAlert({
      title,
      message,
      buttons,
      variant: options?.variant,
      tag: options?.tag,
      subtag: options?.subtag,
    });
  }
}

export function showSoloLevelingAlert(
  title: string,
  message?: string,
  options?: {
    variant?: 'default' | 'info' | 'warning' | 'danger' | 'quest' | 'success';
    tag?: string;
    subtag?: string;
    buttons?: AlertButton[];
  }
) {
  if (globalShowAlert) {
    globalShowAlert({
      title,
      message,
      variant: options?.variant,
      tag: options?.tag,
      subtag: options?.subtag,
      buttons: options?.buttons,
    });
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setAlertConfig({
      title: options.title,
      message: options.message,
      variant: options.variant,
      tag: options.tag,
      subtag: options.subtag,
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
  const titleLower = (alertConfig.title || '').toLowerCase();
  const isDanger =
    titleLower.includes('error') ||
    titleLower.includes('fail') ||
    titleLower.includes('warning') ||
    titleLower.includes('interrupt') ||
    titleLower.includes('locked') ||
    titleLower.includes('insufficient') ||
    titleLower.includes('reject');
  const isQuest =
    titleLower.includes('quest') ||
    titleLower.includes('workout') ||
    titleLower.includes('rep') ||
    titleLower.includes('multiplier');
  const isSuccess =
    titleLower.includes('success') ||
    titleLower.includes('equipped') ||
    titleLower.includes('unlocked') ||
    titleLower.includes('complete') ||
    titleLower.includes('confirmed') ||
    titleLower.includes('claimed') ||
    titleLower.includes('queued') ||
    titleLower.includes('paid');
  const isDirective =
    titleLower.includes('required') ||
    titleLower.includes('directive') ||
    titleLower.includes('confirm') ||
    titleLower.includes('pass') ||
    titleLower.includes('tier');

  const variant =
    alertConfig.variant ||
    (isDanger
      ? 'danger'
      : isSuccess
      ? 'success'
      : isQuest
      ? 'quest'
      : isDirective
      ? 'warning'
      : 'default');

  const defaultTag = isDanger
    ? 'SYSTEM ALERT'
    : isDirective
    ? 'SYSTEM DIRECTIVE'
    : isQuest
    ? 'QUEST NOTIFICATION'
    : isSuccess
    ? 'SYSTEM NOTIFICATION'
    : 'SYSTEM DIRECTIVE';

  const tag = alertConfig.tag || defaultTag;
  const subtag = alertConfig.subtag || 'ARISE OS';

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
              <View style={{ width: '100%', maxWidth: 350, alignItems: 'center' }}>
                <SoloLevelingWindow
                  variant={variant}
                  tag={tag}
                  subtag={subtag}
                  title={alertConfig.title}
                  message={alertConfig.message}
                  buttons={buttons.map((btn) => ({
                    text: btn.text,
                    style: btn.style,
                    onPress: () => handleButtonPress(btn),
                  }))}
                  onClose={hideAlert}
                />
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});

