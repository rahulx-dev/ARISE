import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { voiceCoach } from './voiceCoach';
import * as NativeRunningTracker from '../../modules/running-tracker';

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

// Haversine formula to compute distance between two GPS coordinates in meters (fallback)
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class RunningTrackerService {
  private nativeStatsSub: { remove: () => void } | null = null;
  private nativeCompletionSub: { remove: () => void } | null = null;

  // Fallback state
  private locationSubscription: Location.LocationSubscription | null = null;
  private pedometerSubscription: { remove: () => void } | null = null;
  private accelerometerSubscription: { remove: () => void } | null = null;
  private timerInterval: any = null;

  private lastLocation: { lat: number; lon: number; timestamp: number } | null = null;
  private totalDistanceMeters = 0;
  private hardwareSteps = 0;
  private accelerometerSteps = 0;
  private lastStepTimestamp = 0;
  private isPeakSearching = true;

  private elapsedSeconds = 0;
  private currentSpeedKmh = 0;
  private speedEmaKmh = 0;
  private vehicleSamples = 0;
  private isTracking = false;
  private isPaused = false;
  private isVehicleSpeed = false;

  private targetKm = 1.0;
  private halfwayAlertGiven = false;
  private nearFinishAlertGiven = false;
  private onUpdateCallback: ((stats: RunningStats) => void) | null = null;
  private onCompletedCallback: (() => void) | null = null;

  public async requestPermissions(): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Check if GPS / Location services are enabled at device level
      const isDeviceLocationOn = await NativeRunningTracker.isLocationServiceEnabled().catch(() => true);
      const isExpoLocationEnabled = await Location.hasServicesEnabledAsync().catch(() => true);

      if (!isDeviceLocationOn && !isExpoLocationEnabled) {
        return {
          success: false,
          error: 'GPS is disabled on your device. Please turn on Location in quick settings or device settings.',
        };
      }

      // 2. Check and request Foreground Location Permissions
      let { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        fgStatus = req.status;
      }

      if (fgStatus !== 'granted') {
        return {
          success: false,
          error: 'Location permission is required to track distance and pace during running workouts.',
        };
      }

      // 3. Optional sensors (Activity recognition & Pedometer)
      try {
        if (Pedometer.requestPermissionsAsync) {
          await Pedometer.requestPermissionsAsync();
        }
      } catch {}

      return { success: true };
    } catch (e: any) {
      console.warn('[RunningTracker] Permission request error:', e);
      return {
        success: false,
        error: e?.message || 'Unable to verify location permissions.',
      };
    }
  }

  public async startTracking(
    targetKm: number,
    onUpdate: (stats: RunningStats) => void,
    onCompleted: () => void
  ): Promise<{ success: boolean; error?: string }> {
    const permResult = await this.requestPermissions();
    if (!permResult.success) {
      return { success: false, error: permResult.error };
    }

    this.stopTracking();

    this.targetKm = targetKm;
    this.totalDistanceMeters = 0;
    this.hardwareSteps = 0;
    this.accelerometerSteps = 0;
    this.lastStepTimestamp = Date.now();
    this.elapsedSeconds = 0;
    this.currentSpeedKmh = 0;
    this.speedEmaKmh = 0;
    this.vehicleSamples = 0;
    this.lastLocation = null;
    this.halfwayAlertGiven = false;
    this.nearFinishAlertGiven = false;
    this.isTracking = true;
    this.isPaused = false;
    this.isVehicleSpeed = false;
    this.onUpdateCallback = onUpdate;
    this.onCompletedCallback = onCompleted;

    // Voice announcement
    try {
      voiceCoach.speak(`Shadow Sprint Trial initiated. Target: ${targetKm} kilometers. Begin running!`);
    } catch {}

    // Prefer Native Android RunningService (Foreground Service with persistent lockscreen tracking)
    if (Platform.OS === 'android') {
      try {
        const started = await NativeRunningTracker.startTracking(targetKm);
        if (started) {
          // Listen to live stats from native foreground service
          this.nativeStatsSub = NativeRunningTracker.addStatsListener((stats) => {
            this.handleStatsUpdate(stats);
          });

          this.nativeCompletionSub = NativeRunningTracker.addCompletionListener(() => {
            this.handleTargetReached();
          });

          return { success: true };
        }
      } catch (err) {
        console.warn('[RunningTracker] Native service start error, falling back to Expo Location:', err);
      }
    }

    // Fallback: Start Expo Location tracking
    return await this.startExpoFallbackTracking();
  }

  private handleStatsUpdate(stats: RunningStats): void {
    this.totalDistanceMeters = stats.distanceKm * 1000;
    this.currentSpeedKmh = stats.speedKmh;
    this.elapsedSeconds = stats.elapsedSeconds;
    this.isVehicleSpeed = stats.isVehicleSpeed;
    this.isPaused = stats.isPaused;

    this.checkProgress();
    if (this.onUpdateCallback) {
      this.onUpdateCallback(stats);
    }
  }

  private async startExpoFallbackTracking(): Promise<{ success: boolean; error?: string }> {
    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
          timeInterval: 1000,
        },
        (loc) => {
          if (this.isPaused || !this.isTracking) return;

          const { latitude, longitude, speed, accuracy } = loc.coords;
          const timestamp = Number(loc.timestamp);
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(timestamp) ||
            (accuracy != null && accuracy > 18)
          ) {
            return;
          }

          let rawSpeedKmh = Number.isFinite(speed) && (speed as number) > 0 ? (speed as number) * 3.6 : 0;

          if (this.lastLocation) {
            const distMeters = getDistanceInMeters(
              this.lastLocation.lat,
              this.lastLocation.lon,
              latitude,
              longitude
            );

            const timeDiffSec = Math.max(0.5, (timestamp - this.lastLocation.timestamp) / 1000);
            const calculatedSpeedKmh = (distMeters / timeDiffSec) * 3.6;

            if (rawSpeedKmh <= 0) {
              rawSpeedKmh = calculatedSpeedKmh;
            }

            if (rawSpeedKmh > 30) this.vehicleSamples += 1;
            else this.vehicleSamples = Math.max(0, this.vehicleSamples - 1);
            this.isVehicleSpeed = this.vehicleSamples >= 4;

            // Filter minor GPS stationary drift
            const isStationaryDrift = distMeters < 1.8 && rawSpeedKmh < 1.2;
            const isPhysicallyPlausible = distMeters < 80 && calculatedSpeedKmh < 35;

            if (!this.isVehicleSpeed && !isStationaryDrift && isPhysicallyPlausible) {
              this.totalDistanceMeters += distMeters;
            }
          }

          this.currentSpeedKmh = Math.max(0, Math.min(30, Math.round(rawSpeedKmh * 10) / 10));
          this.lastLocation = { lat: latitude, lon: longitude, timestamp };

          this.checkProgress();
          this.broadcast();
        }
      );
    } catch (err) {
      console.warn('[RunningTracker] Location watch failed:', err);
      this.stopTracking();
      return { success: false, error: 'Unable to start location tracking. Check location settings.' };
    }

    // Step Detector Fallback
    try {
      const isPedometerAvailable = await Pedometer.isAvailableAsync();
      if (isPedometerAvailable) {
        this.pedometerSubscription = Pedometer.watchStepCount((result) => {
          if (this.isPaused || !this.isTracking) return;
          this.hardwareSteps = result.steps;
          this.broadcast();
        });
      }
    } catch {}

    // Accelerometer Fallback
    try {
      Accelerometer.setUpdateInterval(60);
      this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
        if (this.isPaused || !this.isTracking) return;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        if (this.isPeakSearching) {
          if (magnitude > 1.25 && now - this.lastStepTimestamp > 260) {
            this.accelerometerSteps += 1;
            this.lastStepTimestamp = now;
            this.isPeakSearching = false;
            this.broadcast();
          }
        } else {
          if (magnitude < 0.9) {
            this.isPeakSearching = true;
          }
        }
      });
    } catch {}

    // Timer Interval Fallback
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.isTracking) {
        this.elapsedSeconds += 1;
        this.broadcast();
      }
    }, 1000);

    this.broadcast();
    return { success: true };
  }

  public pause(): void {
    this.isPaused = true;
    if (Platform.OS === 'android') {
      NativeRunningTracker.pauseTracking();
    }
    this.broadcast();
  }

  public resume(): void {
    this.isPaused = false;
    this.lastLocation = null;
    if (Platform.OS === 'android') {
      NativeRunningTracker.resumeTracking();
    }
    this.broadcast();
  }

  public stopTracking(): void {
    this.isTracking = false;
    this.isPaused = false;

    if (Platform.OS === 'android') {
      NativeRunningTracker.stopTracking().catch(() => {});
    }

    if (this.nativeStatsSub) {
      this.nativeStatsSub.remove();
      this.nativeStatsSub = null;
    }

    if (this.nativeCompletionSub) {
      this.nativeCompletionSub.remove();
      this.nativeCompletionSub = null;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.pedometerSubscription) {
      this.pedometerSubscription.remove();
      this.pedometerSubscription = null;
    }

    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.lastLocation = null;
    this.speedEmaKmh = 0;
    this.vehicleSamples = 0;
    this.onUpdateCallback = null;
    this.onCompletedCallback = null;
  }

  private handleTargetReached(): void {
    const cb = this.onCompletedCallback;
    this.stopTracking();
    try {
      voiceCoach.speak(`Target reached! ${this.targetKm} kilometers completed. Quest Cleared!`);
    } catch {}
    if (cb) {
      cb();
    }
  }

  private checkProgress(): void {
    const currentKm = this.totalDistanceMeters / 1000;

    // Halfway voice coaching
    if (!this.halfwayAlertGiven && currentKm >= this.targetKm / 2) {
      this.halfwayAlertGiven = true;
      try {
        const remaining = (this.targetKm - currentKm).toFixed(1);
        voiceCoach.speak(`Halfway completed! ${remaining} kilometers remaining.`);
      } catch {}
    }

    // 90% near finish alert
    if (!this.nearFinishAlertGiven && currentKm >= this.targetKm * 0.9) {
      this.nearFinishAlertGiven = true;
      try {
        voiceCoach.speak(`Final stretch! Push through to the finish!`);
      } catch {}
    }

    // Target Reached!
    if (currentKm >= this.targetKm) {
      this.handleTargetReached();
    }
  }

  private getPaceString(): string {
    const km = this.totalDistanceMeters / 1000;
    if (km <= 0.05 || this.elapsedSeconds <= 5 || this.currentSpeedKmh <= 0.5 || this.isVehicleSpeed) return '--:--';
    const paceSecondsPerKm = this.elapsedSeconds / km;
    if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm < 120 || paceSecondsPerKm > 3600) return '--:--';
    const mins = Math.floor(paceSecondsPerKm / 60);
    const secs = Math.floor(paceSecondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private broadcast(): void {
    if (!this.onUpdateCallback) return;

    const km = Math.round((this.totalDistanceMeters / 1000) * 100) / 100;
    const calories = Number.isFinite(km) ? Math.max(0, Math.min(5000, Math.round(km * 62))) : 0;
    const strideEstimatedSteps = Math.round(this.totalDistanceMeters / 0.76);
    const effectiveTotalSteps = Math.max(this.hardwareSteps, this.accelerometerSteps, strideEstimatedSteps);

    this.onUpdateCallback({
      distanceKm: km,
      speedKmh: this.currentSpeedKmh,
      paceMinKm: this.getPaceString(),
      steps: effectiveTotalSteps,
      elapsedSeconds: this.elapsedSeconds,
      caloriesBurned: calories,
      isVehicleSpeed: this.isVehicleSpeed,
      isTracking: this.isTracking,
      isPaused: this.isPaused,
    });
  }
}

export const runningTrackerService = new RunningTrackerService();
