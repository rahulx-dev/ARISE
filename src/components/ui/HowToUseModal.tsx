import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Play, X, Video, Globe, PlaySquare } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { AriseLogo } from './AriseLogo';

interface HowToUseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (lang: 'hi' | 'en') => void;
}

export function HowToUseModal({
  visible,
  onClose,
  onSelectLanguage,
}: HowToUseModalProps) {
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

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
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#111218' : '#FFFFFF',
                  borderColor: isDark ? '#1C1E2A' : '#F1F5F9',
                },
              ]}
            >
              {/* Top Handle Bar */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? '#2A2D3D' : '#D1D5DB' },
                ]}
              />

              {/* Top Header Row */}
              <View style={styles.headerRow}>
                <View style={styles.tagRow}>
                  <PlaySquare
                    size={15}
                    color={isDark ? '#8E8E93' : '#64748B'}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.tagText,
                      { color: isDark ? '#8E8E93' : '#64748B' },
                    ]}
                  >
                    VIDEO GUIDE
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    onClose();
                  }}
                  style={[
                    styles.closeBtn,
                    {
                      backgroundColor: isDark ? '#1C1E2A' : '#F1F5F9',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <X
                    size={16}
                    color={isDark ? '#8E8E93' : '#64748B'}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              </View>

              {/* Main Title & Subtitle */}
              <Text
                style={[
                  styles.mainTitle,
                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                ]}
              >
                How to Use ARISE
              </Text>
              <Text
                style={[
                  styles.mainSubtitle,
                  { color: isDark ? '#8E8E93' : '#64748B' },
                ]}
              >
                Watch our official video guide on the web. Select your preferred
                tutorial language:
              </Text>

              {/* Options List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.optionsList}
              >
                {/* 1. HINDI CARD */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? '#1A1215' : '#FFF5F5',
                      borderColor: isDark ? '#3D1C22' : '#FFE4E6',
                    },
                  ]}
                  onPress={() => handleSelect('hi')}
                  activeOpacity={0.88}
                >
                  {/* Card Top Badges Row */}
                  <View style={styles.cardBadgesRow}>
                    <View
                      style={[
                        styles.langBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(239, 68, 68, 0.2)'
                            : '#FFE4E6',
                        },
                      ]}
                    >
                      <Text style={[styles.langBadgeText, { color: '#E11D48' }]}>
                        IN HINDI
                      </Text>
                    </View>

                    <View style={styles.hdBadge}>
                      <Video size={13} color="#E11D48" />
                      <Text style={[styles.hdBadgeText, { color: '#E11D48' }]}>
                        HD VIDEO
                      </Text>
                    </View>
                  </View>

                  {/* Card Content Row: Thumbnail + Info */}
                  <View style={styles.contentRow}>
                    {/* Video Thumbnail Box */}
                    <View style={styles.thumbnailBox}>
                      <AriseLogo size={32} />
                      <Text style={styles.thumbnailBrand}>A R I S E</Text>
                      {/* Play Overlay */}
                      <View style={styles.playIconOverlay}>
                        <Play size={10} color="#E11D48" fill="#E11D48" />
                      </View>
                    </View>

                    {/* Text Details */}
                    <View style={styles.cardDetailsCol}>
                      <Text
                        style={[
                          styles.cardHeading,
                          { color: isDark ? '#FFFFFF' : '#0F172A' },
                        ]}
                      >
                        हिंदी वीडियो गाइड
                      </Text>
                      <Text
                        style={[
                          styles.cardSubHeading,
                          { color: isDark ? '#8E8E93' : '#64748B' },
                        ]}
                      >
                        (How to Use in Hindi)
                      </Text>
                      <Text
                        style={[
                          styles.cardDescription,
                          { color: isDark ? '#8E8E93' : '#64748B' },
                        ]}
                        numberOfLines={3}
                      >
                        Phone camera kaise set karein, Pushups count kaise honge,
                        aur surveys se UPI me paise kaise nikalein.
                      </Text>
                    </View>
                  </View>

                  {/* Watch Button */}
                  <View style={styles.watchBtnHindi}>
                    <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.watchBtnText}>Watch in Hindi</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. ENGLISH CARD */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? '#141720' : '#F8FAFC',
                      borderColor: isDark ? '#232A38' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => handleSelect('en')}
                  activeOpacity={0.88}
                >
                  {/* Card Top Badges Row */}
                  <View style={styles.cardBadgesRow}>
                    <View
                      style={[
                        styles.langBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(100, 116, 139, 0.2)'
                            : '#E2E8F0',
                        },
                      ]}
                    >
                      <Globe
                        size={11}
                        color={isDark ? '#94A3B8' : '#334155'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.langBadgeText,
                          { color: isDark ? '#94A3B8' : '#334155' },
                        ]}
                      >
                        ENGLISH
                      </Text>
                    </View>

                    <View style={styles.hdBadge}>
                      <Video
                        size={13}
                        color={isDark ? '#8E8E93' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.hdBadgeText,
                          { color: isDark ? '#8E8E93' : '#64748B' },
                        ]}
                      >
                        HD VIDEO
                      </Text>
                    </View>
                  </View>

                  {/* Card Content Row: Thumbnail + Info */}
                  <View style={styles.contentRow}>
                    {/* Video Thumbnail Box */}
                    <View style={styles.thumbnailBox}>
                      <AriseLogo size={32} />
                      <Text style={styles.thumbnailBrand}>A R I S E</Text>
                      {/* Play Overlay */}
                      <View style={styles.playIconOverlay}>
                        <Play size={10} color="#1E293B" fill="#1E293B" />
                      </View>
                    </View>

                    {/* Text Details */}
                    <View style={styles.cardDetailsCol}>
                      <Text
                        style={[
                          styles.cardHeading,
                          { color: isDark ? '#FFFFFF' : '#0F172A' },
                        ]}
                      >
                        English Video Walkthrough
                      </Text>
                      <Text
                        style={[
                          styles.cardDescription,
                          { color: isDark ? '#8E8E93' : '#64748B', marginTop: 3 },
                        ]}
                        numberOfLines={3}
                      >
                        Complete step-by-step walkthrough on camera calibration,
                        quest mechanics, and reward cashouts.
                      </Text>
                    </View>
                  </View>

                  {/* Watch Button */}
                  <View
                    style={[
                      styles.watchBtnEnglish,
                      {
                        backgroundColor: isDark ? '#242B38' : '#1E293B',
                      },
                    ]}
                  >
                    <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.watchBtnText}>Watch in English</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  mainSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 4,
  },
  optionsList: {
    gap: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },

  // Option Card
  optionCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  cardBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  langBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hdBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Content Row
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  thumbnailBox: {
    width: 106,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#0B0D14',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  thumbnailBrand: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 2,
  },
  playIconOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  cardDetailsCol: {
    flex: 1,
    gap: 2,
  },
  cardHeading: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  cardSubHeading: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: -2,
  },
  cardDescription: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Watch Buttons
  watchBtnHindi: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  watchBtnEnglish: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  watchBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
