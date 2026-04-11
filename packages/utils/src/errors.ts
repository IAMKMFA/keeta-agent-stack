/** Base for failures that may succeed on retry (network, rate limit). */
export class RetryableError extends Error {
  readonly retryable = true as const;
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'RetryableError';
    this.code = code;
  }
}

/** Failures that should not be retried (validation, policy, permanent RPC errors). */
export class NonRetryableError extends Error {
  readonly retryable = false as const;
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'NonRetryableError';
    this.code = code;
  }
}

export function isRetryableError(e: unknown): boolean {
  if (e && typeof e === 'object' && 'retryable' in e && (e as { retryable: boolean }).retryable === true) {
    return true;
  }
  return false;
}
