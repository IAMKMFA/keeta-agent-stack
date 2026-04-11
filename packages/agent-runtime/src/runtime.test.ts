import { describe, expect, it } from 'vitest';
import { MockDexAdapter } from '@keeta-agent-sdk/adapter-mock-dex';
import { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import type { ExecutionIntent } from '@keeta-agent-sdk/types';
import { AgentRuntime } from './runtime.js';

function createIntent(): ExecutionIntent {
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
  };
}

function createRuntime() {
  const registry = new AdapterRegistry();
  registry.register(
    new MockDexAdapter({
      id: 'mock-dex',
      spreadBps: 10,
      feeBps: 5,
      maxSlippageBps: 4,
      failureRate: 0,
      seed: 'agent-runtime-test',
    })
  );

  return new AgentRuntime({
    registry,
    policy: {
      maxOrderSize: 1_000_000,
      maxSlippageBps: 500,
      venueAllowlist: [],
      assetAllowlist: [],
      liveModeEnabled: true,
    },
  });
}

describe('AgentRuntime hooks', () => {
  it('lets hooks annotate the quote and route pipeline context', async () => {
    const registry = new AdapterRegistry();
    registry.register(
      new MockDexAdapter({
        id: 'mock-dex',
        spreadBps: 10,
        feeBps: 5,
        maxSlippageBps: 4,
        failureRate: 0,
        seed: 'agent-runtime-hook-quote',
      })
    );

    const runtime = new AgentRuntime({
      registry,
      policy: {
        maxOrderSize: 1_000_000,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
      hooks: {
        beforeQuote: (ctx) => {
          ctx.metadata.trace = 'quote-started';
        },
        afterRoute: (ctx) => {
          ctx.metadata.bestRouteId = ctx.routes?.best.id;
        },
      },
    });

    const built = await runtime.quoteAndRoute(createIntent());

    expect(built.best.steps).toHaveLength(1);
    expect(built.best.id).toBeTypeOf('string');
  });

  it('surfaces policy decisions through synchronous hooks', () => {
    const seen: string[] = [];
    const runtime = new AgentRuntime({
      registry: (() => {
        const registry = new AdapterRegistry();
        registry.register(
          new MockDexAdapter({
            id: 'mock-dex',
            spreadBps: 10,
            feeBps: 5,
            maxSlippageBps: 4,
            failureRate: 0,
            seed: 'agent-runtime-hook-policy',
          })
        );
        return registry;
      })(),
      policy: {
        maxOrderSize: 1_000_000,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
      hooks: {
        beforePolicy: (ctx) => {
          seen.push(`before:${ctx.intent.id}`);
        },
        afterPolicy: (ctx) => {
          seen.push(`after:${ctx.policyDecision?.allowed}`);
        },
      },
    });

    const decision = runtime.evaluatePolicy(createIntent());

    expect(decision.allowed).toBe(true);
    expect(seen).toEqual([`before:${createIntent().id}`, 'after:true']);
  });

  it('rejects async policy hooks because policy evaluation is synchronous', () => {
    const runtime = new AgentRuntime({
      registry: (() => {
        const registry = new AdapterRegistry();
        registry.register(
          new MockDexAdapter({
            id: 'mock-dex',
            spreadBps: 10,
            feeBps: 5,
            maxSlippageBps: 4,
            failureRate: 0,
            seed: 'agent-runtime-hook-async-policy',
          })
        );
        return registry;
      })(),
      policy: {
        maxOrderSize: 1_000_000,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
      hooks: {
        beforePolicy: async () => {
          await Promise.resolve();
        },
      },
    });

    expect(() => runtime.evaluatePolicy(createIntent())).toThrow(
      'Async hooks are not supported for synchronous policy evaluation'
    );
  });

  it('runs execute hooks even when executeLive throws its infrastructure guard error', async () => {
    const seen: string[] = [];
    const runtime = createRuntime();
    const { best } = await runtime.quoteAndRoute(createIntent());
    const hookedRuntime = new AgentRuntime({
      registry: (() => {
        const registry = new AdapterRegistry();
        registry.register(
          new MockDexAdapter({
            id: 'mock-dex',
            spreadBps: 10,
            feeBps: 5,
            maxSlippageBps: 4,
            failureRate: 0,
            seed: 'agent-runtime-hook-execute',
          })
        );
        return registry;
      })(),
      policy: {
        maxOrderSize: 1_000_000,
        maxSlippageBps: 500,
        venueAllowlist: [],
        assetAllowlist: [],
        liveModeEnabled: true,
      },
      hooks: {
        beforeExecute: () => {
          seen.push('before');
        },
        afterExecute: () => {
          seen.push('after');
        },
      },
    });

    await expect(hookedRuntime.executeLive(createIntent(), best, {} as never)).rejects.toThrow(
      'Live execution must be invoked from worker/API with injected signer'
    );
    expect(seen).toEqual(['before', 'after']);
  });
});
