import { playSound, getNativeSoundUri, SoundEffectName } from './soundSynthesizer';
import { useSound } from '../hooks/useSound';

export { playSound, getNativeSoundUri, useSound };
export type { SoundEffectName };

export const soundService = {
  play: (effectName: SoundEffectName, volume = 0.8) => {
    playSound(effectName, volume);
  },
  getUri: (effectName: SoundEffectName) => {
    return getNativeSoundUri(effectName);
  },
};

export default soundService;
