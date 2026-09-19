import { Platform } from 'react-native';

/**
 * ARISE Safe Clipboard Utility
 * Gracefully handles clipboard copying across Android, iOS, and Web.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Attempt dynamic expo-clipboard if loaded
    try {
      const ExpoClipboard = require('expo-clipboard');
      if (ExpoClipboard?.setStringAsync) {
        await ExpoClipboard.setStringAsync(text);
        return true;
      }
    } catch {
      // expo-clipboard not linked or available
    }
    return false;
  } catch (err) {
    console.warn('[Clipboard] Failed to copy text:', err);
    return false;
  }
}
