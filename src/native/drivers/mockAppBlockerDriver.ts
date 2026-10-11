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
  private emergencyAvailable: boolean = true;
  private unlockedUntilEpoch: number = 0;
  private appBudgets: Record<string, number> = {};

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
    console.log('[PREVIEW MODE] Simulated Usage Access Permission Granted');
  }

  requestOverlayPermission(): void {
    this.overlayPermGranted = true;
    console.log('[PREVIEW MODE] Simulated Draw Over Other Apps Permission Granted');
  }

  requestBatteryOptimizationExemption(): void {
    console.log('[PREVIEW MODE] Simulated Battery Optimization Exemption Granted');
  }

  startMonitoring(restrictedPackages: string[]): void {
    this.isMonitoring = true;
    this.restrictedPackages = [...restrictedPackages];
    console.log(`[PREVIEW MODE] Monitoring ${restrictedPackages.length} apps in simulation`);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('[PREVIEW MODE] Monitoring paused in simulation');
  }

  setRestrictedPackages(restrictedPackages: string[]): void {
    this.restrictedPackages = [...restrictedPackages];
  }

  setAppBudget(packageName: string | null, budgetMinutes: number): void {
    if (packageName) {
      this.appBudgets[packageName] = budgetMinutes;
    } else {
      this.appBudgets['global'] = budgetMinutes;
    }
    console.log(`[PREVIEW MODE] setAppBudget for ${packageName || 'global'}: ${budgetMinutes}m`);
  }

  getAppBudget(packageName?: string | null): number {
    if (packageName && this.appBudgets[packageName] !== undefined) {
      return this.appBudgets[packageName];
    }
    return this.appBudgets['global'] ?? 30;
  }

  async isAppInstalled(packageName: string): Promise<boolean> {
    return MOCK_INSTALLED_APPS.some((a) => a.packageName === packageName);
  }

  async getInstalledApps(): Promise<InstalledAppItem[]> {
    return MOCK_INSTALLED_APPS;
  }

  temporaryUnlock(durationMs: number): boolean {
    this.unlockedUntilEpoch = Date.now() + durationMs;
    console.log(`[PREVIEW MODE] temporaryUnlock for ${durationMs}ms`);
    return true;
  }

  unlockUntil(epochMs: number): boolean {
    this.unlockedUntilEpoch = epochMs;
    console.log(`[PREVIEW MODE] unlockUntil ${epochMs}`);
    return true;
  }

  getUnlockUntil(): number {
    return this.unlockedUntilEpoch;
  }

  isCurrentlyUnlocked(): boolean {
    return Date.now() < this.unlockedUntilEpoch;
  }

  isEmergencyAvailable(): boolean {
    return this.emergencyAvailable;
  }

  claimEmergencyBailout(packageName?: string | null): boolean {
    if (!this.emergencyAvailable) return false;
    this.emergencyAvailable = false;
    this.unlockedUntilEpoch = Date.now() + 5 * 60 * 1000;
    console.log(`[PREVIEW MODE] Emergency bailout claimed for ${packageName || 'app'}, 5 min added to budget`);
    return true;
  }

  getPackageTodayUsageMs(_packageName: string): number {
    return 15 * 60 * 1000;
  }

  getTotalTodayUsageMs(): number {
    return 45 * 60 * 1000;
  }

  simulateBlockEvent(packageName: string): void {
    console.log(`[PREVIEW MODE] Simulating block overlay for ${packageName}`);
  }
}
