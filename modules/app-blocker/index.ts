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
    hasBatteryOptimizationExemption: async () => false,
    requestUsagePermission: () => {},
    requestOverlayPermission: () => {},
    requestBatteryOptimizationExemption: () => {},
    startMonitoring: (_restrictedPackages: string[]) => {},
    stopMonitoring: () => {},
    setRestrictedPackages: (_restrictedPackages: string[]) => {},
    setAppBudget: (_packageName: string | null, _budgetMinutes: number) => {},
    getAppBudget: (_packageName?: string | null) => 30,
    getInstalledApps: async () => [],
    isAppInstalled: async (_packageName: string) => false,
    temporaryUnlock: (_durationMs: number) => false,
    unlockUntil: (_epochMs: number) => false,
    getUnlockUntil: () => 0,
    isCurrentlyUnlocked: () => false,
    isEmergencyAvailable: () => true,
    claimEmergencyBailout: (_packageName?: string | null) => false,
    getPackageTodayUsageMs: (_packageName: string) => 0,
    getTotalTodayUsageMs: () => 0,
    showTestOverlay: (_targetPackage?: string) => false,
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

export async function hasBatteryOptimizationExemption(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await AppBlocker.hasBatteryOptimizationExemption();
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

export function requestBatteryOptimizationExemption(): void {
  if (Platform.OS === 'android') {
    AppBlocker.requestBatteryOptimizationExemption();
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

export function getAppBudget(packageName?: string | null): number {
  if (Platform.OS === 'android' && AppBlocker?.getAppBudget) {
    try {
      return AppBlocker.getAppBudget(packageName);
    } catch {
      return 30;
    }
  }
  return 30;
}

export function temporaryUnlock(durationMs: number): boolean {
  if (Platform.OS === 'android' && AppBlocker?.temporaryUnlock) {
    try {
      return AppBlocker.temporaryUnlock(durationMs);
    } catch {
      return false;
    }
  }
  return false;
}

export function unlockUntil(epochMs: number): boolean {
  if (Platform.OS === 'android' && AppBlocker?.unlockUntil) {
    try {
      return AppBlocker.unlockUntil(epochMs);
    } catch {
      return false;
    }
  }
  return false;
}

export function getUnlockUntil(): number {
  if (Platform.OS === 'android' && AppBlocker?.getUnlockUntil) {
    try {
      return AppBlocker.getUnlockUntil();
    } catch {
      return 0;
    }
  }
  return 0;
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

export function isEmergencyAvailable(): boolean {
  if (Platform.OS === 'android' && AppBlocker?.isEmergencyAvailable) {
    try {
      return AppBlocker.isEmergencyAvailable();
    } catch {
      return true;
    }
  }
  return true;
}

export function claimEmergencyBailout(packageName?: string | null): boolean {
  if (Platform.OS === 'android' && AppBlocker?.claimEmergencyBailout) {
    try {
      return AppBlocker.claimEmergencyBailout(packageName || null);
    } catch {
      return false;
    }
  }
  return false;
}

export function getPackageTodayUsageMs(packageName: string): number {
  if (Platform.OS !== 'android' || !AppBlocker?.getPackageTodayUsageMs) return 0;
  try {
    return AppBlocker.getPackageTodayUsageMs(packageName) || 0;
  } catch {
    return 0;
  }
}

export function getTotalTodayUsageMs(): number {
  if (Platform.OS !== 'android' || !AppBlocker?.getTotalTodayUsageMs) return 0;
  try {
    return AppBlocker.getTotalTodayUsageMs() || 0;
  } catch {
    return 0;
  }
}

export interface InstalledAppItem {
  packageName: string;
  appName: string;
  isSystemApp?: boolean;
  appIconBase64?: string;
}

export async function getInstalledApps(): Promise<InstalledAppItem[]> {
  if (Platform.OS !== 'android' || !AppBlocker?.getInstalledApps) return [];
  try {
    return await AppBlocker.getInstalledApps();
  } catch {
    return [];
  }
}

export async function isAppInstalled(packageName: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !AppBlocker?.isAppInstalled) return false;
  try {
    return await AppBlocker.isAppInstalled(packageName);
  } catch {
    return false;
  }
}

export function showTestOverlay(targetPackage?: string): boolean {
  if (Platform.OS !== 'android' || !AppBlocker?.showTestOverlay) return false;
  try {
    return AppBlocker.showTestOverlay(targetPackage || 'com.instagram.android');
  } catch {
    return false;
  }
}

export default {
  hasUsagePermission,
  hasOverlayPermission,
  hasBatteryOptimizationExemption,
  requestUsagePermission,
  requestOverlayPermission,
  requestBatteryOptimizationExemption,
  startMonitoring,
  stopMonitoring,
  setRestrictedPackages,
  setAppBudget,
  getAppBudget,
  temporaryUnlock,
  unlockUntil,
  getUnlockUntil,
  isCurrentlyUnlocked,
  isEmergencyAvailable,
  claimEmergencyBailout,
  getPackageTodayUsageMs,
  getTotalTodayUsageMs,
  showTestOverlay,
  getInstalledApps,
  isAppInstalled,
};
