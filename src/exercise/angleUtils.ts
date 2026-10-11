/**
 * ARISE — Joint Angle & Landmark Utilities (MediaPipe 33 Landmark Compatible)
 * 
 * Computes 3D joint angles using metric world coordinates (meters) when available,
 * falling back to 3D normalized coords. Applies adaptive One Euro filtering to
 * completely eliminate landmark jitter before angle calculations.
 */

export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
  confidence?: number;
  worldX?: number;
  worldY?: number;
  worldZ?: number;
  index?: number;
}

/**
 * Returns visibility or confidence score in range 0..1.
 */
export function getConfidence(p?: Point): number {
  if (!p) return 0;
  if (typeof p.visibility === 'number') return p.visibility;
  if (typeof p.confidence === 'number') return p.confidence;
  return 0;
}

/**
 * Check if a keypoint has sufficient visibility/confidence.
 */
export function isConfident(point: Point, threshold: number = 0.5): boolean {
  return getConfidence(point) >= threshold;
}

/**
 * Check if all required keypoints have sufficient visibility/confidence.
 */
export function areAllConfident(
  points: Point[],
  threshold: number = 0.5
): boolean {
  return points.every((p) => isConfident(p, threshold));
}

/**
 * Calculate the 3D angle at vertex B formed by segments BA and BC.
 * Uses 3D world metric coordinates (meters) if available, which eliminates
 * distortion from camera perspective, distance, or angle.
 * Returns angle in degrees (0..180).
 */
export function calculateAngle3D(a: Point, b: Point, c: Point): number {
  const hasWorld =
    typeof a.worldX === 'number' && typeof a.worldY === 'number' &&
    typeof b.worldX === 'number' && typeof b.worldY === 'number' &&
    typeof c.worldX === 'number' && typeof c.worldY === 'number';

  const ax = hasWorld ? a.worldX! : a.x;
  const ay = hasWorld ? a.worldY! : a.y;
  const az = hasWorld ? (a.worldZ ?? 0) : (a.z ?? 0);

  const bx = hasWorld ? b.worldX! : b.x;
  const by = hasWorld ? b.worldY! : b.y;
  const bz = hasWorld ? (b.worldZ ?? 0) : (b.z ?? 0);

  const cx = hasWorld ? c.worldX! : c.x;
  const cy = hasWorld ? c.worldY! : c.y;
  const cz = hasWorld ? (c.worldZ ?? 0) : (c.z ?? 0);

  // Vector BA
  const v1x = ax - bx;
  const v1y = ay - by;
  const v1z = az - bz;

  // Vector BC
  const v2x = cx - bx;
  const v2y = cy - by;
  const v2z = cz - bz;

  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

  if (mag1 < 1e-6 || mag2 < 1e-6) return 0;

  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

/**
 * Backward-compatible calculateAngle delegating to calculateAngle3D.
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  return calculateAngle3D(a, b, c);
}

/**
 * 2D Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 3D distance between two points.
 */
export function distance3D(a: Point, b: Point, preferWorld: boolean = true): number {
  if (preferWorld && typeof a.worldX === 'number' && typeof b.worldX === 'number') {
    return Math.hypot(
      (a.worldX ?? 0) - (b.worldX ?? 0),
      (a.worldY ?? 0) - (b.worldY ?? 0),
      (a.worldZ ?? 0) - (b.worldZ ?? 0)
    );
  }
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

/**
 * Midpoint between two points.
 */
export function midpoint(a: Point, b: Point): Point {
  const result: Point = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    visibility: Math.min(getConfidence(a), getConfidence(b)),
    confidence: Math.min(getConfidence(a), getConfidence(b)),
  };
  if (typeof a.z === 'number' && typeof b.z === 'number') {
    result.z = (a.z + b.z) / 2;
  }
  if (typeof a.worldX === 'number' && typeof b.worldX === 'number') {
    result.worldX = (a.worldX + b.worldX) / 2;
    result.worldY = ((a.worldY ?? 0) + (b.worldY ?? 0)) / 2;
    result.worldZ = ((a.worldZ ?? 0) + (b.worldZ ?? 0)) / 2;
  }
  return result;
}

/**
 * Body alignment deviation from 180 degrees straight line.
 */
export function bodyAlignmentDeviation(
  shoulder: Point,
  hip: Point,
  ankle: Point
): number {
  const angle = calculateAngle3D(shoulder, hip, ankle);
  return Math.abs(180 - angle);
}

/**
 * Exponential moving average for smoothing single float values.
 */
export function smoothAngle(
  currentAngle: number,
  previousAngle: number,
  alpha: number = 0.75
): number {
  if (previousAngle === 0) return currentAngle;
  return alpha * currentAngle + (1 - alpha) * previousAngle;
}

/**
 * Internal low-pass filter for One Euro filter.
 */
class LowPassFilter {
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.s === null) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.s;
    }
    return this.s;
  }

  lastValue(): number | null {
    return this.s;
  }

  reset(): void {
    this.s = null;
  }
}

/**
 * One Euro Filter
 * Adaptive low-pass filter for noise reduction in human pose tracking.
 * Filters jitter when moving slowly, preserves responsiveness during rapid movement.
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return this.xFilter.filter(value, 1.0);
    }

    const dt = Math.max(1e-3, (timestampMs - this.lastTime) / 1000.0);
    this.lastTime = timestampMs;
    const rate = 1.0 / dt;

    const prevX = this.xFilter.lastValue() ?? value;
    const dx = (value - prevX) * rate;
    const edx = this.dxFilter.filter(dx, this.alpha(rate, this.dCutoff));

    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(rate, cutoff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Multi-coordinate One Euro filter for smoothing all 33 pose landmarks.
 */
export class PoseLandmarkFilter {
  private filters: Map<string, OneEuroFilter> = new Map();

  private getFilter(key: string): OneEuroFilter {
    let f = this.filters.get(key);
    if (!f) {
      f = new OneEuroFilter(1.2, 0.015, 1.0);
      this.filters.set(key, f);
    }
    return f;
  }

  filterLandmarks(landmarks: Point[], timestampMs: number): Point[] {
    return landmarks.map((lm, idx) => {
      const fx = this.getFilter(`${idx}_x`).filter(lm.x, timestampMs);
      const fy = this.getFilter(`${idx}_y`).filter(lm.y, timestampMs);
      const fz = typeof lm.z === 'number'
        ? this.getFilter(`${idx}_z`).filter(lm.z, timestampMs)
        : undefined;

      const result: Point = {
        ...lm,
        x: fx,
        y: fy,
        z: fz,
      };

      if (typeof lm.worldX === 'number') {
        result.worldX = this.getFilter(`${idx}_wx`).filter(lm.worldX, timestampMs);
        result.worldY = typeof lm.worldY === 'number'
          ? this.getFilter(`${idx}_wy`).filter(lm.worldY, timestampMs)
          : undefined;
        result.worldZ = typeof lm.worldZ === 'number'
          ? this.getFilter(`${idx}_wz`).filter(lm.worldZ, timestampMs)
          : undefined;
      }

      return result;
    });
  }

  reset(): void {
    this.filters.forEach((f) => f.reset());
    this.filters.clear();
  }
}
