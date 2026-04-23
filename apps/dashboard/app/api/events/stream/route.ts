import { requireRole, forwardedAuthHeaders } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveApiBaseUrl(): string | null {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  return typeof base === 'string' && base.length > 0 ? base.replace(/\/$/, '') : null;
}

/**
 * Hardened SSE proxy — dashboard-owned path only.
 *
 * Browsers MUST connect via `new EventSource('/api/events/stream')`. They
 * MUST NOT open an EventSource against the upstream API directly; the
 * proxy exists so this route can:
 *  1. Verify the viewer is at least admin/operator (three-layer guard —
 *     nav hides, layout guards, and this API guard enforces).
 *  2. Use `OPS_API_KEY` **server-side only** to authenticate to the upstream
 *     API; the key never reaches the browser.
 *  3. Forward client cookies / bearer token so the upstream API can
 *     perform its own authorization on the same viewer.
 *  4. Close the upstream connection via AbortController when the browser
 *     disconnects.
 *
 * The rule is enforced by `apps/dashboard/scripts/check-duplicate-routes.ts`,
 * which fails the build if a client component constructs an EventSource
 * with anything other than a relative `/api/...` string literal.
 */
export async function GET(request: Request) {
  await requireRole(['admin', 'operator']);

  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return new Response('API_URL is not configured.', { status: 500 });
  }

  const upstreamUrl = new URL(`${apiBaseUrl}/events/stream`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => upstreamUrl.searchParams.set(key, value));

  const forwarded = (await forwardedAuthHeaders()) ?? {};
  const headers = new Headers(forwarded as HeadersInit);
  headers.set('accept', 'text/event-stream');
  // Server-only service credential for the upstream hop; never exposed to the client.
  if (process.env.OPS_API_KEY) {
    headers.set('x-ops-key', process.env.OPS_API_KEY);
  }

  const upstreamAbort = new AbortController();
  request.signal.addEventListener('abort', () => upstreamAbort.abort());

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      headers,
      cache: 'no-store',
      signal: upstreamAbort.signal,
    });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : 'Upstream event stream failed',
      { status: 502 }
    );
  }

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => 'Unable to connect to event stream.');
    return new Response(body, { status: response.status || 502 });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
