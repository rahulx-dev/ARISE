import { requireNativeModule } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';

let AppBlocker: any = null;
try {
  AppBlocker = requireNativeModule('AppBlocker');
} catch {
  AppBlocker = NativeModules.AppBlocker || null;
}

if (!AppBlocker) {
  AppBlocker = {
    hasUsagePermission: async () => false,
    hasOverlayPermission: async () => false,
    requestUsagePermission: () => {},
    requestOverlayPermission: () => {},
    startMonitoring: (_restrictedPackages: string[]) => {},
    stopMonitoring: () => {},
    setRestrictedPackages: (_restrictedPackages: string[]) => {},
    getInstalledApps: async () => [],
    temporaryUnlock: (_durationMs: number) => true,
    unlockUntil: (_epochMs: number) => true,
    isCurrentlyUnlocked: () => false,
  };
}

export async function hasUsagePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await AppBlocker.hasUsagePermission();
  } catch {
    return false;
  }
}

export async function hasOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await AppBlocker.hasOverlayPermission();
  } catch {
    return false;
  }
}

export function requestUsagePermission(): void {
  if (Platform.OS === 'android') {
    AppBlocker.requestUsagePermission();
  }
}

export function requestOverlayPermission(): void {
  if (Platform.OS === 'android') {
    AppBlocker.requestOverlayPermission();
  }
}

export function startMonitoring(restrictedPackages: string[]): void {
  if (Platform.OS === 'android') {
    AppBlocker.startMonitoring(restrictedPackages);
  }
}

export function stopMonitoring(): void {
  if (Platform.OS === 'android') {
    AppBlocker.stopMonitoring();
  }
}

export function setRestrictedPackages(restrictedPackages: string[]): void {
  if (Platform.OS === 'android') {
    AppBlocker.setRestrictedPackages(restrictedPackages);
  }
}

export function setAppBudget(packageName: string | null, budgetMinutes: number): void {
  if (Platform.OS === 'android' && AppBlocker?.setAppBudget) {
    try {
      AppBlocker.setAppBudget(packageName, budgetMinutes);
    } catch {}
  }
}

export function temporaryUnlock(durationMs: number): boolean {
  if (Platform.OS === 'android' && AppBlocker?.temporaryUnlock) {
    try {
      return AppBlocker.temporaryUnlock(durationMs);
    } catch {
      return false;
    }
  }
  return true;
}

export function unlockUntil(epochMs: number): boolean {
  if (Platform.OS === 'android' && AppBlocker?.unlockUntil) {
    try {
      return AppBlocker.unlockUntil(epochMs);
    } catch {
      return false;
    }
  }
  return true;
}

export function isCurrentlyUnlocked(): boolean {
  if (Platform.OS === 'android' && AppBlocker?.isCurrentlyUnlocked) {
    try {
      return AppBlocker.isCurrentlyUnlocked();
    } catch {
      return false;
    }
  }
  return false;
}

export default {
  hasUsagePermission,
  hasOverlayPermission,
  requestUsagePermission,
  requestOverlayPermission,
  startMonitoring,
  stopMonitoring,
  setRestrictedPackages,
  temporaryUnlock,
  unlockUntil,
  isCurrentlyUnlocked,
};
