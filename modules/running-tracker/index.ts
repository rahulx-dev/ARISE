import { requireNativeModule, EventEmitter } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';

export interface RunningStats {
  distanceKm: number;
  speedKmh: number;
  paceMinKm: string;
  steps: number;
  elapsedSeconds: number;
  caloriesBurned: number;
  isVehicleSpeed: boolean;
  isTracking: boolean;
  isPaused: boolean;
}

let RunningTracker: any = null;
try {
  RunningTracker = requireNativeModule('RunningTracker');
} catch {
  RunningTracker = NativeModules.RunningTracker || null;
}

const emitter = RunningTracker ? new EventEmitter(RunningTracker) : null;

export async function startTracking(targetKm: number): Promise<boolean> {
  if (Platform.OS !== 'android' || !RunningTracker) {
    return false;
  }
  return await RunningTracker.startTracking(targetKm);
}

export function pauseTracking(): void {
  if (Platform.OS === 'android' && RunningTracker) {
    RunningTracker.pauseTracking();
  }
}

export function resumeTracking(): void {
  if (Platform.OS === 'android' && RunningTracker) {
    RunningTracker.resumeTracking();
  }
}

export async function stopTracking(): Promise<RunningStats | null> {
  if (Platform.OS !== 'android' || !RunningTracker) {
    return null;
  }
  return await RunningTracker.stopTracking();
}

export function getStats(): RunningStats {
  if (Platform.OS === 'android' && RunningTracker) {
    return RunningTracker.getStats();
  }
  return {
    distanceKm: 0,
    speedKmh: 0,
    paceMinKm: '--:--',
    steps: 0,
    elapsedSeconds: 0,
    caloriesBurned: 0,
    isVehicleSpeed: false,
    isTracking: false,
    isPaused: false,
  };
}

export async function isLocationServiceEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !RunningTracker) {
    return true;
  }
  return await RunningTracker.isLocationServiceEnabled();
}

export function addStatsListener(listener: (stats: RunningStats) => void): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }
  const sub = (emitter as any).addListener('onStatsUpdate', listener);
  return {
    remove: () => sub?.remove?.(),
  };
}

export function addCompletionListener(listener: () => void): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }
  const sub = (emitter as any).addListener('onRunCompleted', listener);
  return {
    remove: () => sub?.remove?.(),
  };
}

