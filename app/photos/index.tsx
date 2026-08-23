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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { photoRepository } from '../../src/database/repositories/photoRepository';
import { photoService } from '../../src/services/photoService';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { AriseIcon } from '../../src/components/ui/AriseIcon';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

export default function PhotosScreen() {
  const router = useRouter();
  const haptics = useHaptics();

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Photos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Daily Check-in Card */}
        <Card variant="glow" style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <AriseIcon name="camera" size={28} color={colors.primary} glowIntensity="medium" />
            <View style={{ flex: 1 }}>
              <Text style={styles.todayTitle}>Daily Photo Check-In</Text>
              <Text style={styles.todaySub}>
                {todayPhoto ? 'Logged for today' : '1 photo per day • Stored 100% locally on device'}
              </Text>
            </View>
          </View>

          {!todayPhoto ? (
            <Button
              title="Capture Today's Photo"
              variant="primary"
              size="md"
              fullWidth
              onPress={handleCapturePhoto}
              style={{ marginTop: 8 }}
            />
          ) : (
            <View style={styles.completedBadgeRow}>
              <AriseIcon name="check" size={16} color={colors.success} glowIntensity="none" />
              <Text style={styles.completedText}>Logged for today. Next check-in tomorrow.</Text>
            </View>
          )}
        </Card>

        {/* Before / After Comparison Feature */}
        {photos.length >= 2 && (
          <Card variant="elevated" style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle}>TRANSFORMATION COMPARISON</Text>
              <Badge label="DAY 1 VS NOW" color={colors.accentGold} size="sm" variant="filled" />
            </View>

            <View style={styles.comparisonGrid}>
              <View style={styles.comparisonColumn}>
                <Image source={{ uri: oldestPhoto.filePath }} style={styles.comparisonImg} />
                <Text style={styles.comparisonDate}>{oldestPhoto.date}</Text>
                <Text style={styles.comparisonLabel}>BASELINE</Text>
              </View>

              <View style={styles.vsCircle}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              <View style={styles.comparisonColumn}>
                <Image source={{ uri: newestPhoto.filePath }} style={styles.comparisonImg} />
                <Text style={styles.comparisonDate}>{newestPhoto.date}</Text>
                <Text style={styles.comparisonLabel}>LATEST</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Photo Gallery Grid */}
        <Text style={styles.sectionHeading}>
          PHOTO TIMELINE ({photos.length})
        </Text>

        {photos.length > 0 ? (
          <View style={styles.galleryGrid}>
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.thumbnailWrapper}
                onPress={() => setSelectedPhoto(photo)}
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
          <Card variant="elevated" style={styles.emptyCard}>
            <AriseIcon name="photo" size={40} color={colors.textMuted} glowIntensity="none" />
            <Text style={styles.emptyTitle}>No Photos Logged Yet</Text>
            <Text style={styles.emptySub}>
              Take daily physique check-in photos to build your visual transformation timeline.
            </Text>
          </Card>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Full Photo Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>{selectedPhoto?.date}</Text>
              <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
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
              <Button
                title="Delete Photo"
                variant="danger"
                size="md"
                onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto.id)}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  scrollContent: { padding: 16, gap: 16 },
  todayCard: { padding: 18, gap: 10 },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  todaySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  completedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  completedText: { fontSize: 12, color: colors.success, fontWeight: '700' },
  comparisonCard: { padding: 16, gap: 14 },
  comparisonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comparisonTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.2 },
  comparisonGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comparisonColumn: { width: '44%', alignItems: 'center', gap: 4 },
  comparisonImg: { width: '100%', height: 160, borderRadius: 10 },
  comparisonDate: { fontSize: 11, color: colors.textSecondary },
  comparisonLabel: { fontSize: 10, fontWeight: '800', color: colors.accentGold, letterSpacing: 0.8 },
  vsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: { fontSize: 10, fontWeight: '900', color: colors.textMuted },
  sectionHeading: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbnailWrapper: { width: '31%', aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  dateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  thumbnailDate: { fontSize: 9, color: colors.textPrimary, fontWeight: '700' },
  emptyCard: { padding: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  emptySub: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  modalSafeArea: { flex: 1, padding: 16, justifyContent: 'space-between' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalDate: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  modalImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 16 },
  modalImage: { width: '100%', height: '100%' },
  modalFooter: { alignItems: 'center' },
});
