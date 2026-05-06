export type SafeFetchFailureReason =
  | 'not-configured'
  | 'invalid-url'
  | 'timeout'
  | 'http-error'
  | 'parse-error'
  | 'network-error'
  | 'too-large';

export interface SafeFetchSuccess<T> {
  readonly ok: true;
  readonly url: string;
  readonly status: number;
  readonly data: T;
}

export interface SafeFetchFailure {
  readonly ok: false;
  readonly url?: string;
  readonly status?: number;
  readonly reason: SafeFetchFailureReason;
}

export type SafeFetchResult<T> = SafeFetchSuccess<T> | SafeFetchFailure;

export interface SafeFetchOptions {
  readonly baseUrl?: string;
  readonly path: string;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 3500;
const DEFAULT_MAX_BYTES = 250_000;

function resolvePublicUrl(baseUrl: string | undefined, path: string): string | undefined {
  if (!baseUrl) return undefined;
  try {
    return new URL(path, `${baseUrl.replace(/\/$/, '')}/`).toString();
  } catch {
    return undefined;
  }
}

export async function safeFetchText(options: SafeFetchOptions): Promise<SafeFetchResult<string>> {
  const url = resolvePublicUrl(options.baseUrl, options.path);
  if (!options.baseUrl) return { ok: false, reason: 'not-configured' };
  if (!url) return { ok: false, reason: 'invalid-url' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json, text/plain;q=0.8, */*;q=0.1' },
    });

    if (!response.ok) {
      return { ok: false, url, status: response.status, reason: 'http-error' };
    }

    const text = await response.text();
    if (text.length > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
      return { ok: false, url, status: response.status, reason: 'too-large' };
    }

    return { ok: true, url, status: response.status, data: text };
  } catch (error) {
    const reason =
      error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network-error';
    return { ok: false, url, reason };
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeFetchJson<T = unknown>(
  options: SafeFetchOptions
): Promise<SafeFetchResult<T>> {
  const text = await safeFetchText(options);
  if (!text.ok) return text;

  try {
    return {
      ok: true,
      url: text.url,
      status: text.status,
      data: JSON.parse(text.data) as T,
    };
  } catch {
    return { ok: false, url: text.url, status: text.status, reason: 'parse-error' };
  }
}
