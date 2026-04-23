import { describe, expect, it } from 'vitest';
import { MockDexAdapter } from '@keeta-agent-sdk/adapter-mock-dex';
import { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import type { ExecutionIntent } from '@keeta-agent-sdk/types';
import { createKeetaAgent } from './factory.js';

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
