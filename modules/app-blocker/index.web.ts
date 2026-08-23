export async function hasUsagePermission(): Promise<boolean> {
  return true;
}

export async function hasOverlayPermission(): Promise<boolean> {
  return true;
}

export function requestUsagePermission(): void {}
export function requestOverlayPermission(): void {}
export function startMonitoring(restrictedPackages: string[]): void {}
export function stopMonitoring(): void {}
export function setRestrictedPackages(restrictedPackages: string[]): void {}

export default {
  hasUsagePermission,
  hasOverlayPermission,
  requestUsagePermission,
  requestOverlayPermission,
  startMonitoring,
  stopMonitoring,
  setRestrictedPackages,
};
