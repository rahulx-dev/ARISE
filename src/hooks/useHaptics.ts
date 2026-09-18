import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const light = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Vibration.vibrate(12);
    }
  };

  const medium = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Vibration.vibrate(28);
    }
  };

  const heavy = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      Vibration.vibrate(45);
    }
  };

  const success = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Vibration.vibrate([0, 30, 40, 60]);
    }
  };

  const warning = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      Vibration.vibrate([0, 40, 40, 40]);
    }
  };

  return { light, medium, heavy, success, warning };
}
