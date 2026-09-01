import { Audio } from 'expo-av';
import { useSettingsStore } from '../stores/useSettingsStore';

export interface AudioTrackInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
}

export const AUDIO_TRACKS: AudioTrackInfo[] = [
  {
    id: 'deep_focus',
    name: 'Deep Alpha State (14Hz)',
    category: 'Deep Focus',
    description: 'Binaural 14Hz alpha waves with 108Hz carrier for deep flow-state concentration.',
    durationMinutes: 60,
  },
  {
    id: 'productivity_sprint',
    name: 'Gamma Surge (40Hz)',
    category: 'Productivity',
    description: '40Hz gamma resonance tuned for high-intensity problem solving and coding.',
    durationMinutes: 45,
  },
  {
    id: 'brown_noise',
    name: 'Deep Space Brown Noise',
    category: 'Brown Noise',
    description: 'Warm, low-frequency rumble that masks background auditory distractions.',
    durationMinutes: 90,
  },
  {
    id: 'rain_window',
    name: 'Neon Rain on Glass',
    category: 'Rain',
    description: 'Continuous gentle rain falling on a skyscraper window with distant thunder.',
    durationMinutes: 60,
  },
  {
    id: 'forest_wind',
    name: 'Cyber Forest Breeze',
    category: 'Forest',
    description: 'Atmospheric mountain wind and gentle organic leaves rustling.',
    durationMinutes: 50,
  },
  {
    id: 'lofi_beats',
    name: 'Cyberpunk Lo-Fi Chill',
    category: 'Lo-Fi',
    description: 'Warm analog chords and retro tape saturation for calm studying.',
    durationMinutes: 45,
  },
  {
    id: 'calm_ambient',
    name: '432Hz Solar Ambient',
    category: 'Calm',
    description: 'Spacious cinematic ambient pads and harmonic reverberation.',
    durationMinutes: 60,
  },
];

// Helper to generate a 16-bit 44.1kHz PCM WAV Data URI with Base64 encoding
function generateSoundscapeWavUri(
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
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // PCM Samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.max(-1, Math.min(1, generator(t, durationSec)));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  // Base64 encode
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Robust universal base64 encode
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');

  return `data:audio/wav;base64,${b64}`;
}

export class AudioService {
  private static instance: AudioService;
  private sound: Audio.Sound | null = null;
  private currentTrackId: string = 'deep_focus';
  private isPlaying: boolean = false;
  private volume: number = 0.7;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  async initAudioSession(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      this.isInitialized = true;
    } catch (e) {
      console.warn('[AudioService] Audio mode init warning:', e);
    }
  }

  private generateTrackUri(trackId: string): string {
    const DURATION = 8.0; // 8-second seamless looping buffer

    switch (trackId) {
      case 'deep_focus': // 14Hz Binaural Alpha on 108Hz carrier
        return generateSoundscapeWavUri(DURATION, (t) => {
          const carrierL = Math.sin(2 * Math.PI * 108 * t);
          const carrierR = Math.sin(2 * Math.PI * 122 * t);
          const sub = Math.sin(2 * Math.PI * 54 * t) * 0.4;
          const pad = Math.sin(2 * Math.PI * 216 * t) * 0.15;
          return (carrierL * 0.35 + carrierR * 0.35 + sub + pad) * 0.6;
        });

      case 'productivity_sprint': // 40Hz Gamma wave
        return generateSoundscapeWavUri(DURATION, (t) => {
          const gamma = Math.sin(2 * Math.PI * 40 * t) * 0.3;
          const tone1 = Math.sin(2 * Math.PI * 240 * t) * 0.2;
          const tone2 = Math.sin(2 * Math.PI * 280 * t) * 0.2;
          const pulse = Math.sin(2 * Math.PI * 2 * t) * 0.1;
          return (gamma + tone1 + tone2 + pulse) * 0.7;
        });

      case 'brown_noise': // Warm low-frequency space rumble
        return generateSoundscapeWavUri(DURATION, (t) => {
          let noise = 0;
          for (let f = 20; f < 300; f += 25) {
            noise += (Math.sin(2 * Math.PI * f * t + Math.sin(t * 2)) * 1) / Math.sqrt(f);
          }
          return noise * 0.4;
        });

      case 'rain_window': // Raindrops & atmospheric showers
        return generateSoundscapeWavUri(DURATION, (t) => {
          const hiss = (Math.random() * 2 - 1) * 0.15;
          const drop1 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-((t * 8) % 1) * 5) * 0.1;
          const drop2 = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-((t * 5) % 1) * 6) * 0.1;
          const rumble = Math.sin(2 * Math.PI * 45 * t) * 0.15;
          return (hiss + drop1 + drop2 + rumble) * 0.7;
        });

      case 'forest_wind': // Mountain breeze with soft harmonic pads
        return generateSoundscapeWavUri(DURATION, (t) => {
          const windMod = (Math.sin(2 * Math.PI * 0.25 * t) + 1) * 0.5;
          const breeze = (Math.sin(2 * Math.PI * 95 * t) + Math.sin(2 * Math.PI * 140 * t)) * 0.25 * windMod;
          const birds = Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-((t * 3) % 1) * 8) * 0.04;
          return (breeze + birds) * 0.6;
        });

      case 'lofi_beats': // Dm7 - G7 jazz chords with tape warmth
        return generateSoundscapeWavUri(DURATION, (t) => {
          const chordIndex = Math.floor((t / 2) % 4);
          const chords = [
            [146.83, 174.61, 220.0, 261.63], // Dm7
            [196.0, 246.94, 293.66, 349.23], // G7
            [130.81, 164.81, 196.0, 246.94], // Cmaj7
            [174.61, 220.0, 261.63, 329.63], // Fmaj7
          ];
          const notes = chords[chordIndex];
          let val = 0;
          for (const freq of notes) {
            val += Math.sin(2 * Math.PI * freq * t) * 0.15;
          }
          const sub = Math.sin(2 * Math.PI * (notes[0] / 2) * t) * 0.2;
          return (val + sub) * 0.6;
        });

      case 'calm_ambient':
      default: // 432Hz Solar Ambient
        return generateSoundscapeWavUri(DURATION, (t) => {
          const root = Math.sin(2 * Math.PI * 108 * t) * 0.3;
          const fifth = Math.sin(2 * Math.PI * 162 * t) * 0.2;
          const octave = Math.sin(2 * Math.PI * 216 * t) * 0.15;
          const shimmer = Math.sin(2 * Math.PI * 432 * t) * 0.08 * (Math.sin(t) * 0.5 + 0.5);
          return (root + fifth + octave + shimmer) * 0.65;
        });
    }
  }

  async play(trackId: string = this.currentTrackId): Promise<void> {
    await this.stop();
    this.currentTrackId = trackId;
    await this.initAudioSession();

    try {
      const uri = this.generateTrackUri(trackId);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          isLooping: true,
          volume: this.volume,
          shouldPlay: true,
        }
      );

      this.sound = sound;
      this.isPlaying = true;
      if (__DEV__) {
        console.log(`[AudioService] Playing soundscape "${trackId}" (Volume: ${this.volume})`);
      }
    } catch (e) {
      console.warn('[AudioService] Failed to play track:', e);
      this.isPlaying = false;
    }
  }

  async pause(): Promise<void> {
    if (this.sound && this.isPlaying) {
      try {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      } catch (_) {}
    }
  }

  async resume(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      try {
        await this.sound.playAsync();
        this.isPlaying = true;
      } catch (_) {}
    } else if (!this.sound) {
      await this.play(this.currentTrackId);
    }
  }

  async stop(): Promise<void> {
    this.isPlaying = false;
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (_) {}
      this.sound = null;
    }
  }

  async next(): Promise<AudioTrackInfo> {
    const index = AUDIO_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const nextIndex = (index + 1) % AUDIO_TRACKS.length;
    const nextTrack = AUDIO_TRACKS[nextIndex];
    if (this.isPlaying) {
      await this.play(nextTrack.id);
    } else {
      this.currentTrackId = nextTrack.id;
    }
    return nextTrack;
  }

  async previous(): Promise<AudioTrackInfo> {
    const index = AUDIO_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const prevIndex = (index - 1 + AUDIO_TRACKS.length) % AUDIO_TRACKS.length;
    const prevTrack = AUDIO_TRACKS[prevIndex];
    if (this.isPlaying) {
      await this.play(prevTrack.id);
    } else {
      this.currentTrackId = prevTrack.id;
    }
    return prevTrack;
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(this.volume);
      } catch (_) {}
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentTrack(): AudioTrackInfo {
    return AUDIO_TRACKS.find((t) => t.id === this.currentTrackId) || AUDIO_TRACKS[0];
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getAllTracks(): AudioTrackInfo[] {
    return AUDIO_TRACKS;
  }
}

export const audioService = AudioService.getInstance();
