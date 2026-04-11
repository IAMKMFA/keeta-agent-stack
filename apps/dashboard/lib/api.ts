const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

export function isApiConfigured(): boolean {
  return Boolean(base);
}

export function resolveUrl(path: string): string | null {
  if (!base) return null;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function fetchJson<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);
  if (!url) return fallback;
  try {
    const res = await fetch(url, { cache: 'no-store', ...init });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  return fetchJson<T>(path, fallback, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  });
}

function readErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const error = (payload as { error?: unknown }).error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string' && message.length > 0) return message;
  return null;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not set.');
  }
  const res = await fetch(url, { cache: 'no-store', ...init });
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message = readErrorMessage(payload) ?? `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return payload as T;
}
