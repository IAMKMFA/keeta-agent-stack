import { describe, expect, it } from 'vitest';
import { scoreRoute } from './router.js';
import { Router } from './router.js';
import type { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import type { VenueAdapter } from '@keeta-agent-stack/adapter-base';
import type { QuoteRequest } from '@keeta-agent-stack/types';

type RouterTestAdapter = Omit<VenueAdapter, 'execute'>;

function createRegistry(adapters: RouterTestAdapter[]): AdapterRegistry {
  return {
    list() {
      return adapters as VenueAdapter[];
    },
    async discoverAdapters({ limit }: { limit?: number } = {}) {
      const selected = limit === undefined ? adapters : adapters.slice(0, limit);
      return Promise.all(
        selected.map(async (adapter) => ({
          adapter: adapter as VenueAdapter,
          capabilities: await adapter.getCapabilities(),
        }))
      );
    },
  } as unknown as AdapterRegistry;
}

describe('Router scoring', () => {
  it('scoreRoute is deterministic for identical inputs', () => {
    const input = {
      totalFeeBps: 5,
      expectedSlippageBps: 10,
      hopCount: 1,
      healthOk: true,
    };
    expect(scoreRoute(input)).toBe(scoreRoute(input));
  });

  it('prefers lower fees when other factors equal', () => {
    const hi = scoreRoute({
      totalFeeBps: 50,
      expectedSlippageBps: 10,
      hopCount: 1,
      healthOk: true,
    });
    const lo = scoreRoute({
      totalFeeBps: 5,
      expectedSlippageBps: 10,
      hopCount: 1,
      healthOk: true,
    });
    expect(lo).toBeGreaterThan(hi);
  });

  it('can filter adapters during plan construction', async () => {
    const registry = createRegistry([
      {
        id: 'anchor-a',
        kind: 'anchor',
        supportsPair: () => true,
        async getCapabilities() {
          return {
            adapterId: 'anchor-a',
            kind: 'anchor' as const,
            pairs: [{ base: 'USD', quote: 'AED' }],
            features: ['bridge'],
          };
        },
        async getQuote(_request: QuoteRequest) {
          return {
            success: true as const,
            data: {
              adapterId: 'anchor-a',
              baseAsset: 'USD',
              quoteAsset: 'AED',
              side: 'sell' as const,
              sizeIn: '100',
              sizeOut: '99',
              price: '1',
              feeBps: 10,
              expectedSlippageBps: 0,
            },
          };
        },
        async healthCheck() {
          return { adapterId: 'anchor-a', ok: true, checkedAt: new Date().toISOString() };
        },
      },
      {
        id: 'anchor-b',
        kind: 'anchor',
        supportsPair: () => true,
        async getCapabilities() {
          return {
            adapterId: 'anchor-b',
            kind: 'anchor' as const,
            pairs: [{ base: 'USD', quote: 'AED' }],
            features: ['bridge'],
          };
        },
        async getQuote(_request: QuoteRequest) {
          return {
            success: true as const,
            data: {
              adapterId: 'anchor-b',
              baseAsset: 'USD',
              quoteAsset: 'AED',
              side: 'sell' as const,
              sizeIn: '100',
              sizeOut: '98',
              price: '1',
              feeBps: 20,
              expectedSlippageBps: 0,
            },
          };
        },
        async healthCheck() {
          return { adapterId: 'anchor-b', ok: true, checkedAt: new Date().toISOString() };
        },
      },
    ]);

    const router = new Router(registry);
    const built = await router.buildPlans(
      {
        id: '550e8400-e29b-41d4-a716-446655440100',
        walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        baseAsset: 'USD',
        quoteAsset: 'AED',
        side: 'sell',
        size: '100',
        maxSlippageBps: 50,
        mode: 'live',
        createdAt: new Date().toISOString(),
      },
      {
        canUseAdapter: async (adapter) => adapter.id !== 'anchor-b',
        describeAdapter: (adapter) => ({ paymentAnchorId: `anchor-${adapter.id}` }),
      }
    );

    expect(built.best.steps[0]?.adapterId).toBe('anchor-a');
    expect(built.best.steps[0]?.paymentAnchorId).toBe('anchor-anchor-a');
  });

  it('can boost a corridor-fit anchor with adapter-specific scoring', async () => {
    const registry = createRegistry([
      {
        id: 'anchor-exact',
        kind: 'anchor',
        supportsPair: () => true,
        async getCapabilities() {
          return {
            adapterId: 'anchor-exact',
            kind: 'anchor' as const,
            pairs: [{ base: 'USD', quote: 'AED' }],
            features: ['bridge'],
          };
        },
        async getQuote(_request: QuoteRequest) {
          return {
            success: true as const,
            data: {
              adapterId: 'anchor-exact',
              baseAsset: 'USD',
              quoteAsset: 'AED',
              side: 'sell' as const,
              sizeIn: '100',
              sizeOut: '98.5',
              price: '1',
              feeBps: 15,
              expectedSlippageBps: 0,
            },
          };
        },
        async healthCheck() {
          return { adapterId: 'anchor-exact', ok: true, checkedAt: new Date().toISOString() };
        },
      },
      {
        id: 'anchor-unscoped',
        kind: 'anchor',
        supportsPair: () => true,
        async getCapabilities() {
          return {
            adapterId: 'anchor-unscoped',
            kind: 'anchor' as const,
            pairs: [{ base: 'USD', quote: 'AED' }],
            features: ['bridge'],
          };
        },
        async getQuote(_request: QuoteRequest) {
          return {
            success: true as const,
            data: {
              adapterId: 'anchor-unscoped',
              baseAsset: 'USD',
              quoteAsset: 'AED',
              side: 'sell' as const,
              sizeIn: '100',
              sizeOut: '99',
              price: '1',
              feeBps: 10,
              expectedSlippageBps: 0,
            },
          };
        },
        async healthCheck() {
          return { adapterId: 'anchor-unscoped', ok: true, checkedAt: new Date().toISOString() };
        },
      },
    ]);

    const router = new Router(registry);
    const built = await router.buildPlans(
      {
        id: '550e8400-e29b-41d4-a716-446655440101',
        walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        baseAsset: 'USD',
        quoteAsset: 'AED',
        side: 'sell',
        size: '100',
        maxSlippageBps: 50,
        mode: 'live',
        createdAt: new Date().toISOString(),
      },
      {
        describeAdapter: (adapter) => ({
          routingContext: {
            corridorKey: 'USD:AED',
            corridorMatch: adapter.id === 'anchor-exact' ? 'exact' : 'unscoped',
            readinessStatus: 'ready',
            commercialVolumeFeeBps: adapter.id === 'anchor-exact' ? 6 : 2,
            operatorPriority: adapter.id === 'anchor-exact' ? 8 : 0,
            scoreAdjustment: adapter.id === 'anchor-exact' ? 6 : -2,
            scoreAdjustments: [
              {
                source:
                  adapter.id === 'anchor-exact' ? 'corridor_exact_match' : 'commercial_fee_penalty',
                value: adapter.id === 'anchor-exact' ? 12 : -2,
              },
            ],
          },
        }),
        scoreAdapter: async (adapter) => (adapter.id === 'anchor-exact' ? 6 : -2),
      }
    );

    expect(built.best.steps[0]?.adapterId).toBe('anchor-exact');
    expect(built.best.steps[0]?.routingContext?.corridorMatch).toBe('exact');
    expect(built.best.steps[0]?.routingContext?.scoreAdjustment).toBe(6);
  });

  it('builds a multi-hop path when no direct pair exists', async () => {
    const registry = createRegistry([
      {
        id: 'dex-leg-1',
        kind: 'dex',
        supportsPair: (base: string, quote: string) => base === 'KTA' && quote === 'USDC',
        async getCapabilities() {
          return {
            adapterId: 'dex-leg-1',
            kind: 'dex' as const,
            pairs: [{ base: 'KTA', quote: 'USDC' }],
            features: ['swap'],
          };
        },
        async getQuote(_request: QuoteRequest) {
          return {
            success: true as const,
            data: {
              adapterId: 'dex-leg-1',
              baseAsset: 'KTA',
              quoteAsset: 'USDC',
              side: 'sell' as const,
              sizeIn: '100',
              sizeOut: '101',
              price: '1.01',
              feeBps: 8,
              expectedSlippageBps: 4,
            },
          };
        },
        async healthCheck() {
          return { adapterId: 'dex-leg-1', ok: true, checkedAt: new Date().toISOString() };
        },
      },
      {
        id: 'anchor-leg-2',
        kind: 'anchor',
        supportsPair: (base: string, quote: string) => base === 'USDC' && quote === 'AED',
        async getCapabilities() {
          return {
            adapterId: 'anchor-leg-2',
            kind: 'anchor' as const,
            pairs: [{ base: 'USDC', quote: 'AED' }],
            features: ['bridge'],
          };
        },
        async getQuote(request: QuoteRequest) {
          return {
            success: true as const,
            data: {
              adapterId: 'anchor-leg-2',
              baseAsset: 'USDC',
              quoteAsset: 'AED',
              side: 'sell' as const,
              sizeIn: request.size,
              sizeOut: '100.5',
              price: '0.995',
              feeBps: 6,
              expectedSlippageBps: 1,
            },
          };
        },
        async healthCheck() {
          return { adapterId: 'anchor-leg-2', ok: true, checkedAt: new Date().toISOString() };
        },
      },
    ]);

    const router = new Router(registry, { maxQuotes: 8, maxHops: 2 });
    const built = await router.buildPlans({
      id: '550e8400-e29b-41d4-a716-446655440102',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      baseAsset: 'KTA',
      quoteAsset: 'AED',
      side: 'sell',
      size: '100',
      maxSlippageBps: 50,
      mode: 'live',
      createdAt: new Date().toISOString(),
    });

    expect(built.best.hopCount).toBe(2);
    expect(built.best.steps.map((step) => step.adapterId)).toEqual(['dex-leg-1', 'anchor-leg-2']);
    expect(built.best.steps[1]?.sizeIn).toBe('101');
    expect(built.best.totalFeeBps).toBe(14);
    expect(built.best.expectedSlippageBps).toBe(5);
  });
});
