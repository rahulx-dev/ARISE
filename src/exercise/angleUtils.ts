/**
 * ARISE — Joint Angle Calculation Utilities
 * 
 * Calculates angles between body keypoints for exercise detection.
 * All angles are in degrees (0-180).
 */

export interface Point {
  x: number;
  y: number;
  confidence: number;
}

/**
 * Calculate the angle at point B formed by segments BA and BC.
 * Returns angle in degrees (0-180).
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Calculate distance between two points.
 */
export function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Calculate midpoint between two points.
 */
export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    confidence: Math.min(a.confidence, b.confidence),
  };
}

/**
 * Check if a keypoint has sufficient confidence to be used.
 */
export function isConfident(point: Point, threshold: number = 0.3): boolean {
  return point.confidence >= threshold;
}

/**
 * Check if all required keypoints have sufficient confidence.
 */
export function areAllConfident(
  points: Point[],
  threshold: number = 0.3
): boolean {
  return points.every((p) => isConfident(p, threshold));
}

/**
 * Calculate the angle of body alignment (straightness).
 * Used for plank detection and form checking.
 * Returns how far the body deviates from a straight line (0 = perfectly straight).
 */
export function bodyAlignmentDeviation(
  shoulder: Point,
  hip: Point,
  ankle: Point
): number {
  const angle = calculateAngle(shoulder, hip, ankle);
  return Math.abs(180 - angle);
}

/**
 * Smooth angle values to reduce jitter.
 * Uses exponential moving average.
 */
export function smoothAngle(
  currentAngle: number,
  previousAngle: number,
  alpha: number = 0.7
): number {
  if (previousAngle === 0) return currentAngle;
  return alpha * currentAngle + (1 - alpha) * previousAngle;
}

/**
 * Normalize keypoint coordinates from model output (0-1) to screen coordinates.
 */
export function normalizeKeypoints(
  keypoints: Point[],
  screenWidth: number,
  screenHeight: number,
  isFrontCamera: boolean = true
): Point[] {
  return keypoints.map((kp) => ({
    x: isFrontCamera
      ? screenWidth - kp.x * screenWidth
      : kp.x * screenWidth,
    y: kp.y * screenHeight,
    confidence: kp.confidence,
  }));
}
