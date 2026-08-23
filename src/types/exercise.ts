export type KeypointName = 
  | 'nose' 
  | 'left_eye' 
  | 'right_eye' 
  | 'left_ear' 
  | 'right_ear' 
  | 'left_shoulder' 
  | 'right_shoulder' 
  | 'left_elbow' 
  | 'right_elbow' 
  | 'left_wrist' 
  | 'right_wrist' 
  | 'left_hip' 
  | 'right_hip' 
  | 'left_knee' 
  | 'right_knee' 
  | 'left_ankle' 
  | 'right_ankle';

export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
  name: KeypointName;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

export type RepState = 'IDLE' | 'READY' | 'UP' | 'DOWN';
export type PlankState = 'IDLE' | 'READY' | 'HOLDING' | 'DROPPED';

export interface ExerciseConfig {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  targetKeypoints: KeypointName[];
  upThreshold: number;
  downThreshold: number;
  minConfidence: number;
  debounceMs: number;
  defaultTarget: number;
  maxTarget: number;
  coinsPerRep: number;
  xpPerRep: number;
  statType: string;
}

export interface ExerciseSession {
  id: string;
  exerciseType: string;
  target: number;
  completedReps: number;
  durationSeconds: number;
  formScore?: number;
  timestamp: string;
  questId?: string;
}

export interface FormFeedback {
  message: string;
  type: 'good' | 'warning' | 'error';
  detail?: string;
}
