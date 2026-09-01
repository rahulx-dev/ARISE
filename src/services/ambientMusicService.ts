import { audioService } from './audioService';
import { useSettingsStore } from '../stores/useSettingsStore';

class AmbientMusicService {
  async start(): Promise<void> {
    const isEnabled = useSettingsStore.getState().bgMusicEnabled;
    const volume = useSettingsStore.getState().bgMusicVolume;

    if (!isEnabled || audioService.getIsPlaying()) return;

    try {
      await audioService.setVolume(volume || 0.4);
      await audioService.play('calm_ambient');
      if (__DEV__) {
        console.log(`[Ambient Music] Started background atmospheric sound (Volume: ${volume})`);
      }
    } catch (e) {
      console.warn('AmbientMusicService error:', e);
    }
  }

  async stop(): Promise<void> {
    await audioService.stop();
  }

  async setVolume(volume: number): Promise<void> {
    await audioService.setVolume(volume);
  }

  getIsPlaying(): boolean {
    return audioService.getIsPlaying();
  }
}

export const ambientMusicService = new AmbientMusicService();
