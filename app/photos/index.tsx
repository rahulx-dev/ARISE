import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera as CameraIcon,
  Image as ImageIcon,
  Check,
  Trash2,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { photoRepository } from '../../src/database/repositories/photoRepository';
import { photoService } from '../../src/services/photoService';
import { GlowCard } from '../../src/components/design-system/GlowCard';
import { GlowButton } from '../../src/components/design-system/GlowButton';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useTheme } from '../../src/hooks/useTheme';

export default function PhotosScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { colors } = useTheme();

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
      Alert.alert(
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
    Alert.alert(
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
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>DAILY PROGRESS PHOTO</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Daily Check-in Hero Card */}
          <GlowCard variant="glow" style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <View style={[styles.cameraIconBadge, { backgroundColor: 'rgba(209, 255, 0, 0.15)' }]}>
                <CameraIcon size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.todayTitle, { color: colors.textPrimary }]}>Today's Physique Check-In</Text>
                <Text style={[styles.todaySub, { color: colors.textSecondary }]}>
                  {todayPhoto
                    ? 'Logged for today. Stored 100% locally on your device.'
                    : 'Take 1 photo daily to track lean mass & transformation progress.'}
                </Text>
              </View>
            </View>

            {todayPhoto && (
              <View style={styles.todayPreviewBox}>
                <Image source={{ uri: todayPhoto.filePath }} style={styles.todayPreviewImg} />
                <View style={styles.todaySuccessBadge}>
                  <Check size={14} color="#000" strokeWidth={3} />
                  <Text style={styles.todaySuccessText}>LOGGED TODAY</Text>
                </View>
              </View>
            )}

            <View style={styles.actionButtonsRow}>
              <GlowButton
                title={todayPhoto ? 'RETAKE PHOTO' : 'CAMERA CHECK-IN'}
                onPress={handleCapturePhoto}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                icon={<CameraIcon size={16} color="#000" />}
              />
              <GlowButton
                title="GALLERY"
                onPress={handlePickFromGallery}
                variant="outline"
                size="md"
                style={{ flex: 0.8 }}
                icon={<ImageIcon size={16} color={colors.primary} />}
              />
            </View>
          </GlowCard>

          {/* Transformation Baseline Comparison */}
          {photos.length >= 2 && oldestPhoto && newestPhoto && (
            <GlowCard variant="default" style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <Text style={[styles.comparisonTitle, { color: colors.textMuted }]}>
                  TRANSFORMATION TIMELINE
                </Text>
                <View style={styles.tagBadge}>
                  <Text style={[styles.tagBadgeText, { color: colors.accentGold }]}>
                    {photos.length} TOTAL DAYS LOGGED
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonColumn}>
                  <Image source={{ uri: oldestPhoto.filePath }} style={styles.comparisonImg} />
                  <Text style={[styles.comparisonDate, { color: colors.textSecondary }]}>
                    {oldestPhoto.date}
                  </Text>
                  <Text style={[styles.comparisonLabel, { color: colors.accentGold }]}>BASELINE</Text>
                </View>

                <View style={[styles.vsCircle, { backgroundColor: colors.surfaceLight }]}>
                  <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>
                </View>

                <View style={styles.comparisonColumn}>
                  <Image source={{ uri: newestPhoto.filePath }} style={styles.comparisonImg} />
                  <Text style={[styles.comparisonDate, { color: colors.textSecondary }]}>
                    {newestPhoto.date}
                  </Text>
                  <Text style={[styles.comparisonLabel, { color: colors.primary }]}>LATEST</Text>
                </View>
              </View>
            </GlowCard>
          )}

          {/* Chronological Grid */}
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
            PHOTO TIMELINE ({photos.length})
          </Text>

          {photos.length > 0 ? (
            <View style={styles.galleryGrid}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.thumbnailWrapper}
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
            <GlowCard variant="default" style={styles.emptyCard}>
              <CameraIcon size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Photos Logged Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Capture daily physique check-ins to build your private visual transformation timeline.
              </Text>
            </GlowCard>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Full Image Modal */}
        <Modal visible={!!selectedPhoto} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalDate}>{selectedPhoto?.date}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedPhoto(null)}
                  style={styles.iconBtn}
                >
                  <X size={20} color="#FFF" />
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
                <GlowButton
                  title="DELETE PHOTO"
                  variant="danger"
                  size="md"
                  icon={<Trash2 size={16} color="#FFF" />}
                  onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto.id)}
                />
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
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  todayCard: {
    padding: 18,
    gap: 14,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '900',
  },
  todaySub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  todayPreviewBox: {
    width: '100%',
    height: 200,
    borderRadius: 14,
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
    gap: 6,
    backgroundColor: '#D1FF00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todaySuccessText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  comparisonCard: {
    padding: 16,
    gap: 14,
    borderRadius: 18,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
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
    gap: 4,
  },
  comparisonImg: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  comparisonDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  comparisonLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 11,
    fontWeight: '900',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbnailWrapper: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbnailDate: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '800',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
    color: '#FFF',
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
  },
});
