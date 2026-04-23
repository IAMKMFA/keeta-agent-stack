/**
 * CSRF / same-origin protection for dashboard mutation route handlers.
 *
 * Defense-in-depth per OWASP: we combine a classic Origin / Sec-Fetch-Site
 * check with a double-submit cookie token so an attacker needs both a
 * matching Origin *and* access to the server-side token, even if one layer
 * is misconfigured in a given environment.
 *
 * Secrets:
 *   - `DASHBOARD_CSRF_SECRET` — server-only HMAC signing key. Must be set
 *     in production. In development we fall back to a fixed value so the
 *     flow works without configuration; the fallback is explicitly *not*
 *     usable in production (see `getCsrfSecret`).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { CSRF_COOKIE_CLIENT, CSRF_HEADER } from './csrf-public';

export const CSRF_COOKIE_SIGNED = '__Host-dashboard_csrf';
export { CSRF_COOKIE_CLIENT, CSRF_HEADER };

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface CsrfFailure {
  response: Response;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function getCsrfSecret(): string {
  const secret = process.env.DASHBOARD_CSRF_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DASHBOARD_CSRF_SECRET must be set in production');
  }
  return 'dev-only-dashboard-csrf-secret-do-not-use-in-prod';
}

function hmac(value: string): string {
  return createHmac('sha256', getCsrfSecret()).update(value).digest('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Parses `Origin` / `Referer` into a bare origin string, or returns `null`
 * if neither header is present or parseable.
 */
function requestOrigin(req: Request): string | null {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const referer = req.headers.get('referer');
  if (!referer) return null;
  try {
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function expectedOrigin(req: Request): string | null {
  const host = req.headers.get('host');
  if (!host) return null;
  const proto = req.headers.get('x-forwarded-proto') ?? (req.url.startsWith('https:') ? 'https' : 'http');
  return `${proto}://${host}`;
}

/**
 * Validates method / Origin / Sec-Fetch-Site on any incoming mutation.
 *
 * Returns `null` when the request passes; returns a fully-formed 403
 * `Response` the caller should short-circuit on when it fails.
 */
export function requireSameOriginMutation(req: Request): Response | null {
  const method = req.method.toUpperCase();
  if (!MUTATION_METHODS.has(method)) {
    return jsonResponse(405, {
      error: { code: 'method_not_allowed', message: `Method ${method} not allowed` },
    });
  }

  const origin = requestOrigin(req);
  const expected = expectedOrigin(req);
  if (!origin || !expected || origin !== expected) {
    return jsonResponse(403, {
      error: { code: 'csrf_origin_mismatch', message: 'Origin did not match dashboard host' },
    });
  }

  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return jsonResponse(403, {
      error: { code: 'csrf_cross_site', message: 'Sec-Fetch-Site indicates cross-site request' },
    });
  }

  return null;
}

/**
 * Server-side issuance: generates a fresh token, writes the signed version to
 * `__Host-dashboard_csrf` (httpOnly) and the raw value to
 * `dashboard_csrf_client` (readable by the client so the browser can echo it
 * via the `x-dashboard-csrf` header).
 *
 * Intended to be called from the root layout on every render; idempotent
 * because Next will only set the cookie if it changes (we also only rotate
 * when there is no existing value to keep the flow stable across renders).
 */
export async function issueCsrfToken(): Promise<{ token: string }> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE_SIGNED)?.value;
  if (existing) {
    const [token, signature] = existing.split('.', 2);
    if (token && signature && constantTimeEqual(signature, hmac(token))) {
      return { token };
    }
  }

  const token = randomBytes(32).toString('hex');
  const signed = `${token}.${hmac(token)}`;
  const secure = process.env.NODE_ENV === 'production';

  store.set(CSRF_COOKIE_SIGNED, signed, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
  });
  store.set(CSRF_COOKIE_CLIENT, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure,
    path: '/',
  });
  return { token };
}

/**
 * Verifies the double-submit token on an incoming mutation.
 *
 * Expects the signed `__Host-dashboard_csrf` cookie on the request plus an
 * `x-dashboard-csrf` header carrying the unsigned token; compares them in
 * constant time.
 */
export async function verifyCsrfToken(req: Request): Promise<Response | null> {
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!headerToken) {
    return jsonResponse(403, {
      error: { code: 'csrf_missing_header', message: `Missing ${CSRF_HEADER} header` },
    });
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieMatch = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${CSRF_COOKIE_SIGNED}=`));
  if (!cookieMatch) {
    return jsonResponse(403, {
      error: { code: 'csrf_missing_cookie', message: 'Missing CSRF cookie' },
    });
  }
  const signed = decodeURIComponent(cookieMatch.split('=', 2)[1] ?? '');
  const [token, signature] = signed.split('.', 2);
  if (!token || !signature || !constantTimeEqual(signature, hmac(token))) {
    return jsonResponse(403, {
      error: { code: 'csrf_invalid_cookie', message: 'CSRF cookie signature invalid' },
    });
  }
  if (!constantTimeEqual(headerToken, token)) {
    return jsonResponse(403, {
      error: { code: 'csrf_token_mismatch', message: 'CSRF token mismatch' },
    });
  }
  return null;
}

/**
 * Pure helper exposed for tests — lets test code construct a cookie/header
 * pair that would pass verification in production.
 */
export function __signTokenForTest(token: string): string {
  return `${token}.${hmac(token)}`;
}
