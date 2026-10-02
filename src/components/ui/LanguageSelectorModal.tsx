import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Check, Globe } from 'phosphor-react-native';
import {
  useLanguageStore,
  SUPPORTED_LANGUAGES,
  LanguageCode,
  useTranslation,
} from '../../services/i18n';
import { useHaptics } from '../../hooks/useHaptics';
import { SoloLevelingWindow } from './SoloLevelingWindow';

interface LanguageSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageSelectorModal({
  visible,
  onClose,
}: LanguageSelectorModalProps) {
  const { language: currentLang, setLanguage, t } = useTranslation();
  const haptics = useHaptics();

  const handleSelect = async (code: LanguageCode) => {
    haptics.light();
    await setLanguage(code);
    onClose();
  };

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
            <View style={{ width: '100%', maxWidth: 340, alignItems: 'center' }}>
              <SoloLevelingWindow
                variant="quest"
                tag="SYSTEM LOCALIZATION"
                subtag="SELECT LANGUAGE"
                title={`${t('selectLanguage', 'Select Language')} / भाषा चुनें`}
                buttons={[
                  {
                    text: t('close', 'CLOSE').toUpperCase(),
                    style: 'cancel',
                    onPress: onClose,
                  },
                ]}
                onClose={onClose}
              >
                <ScrollView style={{ maxHeight: 360, width: '100%' }} showsVerticalScrollIndicator={false}>
                  <View style={styles.listWrap}>
                    {SUPPORTED_LANGUAGES.map((item) => {
                      const isSelected = item.code === currentLang;
                      return (
                        <TouchableOpacity
                          key={item.code}
                          style={[
                            styles.langItem,
                            isSelected && styles.langItemSelected,
                          ]}
                          onPress={() => handleSelect(item.code)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.langLeft}>
                            <Text style={styles.flagText}>{item.flag}</Text>
                            <View>
                              <Text
                                style={[
                                  styles.langLabel,
                                  isSelected && { color: '#00F2FE' },
                                ]}
                              >
                                {item.label}
                              </Text>
                              <Text style={styles.nativeLabel}>
                                {item.nativeLabel}
                              </Text>
                            </View>
                          </View>

                          {isSelected && (
                            <View style={styles.checkPill}>
                              <Check size={14} color="#000000" weight="bold" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </SoloLevelingWindow>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  listWrap: {
    width: '100%',
    gap: 8,
    marginVertical: 6,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langItemSelected: {
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderColor: '#00F2FE',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagText: {
    fontSize: 22,
  },
  langLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  nativeLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  checkPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
