import { db } from '../database/client';
import { notification } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground presentation behavior so notifications show banners on Android
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

export type NotificationType =
  | 'QUEST'
  | 'REWARD'
  | 'ACHIEVEMENT'
  | 'STREAK'
  | 'FOCUS'
  | 'SYSTEM'
  | 'MOTIVATION'
  | 'GYM';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  entityId?: string | null;
}

export const MONARCH_MOTIVATIONS = [
  {
    title: '👑 [SHADOW MONARCH DIRECTIVE]',
    message: '"I will protect my realm, even if the entire world opposes me." — Stand up and execute your reps, Hunter.',
  },
  {
    title: '⚡ [SYSTEM MOTIVATION // POWER GAP]',
    message: '"The difference between an E-Rank weakling and a National-Level hunter is daily discipline." Put the phone down and train.',
  },
  {
    title: '🗡️ [S-RANK MENTALITY]',
    message: '"Pain is temporary. Quitting is forever. Every pushup summons another shadow soldier to your army."',
  },
  {
    title: '🌌 [THE MONARCH COMMANDS]',
    message: '"Weakness is an illusion. Rise beyond your mortal limits and claim today\'s victory. ARISE!"',
  },
  {
    title: '🔥 [DISCIPLINE PROTOCOL]',
    message: '"Motivation gets you started. Unforgiving consistency makes you a King." Log your workout now.',
  },
  {
    title: '🛡️ [IRON WILL DIRECTIVE]',
    message: '"The dungeon gate does not care about your excuses. Only strength will see you through the rift."',
  },
  {
    title: '⚔️ [SOVEREIGN AWAKENING]',
    message: '"Every rep builds your core. Every minute of focus expands your mana. Level up right now."',
  },
  {
    title: '💎 [DIMENSIONAL RAID PROTOCOL]',
    message: '"High-tier loot is reserved for hunters who sweat in silence." Conquer your daily training block.',
  },
  {
    title: '💀 [PENALTY ZONE WARNING]',
    message: '"Those who neglect daily directives shall face the centipedes of the wasteland." Get your training done!',
  },
  {
    title: '🎯 [PRECISION FOCUS]',
    message: '"Social media algorithms steal your life. Reclaim your focus, conquer your screen time, and Arise."',
  },
];

class NotificationService {
  /**
   * Setup Android notification channels with high importance and custom lights
   */
  async setupNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('hunter_reminders', {
        name: 'Hunter Directives & Quests',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A84FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('hunter_motivation', {
        name: 'Monarch Motivational Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: '#A855F7',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('streak_alerts', {
        name: 'Streak Preservation & Warnings',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#EA580C',
        sound: 'default',
      });
    } catch (e) {
      console.warn('Failed to setup notification channels:', e);
    }
  }

  /**
   * Schedule timely daily reminders across the day:
   * 1. 07:30 AM - Morning Awakening Protocol
   * 2. 02:00 PM - Midday Focus & Mana Shield
   * 3. 04:30 PM - Afternoon Motivational Directive
   * 4. 08:00 PM - Evening Daily Quest Warning (4 Hours to Midnight)
   * 5. 10:30 PM - Final Streak Savior Defense Alert
   */
  async scheduleDailyTimelyReminders(): Promise<void> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') return;
      }

      await this.setupNotificationChannels();

      // Cancel previous scheduled reminders to avoid duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();

      // 1. Morning Awakening (7:30 AM)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚔️ [SYSTEM DIRECTIVE // MORNING AWAKENING]',
          body: 'Rise, Hunter! 3 New daily quests have spawned. Begin your morning training protocol.',
          color: '#0A84FF',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'DAILY_AWAKENING' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 7,
          minute: 30,
          channelId: 'hunter_reminders',
        },
      });

      // 2. Midday Focus & Mana Shield (2:00 PM)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🛡️ [MONARCH PROTOCOL // FOCUS SHIELD]',
          body: 'Digital distractions drain your mana. Step away from doomscrolling and claim your daily focus XP.',
          color: '#00D2EE',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          data: { type: 'MIDDAY_FOCUS' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 14,
          minute: 0,
          channelId: 'hunter_reminders',
        },
      });

      // 3. Afternoon Motivational Push (4:30 PM)
      const randomMotiv = MONARCH_MOTIVATIONS[Math.floor(Math.random() * MONARCH_MOTIVATIONS.length)];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: randomMotiv.title,
          body: randomMotiv.message,
          color: '#A855F7',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'MOTIVATION' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 16,
          minute: 30,
          channelId: 'hunter_motivation',
        },
      });

      // 4. Evening Urgent Deadline (8:00 PM - 4 Hours to Midnight)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ [SYSTEM ALERT // 4 HOURS TO MIDNIGHT]',
          body: 'Only 4 hours remain before quest reset! Complete your daily workout or face the Penalty Zone.',
          color: '#EA580C',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { type: 'QUEST_DEADLINE' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
          channelId: 'streak_alerts',
        },
      });

      // 5. Night Final Streak Savior (10:30 PM)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 [STREAK SHIELD // FINAL CALL]',
          body: 'Do not let your hunter streak die! Final 90 minutes to register reps and claim daily coins.',
          color: '#FF2E54',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { type: 'STREAK_FINAL_CALL' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 22,
          minute: 30,
          channelId: 'streak_alerts',
        },
      });
    } catch (e) {
      console.warn('Failed to schedule daily notifications:', e);
    }
  }

  /**
   * Broadcast an instant motivational notification on the phone + save to SQLite
   */
  async sendMotivationalNotification(): Promise<void> {
    try {
      await this.setupNotificationChannels();
      const pick = MONARCH_MOTIVATIONS[Math.floor(Math.random() * MONARCH_MOTIVATIONS.length)];

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: pick.title,
            body: pick.message,
            color: '#A855F7',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: { channelId: 'hunter_motivation' },
        });
      } catch {}

      await this.createNotification('MOTIVATION', pick.title, pick.message);
    } catch (e) {
      console.warn('Error triggering motivational notification:', e);
    }
  }

  /**
   * Send an instant test notification so user can see it pop up immediately
   */
  async sendTestNotification(): Promise<void> {
    try {
      await this.setupNotificationChannels();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚔️ [ARISE OS // SYSTEM TEST DIRECTIVE]',
          body: 'Hunter Notification Conduit Verified! Timely reminders and Monarch motivations are active.',
          color: '#00D2EE',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: { channelId: 'hunter_reminders' },
      });

      await this.createNotification(
        'SYSTEM',
        '⚔️ SYSTEM NOTIFICATION CONDUIT ONLINE',
        'Live notification channels initialized. Timely morning, focus, deadline, and streak defense reminders are synchronized.'
      );
    } catch (e) {
      console.warn('Error sending test notification:', e);
    }
  }

  /**
   * Create a persistent local notification in SQLite
   */
  async createNotification(
    type: NotificationType,
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
   * Seed default notifications if log is empty
   */
  async seedDefaultNotificationsIfEmpty(): Promise<void> {
    try {
      const existing = await this.getNotifications(1);
      if (existing.length === 0) {
        await this.createNotification(
          'SYSTEM',
          '⚡ MONARCH SYSTEM AWAKENING',
          'Welcome to ARISE. The System has calibrated your player vessel. Execute daily quests to ascend.'
        );
        await this.createNotification(
          'MOTIVATION',
          '👑 [SHADOW MONARCH DIRECTIVE]',
          '"The difference between an E-Rank weakling and a National-Level hunter is daily discipline." — Stand up and execute.'
        );
        await this.createNotification(
          'QUEST',
          '⚔️ DAILY QUESTS MATERIALIZED',
          '3 New daily physical training trials are active in your sector. Complete them before midnight reset.'
        );
      }
    } catch {}
  }

  /**
   * Get all persistent notifications from SQLite
   */
  async getNotifications(limit = 30): Promise<AppNotification[]> {
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

  /**
   * Clear all notifications from SQLite
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await db.delete(notification);
    } catch (e) {
      console.warn('Error clearing notifications:', e);
    }
  }
}

export const notificationService = new NotificationService();
