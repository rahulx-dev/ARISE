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

  async hasBatteryOptimizationExemption(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeAppBlocker?.hasBatteryOptimizationExemption) return false;
    try {
      const result = await NativeAppBlocker.hasBatteryOptimizationExemption();
      console.log('[NativeAppBlocker] hasBatteryOptimizationExemption:', result);
      return !!result;
    } catch (e) {
      console.warn('[NativeAppBlocker] Error checking battery exemption:', e);
      return false;
    }
  }

  requestUsagePermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        console.log('[NativeAppBlocker] Calling native requestUsagePermission');
        NativeAppBlocker.requestUsagePermission();
      } catch (e) {
        console.warn('[NativeAppBlocker] requestUsagePermission error:', e);
      }
    }
  }

  requestOverlayPermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        console.log('[NativeAppBlocker] Calling native requestOverlayPermission');
        NativeAppBlocker.requestOverlayPermission();
      } catch (e) {
        console.warn('[NativeAppBlocker] requestOverlayPermission error:', e);
      }
    }
  }

  requestBatteryOptimizationExemption(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        console.log('[NativeAppBlocker] Calling native requestBatteryOptimizationExemption');
        NativeAppBlocker.requestBatteryOptimizationExemption();
      } catch (e) {
        console.warn('[NativeAppBlocker] requestBatteryOptimizationExemption error:', e);
      }
    }
  }

  startMonitoring(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        console.log('[NativeAppBlocker] startMonitoring with packages:', restrictedPackages);
        NativeAppBlocker.startMonitoring(restrictedPackages);
      } catch (e) {
        console.warn('[NativeAppBlocker] startMonitoring error:', e);
      }
    }
  }

  stopMonitoring(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        console.log('[NativeAppBlocker] stopMonitoring');
        NativeAppBlocker.stopMonitoring();
      } catch (e) {
        console.warn('[NativeAppBlocker] stopMonitoring error:', e);
      }
    }
  }

  setRestrictedPackages(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        console.log('[NativeAppBlocker] setRestrictedPackages:', restrictedPackages);
        NativeAppBlocker.setRestrictedPackages(restrictedPackages);
      } catch (e) {
        console.warn('[NativeAppBlocker] setRestrictedPackages error:', e);
      }
    }
  }

  setAppBudget(packageName: string | null, budgetMinutes: number): void {
    if (Platform.OS === 'android' && packageName && NativeAppBlocker?.setAppBudget) {
      try {
        console.log('[NativeAppBlocker] setAppBudget:', packageName, budgetMinutes);
        NativeAppBlocker.setAppBudget(packageName, budgetMinutes);
      } catch (e) {
        console.warn('[NativeAppBlocker] setAppBudget error:', e);
      }
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
    // No native implementation means no enforceable unlock.
    return false;
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
    // No native implementation means no enforceable unlock.
    return false;
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
