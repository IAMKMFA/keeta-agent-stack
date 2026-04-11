export const dynamic = 'force-dynamic';

function resolveApiBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  return typeof base === 'string' && base.length > 0 ? base.replace(/\/$/, '') : null;
}

export async function GET(request: Request) {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return new Response('NEXT_PUBLIC_API_URL is not configured.', { status: 500 });
  }

  const upstreamUrl = new URL(`${apiBaseUrl}/events/stream`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => upstreamUrl.searchParams.set(key, value));

  const headers = new Headers();
  if (process.env.OPS_API_KEY) {
    headers.set('x-ops-key', process.env.OPS_API_KEY);
  }

  const response = await fetch(upstreamUrl, {
    headers,
    cache: 'no-store',
  });

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
    },
  });
}
