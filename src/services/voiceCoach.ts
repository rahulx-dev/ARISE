/**
 * ARISE — On-Device Female Voice AI Coach
 * 
 * 100% Offline using Android / iOS native Text-to-Speech (TTS) via expo-speech.
 * Configured with crisp, clear, accurate female voice synthesis.
 */

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

class VoiceCoachService {
  public isEnabled: boolean = true;
  private femaleVoiceIdentifier: string | undefined = undefined;
  private isInitialized: boolean = false;

  constructor() {
    this.initVoice();
  }

  private async initVoice() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      // Look for high quality English female voices
      const femaleVoice = voices.find((v) => {
        const name = (v.name || '').toLowerCase();
        const id = (v.identifier || '').toLowerCase();
        const lang = (v.language || '').toLowerCase();

        return (
          lang.startsWith('en') &&
          (name.includes('female') ||
            name.includes('samantha') ||
            name.includes('karen') ||
            name.includes('siri') ||
            name.includes('zira') ||
            name.includes('eva') ||
            id.includes('female') ||
            id.includes('sfg') ||
            id.includes('tpf'))
        );
      }) || voices.find((v) => (v.language || '').toLowerCase().startsWith('en'));

      if (femaleVoice) {
        this.femaleVoiceIdentifier = femaleVoice.identifier;
      }
      this.isInitialized = true;
    } catch (e) {
      // Fallback to default engine
      this.isInitialized = true;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public async speak(text: string, priority = false) {
    if (!this.isEnabled) return;
    try {
      if (priority) {
        await Speech.stop();
      }

      Speech.speak(text, {
        language: 'en-US',
        voice: this.femaleVoiceIdentifier,
        pitch: 1.18, // Clean, crisp, energetic female pitch
        rate: 1.02,  // Highly accurate, natural cadence
      });
    } catch (e) {
      // Graceful fallback
    }
  }

  public speakRep(repCount: number, customMessage?: string) {
    if (!this.isEnabled) return;
    if (customMessage) {
      this.speak(`Rep ${repCount}. ${customMessage}`);
    } else {
      this.speak(`${repCount}`);
    }
  }

  public speakHalfway(repsRemaining: number) {
    this.speak(`Halfway there! ${repsRemaining} reps to go. Maintain your form and breathe!`, true);
  }

  public speakComplete(exerciseName: string, coins: number) {
    this.speak(`Outstanding discipline! ${exerciseName} verified. You earned ${coins} coins. Great job!`, true);
  }

  public speakFocusStart(minutes: number) {
    this.speak(`Deep focus session started for ${minutes} minutes. Stay locked in. I'm with you.`, true);
  }

  public speakEmergencyUnlocked() {
    this.speak(`Emergency protocol verified. 5 minutes unrestricted screen time granted. Use it wisely!`, true);
  }

  public stop() {
    try {
      Speech.stop();
    } catch (e) {}
  }
}

export const voiceCoach = new VoiceCoachService();
