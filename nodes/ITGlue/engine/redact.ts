/**
 * Recursive secret redactor.
 *
 * SECURITY-CRITICAL: Called on every IT Glue API response before the data is
 * returned from the node or placed into n8n execution data / LLM context.
 * Passwords and OTP secrets MUST NOT leak in plain text.
 *
 * Rules:
 *  - A key is "secret" if it exactly equals "password" or "otp" (case-insensitive)
 *    OR if it matches SECRET_KEY_RE.
 *  - Secret keys always get their value replaced with REDACTED, regardless of
 *    the original value's type (string, object, array, null, …).
 *  - Non-secret keys are recursed into for arrays and plain objects.
 *  - Primitives and non-plain objects are returned as-is.
 *  - Input is NEVER mutated (pure function / deep clone by construction).
 */

export const REDACTED = '***REDACTED***';

/**
 * Matches keys that contain a password-like or OTP-like segment.
 * Anchors allow for leading/trailing text separated by - or _.
 * Examples caught: otp-secret, otp_secret, admin-password, db_password,
 *                  one-time-password, one_time_password, password (bare).
 */
export const SECRET_KEY_RE =
  /(^|[-_])(password|otp|otp[-_]?secret|one[-_]?time[-_]?password)($|[-_])/i;

/** True for bare "password" or "otp" (case-insensitive exact match). */
function isExactSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return lower === 'password' || lower === 'otp';
}

/** True if the key should be redacted. */
function isSecretKey(key: string): boolean {
  return isExactSecretKey(key) || SECRET_KEY_RE.test(key);
}

/** True for a "plain object" — not null, not an array, not a Date/RegExp/… */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Returns a deep clone of `value` with all secret keys replaced by REDACTED.
 * Input is never mutated.
 */
export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return (value as unknown[]).map(redactSecrets) as unknown as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (isSecretKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSecrets((value as Record<string, unknown>)[key]);
      }
    }
    return result as unknown as T;
  }

  // Primitive or non-plain object — return as-is
  return value;
}
