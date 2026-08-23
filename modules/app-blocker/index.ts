import { NativeModules, Platform } from 'react-native';

const AppBlocker = NativeModules.AppBlocker || {
  hasUsagePermission: async () => false,
  hasOverlayPermission: async () => false,
  requestUsagePermission: () => {},
  requestOverlayPermission: () => {},
  startMonitoring: (restrictedPackages: string[]) => {},
  stopMonitoring: () => {},
  setRestrictedPackages: (restrictedPackages: string[]) => {},
};

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

export default {
  hasUsagePermission,
  hasOverlayPermission,
  requestUsagePermission,
  requestOverlayPermission,
  startMonitoring,
  stopMonitoring,
  setRestrictedPackages,
};
