import { useState, useCallback, useEffect, useRef } from 'react';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';

// Placeholders for real expo permission hooks if needed, otherwise standard approach
export function useCameraPermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const checkPermission = useCallback(async () => {
    try {
      const result = await Camera.getCameraPermissionsAsync();
      if (mounted.current) setHasPermission(result.granted);
      return result.granted;
    } catch {
      if (mounted.current) setHasPermission(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      if (mounted.current) setHasPermission(result.granted);
      return result.granted;
    } catch {
      if (mounted.current) setHasPermission(false);
      return false;
    }
  }, []);

  return { hasPermission, requestPermission, checkPermission };
}

export function useNotificationPermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const checkPermission = useCallback(async () => {
    try {
      const result = await Notifications.getPermissionsAsync();
      if (mounted.current) setHasPermission(result.granted);
      return result.granted;
    } catch {
      if (mounted.current) setHasPermission(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const result = await Notifications.requestPermissionsAsync();
      if (mounted.current) setHasPermission(result.granted);
      return result.granted;
    } catch {
      if (mounted.current) setHasPermission(false);
      return false;
    }
  }, []);

  return { hasPermission, requestPermission, checkPermission };
}
