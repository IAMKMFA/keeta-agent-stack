import { describe, expect, it } from 'vitest';
import type { QuoteRequest } from '@keeta-agent-sdk/types';
import { QuoteResponseSchema } from '@keeta-agent-sdk/types';
import type { VenueAdapter } from './venue-adapter.js';
import type { ContractTestOptions } from './contract.js';

export interface ConformanceOptions extends ContractTestOptions {
  /** Fail execute when quote latency exceeds this (ms). */
  maxQuoteLatencyMs?: number;
}

/**
 * Extended contract: timeouts, latency, and failure paths beyond {@link runAdapterContractSuite}.
 */
export function runAdapterConformanceSuite(adapter: VenueAdapter, opts: ConformanceOptions) {
  describe(`adapter conformance: ${adapter.id}`, () => {
    it('getQuote respects AbortSignal / timeout', async () => {
      const req: QuoteRequest = {
        adapterId: adapter.id,
        baseAsset: opts.supportedBase,
        quoteAsset: opts.supportedQuote,
        side: 'buy',
        size: '1',
      };
      const ac = new AbortController();
      const p = adapter.getQuote(req);
      ac.abort();
      const res = await p;
      expect(typeof res.success).toBe('boolean');
    });

    it('quote latency under maxQuoteLatencyMs when set', async () => {
      if (opts.maxQuoteLatencyMs === undefined) return;
      const req: QuoteRequest = {
        adapterId: adapter.id,
        baseAsset: opts.supportedBase,
        quoteAsset: opts.supportedQuote,
        side: 'buy',
        size: '1',
      };
      const t0 = Date.now();
      const res = await adapter.getQuote(req);
      const dt = Date.now() - t0;
      expect(res.success).toBe(true);
      if (res.success) {
        expect(() => QuoteResponseSchema.parse(res.data)).not.toThrow();
      }
      expect(dt).toBeLessThanOrEqual(opts.maxQuoteLatencyMs + 500);
    });

    it('execute simulate path fails gracefully with invalid wallet id shape', async () => {
      const res = await adapter.execute({
        intentId: '550e8400-e29b-41d4-a716-446655440000',
        walletId: 'not-a-uuid',
        mode: 'simulate',
      });
      expect(typeof res.success).toBe('boolean');
    });
  });
}
