import { NativeModules, Platform } from 'react-native';
import { IAppBlockerDriver, InstalledAppItem } from '../types';

const NativeAppBlocker = NativeModules.AppBlocker;

export class NativeAppBlockerDriver implements IAppBlockerDriver {
  async hasUsagePermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeAppBlocker) return false;
    try {
      return await NativeAppBlocker.hasUsagePermission();
    } catch {
      return false;
    }
  }

  async hasOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeAppBlocker) return false;
    try {
      return await NativeAppBlocker.hasOverlayPermission();
    } catch {
      return false;
    }
  }

  requestUsagePermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      NativeAppBlocker.requestUsagePermission();
    }
  }

  requestOverlayPermission(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      NativeAppBlocker.requestOverlayPermission();
    }
  }

  startMonitoring(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      NativeAppBlocker.startMonitoring(restrictedPackages);
    }
  }

  stopMonitoring(): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      NativeAppBlocker.stopMonitoring();
    }
  }

  setRestrictedPackages(restrictedPackages: string[]): void {
    if (Platform.OS === 'android' && NativeAppBlocker) {
      NativeAppBlocker.setRestrictedPackages(restrictedPackages);
    }
  }

  async getInstalledApps(): Promise<InstalledAppItem[]> {
    if (Platform.OS !== 'android' || !NativeAppBlocker?.getInstalledApps) {
      return [];
    }
    try {
      return await NativeAppBlocker.getInstalledApps();
    } catch (e) {
      console.warn('Failed querying installed apps on Android:', e);
      return [];
    }
  }
}
