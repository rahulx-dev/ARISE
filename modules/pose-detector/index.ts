import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';

// Real-time CameraX native view with built-in ML Kit pose streaming
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

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  confidence: number;
  type: number;
  frameWidth?: number;
  frameHeight?: number;
}

export interface MoveNetKeypoint {
  x: number;
  y: number;
  confidence: number;
}

export const ML_KIT_TO_MOVENET_MAP: Record<number, number | null> = {
  0: 0,
  1: null,
  2: 1,
  3: null,
  4: null,
  5: 2,
  6: null,
  7: 3,
  8: 4,
  9: null,
  10: null,
  11: 5,
  12: 6,
  13: 7,
  14: 8,
  15: 9,
  16: 10,
  17: null,
  18: null,
  19: null,
  20: null,
  21: null,
  22: null,
  23: 11,
  24: 12,
  25: 13,
  26: 14,
  27: 15,
  28: 16
};

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

export function convertToMoveNetKeypoints(landmarks: PoseLandmark[]): MoveNetKeypoint[] {
  const result: MoveNetKeypoint[] = Array.from({ length: 17 }, () => ({ x: 0, y: 0, confidence: 0 }));
  
  for (const landmark of landmarks) {
    const moveNetIndex = ML_KIT_TO_MOVENET_MAP[landmark.type];
    if (moveNetIndex !== undefined && moveNetIndex !== null) {
      const confidence = Number.isFinite(landmark.confidence)
        ? Math.max(0, Math.min(1, landmark.confidence))
        : 0;
      // A detector may emit a duplicate point while tracking a transition.
      // Keep the strongest observation rather than replacing it with a weak
      // point and accidentally making the exercise appear invalid.
      if (confidence >= result[moveNetIndex].confidence) {
        result[moveNetIndex] = {
          x: Number.isFinite(landmark.x) ? Math.max(0, Math.min(1, landmark.x)) : 0,
          y: Number.isFinite(landmark.y) ? Math.max(0, Math.min(1, landmark.y)) : 0,
          confidence
        };
      }
    }
  }
  
  return result;
}
