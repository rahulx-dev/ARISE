import { audioService, AUDIO_TRACKS, AudioTrackInfo } from './audioService';

export interface FocusTrack {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description: string;
  durationMinutes: number;
}

export const FOCUS_TRACKS: FocusTrack[] = AUDIO_TRACKS.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.category,
  description: t.description,
  durationMinutes: t.durationMinutes,
}));

export const FOCUS_MUSIC_TRACKS = FOCUS_TRACKS;

class FocusMusicServiceWrapper {
  async initAudioSession(): Promise<void> {
    await audioService.initAudioSession();
  }

  async play(trackId?: string): Promise<void> {
    await audioService.play(trackId);
  }

  async pause(): Promise<void> {
    await audioService.pause();
  }

  async resume(): Promise<void> {
    await audioService.resume();
  }

  async stop(): Promise<void> {
    await audioService.stop();
  }

  async setVolume(vol: number): Promise<void> {
    await audioService.setVolume(vol);
  }

  getVolume(): number {
    return audioService.getVolume();
  }

  getCurrentTrack(): FocusTrack {
    return audioService.getCurrentTrack();
  }

  getIsPlaying(): boolean {
    return audioService.getIsPlaying();
  }

  getAllTracks(): FocusTrack[] {
    return FOCUS_TRACKS;
  }

  async getNextTrack(): Promise<FocusTrack> {
    return await audioService.next();
  }

  async getPrevTrack(): Promise<FocusTrack> {
    return await audioService.previous();
  }
}

export const focusMusicService = new FocusMusicServiceWrapper();
