import { db } from '../database/client';
import { notification } from '../database/schema';
import { desc, eq } from 'drizzle-orm';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  entityId?: string | null;
}

class NotificationService {
  /**
   * Create a persistent local notification in SQLite on real events
   */
  async createNotification(
    type: 'QUEST' | 'REWARD' | 'ACHIEVEMENT' | 'STREAK' | 'FOCUS' | 'SYSTEM',
    title: string,
    message: string,
    entityId?: string
  ): Promise<void> {
    try {
      await db.insert(notification).values({
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: 0,
        entityId: entityId || null,
      });
    } catch (e) {
      console.warn('Error creating notification:', e);
    }
  }

  /**
   * Get all persistent notifications from SQLite
   */
  async getNotifications(limit = 20): Promise<AppNotification[]> {
    try {
      const rows = await db
        .select()
        .from(notification)
        .orderBy(desc(notification.id))
        .limit(limit);

      return rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        timestamp: r.timestamp,
        isRead: Boolean(r.isRead),
        entityId: r.entityId,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: number): Promise<void> {
    try {
      await db
        .update(notification)
        .set({ isRead: 1 })
        .where(eq(notification.id, id));
    } catch (e) {
      console.warn('Error marking notification as read:', e);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await db.update(notification).set({ isRead: 1 });
    } catch (e) {
      console.warn('Error marking all notifications as read:', e);
    }
  }
}

export const notificationService = new NotificationService();
