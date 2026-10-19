import * as FileSystem from 'expo-file-system';
import { photoRepository } from '../database/repositories/photoRepository';
import { ProgressPhoto } from '../types';

export const photoService = {
  saveProgressPhoto: async (uri: string, notes?: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    // M64: NEVER trust the source URI's filename. A crafted URI could
    // contain "../" (path traversal) and two photos from the same source
    // name collided, overwriting each other. Generate a safe unique name
    // with an allowlisted extension.
    const extMatch = /\.([a-zA-Z0-9]+)(?:[?#]|$)/.exec(uri);
    const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes((extMatch?.[1] || '').toLowerCase())
      ? (extMatch![1]!.toLowerCase())
      : 'jpg';
    const randomHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    const filename = `photo_${Date.now()}_${randomHex}.${ext}`;
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
    // M65: deleting the DB row left the image file on disk forever
    // (orphaned storage). Fetch the path first, delete the row, then
    // delete the file best-effort.
    const photo = await photoRepository.getPhotoById(photoId);
    await photoRepository.deletePhoto(photoId);
    const filePath = (photo as any)?.filePath as string | undefined;
    if (filePath && (FileSystem as any).deleteAsync) {
      try {
        await (FileSystem as any).deleteAsync(filePath, { idempotent: true });
      } catch (e) {
        console.warn('[PhotoService] Could not delete photo file:', e);
      }
    }
  },
};
