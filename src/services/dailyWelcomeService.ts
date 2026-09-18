import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useLanguageStore } from './i18n';

// Static audio asset references
const AUDIO_EN_CINEMATIC = require('../../assets/audio/welcome_hunter_cinematic.mp3');
const AUDIO_EN_IN = require('../../assets/audio/welcome_hunter_in.mp3');
const AUDIO_HI = require('../../assets/audio/welcome_hunter_hi.mp3');

// Helper to get today's date string YYYY-MM-DD
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// In-memory cache for fast check
let lastGreetedDate: string | null = null;
let currentSound: Audio.Sound | null = null;

export async function shouldShowDailyWelcome(): Promise<boolean> {
  const today = getTodayDateString();
  if (lastGreetedDate === today) {
    return false;
  }
  return true;
}

export function markDailyWelcomeShown(): void {
  lastGreetedDate = getTodayDateString();
}

export async function speakWelcomeGreeting(_userName?: string): Promise<void> {
  return Promise.resolve();
}

export function stopWelcomeGreeting(): void {}

