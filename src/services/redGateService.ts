import { expoDb } from '../database/client';
import { crystalRepository } from '../database/repositories/crystalRepository';
import { userRepository } from '../database/repositories/userRepository';
import { notificationService } from './notificationService';
import * as Notifications from 'expo-notifications';

export interface RedGateTrial {
  id: 'pushups' | 'squats' | 'focus';
  title: string;
  subtitle: string;
  targetLabel: string;
  targetValue: number;
  type: 'exercise' | 'focus';
  exerciseType?: 'PUSHUP' | 'SQUAT';
}

export interface RedGateEncounter {
  id: string;
  threatName: string;
  title: string;
  lore: string;
  rankCode: string;
  expiresAt: number;
  isCleared: boolean;
  bountyCrystals: number;
  rewardXP: number;
  unlockedTitle: string;
  trials: RedGateTrial[];
}

const RED_GATE_STORAGE_KEY = '@arise_active_red_gate';
const RED_GATE_LAST_CLEARED_KEY = '@arise_last_red_gate_cleared_at';
const NEXT_RED_GATE_EPOCH_KEY = '@arise_next_red_gate_epoch';
const RED_GATE_NOTIFIED_KEY = '@arise_red_gate_notified';

function getKv(key: string): string | null {
  try {
    expoDb.runSync('CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)');
    const res = expoDb.getFirstSync<{ val: string }>('SELECT val FROM arise_kv WHERE key = ?', [key]);
    return res?.val ?? null;
  } catch {
    return null;
  }
}

function setKv(key: string, val: string): void {
  try {
    expoDb.runSync('CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)');
    expoDb.runSync('INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)', [key, val]);
  } catch {}
}

/**
 * Generates an unpredictable random delay between 4.5 and 7.5 days.
 * Keeps hunters eagerly checking the app without predictable timing!
 */
function getRandomWeeklyDelayMs(): number {
  const minDays = 4.5;
  const maxDays = 7.5;
  const randomDays = minDays + Math.random() * (maxDays - minDays);
  return Math.floor(randomDays * 24 * 60 * 60 * 1000);
}

class RedGateService {
  /**
   * Get the current active Red Gate encounter, or null if none active or expired.
   */
  async getActiveGate(): Promise<RedGateEncounter | null> {
    try {
      const raw = getKv(RED_GATE_STORAGE_KEY);
      if (!raw) return null;

      const gate: RedGateEncounter = JSON.parse(raw);
      if (Date.now() > gate.expiresAt) {
        this.clearGate();
        return null;
      }

      return gate;
    } catch {
      return null;
    }
  }

  /**
   * Checks schedule and triggers an emergency Red Gate if the unpredictable interval has arrived!
   */
  async checkAndTriggerRandomGate(): Promise<RedGateEncounter | null> {
    const existing = await this.getActiveGate();
    if (existing && !existing.isCleared) {
      return existing;
    }

    const now = Date.now();
    const nextTargetStr = getKv(NEXT_RED_GATE_EPOCH_KEY);

    // If no next target scheduled yet, schedule the first random spawn window
    if (!nextTargetStr) {
      const initialDelay = getRandomWeeklyDelayMs();
      setKv(NEXT_RED_GATE_EPOCH_KEY, (now + initialDelay).toString());
      return null;
    }

    const nextTargetEpoch = Number(nextTargetStr);
    if (isNaN(nextTargetEpoch)) {
      setKv(NEXT_RED_GATE_EPOCH_KEY, (now + getRandomWeeklyDelayMs()).toString());
      return null;
    }

    // If time has arrived for the unpredictable Red Gate spawn!
    if (now >= nextTargetEpoch) {
      return this.triggerEmergencyGate(true);
    }

    return null;
  }

  /**
   * Spawns an Emergency Red Gate encounter (24-hour survival event)
   * with Mega 750 Mana Crystal Bounty & High-Priority Red System Notification!
   */
  async triggerEmergencyGate(force = false): Promise<RedGateEncounter> {
    const existing = await this.getActiveGate();
    if (existing && !force && !existing.isCleared) {
      return existing;
    }

    const now = Date.now();
    const gate: RedGateEncounter = {
      id: `red_gate_${now}`,
      threatName: 'Demon Monarch Baran',
      title: 'CRIMSON DIMENSION RIFT // RED GATE',
      lore: 'Atmospheric mana has reached lethal density! The dimensional rift has mutated into a catastrophic Red Gate. Normal extraction is sealed until the monarch sovereign entity is defeated.',
      rankCode: 'S',
      expiresAt: now + 24 * 60 * 60 * 1000,
      isCleared: false,
      bountyCrystals: 750, // Mega Bounty!
      rewardXP: 2500, // Massive XP boost
      unlockedTitle: 'Red Gate Conqueror',
      trials: [
        {
          id: 'pushups',
          title: '[ AI TRIAL: 25 PUSHUPS ]',
          subtitle: 'Anti-Cheat Camera Motion Tracked',
          targetLabel: '25 Reps',
          targetValue: 25,
          type: 'exercise',
          exerciseType: 'PUSHUP',
        },
        {
          id: 'squats',
          title: '[ AI TRIAL: 30 SQUATS ]',
          subtitle: 'Full Depth & Form Angle Verified',
          targetLabel: '30 Reps',
          targetValue: 30,
          type: 'exercise',
          exerciseType: 'SQUAT',
        },
        {
          id: 'focus',
          title: '[ ISOLATION: 45M FOCUS ]',
          subtitle: 'Zero Distraction Phone Lockdown',
          targetLabel: '45 Mins',
          targetValue: 45,
          type: 'focus',
        },
      ],
    };

    setKv(RED_GATE_STORAGE_KEY, JSON.stringify(gate));

    // Schedule the next unpredictable spawn window
    const nextRandomInterval = getRandomWeeklyDelayMs();
    setKv(NEXT_RED_GATE_EPOCH_KEY, (now + nextRandomInterval).toString());

    // Send High-Priority Red System Alert Notification
    this.sendRedAlertNotification(gate);

    return gate;
  }

  /**
   * Broadcasts high-priority red alert OS push notification and database record
   */
  private async sendRedAlertNotification(gate: RedGateEncounter): Promise<void> {
    try {
      const lastNotified = getKv(RED_GATE_NOTIFIED_KEY);
      if (lastNotified === gate.id) return; // Prevent spamming duplicate notifications

      // 1. Android Notification Channel with Max Importance & Red Light
      try {
        await Notifications.setNotificationChannelAsync('emergency_red_gate', {
          name: 'Emergency Red Gate Alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 600, 200, 600, 200, 800],
          lightColor: '#FF1E44',
          sound: 'default',
        });
      } catch {}

      // 2. High Priority OS Push Notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 [ EMERGENCY RED GATE DETECTED ]',
            body: 'Atmospheric mana overload! Crimson Dimension Rift has materialized. 750 Mana Crystals Bounty active for 24h. Enter the trial now!',
            color: '#FF1E44',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { type: 'RED_GATE', gateId: gate.id },
          },
          trigger: null, // Send immediately
        });
      } catch (pushErr) {
        console.warn('OS push notification warning:', pushErr);
      }

      // 3. Persistent SQLite Notification Record
      await notificationService.createNotification(
        'SYSTEM',
        '🚨 EMERGENCY RED GATE MATERIALIZED',
        'Demon Monarch Baran has sealed the dimensional rift. 750 Mana Crystals & 2,500 XP mega bounty unlocked for 24 hours!',
        gate.id
      );

      setKv(RED_GATE_NOTIFIED_KEY, gate.id);
    } catch (err) {
      console.warn('Error sending red alert notification:', err);
    }
  }

  /**
   * Complete the Red Gate trial and award massive Mana Crystals & XP.
   */
  async claimVictory(trialId: string): Promise<{
    success: boolean;
    crystalsAwarded: number;
    rewardXP: number;
    title: string;
    error?: string;
  }> {
    try {
      const active = await this.getActiveGate();
      if (!active) {
        return { success: false, crystalsAwarded: 0, rewardXP: 0, title: '', error: 'No active Red Gate found.' };
      }

      if (active.isCleared) {
        return { success: false, crystalsAwarded: 0, rewardXP: 0, title: '', error: 'Red Gate already conquered.' };
      }

      active.isCleared = true;
      setKv(RED_GATE_STORAGE_KEY, JSON.stringify(active));
      setKv(RED_GATE_LAST_CLEARED_KEY, new Date().toISOString());

      // Award Mega Mana Crystals
      await crystalRepository.addCrystals(
        active.bountyCrystals,
        `Conquered Emergency Red Gate: ${active.threatName}`,
        active.id
      );

      // Award Massive System XP
      await userRepository.addXP(active.rewardXP);

      // Schedule next unpredictable Red Gate 4.5 - 7.5 days from clearance
      const nextSpawnTarget = Date.now() + getRandomWeeklyDelayMs();
      setKv(NEXT_RED_GATE_EPOCH_KEY, nextSpawnTarget.toString());

      return {
        success: true,
        crystalsAwarded: active.bountyCrystals,
        rewardXP: active.rewardXP,
        title: active.unlockedTitle,
      };
    } catch (e: any) {
      return { success: false, crystalsAwarded: 0, rewardXP: 0, title: '', error: e?.message || 'Failed to claim victory' };
    }
  }

  clearGate(): void {
    setKv(RED_GATE_STORAGE_KEY, '');
  }
}

export const redGateService = new RedGateService();
