/**
 * Public-only environment loader for the Keeta Agent Stack marketing site.
 *
 * Rules (enforced here and in the future apps/web/scripts/lint-security.ts):
 *
 *   - Only `NEXT_PUBLIC_*` vars may be read from this module.
 *   - This module is safe to import from any client component.
 *   - No signing seed, OPS_API_KEY, ADMIN_BYPASS_TOKEN, KMS key, JWT secret,
 *     or webhook secret is allowed to be added here. The list below is
 *     intentionally exhaustive — extending it requires a security review.
 *   - When `NEXT_PUBLIC_DEMO_MODE` is unset, the site defaults to demo mode
 *     so the homepage never depends on a backend being reachable.
 */

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function readBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (typeof raw !== 'string') return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

function readString(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readUrl(name: string): string | undefined {
  const value = readString(name);
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

const DEMO_MODE = readBoolean('NEXT_PUBLIC_DEMO_MODE', true);
const KEETA_API_BASE_URL = readUrl('NEXT_PUBLIC_KEETA_API_BASE_URL');
const DASHBOARD_URL = readUrl('NEXT_PUBLIC_DASHBOARD_URL');
const DOCS_URL = readUrl('NEXT_PUBLIC_DOCS_URL');

/**
 * The website should only attempt live API calls when an operator has both:
 *  1. flipped `NEXT_PUBLIC_DEMO_MODE=false` explicitly, and
 *  2. provided a reachable `NEXT_PUBLIC_KEETA_API_BASE_URL`.
 *
 * Either condition missing keeps us in demo mode.
 */
const LIVE_MODE = !DEMO_MODE && Boolean(KEETA_API_BASE_URL);

export const publicEnv = {
  demoMode: DEMO_MODE,
  liveMode: LIVE_MODE,
  keetaApiBaseUrl: KEETA_API_BASE_URL,
  dashboardUrl: DASHBOARD_URL,
  docsUrl: DOCS_URL,
} as const;

export type PublicEnv = typeof publicEnv;
