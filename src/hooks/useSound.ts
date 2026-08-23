import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useSettingsStore } from '../stores/useSettingsStore';
import {
  SoundEffectName,
  playSound,
  getNativeSoundUri,
} from '../services/soundSynthesizer';

export type SoundName = SoundEffectName;

export function useSound() {
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  const play = async (sound: SoundName) => {
    if (!sfxEnabled) return;

    try {
      if (Platform.OS === 'web') {
        playSound(sound, sfxVolume);
      } else {
        const uri = getNativeSoundUri(sound);
        if (!uri) return;

        const { sound: audioObj } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, volume: sfxVolume }
        );

        audioObj.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            audioObj.unloadAsync().catch(() => {});
          }
        });
      }
    } catch (error) {
      // Audio playback fails silently if device muted
    }
  };

  return { play };
}
