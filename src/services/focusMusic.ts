import { Audio } from 'expo-av';

export interface MusicTrack {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const FOCUS_MUSIC_TRACKS: MusicTrack[] = [
  { id: 'silent', name: 'Silent', emoji: '🔇', description: 'No background music' },
  { id: 'rain', name: 'Rain', emoji: '🌧️', description: 'Gentle soothing rain on window' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊', description: 'Calm rolling ocean waves' },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', description: 'Warm crackling fireplace embers' },
  { id: 'forest', name: 'Forest Breeze', emoji: '🌿', description: 'Peaceful forest wind and chirps' },
  { id: 'lofi', name: 'Lo-Fi Chill', emoji: '🎵', description: 'Warm acoustic meditation chords' },
];

/**
 * Generates 16-bit 44.1kHz Mono PCM WAV Base64 Data URI
 */
function generateAmbientWavUri(
  durationSec: number,
  generator: (t: number, duration: number) => number,
  sampleRate = 44100
): string {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // 1 Channel (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.max(-1, Math.min(1, generator(t, durationSec)));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Base64 encoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i += 3) {
    const b1 = buffer[i];
    const b2 = i + 1 < len ? buffer[i + 1] : 0;
    const b3 = i + 2 < len ? buffer[i + 2] : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    const enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    const enc4 = b3 & 63;

    if (i + 1 >= len) {
      result += chars[enc1] + chars[enc2] + '==';
    } else if (i + 2 >= len) {
      result += chars[enc1] + chars[enc2] + chars[enc3] + '=';
    } else {
      result += chars[enc1] + chars[enc2] + chars[enc3] + chars[enc4];
    }
  }

  return `data:audio/wav;base64,${result}`;
}

// 5 High-Fidelity Synthesized Ambient Tracks (Cached in Memory)
const AMBIENT_TRACK_URIS: Record<string, string> = {
  // 1. Rain: Continuous pink/white noise with random droplet pitch sweeps
  rain: generateAmbientWavUri(3.0, (t, dur) => {
    const white = Math.random() * 2 - 1;
    const smoothWhite = (Math.sin(2 * Math.PI * 180 * t) + white * 0.7) * 0.35;
    const droplet = Math.sin(2 * Math.PI * (1200 + Math.sin(t * 40) * 600) * t) * (Math.random() > 0.985 ? 0.25 : 0);
    // Smooth loop boundary fade
    const fade = Math.sin((Math.PI * t) / dur);
    return (smoothWhite + droplet) * fade * 0.8;
  }),

  // 2. Ocean Waves: Rolling surge and ebb frequency modulation
  ocean: generateAmbientWavUri(3.5, (t, dur) => {
    const surge = Math.sin((2 * Math.PI * t) / dur);
    const waveAmp = (surge + 1) * 0.5;
    const noise = (Math.random() * 2 - 1) * waveAmp * 0.4;
    const deepRumble = Math.sin(2 * Math.PI * 55 * t) * 0.25 * waveAmp;
    const fade = Math.sin((Math.PI * t) / dur);
    return (noise + deepRumble) * fade * 0.9;
  }),

  // 3. Fireplace: Soft low rumble with distinct pop/crackle impulse spikes
  fireplace: generateAmbientWavUri(2.8, (t, dur) => {
    const rumble = Math.sin(2 * Math.PI * 85 * t) * 0.2 + (Math.random() * 2 - 1) * 0.15;
    const crackle = Math.random() > 0.988 ? (Math.random() * 2 - 1) * 0.7 : 0;
    const fade = Math.sin((Math.PI * t) / dur);
    return (rumble + crackle) * fade * 0.85;
  }),

  // 4. Forest: Gentle rustling breeze with high harmonics
  forest: generateAmbientWavUri(3.2, (t, dur) => {
    const breeze = Math.sin(2 * Math.PI * 110 * t) * (Math.random() * 0.3 + 0.1);
    const chirp = (Math.sin(2 * Math.PI * 2400 * t) * Math.sin(2 * Math.PI * 20 * t)) * (t > 1.2 && t < 1.6 ? 0.2 : 0);
    const fade = Math.sin((Math.PI * t) / dur);
    return (breeze + chirp) * fade * 0.8;
  }),

  // 5. Lo-Fi Chill: Warm Rhodes-style harmonic chords loop
  lofi: generateAmbientWavUri(3.6, (t, dur) => {
    const c1 = Math.sin(2 * Math.PI * 261.63 * t); // C4
    const e1 = Math.sin(2 * Math.PI * 329.63 * t); // E4
    const g1 = Math.sin(2 * Math.PI * 392.0 * t);  // G4
    const b1 = Math.sin(2 * Math.PI * 493.88 * t); // B4
    const vinyl = (Math.random() * 2 - 1) * 0.04;
    const chord = (c1 + e1 + g1 + b1) * 0.15;
    const fade = Math.sin((Math.PI * t) / dur);
    return (chord + vinyl) * fade * 0.9;
  }),
};

class FocusMusicService {
  private soundInstance: Audio.Sound | null = null;
  private currentTrackId: string = 'silent';
  private isPlaying: boolean = false;
  private volume: number = 0.8;

  async play(trackId: string): Promise<void> {
    await this.stop();

    if (trackId === 'silent') {
      this.currentTrackId = 'silent';
      return;
    }

    this.currentTrackId = trackId;

    const uri = AMBIENT_TRACK_URIS[trackId];
    if (!uri) {
      console.warn(`FocusMusicService: Track URI not found for "${trackId}"`);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isLooping: true,
          volume: this.volume,
        }
      );

      this.soundInstance = sound;
      this.isPlaying = true;
      console.log(`🎵 Focus Music: Playing ambient track "${trackId}"`);
    } catch (error) {
      console.warn('FocusMusicService: Error playing track:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.soundInstance) {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
        this.soundInstance = null;
      }
      this.isPlaying = false;
      this.currentTrackId = 'silent';
    } catch (error) {
      console.warn('FocusMusicService: Error stopping:', error);
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.soundInstance) {
      try {
        await this.soundInstance.setVolumeAsync(this.volume);
      } catch {}
    }
  }

  getCurrentTrackId(): string {
    return this.currentTrackId;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const focusMusicService = new FocusMusicService();
