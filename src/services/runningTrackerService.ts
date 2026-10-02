import * as Location from 'expo-location';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { voiceCoach } from './voiceCoach';

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

// Haversine formula to compute distance between two GPS coordinates in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the Earth in meters
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
  private locationSubscription: Location.LocationSubscription | null = null;
  private pedometerSubscription: { remove: () => void } | null = null;
  private accelerometerSubscription: { remove: () => void } | null = null;
  private timerInterval: any = null;

  private lastLocation: { lat: number; lon: number; timestamp: number } | null = null;
  private totalDistanceMeters = 0;
  private hardwareSteps = 0;
  private accelerometerSteps = 0;
  private lastStepTimestamp = 0;
  private lastAccelMagnitude = 1.0;
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

  public async requestPermissions(): Promise<boolean> {
    try {
      let { status: locStatus } = await Location.getForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        ({ status: locStatus } = await Location.requestForegroundPermissionsAsync());
      }
      try {
        if (Pedometer.requestPermissionsAsync) {
          await Pedometer.requestPermissionsAsync();
        }
      } catch {}

      if (locStatus !== 'granted' || !(await Location.hasServicesEnabledAsync())) {
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[RunningTracker] Permission request error:', e);
      return false;
    }
  }

  public async startTracking(
    targetKm: number,
    onUpdate: (stats: RunningStats) => void,
    onCompleted: () => void
  ): Promise<{ success: boolean; error?: string }> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return { success: false, error: 'Location permission is required for running track.' };
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

    // 1. Start GPS stream
    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2, // Update every 2 meters
          timeInterval: 1000,  // Update every 1 second
        },
        (loc) => {
          if (this.isPaused || !this.isTracking) return;

          const { latitude, longitude, speed, accuracy } = loc.coords;
          const timestamp = Number(loc.timestamp);
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(timestamp) ||
            (accuracy != null && accuracy > 20)
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

            const timeDiffSec = Math.max(1, (timestamp - this.lastLocation.timestamp) / 1000);
            const calculatedSpeedKmh = (distMeters / timeDiffSec) * 3.6;

            if (rawSpeedKmh <= 0) {
              rawSpeedKmh = calculatedSpeedKmh;
            }

            // Reject impossible jumps and require multiple high-speed samples before
            // flagging a vehicle. This avoids counting GPS spikes as distance.
            const plausibleSpeedKmh = Math.min(60, Math.max(0, rawSpeedKmh));
            this.speedEmaKmh = this.speedEmaKmh === 0
              ? plausibleSpeedKmh
              : this.speedEmaKmh * 0.25 + plausibleSpeedKmh * 0.75;
            if (this.speedEmaKmh > 25) this.vehicleSamples += 1;
            else this.vehicleSamples = Math.max(0, this.vehicleSamples - 1);
            this.isVehicleSpeed = this.vehicleSamples >= 5;

            // Filter minor GPS noise/jitter
            const isJitter = distMeters < 2.5 && timeDiffSec <= 2;
            if (!this.isVehicleSpeed && !isJitter && distMeters < 100 && calculatedSpeedKmh < 30) {
              this.totalDistanceMeters += distMeters;
            }
            if (this.isVehicleSpeed) {
              this.currentSpeedKmh = 0;
              this.broadcast();
              this.lastLocation = { lat: latitude, lon: longitude, timestamp };
              return;
            }
          }

          if (!this.lastLocation) {
            this.speedEmaKmh = Math.min(30, Math.max(0, rawSpeedKmh));
          }
          this.currentSpeedKmh = Math.max(0, Math.min(30, Math.round(this.speedEmaKmh * 10) / 10));
          this.lastLocation = { lat: latitude, lon: longitude, timestamp };

          this.checkProgress();
          this.broadcast();
        }
      );
    } catch (err) {
      console.warn('[RunningTracker] Location watch failed:', err);
      this.stopTracking();
      return { success: false, error: 'Unable to start location tracking. Check that location services are enabled and try again.' };
    }

    // 2. Start Hardware Pedometer
    try {
      const isPedometerAvailable = await Pedometer.isAvailableAsync();
      if (isPedometerAvailable) {
        this.pedometerSubscription = Pedometer.watchStepCount((result) => {
          if (this.isPaused || !this.isTracking) return;
          this.hardwareSteps = result.steps;
          this.broadcast();
        });
      }
    } catch (pedErr) {
      console.warn('[RunningTracker] Pedometer watch warning:', pedErr);
    }

    // 3. Accelerometer High-Accuracy Step Detector (Works on 100% of devices)
    try {
      Accelerometer.setUpdateInterval(60); // ~16 updates per sec
      this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
        if (this.isPaused || !this.isTracking) return;

        // Compute 3D Acceleration magnitude (1.0 = normal 1g gravity)
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // Step peak detection: Human running/jogging footfall impact creates a spike > 1.25g followed by a trough < 0.85g
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

        this.lastAccelMagnitude = magnitude;
      });
    } catch (accelErr) {
      console.warn('[RunningTracker] Accelerometer step detection warning:', accelErr);
    }

    // 4. Start Timer Interval (1 second ticks)
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
    this.broadcast();
  }

  public resume(): void {
    this.isPaused = false;
    this.lastLocation = null;
    this.broadcast();
  }

  public stopTracking(): void {
    this.isTracking = false;
    this.isPaused = false;

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
      const completedCallback = this.onCompletedCallback;
      this.stopTracking();
      try {
        voiceCoach.speak(`Target reached! ${this.targetKm} kilometers completed. Quest Cleared!`);
      } catch {}
      if (completedCallback) {
        completedCallback();
      }
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
    const calories = Number.isFinite(km) ? Math.max(0, Math.min(5000, Math.round(km * 65))) : 0;

    // Dynamic Step Resolution:
    // Stride estimation = distance (meters) / 0.76 meters average running stride
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
