export interface TimePackage {
  id: string;
  durationMinutes: number;
  coinCost: number;
  label: string;
  description: string;
}

export interface ScreenTimeSession {
  id?: string | number;
  packageName: string;
  appName: string;
  durationMs: number;
  startTime: string;
  endTime?: string | null;
  targetEndEpoch: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
}

export type PurchaseResult = {
  success: boolean;
  session?: ScreenTimeSession;
  error?: string;
};
