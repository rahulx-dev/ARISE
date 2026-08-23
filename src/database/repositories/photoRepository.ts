import { db } from '../client';
import { progressPhoto } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const photoRepository = {
  async addPhoto(filePath: string, date: string, notes?: string) {
    const results = await db.insert(progressPhoto).values({
      filePath,
      date,
      notes,
      createdAt: new Date().toISOString(),
    }).returning();
    
    return results[0];
  },

  async getPhotosByDate(date: string) {
    return await db.select()
      .from(progressPhoto)
      .where(eq(progressPhoto.date, date))
      .orderBy(desc(progressPhoto.createdAt));
  },

  async getAllPhotos() {
    return await db.select()
      .from(progressPhoto)
      .orderBy(desc(progressPhoto.date));
  },

  async deletePhoto(photoId: number) {
    await db.delete(progressPhoto).where(eq(progressPhoto.id, photoId));
  },

  async getPhotoCount(): Promise<number> {
    const results = await db.select().from(progressPhoto);
    return results.length;
  },

  async getTodaysPhoto() {
    const today = new Date().toISOString().split('T')[0];
    const results = await this.getPhotosByDate(today);
    return results.length > 0 ? results[0] : null;
  }
};
