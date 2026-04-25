import { describe, expect, it } from 'vitest';
import type { VenueAdapter } from '@keeta-agent-stack/adapter-base';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-stack/types';
import { AdapterRegistry } from './registry.js';

function createAdapter(input: {
  id: string;
  kind: VenueAdapter['kind'];
  pairs: CapabilityMap['pairs'];
  features: string[];
}): VenueAdapter {
  return {
    id: input.id,
    kind: input.kind,
    async healthCheck(): Promise<AdapterHealth> {
      return {
        adapterId: input.id,
        ok: true,
        checkedAt: new Date().toISOString(),
      };
    },
    async getCapabilities(): Promise<CapabilityMap> {
      return {
        adapterId: input.id,
        kind: input.kind,
        pairs: input.pairs,
        features: input.features,
      };
    },
    supportsPair(baseAsset: string, quoteAsset: string): boolean {
      return input.pairs.some((pair) => pair.base === baseAsset && pair.quote === quoteAsset);
    },
    async getQuote(_request: QuoteRequest) {
      return {
        success: false as const,
        code: 'TEST_ONLY',
        message: 'test adapter does not quote',
      };
    },
    async execute() {
      return {
        success: false as const,
        code: 'TEST_ONLY',
        message: 'test adapter does not execute',
      };
    },
  };
}

describe('AdapterRegistry discovery', () => {
  it('discovers supported pairs and assets across adapters', async () => {
    const registry = new AdapterRegistry();
    registry.register(
      createAdapter({
        id: 'dex-a',
        kind: 'dex',
        pairs: [{ base: 'KTA', quote: 'USDC' }],
        features: ['swap', 'quote'],
      })
    );
    registry.register(
      createAdapter({
        id: 'anchor-a',
        kind: 'anchor',
        pairs: [{ base: 'USDC', quote: 'USD' }],
        features: ['bridge'],
      })
    );

    await expect(registry.listPairs()).resolves.toEqual([
      { base: 'KTA', quote: 'USDC' },
      { base: 'USDC', quote: 'USD' },
    ]);
    await expect(registry.listAssets()).resolves.toEqual(['KTA', 'USDC', 'USD']);
  });

  it('filters adapters by kind, pair, and feature', async () => {
    const registry = new AdapterRegistry();
    registry.register(
      createAdapter({
        id: 'dex-a',
        kind: 'dex',
        pairs: [{ base: 'KTA', quote: 'USDC' }],
        features: ['swap', 'quote'],
      })
    );
    registry.register(
      createAdapter({
        id: 'dex-b',
        kind: 'dex',
        pairs: [{ base: 'ETH', quote: 'USDC' }],
        features: ['swap'],
      })
    );
    registry.register(
      createAdapter({
        id: 'anchor-a',
        kind: 'anchor',
        pairs: [{ base: 'USDC', quote: 'USD' }],
        features: ['bridge'],
      })
    );

    await expect(registry.findAdapters({ kind: 'dex' })).resolves.toHaveLength(2);
    await expect(
      registry.findAdapters({ pair: { base: 'KTA', quote: 'USDC' } })
    ).resolves.toMatchObject([{ id: 'dex-a' }]);
    await expect(registry.findAdapters({ kind: 'dex', feature: 'quote' })).resolves.toMatchObject([
      { id: 'dex-a' },
    ]);
  });
});
