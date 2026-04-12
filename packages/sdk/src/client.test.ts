import { describe, expect, it } from 'vitest';
import { createClient } from './client.js';

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFetchStub(
  responder: (url: string, init?: RequestInit) => Response | Promise<Response>
): { calls: FetchCall[]; fetchImpl: typeof fetch } {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, init });
    return responder(url, init);
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe('createClient control-plane parity', () => {
  it('approves, holds, and releases intents through the existing endpoints', async () => {
    const { calls, fetchImpl } = createFetchStub((url) => {
      if (
        url.endsWith('/intents/intent-1/approve') ||
        url.endsWith('/intents/intent-1/hold') ||
        url.endsWith('/intents/intent-1/release')
      ) {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await client.approveIntent('intent-1');
    await client.holdIntent('intent-1');
    await client.releaseIntent('intent-1');

    expect(calls).toHaveLength(3);
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.example.com/intents/intent-1/approve',
      'https://api.example.com/intents/intent-1/hold',
      'https://api.example.com/intents/intent-1/release',
    ]);
    expect(calls.every((call) => call.init?.method === 'POST')).toBe(true);
  });

  it('registers route overrides with the existing override payload', async () => {
    const { calls, fetchImpl } = createFetchStub((url) => {
      expect(url).toBe('https://api.example.com/intents/intent-1/override-route');
      return jsonResponse({ routePlanId: 'route-1' }, 201);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    const result = await client.registerRouteOverride('intent-1', { routePlanId: 'route-1' });

    expect(result).toEqual({ routePlanId: 'route-1' });
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ routePlanId: 'route-1' }));
  });

  it('retrieves wallet balances from the existing wallet balances route', async () => {
    const balances = {
      snapshots: [
        {
          id: '550e8400-e29b-41d4-a716-446655440041',
          walletId: '550e8400-e29b-41d4-a716-446655440042',
          assetId: '550e8400-e29b-41d4-a716-446655440043',
          amount: '10',
          capturedAt: new Date().toISOString(),
        },
      ],
      keeta: [{ assetId: 'KTA', amount: '100' }],
      network: 'test',
    };
    const { calls, fetchImpl } = createFetchStub((url) => {
      expect(url).toBe('https://api.example.com/wallets/wallet-1/balances');
      return jsonResponse(balances);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.getWalletBalances('wallet-1')).resolves.toEqual(balances);
    expect(calls[0]?.init?.method).toBeUndefined();
  });

  it('retrieves chain health, config modes, strategy templates, and ops metrics', async () => {
    const createdAt = new Date().toISOString();
    const { fetchImpl } = createFetchStub((url) => {
      if (url.endsWith('/chain/health')) {
        return jsonResponse({
          network: 'test',
          measuredAt: createdAt,
          latencyMs: 10,
          ok: true,
          apiLatencyMs: 12,
          networkInfo: { baseToken: 'KTA', networkAddress: 'keeta_network' },
        });
      }
      if (url.endsWith('/config/modes')) {
        return jsonResponse({
          liveMode: false,
          keetaNetwork: 'test',
          mockAdapters: true,
          executionKillSwitch: false,
        });
      }
      if (url.endsWith('/strategy-templates')) {
        return jsonResponse([
          {
            id: '550e8400-e29b-41d4-a716-446655440044',
            name: 'Paper Trader',
            config: {},
            slug: 'paper-trader',
            description: 'Demo template',
            isTemplate: true,
            paused: false,
            createdAt,
          },
        ]);
      }
      if (url.endsWith('/ops/metrics')) {
        return jsonResponse({
          samples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440045',
              name: 'orders_total',
              labels: { adapterId: 'mock-dex' },
              value: 3,
              capturedAt: createdAt,
            },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.getChainHealth()).resolves.toMatchObject({ ok: true, network: 'test' });
    await expect(client.getConfigModes()).resolves.toMatchObject({ keetaNetwork: 'test', mockAdapters: true });
    await expect(client.getStrategyTemplates()).resolves.toHaveLength(1);
    await expect(client.getOpsMetrics()).resolves.toMatchObject({ samples: [{ name: 'orders_total' }] });
  });

  it('creates, lists, updates, and deletes policy packs through the policy admin routes', async () => {
    const now = new Date().toISOString();
    const { calls, fetchImpl } = createFetchStub((url, init) => {
      if (url.endsWith('/policy/packs') && init?.method === undefined) {
        return jsonResponse([
          {
            id: '550e8400-e29b-41d4-a716-446655440051',
            name: 'desk-risk',
            description: 'Desk policy pack',
            rules: [],
            compositions: [],
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
      if (url.endsWith('/policy/packs') && init?.method === 'POST') {
        return jsonResponse({
          id: '550e8400-e29b-41d4-a716-446655440051',
          name: 'desk-risk',
          description: 'Desk policy pack',
          rules: [],
          compositions: [],
          createdAt: now,
          updatedAt: now,
        }, 201);
      }
      if (url.endsWith('/policy/packs/550e8400-e29b-41d4-a716-446655440051') && init?.method === 'PATCH') {
        return jsonResponse({
          id: '550e8400-e29b-41d4-a716-446655440051',
          name: 'desk-risk-v2',
          description: 'Updated',
          rules: [],
          compositions: [],
          createdAt: now,
          updatedAt: now,
        });
      }
      if (url.endsWith('/policy/packs/550e8400-e29b-41d4-a716-446655440051') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.listPolicyPacks()).resolves.toHaveLength(1);
    await expect(
      client.createPolicyPack({
        name: 'desk-risk',
        description: 'Desk policy pack',
        rules: [],
        compositions: [],
      })
    ).resolves.toMatchObject({ name: 'desk-risk' });
    await expect(
      client.updatePolicyPack('550e8400-e29b-41d4-a716-446655440051', {
        name: 'desk-risk-v2',
        description: 'Updated',
      })
    ).resolves.toMatchObject({ name: 'desk-risk-v2' });
    await expect(client.deletePolicyPack('550e8400-e29b-41d4-a716-446655440051')).resolves.toBeUndefined();

    expect(calls.map((call) => call.init?.method ?? 'GET')).toEqual(['GET', 'POST', 'PATCH', 'DELETE']);
  });

  it('passes policyPackId through policy preview requests and returns applied-pack metadata', async () => {
    const now = new Date().toISOString();
    const { calls, fetchImpl } = createFetchStub((url) => {
      expect(url).toBe('https://api.example.com/policy/evaluate');
      return jsonResponse({
        decision: {
          intentId: '550e8400-e29b-41d4-a716-446655440052',
          allowed: true,
          summary: 'Allowed by policy pack',
          contributions: [],
          evaluatedAt: now,
        },
        rules: [],
        effectiveConfig: {
          maxOrderSize: 1000,
          maxSlippageBps: 500,
          venueAllowlist: [],
          assetAllowlist: [],
          liveModeEnabled: true,
        },
        policyPack: {
          id: '550e8400-e29b-41d4-a716-446655440053',
          name: 'desk-risk',
          source: 'request',
        },
        policyPackWarnings: ['warning'],
      });
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(
      client.evaluatePolicy({
        reason: 'preview',
        intent: {
          id: '550e8400-e29b-41d4-a716-446655440052',
          walletId: '550e8400-e29b-41d4-a716-446655440054',
          baseAsset: 'KTA',
          quoteAsset: 'USDC',
          side: 'sell',
          size: '10',
          maxSlippageBps: 25,
          mode: 'simulate',
          createdAt: now,
        },
        policyPackId: '550e8400-e29b-41d4-a716-446655440053',
      })
    ).resolves.toMatchObject({
      policyPack: {
        id: '550e8400-e29b-41d4-a716-446655440053',
        source: 'request',
      },
      policyPackWarnings: ['warning'],
    });

    expect(calls[0]?.init?.body).toContain('"policyPackId":"550e8400-e29b-41d4-a716-446655440053"');
  });

  it('gets, sets, and clears a strategy policy pack assignment', async () => {
    const { calls, fetchImpl } = createFetchStub((url, init) => {
      if (url.endsWith('/ops/strategies/strategy-1/policy-pack') && init?.method === undefined) {
        return jsonResponse({ strategyId: 'strategy-1', policyPackId: null });
      }
      if (url.endsWith('/ops/strategies/strategy-1/policy-pack') && init?.method === 'PUT') {
        return jsonResponse({
          strategyId: 'strategy-1',
          policyPackId: '550e8400-e29b-41d4-a716-446655440055',
        });
      }
      if (url.endsWith('/ops/strategies/strategy-1/policy-pack') && init?.method === 'DELETE') {
        return jsonResponse({ strategyId: 'strategy-1', policyPackId: null });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.getStrategyPolicyPack('strategy-1')).resolves.toEqual({
      strategyId: 'strategy-1',
      policyPackId: null,
    });
    await expect(
      client.setStrategyPolicyPack('strategy-1', '550e8400-e29b-41d4-a716-446655440055')
    ).resolves.toEqual({
      strategyId: 'strategy-1',
      policyPackId: '550e8400-e29b-41d4-a716-446655440055',
    });
    await expect(client.clearStrategyPolicyPack('strategy-1')).resolves.toEqual({
      strategyId: 'strategy-1',
      policyPackId: null,
    });

    expect(calls.map((call) => call.init?.method ?? 'GET')).toEqual(['GET', 'PUT', 'DELETE']);
  });

  it('lists events with payment-anchor filters against the existing events route', async () => {
    const { calls, fetchImpl } = createFetchStub((url) => {
      expect(url).toContain('/events?');
      return jsonResponse({ events: [] });
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(
      client.listEvents({
        after: '2026-01-01T00:00:00.000Z',
        eventType: 'execution.completed',
        intentId: '550e8400-e29b-41d4-a716-446655440046',
        paymentAnchorId: '550e8400-e29b-41d4-a716-446655440047',
        limit: 25,
      })
    ).resolves.toEqual({ events: [] });

    expect(calls[0]?.url).toBe(
      'https://api.example.com/events?after=2026-01-01T00%3A00%3A00.000Z&eventType=execution.completed&intentId=550e8400-e29b-41d4-a716-446655440046&paymentAnchorId=550e8400-e29b-41d4-a716-446655440047&limit=25'
    );
  });

  it('lists available rails with explicit non-production tags for mock adapters', async () => {
    const { fetchImpl } = createFetchStub((url) => {
      expect(url).toBe('https://api.example.com/adapters');
      return jsonResponse([
        { id: 'mock-dex', kind: 'dex' },
        { id: 'mock-anchor', kind: 'anchor' },
        { id: 'keeta-transfer', kind: 'transfer' },
      ]);
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.listAvailableRails()).resolves.toEqual([
      expect.objectContaining({ id: 'mock-dex', production: false, kind: 'dex' }),
      expect.objectContaining({ id: 'mock-anchor', production: false, kind: 'anchor' }),
      expect.objectContaining({ id: 'keeta-transfer', production: true, kind: 'transfer' }),
    ]);
  });

  it('subscribes to the existing SSE event stream and emits parsed events', async () => {
    const createdAt = new Date().toISOString();
    const event = {
      id: '550e8400-e29b-41d4-a716-446655440048',
      source: 'audit' as const,
      eventType: 'execution.completed',
      intentId: '550e8400-e29b-41d4-a716-446655440049',
      payload: { status: 'done' },
      createdAt,
    };
    const encoder = new TextEncoder();
    const { calls, fetchImpl } = createFetchStub((url) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(`id: ${event.id}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          controller.close();
        },
      });
      expect(url).toBe('https://api.example.com/events/stream?eventType=execution.completed');
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    });
    const client = createClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const events: unknown[] = [];

    const subscription = client.subscribeEvents(
      { eventType: 'execution.completed' },
      {
        onEvent: (value) => events.push(value),
      }
    );

    await subscription.done;

    expect(events).toEqual([event]);
    expect(calls[0]?.init?.headers).toBeDefined();
  });
});
