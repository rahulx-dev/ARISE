import { Audio } from 'expo-av';

export interface FocusTrack {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  durationMinutes: number;
}

export const FOCUS_TRACKS: FocusTrack[] = [
  {
    id: 'deep_focus',
    name: 'Deep Alpha State',
    category: 'Deep Focus',
    icon: 'brain',
    description: 'Binaural 14Hz alpha waves for intense flow-state productivity.',
    durationMinutes: 60,
  },
  {
    id: 'lofi_beats',
    name: 'Cyberpunk Lo-Fi Chill',
    category: 'Lo-Fi',
    icon: 'music',
    description: 'Smooth retro synth beats for calm concentration.',
    durationMinutes: 45,
  },
  {
    id: 'rain_window',
    name: 'Neon Rain on Glass',
    category: 'Rain',
    icon: 'cloud-rain',
    description: 'Continuous gentle rain falling on a futuristic skyscraper window.',
    durationMinutes: 60,
  },
  {
    id: 'forest_wind',
    name: 'Cyber Forest Breeze',
    category: 'Forest',
    icon: 'trees',
    description: 'Natural mountain wind and gentle rustling leaves.',
    durationMinutes: 50,
  },
  {
    id: 'brown_noise',
    name: 'Deep Space Brown Noise',
    category: 'Brown Noise',
    icon: 'disc',
    description: 'Warm low-frequency rumble that masks external auditory distractions.',
    durationMinutes: 90,
  },
  {
    id: 'calm_ambient',
    name: 'Solar Flare Ambient',
    category: 'Calm',
    icon: 'sun',
    description: 'Spacious cinematic ambient pads and atmospheric reverberations.',
    durationMinutes: 60,
  },
  {
    id: 'productivity_sprint',
    name: 'Gamma Surge (40Hz)',
    category: 'Productivity',
    icon: 'zap',
    description: '40Hz gamma resonance tuned for rapid problem solving.',
    durationMinutes: 30,
  },
];

export const FOCUS_MUSIC_TRACKS = FOCUS_TRACKS;

class FocusMusicService {
  private soundInstance: Audio.Sound | null = null;
  private currentTrackId: string = 'deep_focus';
  private isPlaying: boolean = false;
  private volume: number = 0.6;

  async initAudioSession(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (_) {}
  }

  async play(trackId: string = this.currentTrackId): Promise<void> {
    await this.stop();
    this.currentTrackId = trackId;
    await this.initAudioSession();

    try {
      this.isPlaying = true;
      console.log(`[Focus Music] Playing "${trackId}" (volume: ${this.volume})`);
    } catch (e) {
      console.warn('Error starting focus music:', e);
    }
  }

  async pause(): Promise<void> {
    this.isPlaying = false;
  }

  async stop(): Promise<void> {
    this.isPlaying = false;
    if (this.soundInstance) {
      try {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
      } catch (_) {}
      this.soundInstance = null;
    }
  }

  async setVolume(vol: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.soundInstance) {
      try {
        await this.soundInstance.setVolumeAsync(this.volume);
      } catch (_) {}
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentTrack(): FocusTrack {
    return FOCUS_TRACKS.find((t) => t.id === this.currentTrackId) || FOCUS_TRACKS[0];
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getAllTracks(): FocusTrack[] {
    return FOCUS_TRACKS;
  }

  getNextTrack(): FocusTrack {
    const currentIndex = FOCUS_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const nextIndex = (currentIndex + 1) % FOCUS_TRACKS.length;
    return FOCUS_TRACKS[nextIndex];
  }

  getPrevTrack(): FocusTrack {
    const currentIndex = FOCUS_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const prevIndex = (currentIndex - 1 + FOCUS_TRACKS.length) % FOCUS_TRACKS.length;
    return FOCUS_TRACKS[prevIndex];
  }
}

export const focusMusicService = new FocusMusicService();
