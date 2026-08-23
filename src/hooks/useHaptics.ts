import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useHaptics() {
  const hapticsEnabled = useSettingsStore(s => s.hapticsEnabled);

  const light = async () => {
    if (!hapticsEnabled) return;
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const medium = async () => {
    if (!hapticsEnabled) return;
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
  };

  const heavy = async () => {
    if (!hapticsEnabled) return;
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
  };

  const success = async () => {
    if (!hapticsEnabled) return;
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  };

  const warning = async () => {
    if (!hapticsEnabled) return;
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
  };

  return { light, medium, heavy, success, warning };
}
