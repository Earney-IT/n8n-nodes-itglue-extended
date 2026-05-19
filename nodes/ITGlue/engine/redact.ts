/**
 * Recursive secret redactor.
 *
 * SECURITY-CRITICAL: Called on every IT Glue API response before the data is
 * returned from the node or placed into n8n execution data / LLM context.
 * Passwords and OTP secrets MUST NOT leak in plain text.
 *
 * Rules:
 *  - A key is "secret" if (after separator-stripping + lowercasing) it is
 *    exactly "password" or "otp", OR it contains a secret token
 *    (password / passphrase / otpsecret / onetimepassword) — UNLESS it is on
 *    the explicit non-secret allowlist (password metadata + the JSON:API
 *    "passwords" relationship key).
 *  - Detection is casing/separator-agnostic: flattenResource camelCases IT
 *    Glue's kebab attributes before redaction runs, so "admin-password",
 *    "admin_password" and "adminPassword" must all be caught.
 *  - Secret keys always get their value replaced with REDACTED, regardless of
 *    the original value's type (string, object, array, null, …).
 *  - Non-secret keys are recursed into for arrays and plain objects.
 *  - Primitives and non-plain objects are returned as-is.
 *  - Input is NEVER mutated (pure function / deep clone by construction).
 */

export const REDACTED = '***REDACTED***';

// Secret-bearing key tokens. Matched case-insensitively against the RAW key
// AND against a separator-stripped lowercase form, so it works whether the key
// is kebab-case (admin-password), snake_case (admin_password), or camelCase
// (adminPassword) — flattenResource camelCases IT Glue's kebab attributes
// before redaction runs, so casing-agnostic matching is mandatory.
export const SECRET_KEY_RE =
  /(password|passphrase|otpsecret|onetimepassword)/i;

// IT Glue keys that contain "password"/"otp" but are NOT secret values and
// must survive redaction: the password handler needs these, and "passwords"
// is a JSON:API relationship/endpoint key. Matched against the
// separator-stripped lowercase key.
const NON_SECRET_KEY_RE =
  /^(passwords|passwordcategory(id|name)?|passwordfolder(id|name)?|password(updated|created|changed|recorded)(at|by)?|passwordresetat|otpenabled)$/;

function normalizeKey(key: string): string {
  // strip - and _ so kebab/snake/camel collapse to one comparable form
  return key.replace(/[-_]/g, '').toLowerCase();
}

function isSecretKey(key: string): boolean {
  const n = normalizeKey(key);
  if (NON_SECRET_KEY_RE.test(n)) return false;   // allowlisted non-secret metadata + "passwords" relationship
  if (n === 'password' || n === 'otp') return true; // bare secret
  return SECRET_KEY_RE.test(n);                   // any compound containing a secret token, any casing
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
      const redacted = isSecretKey(key)
        ? REDACTED
        : redactSecrets((value as Record<string, unknown>)[key]);
      // Guard against prototype-pollution keys (__proto__, constructor,
      // prototype) corrupting the result's prototype chain: define the
      // property as a plain own data property instead of assigning.
      Object.defineProperty(result, key, {
        value: redacted,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return result as unknown as T;
  }

  // Primitive or non-plain object — return as-is
  return value;
}
