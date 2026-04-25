import { describe, expect, it } from 'vitest';
import { MockDexAdapter } from '@keeta-agent-stack/adapter-mock-dex';
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import type { EventStreamEvent, ExecutionIntent } from '@keeta-agent-stack/types';
import { createKeetaAgent, type KeetaSDK } from './factory.js';

function createIntent(overrides: Partial<ExecutionIntent> = {}): ExecutionIntent {
  return {
    id: '550e8400-e29b-41d4-a716-446655440123',
    walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    baseAsset: 'KTA',
    quoteAsset: 'USDC',
    side: 'sell',
    size: '25',
    maxSlippageBps: 50,
    mode: 'simulate',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildRegistry(seed: string) {
  const registry = new AdapterRegistry();
  registry.register(
    new MockDexAdapter({
      id: 'mock-dex',
      spreadBps: 10,
      feeBps: 5,
      maxSlippageBps: 4,
      failureRate: 0,
      seed,
    })
  );
  return registry;
}

describe('createKeetaAgent (offline mode)', () => {
  it('runs the route → policy → simulate pipeline and returns kind=simulated', async () => {
    const seen: string[] = [];

    const agent = createKeetaAgent({
      name: 'tutorial-paper-trader',
      registry: buildRegistry('factory-simulate'),
      policy: {
        maxOrderSize: 1_000_000,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
      simulationScenario: {
        label: 'factory-strategy',
        fidelityMode: 'standard',
        volatility: 0,
        latencyMs: 0,
        failureProbability: 0,
        slippageMultiplier: 3,
      },
      hooks: {
        onIntent: (ctx) => {
          seen.push(`intent:${ctx.intent.id}`);
        },
        beforeRoute: () => {
          seen.push('beforeRoute');
        },
        afterRoute: (ctx) => {
          seen.push(`afterRoute:${ctx.routes?.best.steps.length}`);
        },
        beforePolicy: () => {
          seen.push('beforePolicy');
        },
        afterPolicy: (ctx) => {
          seen.push(`afterPolicy:${ctx.policyDecision?.allowed}`);
        },
        beforeSimulation: () => {
          seen.push('beforeSimulation');
        },
        afterSimulation: () => {
          seen.push('afterSimulation');
        },
      },
    });

    const result = await agent.execute(createIntent());

    expect(result.kind).toBe('simulated');
    if (result.kind === 'simulated') {
      expect(result.route.steps.length).toBeGreaterThan(0);
      expect(result.detail.success).toBeDefined();
      expect(result.detail.scenario).toMatchObject({
        label: 'factory-strategy',
        slippageMultiplier: 3,
      });
    }
    expect(seen[0]).toBe(`intent:${createIntent().id}`);
    expect(seen).toContain('beforeRoute');
    expect(seen).toContain('afterRoute:1');
    expect(seen).toContain('afterPolicy:true');
    expect(seen).toContain('beforeSimulation');
    expect(seen).toContain('afterSimulation');
  });

  it('returns kind=denied when policy rejects the intent', async () => {
    const agent = createKeetaAgent({
      name: 'tutorial-strict',
      registry: buildRegistry('factory-deny'),
      policy: {
        maxOrderSize: 1,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
    });

    const result = await agent.execute(createIntent({ size: '500' }));

    expect(result.kind).toBe('denied');
    if (result.kind === 'denied') {
      expect(result.detail.allowed).toBe(false);
      expect(result.detail.contributions.length).toBeGreaterThan(0);
    }
  });

  it('returns kind=failed without an SDK when intent.mode=live and no offline path can simulate', async () => {
    const agent = createKeetaAgent({
      name: 'tutorial-no-sdk',
    });

    const result = await agent.execute(createIntent({ mode: 'live' }));
    expect(result.kind).toBe('failed');
    if (result.kind === 'failed') {
      expect(result.detail.error).toMatch(/No SDK supplied/);
    }
  });

  it('runs onError when the offline pipeline throws', async () => {
    const captured: unknown[] = [];
    const agent = createKeetaAgent({
      name: 'tutorial-throws',
      registry: buildRegistry('factory-throws'),
      policy: {
        maxOrderSize: 1_000_000,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
      hooks: {
        onIntent: () => {
          throw new Error('synthetic hook failure');
        },
        onError: (ctx) => {
          captured.push(ctx.metadata.error);
        },
      },
    });

    const result = await agent.execute(createIntent());
    expect(result.kind).toBe('failed');
    if (result.kind === 'failed') {
      expect(result.detail.error).toBe('synthetic hook failure');
    }
    expect(captured).toHaveLength(1);
  });
});

describe('createKeetaAgent (SDK execution)', () => {
  it('recovers a terminal event emitted before the stream subscription observes it', async () => {
    const events: EventStreamEvent[] = [];
    const streamParams: Array<{ intentId?: string; after?: string }> = [];
    const listParams: Array<{ intentId?: string; after?: string }> = [];
    const agent = createKeetaAgent({
      name: 'live-fast-worker',
      sdk: {
        createIntent: async (body) => ({
          ...body,
          id: '550e8400-e29b-41d4-a716-446655440999',
          createdAt: new Date().toISOString(),
        }),
        quoteIntent: async () => ({ jobId: 'quote-job', queue: 'quote' }),
        routeIntent: async () => ({ jobId: 'route-job', queue: 'route' }),
        policyIntent: async () => ({ jobId: 'policy-job', queue: 'policy' }),
        executeIntent: async (intentId) => {
          events.push({
            id: '550e8400-e29b-41d4-a716-446655440998',
            source: 'audit',
            eventType: 'execution.confirmed',
            intentId,
            executionId: '550e8400-e29b-41d4-a716-446655440997',
            payload: {},
            createdAt: new Date().toISOString(),
          });
          return { jobId: 'execute-job', queue: 'execute' };
        },
        subscribeEvents: (params = {}) => {
          streamParams.push(params);
          let resolveDone!: () => void;
          return {
            close: () => resolveDone(),
            done: new Promise<void>((resolve) => {
              resolveDone = resolve;
            }),
          };
        },
        listEvents: async (params = {}) => {
          listParams.push(params);
          const afterMs = params.after ? Date.parse(params.after) : 0;
          return {
            events: events.filter(
              (event) =>
                (!params.intentId || event.intentId === params.intentId) &&
                Date.parse(event.createdAt) >= afterMs
            ),
          };
        },
      } as Partial<KeetaSDK> as KeetaSDK,
      pollTimeoutMs: 1,
    });

    const result = await agent.execute(createIntent({ mode: 'live' }));

    expect(streamParams[0]?.after).toBeDefined();
    expect(listParams[0]?.after).toBe(streamParams[0]?.after);
    expect(result.kind).toBe('executed');
    if (result.kind === 'executed') {
      expect(result.executionId).toBe('550e8400-e29b-41d4-a716-446655440997');
      expect(result.events).toHaveLength(1);
    }
  });

  it('returns pending instead of executed when no terminal event is observed', async () => {
    const agent = createKeetaAgent({
      name: 'live-no-terminal-event',
      sdk: {
        createIntent: async (body) => ({
          ...body,
          id: '550e8400-e29b-41d4-a716-446655440888',
          createdAt: new Date().toISOString(),
        }),
        quoteIntent: async () => ({ jobId: 'quote-job', queue: 'quote' }),
        routeIntent: async () => ({ jobId: 'route-job', queue: 'route' }),
        policyIntent: async () => ({ jobId: 'policy-job', queue: 'policy' }),
        executeIntent: async () => ({ jobId: 'execute-job', queue: 'execute' }),
        subscribeEvents: () => {
          let resolveDone!: () => void;
          return {
            close: () => resolveDone(),
            done: new Promise<void>((resolve) => {
              resolveDone = resolve;
            }),
          };
        },
        listEvents: async () => ({ events: [] }),
      } as Partial<KeetaSDK> as KeetaSDK,
      pollTimeoutMs: 1,
    });

    const result = await agent.execute(createIntent({ mode: 'live' }));

    expect(result.kind).toBe('pending');
    if (result.kind === 'pending') {
      expect(result.detail.reason).toMatch(/Timed out/);
      expect(result.events).toEqual([]);
    }
  });
});
