import { IAppBlockerDriver, InstalledAppItem } from '../types';

const MOCK_INSTALLED_APPS: InstalledAppItem[] = [
  { packageName: 'com.instagram.android', appName: 'Instagram', icon: 'instagram', isSystemApp: false },
  { packageName: 'com.google.android.youtube', appName: 'YouTube', icon: 'youtube', isSystemApp: false },
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', icon: 'music-box', isSystemApp: false },
  { packageName: 'com.reddit.frontpage', appName: 'Reddit', icon: 'reddit', isSystemApp: false },
  { packageName: 'com.twitter.android', appName: 'X / Twitter', icon: 'twitter', isSystemApp: false },
  { packageName: 'com.facebook.katana', appName: 'Facebook', icon: 'facebook', isSystemApp: false },
  { packageName: 'com.snapchat.android', appName: 'Snapchat', icon: 'snapchat', isSystemApp: false },
  { packageName: 'com.netflix.mediaclient', appName: 'Netflix', icon: 'movie-open', isSystemApp: false },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', icon: 'whatsapp', isSystemApp: false },
  { packageName: 'org.telegram.messenger', appName: 'Telegram', icon: 'send-circle-outline', isSystemApp: false },
  { packageName: 'com.android.chrome', appName: 'Google Chrome', icon: 'google-chrome', isSystemApp: true },
  { packageName: 'com.spotify.music', appName: 'Spotify', icon: 'spotify', isSystemApp: false },
];

export class MockAppBlockerDriver implements IAppBlockerDriver {
  private isMonitoring: boolean = false;
  private restrictedPackages: string[] = [];
  private usagePermGranted: boolean = false;
  private overlayPermGranted: boolean = false;
  private onBlockSimulatedCallback?: (pkg: string) => void;

  async hasUsagePermission(): Promise<boolean> {
    return this.usagePermGranted;
  }

  async hasOverlayPermission(): Promise<boolean> {
    return this.overlayPermGranted;
  }

  async hasBatteryOptimizationExemption(): Promise<boolean> {
    return true;
  }

  requestUsagePermission(): void {
    this.usagePermGranted = true;
    console.log('⚡ [PREVIEW MODE] Simulated Usage Access Permission Granted');
  }

  requestOverlayPermission(): void {
    this.overlayPermGranted = true;
    console.log('⚡ [PREVIEW MODE] Simulated Draw Over Other Apps Permission Granted');
  }

  requestBatteryOptimizationExemption(): void {
    console.log('⚡ [PREVIEW MODE] Simulated Battery Optimization Exemption Granted');
  }

  startMonitoring(restrictedPackages: string[]): void {
    this.isMonitoring = true;
    this.restrictedPackages = [...restrictedPackages];
    console.log(`⚡ [PREVIEW MODE] Monitoring ${restrictedPackages.length} apps in simulation`);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('⚡ [PREVIEW MODE] Monitoring paused in simulation');
  }

  setRestrictedPackages(restrictedPackages: string[]): void {
    this.restrictedPackages = [...restrictedPackages];
  }

  setAppBudget(packageName: string | null, budgetMinutes: number): void {
    console.log(`⚡ [PREVIEW MODE] setAppBudget for ${packageName || 'all'}: ${budgetMinutes}m`);
  }

  async getInstalledApps(): Promise<InstalledAppItem[]> {
    return MOCK_INSTALLED_APPS;
  }

  temporaryUnlock(durationMs: number): boolean {
    console.log(`⚡ [PREVIEW MODE] temporaryUnlock for ${durationMs}ms`);
    return true;
  }

  unlockUntil(epochMs: number): boolean {
    console.log(`⚡ [PREVIEW MODE] unlockUntil ${epochMs}`);
    return true;
  }

  isCurrentlyUnlocked(): boolean {
    return false;
  }
}
