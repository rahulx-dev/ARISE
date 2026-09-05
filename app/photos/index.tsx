import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Camera,
  Images,
  Check,
  Trash,
  X,
  Sparkle,
  Plus,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { photoRepository } from '../../src/database/repositories/photoRepository';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { photoService } from '../../src/services/photoService';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function PhotosScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors, isDark } = useTheme();

  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [todayPhoto, setTodayPhoto] = useState<any | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const all = await photoRepository.getAllPhotos();
      setPhotos(all);

      const today = await photoRepository.getTodaysPhoto();
      setTodayPhoto(today || null);
    } catch (e) {
      console.warn('Failed loading progress photos:', e);
    }
  };

  const handleCapturePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showIOSAlert(
        'Camera Permission Required',
        'Please grant camera permission in system settings to log your daily progress photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await photoService.saveProgressPhoto(result.assets[0].uri, 'Daily Transformation Check-in');
      haptics.success();
      loadPhotos();
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await photoService.saveProgressPhoto(result.assets[0].uri, 'Gallery Check-in');
      haptics.success();
      loadPhotos();
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    showIOSAlert(
      'Delete Progress Photo?',
      'Are you sure you want to permanently delete this progress record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await photoService.deletePhoto(photoId);
            setSelectedPhoto(null);
            haptics.light();
            loadPhotos();
          },
        },
      ]
    );
  };

  const oldestPhoto = photos.length > 1 ? photos[photos.length - 1] : null;
  const newestPhoto = photos.length > 0 ? photos[0] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              router.back();
            }}
            style={[styles.iconBtn, { backgroundColor: isDark ? '#14151C' : '#FFFFFF', borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <CaretLeft size={20} color={colors.textPrimary} weight="bold" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>PHYSIQUE TRACKER</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>100% On-Device Private Log</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Daily Check-in Hero Card */}
          <GlassCard variant="elevated" style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <View style={[styles.cameraIconBadge, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : '#FCE7F3' }]}>
                <Camera size={22} color="#EC4899" weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.todayTitle, { color: colors.textPrimary }]}>Today's Physique Check-In</Text>
                <Text style={[styles.todaySub, { color: colors.textMuted }]}>
                  {todayPhoto
                    ? 'Logged for today. Stored 100% locally and privately on your phone.'
                    : 'Take 1 photo daily to track muscle definition & physical transformation.'}
                </Text>
              </View>
            </View>

            {todayPhoto && (
              <View style={styles.todayPreviewBox}>
                <Image source={{ uri: todayPhoto.filePath }} style={styles.todayPreviewImg} />
                <View style={styles.todaySuccessBadge}>
                  <Check size={12} color="#FFFFFF" weight="bold" />
                  <Text style={styles.todaySuccessText}>LOGGED TODAY</Text>
                </View>
              </View>
            )}

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  haptics.heavy();
                  handleCapturePhoto();
                }}
                activeOpacity={0.85}
              >
                <Camera size={16} color="#FFFFFF" weight="bold" />
                <Text style={styles.primaryActionBtnText}>
                  {todayPhoto ? 'RETAKE PHOTO' : 'CAMERA CHECK-IN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryActionBtn,
                  {
                    backgroundColor: isDark ? '#14151C' : '#FFFFFF',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  handlePickFromGallery();
                }}
                activeOpacity={0.85}
              >
                <Images size={16} color={colors.textPrimary} weight="bold" />
                <Text style={[styles.secondaryActionBtnText, { color: colors.textPrimary }]}>GALLERY</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Transformation Baseline Comparison */}
          {photos.length >= 2 && oldestPhoto && newestPhoto && (
            <GlassCard variant="elevated" style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkle size={15} color="#F59E0B" weight="fill" />
                  <Text style={[styles.comparisonTitle, { color: colors.textPrimary }]}>
                    TRANSFORMATION TIMELINE
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: isDark ? '#1C1E2A' : '#FEF3C7' }]}>
                  <Text style={[styles.tagBadgeText, { color: '#F59E0B' }]}>
                    {photos.length} DAYS LOGGED
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonColumn}>
                  <Image source={{ uri: oldestPhoto.filePath }} style={styles.comparisonImg} />
                  <Text style={[styles.comparisonDate, { color: colors.textMuted }]}>
                    {oldestPhoto.date}
                  </Text>
                  <View style={[styles.compareTagBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Text style={[styles.comparisonLabel, { color: '#F59E0B' }]}>BASELINE</Text>
                  </View>
                </View>

                <View style={[styles.vsCircle, { backgroundColor: isDark ? '#1C1E2A' : '#EFF6FF', borderColor: colors.border }]}>
                  <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>
                </View>

                <View style={styles.comparisonColumn}>
                  <Image source={{ uri: newestPhoto.filePath }} style={styles.comparisonImg} />
                  <Text style={[styles.comparisonDate, { color: colors.textMuted }]}>
                    {newestPhoto.date}
                  </Text>
                  <View style={[styles.compareTagBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : '#EFF6FF' }]}>
                    <Text style={[styles.comparisonLabel, { color: colors.primary }]}>LATEST</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Chronological Grid */}
          <View style={styles.timelineHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Photo Timeline
            </Text>
            <Text style={[styles.photoCountBadge, { color: colors.textMuted }]}>
              {photos.length} total
            </Text>
          </View>

          {photos.length > 0 ? (
            <View style={styles.galleryGrid}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.thumbnailWrapper, { borderColor: colors.border }]}
                  onPress={() => {
                    haptics.light();
                    setSelectedPhoto(photo);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.filePath }} style={styles.thumbnail} />
                  <View style={styles.dateOverlay}>
                    <Text style={styles.thumbnailDate}>{photo.date}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <GlassCard variant="default" style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#14151C' : '#F3F4F6' }]}>
                <Camera size={32} color={colors.textMuted} weight="duotone" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Photos Logged Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Capture daily physique check-ins to build your private visual transformation timeline.
              </Text>
              <TouchableOpacity
                style={[styles.emptyStartBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  haptics.heavy();
                  handleCapturePhoto();
                }}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" weight="bold" />
                <Text style={styles.emptyStartBtnText}>Take First Photo</Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Full Image Modal */}
        <Modal visible={!!selectedPhoto} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalDate}>{selectedPhoto?.date}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedPhoto(null)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.8}
                >
                  <X size={20} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </View>

              {selectedPhoto && (
                <View style={styles.modalImageContainer}>
                  <Image
                    source={{ uri: selectedPhoto.filePath }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto.id)}
                  activeOpacity={0.8}
                >
                  <Trash size={18} color="#FFFFFF" weight="bold" />
                  <Text style={styles.deleteModalBtnText}>DELETE PHOTO</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  todayCard: {
    padding: 18,
    gap: 14,
    borderRadius: 22,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cameraIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  todaySub: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  todayPreviewBox: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  todayPreviewImg: {
    width: '100%',
    height: '100%',
  },
  todaySuccessBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todaySuccessText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  secondaryActionBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  comparisonCard: {
    padding: 16,
    gap: 14,
    borderRadius: 22,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonColumn: {
    width: '43%',
    alignItems: 'center',
    gap: 6,
  },
  comparisonImg: {
    width: '100%',
    height: 160,
    borderRadius: 14,
  },
  comparisonDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  compareTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comparisonLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 11,
    fontWeight: '900',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
  },
  photoCountBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbnailWrapper: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  dateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbnailDate: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    marginTop: 4,
  },
  emptyStartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalSafeArea: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDate: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  deleteModalBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
