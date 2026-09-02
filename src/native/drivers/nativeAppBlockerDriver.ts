import { requireNativeModule } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';
import { IAppBlockerDriver, InstalledAppItem } from '../types';

let NativeAppBlocker: any = null;
try {
  NativeAppBlocker = requireNativeModule('AppBlocker');
} catch {
  NativeAppBlocker = (NativeModules as any).AppBlocker || null;
}

export class NativeAppBlockerDriver implements IAppBlockerDriver {
  async hasUsagePermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeAppBlocker) return false;
    try {
      const result = await NativeAppBlocker.hasUsagePermission();
      console.log('[NativeAppBlocker] hasUsagePermission:', result);
      return !!result;
    } catch (e) {
      console.warn('[NativeAppBlocker] Error checking usage permission:', e);
      return false;
    }
  }

  async hasOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeAppBlocker) return false;
    try {
      const result = await NativeAppBlocker.hasOverlayPermission();
      console.log('[NativeAppBlocker] hasOverlayPermission:', result);
      return !!result;
    } catch (e) {
      console.warn('[NativeAppBlocker] Error checking overlay permission:', e);
      return false;
    }
  }

  requestUsagePermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      console.log('[NativeAppBlocker] Calling native requestUsagePermission');
      NativeAppBlocker.requestUsagePermission();
    }
  }

  requestOverlayPermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      console.log('[NativeAppBlocker] Calling native requestOverlayPermission');
      NativeAppBlocker.requestOverlayPermission();
    }
  }

  startMonitoring(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      console.log('[NativeAppBlocker] startMonitoring with packages:', restrictedPackages);
      NativeAppBlocker.startMonitoring(restrictedPackages);
    }
  }

  stopMonitoring(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      console.log('[NativeAppBlocker] stopMonitoring');
      NativeAppBlocker.stopMonitoring();
    }
  }

  setRestrictedPackages(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      console.log('[NativeAppBlocker] setRestrictedPackages:', restrictedPackages);
      NativeAppBlocker.setRestrictedPackages(restrictedPackages);
    }
  }

  setAppBudget(packageName: string | null, budgetMinutes: number): void {
    if (Platform.OS === 'android' && NativeAppBlocker?.setAppBudget) {
      console.log('[NativeAppBlocker] setAppBudget:', packageName, budgetMinutes);
      NativeAppBlocker.setAppBudget(packageName, budgetMinutes);
    }
  }

  async isAppInstalled(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeAppBlocker?.isAppInstalled) return false;
    try {
      return await NativeAppBlocker.isAppInstalled(packageName);
    } catch {
      return false;
    }
  }

  async getInstalledApps(): Promise<InstalledAppItem[]> {
    if (Platform.OS !== 'android' || !NativeAppBlocker?.getInstalledApps) {
      return [];
    }
    try {
      const apps = await NativeAppBlocker.getInstalledApps();
      console.log(`[NativeAppBlocker] Retrieved ${apps?.length || 0} installed apps from device`);
      return apps || [];
    } catch (e) {
      console.warn('[NativeAppBlocker] Failed querying installed apps on Android:', e);
      return [];
    }
  }

  temporaryUnlock(durationMs: number): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.temporaryUnlock) {
      try {
        return NativeAppBlocker.temporaryUnlock(durationMs);
      } catch (e) {
        console.warn('[NativeAppBlocker] temporaryUnlock error:', e);
        return false;
      }
    }
    return true;
  }

  unlockUntil(epochMs: number): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.unlockUntil) {
      try {
        return NativeAppBlocker.unlockUntil(epochMs);
      } catch (e) {
        console.warn('[NativeAppBlocker] unlockUntil error:', e);
        return false;
      }
    }
    return true;
  }

  isCurrentlyUnlocked(): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.isCurrentlyUnlocked) {
      try {
        return NativeAppBlocker.isCurrentlyUnlocked();
      } catch (e) {
        return false;
      }
    }
    return false;
  }
}
