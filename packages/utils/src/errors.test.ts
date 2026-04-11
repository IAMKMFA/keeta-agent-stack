import { describe, expect, it } from 'vitest';
import { RetryableError, NonRetryableError, isRetryableError } from './errors.js';

describe('errors', () => {
  it('classifies retryable', () => {
    expect(isRetryableError(new RetryableError('X', 'msg'))).toBe(true);
    expect(isRetryableError(new NonRetryableError('X', 'msg'))).toBe(false);
  });
});
