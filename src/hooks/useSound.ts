import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useSettingsStore } from '../stores/useSettingsStore';
import {
  SoundEffectName,
  playSound,
  getNativeSoundUri,
} from '../services/soundSynthesizer';

export type SoundName = SoundEffectName;

// Global Preloaded Sound Pool for zero-latency instant playback
const soundPool = new Map<SoundName, Audio.Sound>();
let isPreloading = false;

async function prewarmSound(sound: SoundName) {
  if (Platform.OS === 'web' || soundPool.has(sound)) return;
  try {
    const uri = getNativeSoundUri(sound);
    if (!uri) return;
    const { sound: audioObj } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false, volume: 0.7 }
    );
    soundPool.set(sound, audioObj);
  } catch {}
}

// Background prewarm on module load
if (Platform.OS !== 'web' && !isPreloading) {
  isPreloading = true;
  setTimeout(() => {
    prewarmSound('rep_count');
    prewarmSound('coin_earn');
    prewarmSound('quest_complete');
  }, 1000);
}

export function useSound() {
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  const play = async (sound: SoundName) => {
    if (!sfxEnabled) return;

    try {
      if (Platform.OS === 'web') {
        playSound(sound, sfxVolume);
      } else {
        const cachedSound = soundPool.get(sound);
        if (cachedSound) {
          // Instant zero-delay replay
          await cachedSound.setVolumeAsync(sfxVolume);
          await cachedSound.replayAsync();
        } else {
          // Load and cache into pool
          const uri = getNativeSoundUri(sound);
          if (!uri) return;

          const { sound: audioObj } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true, volume: sfxVolume }
          );
          soundPool.set(sound, audioObj);
        }
      }
    } catch (error) {
      // Audio playback fails silently if device muted
    }
  };

  return { play };
}
