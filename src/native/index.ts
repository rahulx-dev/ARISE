import { runtimeConfig } from '../config/runtimeConfig';
import { IAppBlockerDriver, IScreenTimerDriver } from './types';
import { NativeAppBlockerDriver } from './drivers/nativeAppBlockerDriver';
import { MockAppBlockerDriver } from './drivers/mockAppBlockerDriver';
import { NativeScreenTimerDriver } from './drivers/nativeScreenTimerDriver';
import { MockScreenTimerDriver } from './drivers/mockScreenTimerDriver';

/**
 * Clean Unified Native Abstraction Layer
 * 
 * In Production (standalone Android dev client / APK):
 * Uses real Kotlin native modules (UsageStatsManager, SYSTEM_ALERT_WINDOW, AlarmManager).
 * 
 * In Preview Mode (Expo Go / Web):
 * Uses mock drivers so the app runs smoothly with 100% functional UI, SQLite, and audio/haptics.
 */

const mockAppBlocker = new MockAppBlockerDriver();
const nativeAppBlocker = new NativeAppBlockerDriver();

const mockScreenTimer = new MockScreenTimerDriver();
const nativeScreenTimer = new NativeScreenTimerDriver();

export const appBlockerService: IAppBlockerDriver = runtimeConfig.previewModeActive
  ? mockAppBlocker
  : nativeAppBlocker;

export const screenTimerService: IScreenTimerDriver = runtimeConfig.previewModeActive
  ? mockScreenTimer
  : nativeScreenTimer;

// Expose access to mock helpers for interactive testing in preview mode
export const previewHelpers = {
  mockAppBlocker,
  mockScreenTimer,
  isMockActive: runtimeConfig.previewModeActive,
};

export * from './types';
export default {
  appBlockerService,
  screenTimerService,
  previewHelpers,
};
