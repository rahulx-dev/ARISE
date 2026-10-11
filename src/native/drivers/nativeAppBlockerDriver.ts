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
      return !!result;
    } catch (e) {
      console.warn('[NativeAppBlocker] Error checking battery exemption:', e);
      return false;
    }
  }

  requestUsagePermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        NativeAppBlocker.requestUsagePermission();
      } catch (e) {
        console.warn('[NativeAppBlocker] requestUsagePermission error:', e);
      }
    }
  }

  requestOverlayPermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        NativeAppBlocker.requestOverlayPermission();
      } catch (e) {
        console.warn('[NativeAppBlocker] requestOverlayPermission error:', e);
      }
    }
  }

  requestBatteryOptimizationExemption(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        NativeAppBlocker.requestBatteryOptimizationExemption();
      } catch (e) {
        console.warn('[NativeAppBlocker] requestBatteryOptimizationExemption error:', e);
      }
    }
  }

  startMonitoring(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        NativeAppBlocker.startMonitoring(restrictedPackages);
      } catch (e) {
        console.warn('[NativeAppBlocker] startMonitoring error:', e);
      }
    }
  }

  stopMonitoring(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        NativeAppBlocker.stopMonitoring();
      } catch (e) {
        console.warn('[NativeAppBlocker] stopMonitoring error:', e);
      }
    }
  }

  setRestrictedPackages(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      try {
        NativeAppBlocker.setRestrictedPackages(restrictedPackages);
      } catch (e) {
        console.warn('[NativeAppBlocker] setRestrictedPackages error:', e);
      }
    }
  }

  setAppBudget(packageName: string | null, budgetMinutes: number): void {
    if (Platform.OS === 'android' && NativeAppBlocker?.setAppBudget) {
      try {
        NativeAppBlocker.setAppBudget(packageName, budgetMinutes);
      } catch (e) {
        console.warn('[NativeAppBlocker] setAppBudget error:', e);
      }
    }
  }

  getAppBudget(packageName?: string | null): number {
    if (Platform.OS === 'android' && NativeAppBlocker?.getAppBudget) {
      try {
        return NativeAppBlocker.getAppBudget(packageName ?? null);
      } catch (e) {
        console.warn('[NativeAppBlocker] getAppBudget error:', e);
        return 30;
      }
    }
    return 30;
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
      return apps || [];
    } catch (e) {
      console.warn('[NativeAppBlocker] Failed querying installed apps on Android:', e);
      return [];
    }
  }

  temporaryUnlock(durationMs: number): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.temporaryUnlock) {
      try {
        return !!NativeAppBlocker.temporaryUnlock(durationMs);
      } catch (e) {
        console.warn('[NativeAppBlocker] temporaryUnlock error:', e);
        return false;
      }
    }
    return false;
  }

  unlockUntil(epochMs: number): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.unlockUntil) {
      try {
        return !!NativeAppBlocker.unlockUntil(epochMs);
      } catch (e) {
        console.warn('[NativeAppBlocker] unlockUntil error:', e);
        return false;
      }
    }
    return false;
  }

  getUnlockUntil(): number {
    if (Platform.OS === 'android' && NativeAppBlocker?.getUnlockUntil) {
      try {
        return NativeAppBlocker.getUnlockUntil() || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  isCurrentlyUnlocked(): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.isCurrentlyUnlocked) {
      try {
        return !!NativeAppBlocker.isCurrentlyUnlocked();
      } catch {
        return false;
      }
    }
    return false;
  }

  isEmergencyAvailable(): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.isEmergencyAvailable) {
      try {
        return !!NativeAppBlocker.isEmergencyAvailable();
      } catch {
        return true;
      }
    }
    return true;
  }

  claimEmergencyBailout(packageName?: string | null): boolean {
    if (Platform.OS === 'android' && NativeAppBlocker?.claimEmergencyBailout) {
      try {
        return !!NativeAppBlocker.claimEmergencyBailout(packageName ?? null);
      } catch (e) {
        console.warn('[NativeAppBlocker] claimEmergencyBailout error:', e);
        return false;
      }
    }
    return false;
  }

  getPackageTodayUsageMs(packageName: string): number {
    if (Platform.OS !== 'android' || !NativeAppBlocker?.getPackageTodayUsageMs) return 0;
    try {
      return NativeAppBlocker.getPackageTodayUsageMs(packageName) || 0;
    } catch {
      return 0;
    }
  }

  getTotalTodayUsageMs(): number {
    if (Platform.OS !== 'android' || !NativeAppBlocker?.getTotalTodayUsageMs) return 0;
    try {
      return NativeAppBlocker.getTotalTodayUsageMs() || 0;
    } catch {
      return 0;
    }
  }

  simulateBlockEvent(packageName: string): void {
    if (Platform.OS === 'android' && NativeAppBlocker?.showTestOverlay) {
      try {
        NativeAppBlocker.showTestOverlay(packageName);
      } catch {}
    }
  }
}
