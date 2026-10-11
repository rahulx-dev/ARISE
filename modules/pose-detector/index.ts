import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';

// Real-time CameraX native view with built-in MediaPipe pose streaming
export const PoseCameraView = Platform.OS === 'android'
  ? requireNativeViewManager('PoseDetector')
  : null;

export interface PoseCameraViewProps {
  style?: any;
  facing?: 'front' | 'back';
  enableTorch?: boolean;
  onPoseDetected?: (event: { nativeEvent: { landmarks: PoseLandmark[] } }) => void;
}

let PoseDetector: any = null;
try {
  PoseDetector = requireNativeModule('PoseDetector');
} catch {
  PoseDetector = NativeModules.PoseDetector || null;
}

/**
 * Standard MediaPipe 33 Pose Landmark indices
 */
export enum LandmarkIndex {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

export interface PoseLandmark {
  index: number;
  x: number;          // Normalized 2D [0, 1]
  y: number;          // Normalized 2D [0, 1]
  z: number;          // Depth
  visibility: number; // 0..1 confidence in landmark being visible
  presence: number;   // 0..1 confidence in landmark being present
  worldX?: number;    // Metric 3D x in meters (origin at hip center)
  worldY?: number;    // Metric 3D y in meters
  worldZ?: number;    // Metric 3D z in meters
  frameWidth?: number;
  frameHeight?: number;
}

export async function initialize(): Promise<boolean> {
  if (Platform.OS !== 'android' || !PoseDetector) {
    return false;
  }
  return await PoseDetector.initialize();
}

export async function processBase64Frame(base64: string, facing: string = 'front'): Promise<PoseLandmark[]> {
  if (Platform.OS !== 'android' || !PoseDetector) {
    return [];
  }
  return await PoseDetector.processBase64Frame(base64, facing);
}

export function muteShutter(): void {
  if (Platform.OS === 'android' && PoseDetector?.muteShutter) {
    try { PoseDetector.muteShutter(); } catch {}
  }
}

export function unmuteShutter(): void {
  if (Platform.OS === 'android' && PoseDetector?.unmuteShutter) {
    try { PoseDetector.unmuteShutter(); } catch {}
  }
}

export function release(): void {
  if (Platform.OS !== 'android' || !PoseDetector) {
    return;
  }
  PoseDetector.release();
}
