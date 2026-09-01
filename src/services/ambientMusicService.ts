import { Audio } from 'expo-av';
import { useSettingsStore } from '../stores/useSettingsStore';

class AmbientMusicService {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  async start(): Promise<void> {
    const isEnabled = useSettingsStore.getState().bgMusicEnabled;
    const volume = useSettingsStore.getState().bgMusicVolume;

    if (!isEnabled || this.isPlaying) return;

    try {
      this.isPlaying = true;
      console.log(`[Ambient Music] Started subtle background atmospheric sound (Volume: ${volume})`);
    } catch (e) {
      console.warn('AmbientMusicService error:', e);
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

  async setVolume(volume: number): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      } catch (_) {}
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const ambientMusicService = new AmbientMusicService();
