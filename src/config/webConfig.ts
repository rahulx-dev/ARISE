/**
 * Official ARISE Web & Guide Configuration
 */

export const ARISE_WEB_BASE_URL = 'https://arise-web.vercel.app';

export function getTutorialUrl(lang: 'hi' | 'en'): string {
  return `${ARISE_WEB_BASE_URL}/guide?lang=${lang}#video`;
}
