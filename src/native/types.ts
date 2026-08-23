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
}

export interface IAppBlockerDriver {
  hasUsagePermission(): Promise<boolean>;
  hasOverlayPermission(): Promise<boolean>;
  requestUsagePermission(): void;
  requestOverlayPermission(): void;
  startMonitoring(restrictedPackages: string[]): void;
  stopMonitoring(): void;
  setRestrictedPackages(restrictedPackages: string[]): void;
  getInstalledApps(): Promise<InstalledAppItem[]>;
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
