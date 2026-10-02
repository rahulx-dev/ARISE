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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

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
      targetEndTime.current = null;
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
      // autoStart and a resumed timer both need an absolute deadline. Without
      // this, the interval runs forever because targetEndTime remains null.
      if (targetEndTime.current === null) {
        targetEndTime.current = Date.now() + remainingMs;
      }
      intervalRef.current = setInterval(() => {
        if (targetEndTime.current) {
          const newRemaining = Math.max(0, targetEndTime.current - Date.now());
          setRemainingMs(newRemaining);
          
          onTickRef.current?.(newRemaining);
          
          if (newRemaining <= 0) {
            setIsRunning(false);
            clearTimerInterval();
            onCompleteRef.current?.();
          }
        }
      }, 1000);
    }
    
    return () => clearTimerInterval();
  }, [isRunning]);

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
