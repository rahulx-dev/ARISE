import * as FileSystem from 'expo-file-system';
import { photoRepository } from '../database/repositories/photoRepository';
import { ProgressPhoto } from '../types';

export const photoService = {
  saveProgressPhoto: async (uri: string, notes?: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const baseDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
    const photosDir = `${baseDir}photos/`;
    const newPath = `${photosDir}${filename}`;

    try {
      if ((FileSystem as any).getInfoAsync && (FileSystem as any).makeDirectoryAsync) {
        const dirInfo = await (FileSystem as any).getInfoAsync(photosDir);
        if (!dirInfo.exists) {
          await (FileSystem as any).makeDirectoryAsync(photosDir, { intermediates: true });
        }

        await (FileSystem as any).copyAsync({
          from: uri,
          to: newPath,
        });

        await photoRepository.addPhoto(newPath, today, notes);
      } else {
        await photoRepository.addPhoto(uri, today, notes);
      }
    } catch (e) {
      console.warn('Failed to copy photo locally, saving direct uri:', e);
      await photoRepository.addPhoto(uri, today, notes);
    }
  },

  getPhotoTimeline: async (): Promise<ProgressPhoto[]> => {
    return (await photoRepository.getAllPhotos()) as ProgressPhoto[];
  },

  getTodaysPhoto: async (): Promise<ProgressPhoto | null> => {
    return (await photoRepository.getTodaysPhoto()) as ProgressPhoto | null;
  },

  deletePhoto: async (photoId: number): Promise<void> => {
    await photoRepository.deletePhoto(photoId);
  },
};
