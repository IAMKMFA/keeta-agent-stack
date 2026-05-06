/**
 * String-level secret redaction for log lines, error envelopes, audit blobs,
 * and any other surface that might be tempted to render seed-shaped material.
 *
 * This is a defense-in-depth utility. The canonical structured-log redactor
 * lives in `@keeta-agent-stack/telemetry` and operates at the pino-field level
 * (see `DEFAULT_REDACT_PATHS`). `redactSecret` is for ad-hoc strings: error
 * messages, console.error fallbacks, MCP tool transcripts, etc.
 */

const REPLACEMENT = '[REDACTED]';

/**
 * Redact a single string value. Always returns the literal `[REDACTED]`
 * marker — never returns a hash or partial string, because partial leakage
 * still allows brute-force reconstruction in some adversary models.
 */
export function redactSecret(_value: string | undefined | null): string {
  return REPLACEMENT;
}

/**
 * Redact every key in an object whose name matches a known secret-shaped
 * pattern. Returns a shallow copy. Non-object inputs are returned untouched.
 *
 * This is a complement to pino's path-based redaction — useful for objects
 * passed to `JSON.stringify` directly (e.g. MCP tool responses).
 */
export function redactObjectSecrets<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => redactObjectSecrets(entry)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isSecretLikeKey(key)) {
      out[key] = REPLACEMENT;
    } else if (val && typeof val === 'object') {
      out[key] = redactObjectSecrets(val);
    } else {
      out[key] = val;
    }
  }
  return out as T;
}

/**
 * Names that always carry settlement/admin secret material in this stack.
 * Match is case-insensitive and partial: `seed` matches `signing_seed`,
 * `apiKey` matches `webhookApiKey`, etc.
 *
 * Adding to this list is cheap; removing from it is dangerous.
 */
const SECRET_KEY_PATTERNS = [
  /seed/i,
  /private[_-]?key/i,
  /privatekey/i,
  /mnemonic/i,
  /passphrase/i,
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /signing[_-]?key/i,
  /\bops[_-]?api[_-]?key\b/i,
  /\badmin[_-]?bypass[_-]?token\b/i,
  /\bkeeta[_-]?signing[_-]?seed\b/i,
  /\bkeeta[_-]?kms[_-]?key\b/i,
  /\bauth[_-]?jwt[_-]?secret\b/i,
  /\bwebhook[_-]?secret\b/i,
];

export function isSecretLikeKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}
