/** Typed failure when Keeta RPC/SDK calls fail or the network is unreachable. */
export class KeetaConnectionError extends Error {
  readonly code = 'KEETA_CONNECTION_ERROR' as const;
  readonly cause?: unknown;
  /** When true, callers may retry with backoff (transient network / node errors). */
  readonly retryable: boolean;

  constructor(message: string, cause?: unknown, retryable = true) {
    super(message);
    this.name = 'KeetaConnectionError';
    this.cause = cause;
    this.retryable = retryable;
  }
}

/** Map SDK/network errors to retryable vs not (best-effort heuristics). */
export function isKeetaErrorRetryable(e: unknown): boolean {
  if (e instanceof KeetaConnectionError) return e.retryable;
  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  if (/timeout|econnreset|econnrefused|network|temporar|rate|503|502|504/.test(msg)) return true;
  if (/invalid|forbidden|unauthorized|bad request|400|401|404/.test(msg)) return false;
  return true;
}
