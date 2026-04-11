import { describe, expect, it } from 'vitest';
import type { QuoteRequest } from '@keeta-agent-sdk/types';
import {
  AdapterHealthSchema,
  CapabilityMapSchema,
  ExecutionResultSchema,
  QuoteResponseSchema,
} from '@keeta-agent-sdk/types';
import type { VenueAdapter } from './venue-adapter.js';

export interface ContractTestOptions {
  /** Pair that must be supported for quote/execute paths */
  supportedBase: string;
  supportedQuote: string;
  /** Pair that should be unsupported or return structured failure */
  unsupportedBase: string;
  unsupportedQuote: string;
}

/**
 * Shared contract every adapter implementation should satisfy.
 * Call from each adapter's `*.contract.test.ts` via `describe(...)`.
 */
export function runAdapterContractSuite(adapter: VenueAdapter, opts: ContractTestOptions) {
  describe(`adapter contract: ${adapter.id}`, () => {
    it('healthCheck returns valid AdapterHealth', async () => {
      const h = await adapter.healthCheck();
      expect(() => AdapterHealthSchema.parse(h)).not.toThrow();
      expect(h.adapterId).toBe(adapter.id);
    });

    it('getCapabilities returns valid CapabilityMap', async () => {
      const c = await adapter.getCapabilities();
      expect(() => CapabilityMapSchema.parse(c)).not.toThrow();
    });

    it('supportsPair is boolean', () => {
      expect(typeof adapter.supportsPair(opts.supportedBase, opts.supportedQuote)).toBe('boolean');
    });

    it('getQuote for supported pair returns valid QuoteResponse', async () => {
      const req: QuoteRequest = {
        adapterId: adapter.id,
        baseAsset: opts.supportedBase,
        quoteAsset: opts.supportedQuote,
        side: 'buy',
        size: '1',
      };
      const res = await adapter.getQuote(req);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(() => QuoteResponseSchema.parse(res.data)).not.toThrow();
      }
    });

    it('getQuote for unsupported pair returns structured failure', async () => {
      const req: QuoteRequest = {
        adapterId: adapter.id,
        baseAsset: opts.unsupportedBase,
        quoteAsset: opts.unsupportedQuote,
        side: 'buy',
        size: '1',
      };
      const res = await adapter.getQuote(req);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBeTruthy();
        expect(res.message).toBeTruthy();
      }
    });

    it('execute returns valid ExecutionResult on simulate path', async () => {
      const res = await adapter.execute({
        intentId: '550e8400-e29b-41d4-a716-446655440000',
        walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        mode: 'simulate',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(() => ExecutionResultSchema.parse(res.data)).not.toThrow();
      }
    });
  });
}
