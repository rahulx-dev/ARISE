import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  targetMs: number;
  onComplete?: () => void;
  onTick?: (remainingMs: number) => void;
  autoStart?: boolean;
}

export function useTimer({ targetMs, onComplete, onTick, autoStart = false }: UseTimerOptions) {
  const [remainingMs, setRemainingMs] = useState(targetMs);
  const [isRunning, setIsRunning] = useState(autoStart);
  
  const targetEndTime = useRef<number | null>(null);
  const intervalRef = useRef<any>(null);

  const clearTimerInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    if (!isRunning) {
      targetEndTime.current = Date.now() + remainingMs;
      setIsRunning(true);
    }
  }, [isRunning, remainingMs]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimerInterval();
    if (targetEndTime.current) {
      setRemainingMs(Math.max(0, targetEndTime.current - Date.now()));
    }
  }, []);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const stop = useCallback(() => {
    setIsRunning(false);
    clearTimerInterval();
    setRemainingMs(targetMs);
    targetEndTime.current = null;
  }, [targetMs]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (targetEndTime.current) {
          const newRemaining = Math.max(0, targetEndTime.current - Date.now());
          setRemainingMs(newRemaining);
          
          if (onTick) onTick(newRemaining);
          
          if (newRemaining <= 0) {
            setIsRunning(false);
            clearTimerInterval();
            if (onComplete) onComplete();
          }
        }
      }, 1000);
    }
    
    return () => clearTimerInterval();
  }, [isRunning, onComplete, onTick]);

  const progress = targetMs > 0 ? 1 - remainingMs / targetMs : 0;

  return {
    start,
    pause,
    resume,
    stop,
    remainingMs,
    isRunning,
    progress
  };
}
