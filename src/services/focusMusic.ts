import { Audio } from 'expo-av';

export interface MusicTrack {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const FOCUS_MUSIC_TRACKS: MusicTrack[] = [
  { id: 'silent', name: 'Silent', emoji: '🔇', description: 'No background music' },
  { id: 'rain', name: 'Rain', emoji: '🌧️', description: 'Gentle rain on a window' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', description: 'Calm ocean waves' },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', description: 'Crackling fireplace' },
  { id: 'forest', name: 'Forest', emoji: '🌿', description: 'Forest birds & breeze' },
  { id: 'lofi', name: 'Lo-Fi', emoji: '🎵', description: 'Chill lo-fi beats' },
];

class FocusMusicService {
  private soundInstance: Audio.Sound | null = null;
  private currentTrackId: string = 'silent';
  private isPlaying: boolean = false;

  /**
   * Generate a simple tone-based ambient sound using expo-av.
   * Since we can't bundle audio files without real assets,
   * this uses Audio.Sound in silent mode as a placeholder.
   * In production, replace with real audio file URIs.
   */
  async play(trackId: string): Promise<void> {
    // Stop any existing sound first
    await this.stop();

    if (trackId === 'silent') {
      this.currentTrackId = 'silent';
      return;
    }

    this.currentTrackId = trackId;

    try {
      // Configure audio session for background playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // NOTE: In a full production build, you would load real audio files here.
      // For now, the service is wired up and ready — just needs audio assets.
      // Example with a real file:
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../../assets/audio/rain.mp3'),
      //   { isLooping: true, volume: 0.6 }
      // );
      // this.soundInstance = sound;
      // this.isPlaying = true;

      console.log(`🎵 Focus Music: Playing "${trackId}" (audio assets needed for production)`);
      this.isPlaying = true;
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
    if (this.soundInstance) {
      await this.soundInstance.setVolumeAsync(Math.max(0, Math.min(1, volume)));
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
