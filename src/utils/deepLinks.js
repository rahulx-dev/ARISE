/**
 * ARISE — Deep Link Parser & Router Validator
 *
 * Validates incoming deep links against strict route allowlists and bounds.
 * Prevents unauthorized execution of admin, debug, or invalid routes.
 */

const ALLOWED_EXERCISES = ['pushup', 'squat', 'plank', 'jumping_jack', 'situp'];
const ALLOWED_ACTIONS = ['watch-ad-unlock', 'shop', 'auth/callback'];

/**
 * @param {string} urlStr
 * @returns {any | null}
 */
export function parseWorkoutDeepLink(urlStr) {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.length > 2048) {
    return null;
  }

  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'arise:') {
      return null;
    }

    const host = url.host.toLowerCase();
    const pathname = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

    // 1. Exercise routes: arise://exercise/pushup?target=15&source=overlay
    if (host === 'exercise') {
      const exerciseType = pathname;
      if (!ALLOWED_EXERCISES.includes(exerciseType)) {
        return null;
      }

      const rawTarget = parseInt(url.searchParams.get('target') || '10', 10);
      const target = Number.isFinite(rawTarget) ? Math.max(1, Math.min(100, rawTarget)) : 10;
      const rawSource = url.searchParams.get('source') || 'direct';
      const source = rawSource.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 32);

      return {
        exerciseType,
        target,
        source: source || 'direct',
      };
    }

    // 2. Action routes: arise://watch-ad-unlock, arise://shop
    if (ALLOWED_ACTIONS.includes(host)) {
      return { action: host };
    }

    return null;
  } catch {
    return null;
  }
}
