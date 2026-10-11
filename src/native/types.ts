/**
 * ARISE Native Driver Interface Contracts
 * 
 * Defines standard interfaces for App Blocker, Screen Timer, and Pose Detection.
 * Allows seamless switching between Real Kotlin Native Modules and Mock Preview Drivers.
 */

export interface InstalledAppItem {
  packageName: string;
  appName: string;
  isSystemApp?: boolean;
  icon?: string;
  appIconBase64?: string;
}

export interface IAppBlockerDriver {
  hasUsagePermission(): Promise<boolean>;
  hasOverlayPermission(): Promise<boolean>;
  hasBatteryOptimizationExemption?(): Promise<boolean>;
  requestUsagePermission(): void;
  requestOverlayPermission(): void;
  requestBatteryOptimizationExemption?(): void;
  startMonitoring(restrictedPackages: string[]): void;
  stopMonitoring(): void;
  setRestrictedPackages(restrictedPackages: string[]): void;
  setAppBudget(packageName: string | null, budgetMinutes: number): void;
  getAppBudget?(packageName?: string | null): number;
  getInstalledApps(): Promise<InstalledAppItem[]>;
  temporaryUnlock(durationMs: number): boolean;
  unlockUntil(epochMs: number): boolean;
  getUnlockUntil?(): number;
  isCurrentlyUnlocked(): boolean;
  isEmergencyAvailable?(): boolean;
  claimEmergencyBailout?(packageName?: string | null): boolean;
  isAppInstalled?(packageName: string): Promise<boolean>;
  getPackageTodayUsageMs(packageName: string): number;
  getTotalTodayUsageMs(): number;
  simulateBlockEvent?(packageName: string): void;
}

export interface IScreenTimerDriver {
  startSessionTimer(durationMs: number, label: string): void;
  cancelSessionTimer(): void;
  getRemainingMillis(): Promise<number>;
}

export interface IPoseDetectorDriver {
  isAvailable(): boolean;
  startDetection(): void;
  stopDetection(): void;
}
