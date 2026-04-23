import { describe, it, expect, beforeAll } from 'vitest';
import {
  CSRF_COOKIE_SIGNED,
  CSRF_HEADER,
  requireSameOriginMutation,
  verifyCsrfToken,
  __signTokenForTest,
} from '../lib/csrf';

beforeAll(() => {
  process.env.DASHBOARD_CSRF_SECRET = 'test-secret-for-vitest-unit-tests';
});

function makeReq(init: {
  method?: string;
  url?: string;
  origin?: string | null;
  referer?: string | null;
  host?: string;
  proto?: string;
  secFetchSite?: string | null;
  cookie?: string | null;
  csrfHeader?: string | null;
  contentType?: string | null;
  body?: string;
}): Request {
  const headers = new Headers();
  if (init.origin) headers.set('origin', init.origin);
  if (init.referer) headers.set('referer', init.referer);
  if (init.host) headers.set('host', init.host);
  if (init.proto) headers.set('x-forwarded-proto', init.proto);
  if (init.secFetchSite) headers.set('sec-fetch-site', init.secFetchSite);
  if (init.cookie) headers.set('cookie', init.cookie);
  if (init.csrfHeader) headers.set(CSRF_HEADER, init.csrfHeader);
  if (init.contentType) headers.set('content-type', init.contentType);
  return new Request(init.url ?? 'https://dashboard.example.com/api/test', {
    method: init.method ?? 'POST',
    headers,
    body: init.body,
  });
}

describe('requireSameOriginMutation', () => {
  it('rejects GET with 405', () => {
    const res = requireSameOriginMutation(
      makeReq({
        method: 'GET',
        origin: 'https://dashboard.example.com',
        host: 'dashboard.example.com',
        proto: 'https',
      })
    );
    expect(res?.status).toBe(405);
  });

  it('allows POST with matching Origin (same-origin)', () => {
    const res = requireSameOriginMutation(
      makeReq({
        method: 'POST',
        origin: 'https://dashboard.example.com',
        host: 'dashboard.example.com',
        proto: 'https',
        secFetchSite: 'same-origin',
      })
    );
    expect(res).toBeNull();
  });

  it('rejects cross-origin POST with 403', () => {
    const res = requireSameOriginMutation(
      makeReq({
        method: 'POST',
        origin: 'https://evil.example.com',
        host: 'dashboard.example.com',
        proto: 'https',
      })
    );
    expect(res?.status).toBe(403);
  });

  it('rejects POST with missing Origin/Referer', () => {
    const res = requireSameOriginMutation(
      makeReq({ method: 'POST', host: 'dashboard.example.com', proto: 'https' })
    );
    expect(res?.status).toBe(403);
  });

  it('rejects Sec-Fetch-Site=cross-site', () => {
    const res = requireSameOriginMutation(
      makeReq({
        method: 'POST',
        origin: 'https://dashboard.example.com',
        host: 'dashboard.example.com',
        proto: 'https',
        secFetchSite: 'cross-site',
      })
    );
    expect(res?.status).toBe(403);
  });

  it('falls back to Referer when Origin is absent', () => {
    const res = requireSameOriginMutation(
      makeReq({
        method: 'POST',
        referer: 'https://dashboard.example.com/command-center',
        host: 'dashboard.example.com',
        proto: 'https',
      })
    );
    expect(res).toBeNull();
  });
});

describe('verifyCsrfToken', () => {
  const token = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';

  it('rejects when x-dashboard-csrf header is missing', async () => {
    const res = await verifyCsrfToken(
      makeReq({ cookie: `${CSRF_COOKIE_SIGNED}=${__signTokenForTest(token)}` })
    );
    expect(res?.status).toBe(403);
    const body = (await res!.json()) as { error: { code: string } };
    expect(body.error.code).toBe('csrf_missing_header');
  });

  it('rejects when cookie is missing', async () => {
    const res = await verifyCsrfToken(makeReq({ csrfHeader: token }));
    expect(res?.status).toBe(403);
    const body = (await res!.json()) as { error: { code: string } };
    expect(body.error.code).toBe('csrf_missing_cookie');
  });

  it('rejects when cookie signature is invalid', async () => {
    const res = await verifyCsrfToken(
      makeReq({
        cookie: `${CSRF_COOKIE_SIGNED}=${token}.deadbeef`,
        csrfHeader: token,
      })
    );
    expect(res?.status).toBe(403);
    const body = (await res!.json()) as { error: { code: string } };
    expect(body.error.code).toBe('csrf_invalid_cookie');
  });

  it('rejects when header does not match cookie token', async () => {
    const res = await verifyCsrfToken(
      makeReq({
        cookie: `${CSRF_COOKIE_SIGNED}=${__signTokenForTest(token)}`,
        csrfHeader: 'different-token-with-same-length-as-expected-xxxxxxxxxxxxxxxxxx',
      })
    );
    expect(res?.status).toBe(403);
    const body = (await res!.json()) as { error: { code: string } };
    expect(body.error.code).toBe('csrf_token_mismatch');
  });

  it('accepts when cookie is signed and header matches', async () => {
    const res = await verifyCsrfToken(
      makeReq({
        cookie: `${CSRF_COOKIE_SIGNED}=${__signTokenForTest(token)}`,
        csrfHeader: token,
      })
    );
    expect(res).toBeNull();
  });
});
