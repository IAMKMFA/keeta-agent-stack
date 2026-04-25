export { RetryableError, NonRetryableError, isRetryableError } from './errors.js';

export function assertNever(x: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected value: ${String(x)}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: { retries: number; delayMs: number }
): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= opts.retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < opts.retries) await sleep(opts.delayMs);
    }
  }
  throw last;
}

export function randomId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
