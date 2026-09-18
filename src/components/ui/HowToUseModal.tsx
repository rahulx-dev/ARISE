import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, X, ShieldCheck, Video } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';

interface HowToUseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (lang: 'hi' | 'en') => void;
}

const { width } = Dimensions.get('window');

export function HowToUseModal({
  visible,
  onClose,
  onSelectLanguage,
}: HowToUseModalProps) {
  const haptics = useHaptics();

  if (!visible) return null;

  const handleSelect = (lang: 'hi' | 'en') => {
    haptics.heavy();
    onSelectLanguage(lang);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalCard}>
            {/* Top Header */}
            <View style={styles.header}>
              <View style={styles.tagBadge}>
                <ShieldCheck size={11} color="#00D2EE" />
                <Text style={styles.tagBadgeText}>SYSTEM // VIDEO GUIDE</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  onClose();
                }}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>HOW TO USE ARISE</Text>
            <Text style={styles.subtitle}>
              Watch our official video guide on the web. Select your preferred tutorial language:
            </Text>

            {/* Language Options (Strictly 2 options: Hindi & English) */}
            <View style={styles.optionsList}>
              {/* Option 1: Hindi */}
              <TouchableOpacity
                style={[styles.langCard, { borderColor: '#0A84FF', backgroundColor: '#07101E' }]}
                onPress={() => handleSelect('hi')}
                activeOpacity={0.85}
              >
                <View style={styles.langHeaderRow}>
                  <View style={styles.flagBadge}>
                    <Text style={styles.flagText}>🇮🇳 HINDI</Text>
                  </View>
                  <View style={styles.videoBadge}>
                    <Video size={12} color="#00D2EE" />
                    <Text style={styles.videoBadgeText}>HD VIDEO</Text>
                  </View>
                </View>

                <Text style={styles.langTitle}>हिंदी वीडियो गाइड (How to Use in Hindi)</Text>
                <Text style={styles.langDesc}>
                  Phone camera kaise set karein, Pushups count kaise honge, aur surveys se UPI me paise kaise nikalein.
                </Text>

                <View style={[styles.playBtn, { backgroundColor: '#0A84FF' }]}>
                  <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.playBtnText}>WATCH IN HINDI</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: English */}
              <TouchableOpacity
                style={[styles.langCard, { borderColor: '#8B5CF6', backgroundColor: '#100A1F' }]}
                onPress={() => handleSelect('en')}
                activeOpacity={0.85}
              >
                <View style={styles.langHeaderRow}>
                  <View style={[styles.flagBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: '#8B5CF6' }]}>
                    <Text style={[styles.flagText, { color: '#C084FC' }]}>🌐 ENGLISH</Text>
                  </View>
                  <View style={styles.videoBadge}>
                    <Video size={12} color="#C084FC" />
                    <Text style={[styles.videoBadgeText, { color: '#C084FC' }]}>HD VIDEO</Text>
                  </View>
                </View>

                <Text style={styles.langTitle}>English Video Walkthrough</Text>
                <Text style={styles.langDesc}>
                  Complete step-by-step walkthrough on camera calibration, quest mechanics, and reward cashouts.
                </Text>

                <View style={[styles.playBtn, { backgroundColor: '#8B5CF6' }]}>
                  <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.playBtnText}>WATCH IN ENGLISH</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0A0E1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    gap: 12,
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 210, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 238, 0.3)',
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  optionsList: {
    gap: 12,
    marginTop: 6,
  },
  langCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  langHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  flagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 1,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00D2EE',
    letterSpacing: 0.5,
  },
  langTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  langDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  playBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
