import { create } from 'zustand';
import { ScreenTimeSession } from '../types';
import { sessionRepository } from '../database/repositories/sessionRepository';

interface TimerState {
  activeSession: ScreenTimeSession | null;
  remainingMs: number;
  isActive: boolean;

  startSession: (session: ScreenTimeSession) => void;
  updateRemaining: (ms: number) => void;
  endSession: () => Promise<void>;
  loadActiveSession: () => Promise<void>;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeSession: null,
  remainingMs: 0,
  isActive: false,

  startSession: (session: ScreenTimeSession) => {
    set({
      activeSession: session,
      remainingMs: session.durationMs,
      isActive: true,
    });
  },

  updateRemaining: (ms: number) => {
    set({ remainingMs: Math.max(0, ms) });
  },

  endSession: async () => {
    const { activeSession } = get();
    if (activeSession && activeSession.id) {
      try {
        const numId =
          typeof activeSession.id === 'number'
            ? activeSession.id
            : parseInt(String(activeSession.id), 10);
        await sessionRepository.completeSession(numId);
      } catch (error) {
        console.error('Failed to end screen time session', error);
      }
    }
    set({
      activeSession: null,
      remainingMs: 0,
      isActive: false,
    });
  },

  loadActiveSession: async () => {
    try {
      const record = await sessionRepository.getActiveSession();
      if (record) {
        const remaining = record.targetEndEpoch - Date.now();
        if (remaining > 0) {
          const session: ScreenTimeSession = {
            id: record.id,
            packageName: record.packageName,
            appName: record.appName,
            durationMs: record.durationMs,
            startTime: record.startTime,
            endTime: record.endTime || undefined,
            targetEndEpoch: record.targetEndEpoch,
            status: record.status as any,
          };
          set({
            activeSession: session,
            remainingMs: remaining,
            isActive: true,
          });
        } else {
          await sessionRepository.expireSession(record.id);
          set({ activeSession: null, remainingMs: 0, isActive: false });
        }
      }
    } catch (error) {
      console.error('Failed to load active session', error);
    }
  },
}));
