/**
 * Client-safe subset of `lib/csrf.ts`. Only the cookie and header names are
 * needed by the browser; the signing / verification logic pulls in
 * `node:crypto` and must stay server-only.
 */
export const CSRF_COOKIE_CLIENT = 'dashboard_csrf_client';
export const CSRF_HEADER = 'x-dashboard-csrf';
