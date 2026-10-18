/**
 * ARISE — Package Name Normalizer & Security Validator
 *
 * Enforces Android reverse-domain package standards and bounds (max 256 chars).
 * Prevents path traversal, SQL injection, or unvalidated identifiers in app blocking.
 */

const PACKAGE_REGEX = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const MAX_PACKAGE_LENGTH = 256;

/**
 * Normalizes and validates an Android package name string
 * @param {string | null | undefined} packageName
 * @returns {string | null}
 */
export function normalizePackageName(packageName) {
  if (typeof packageName !== 'string') return null;
  const normalized = packageName.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > MAX_PACKAGE_LENGTH || normalized === 'null') {
    return null;
  }
  return PACKAGE_REGEX.test(normalized) ? normalized : null;
}
