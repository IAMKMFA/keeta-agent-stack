import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildControlPlaneToolSpecs, registerControlPlaneTools } from './control-plane.js';
import type { ControlPlaneSdkClient } from './sdk-client.js';

function buildFakeClient() {
  const calls = {
    createIntent: [] as unknown[],
    quoteIntent: [] as string[],
    routeIntent: [] as string[],
    policyIntent: [] as Array<{ intentId: string; body?: unknown }>,
    executeIntent: [] as string[],
    holdIntent: [] as string[],
    releaseIntent: [] as string[],
    approveIntent: [] as string[],
    registerRouteOverride: [] as Array<{ intentId: string; body: unknown }>,
    listPolicyPacks: [] as boolean[],
    listPolicyRules: [] as boolean[],
    evaluatePolicy: [] as unknown[],
    createPolicyPack: [] as unknown[],
    updatePolicyPack: [] as Array<{ id: string; body: unknown }>,
    deletePolicyPack: [] as string[],
    getStrategyPolicyPack: [] as string[],
    setStrategyPolicyPack: [] as Array<{ strategyId: string; policyPackId: string }>,
    clearStrategyPolicyPack: [] as string[],
    getWalletBalances: [] as string[],
    getChainHealth: [] as boolean[],
    getConfigModes: [] as boolean[],
    getStrategyTemplates: [] as boolean[],
    getOpsMetrics: [] as boolean[],
    listAvailableRails: [] as boolean[],
    createWebhook: [] as unknown[],
    listWebhooks: [] as boolean[],
    listEvents: [] as unknown[],
    subscribeEvents: [] as unknown[],
  };

  const client = {
    createIntent: async (body: unknown) => {
      calls.createIntent.push(body);
      return {
        ...(body as Record<string, unknown>),
        id: '550e8400-e29b-41d4-a716-446655440101',
        createdAt: '2026-04-11T12:00:00.000Z',
      };
    },
    quoteIntent: async (intentId: string) => {
      calls.quoteIntent.push(intentId);
      return { jobId: 'job-quote', queue: 'quote-generation' };
    },
    routeIntent: async (intentId: string) => {
      calls.routeIntent.push(intentId);
      return { jobId: 'job-route', queue: 'route-generation' };
    },
    policyIntent: async (intentId: string, body?: unknown) => {
      calls.policyIntent.push({ intentId, body });
      return { jobId: 'job-policy', queue: 'policy-evaluation' };
    },
    executeIntent: async (intentId: string) => {
      calls.executeIntent.push(intentId);
      return { jobId: 'job-execute', queue: 'execution-processing' };
    },
    holdIntent: async (intentId: string) => {
      calls.holdIntent.push(intentId);
    },
    releaseIntent: async (intentId: string) => {
      calls.releaseIntent.push(intentId);
    },
    approveIntent: async (intentId: string) => {
      calls.approveIntent.push(intentId);
    },
    registerRouteOverride: async (intentId: string, body: unknown) => {
      calls.registerRouteOverride.push({ intentId, body });
      return { routePlanId: (body as { routePlanId: string }).routePlanId };
    },
    listPolicyPacks: async () => {
      calls.listPolicyPacks.push(true);
      return [
        {
          id: '550e8400-e29b-41d4-a716-446655440120',
          name: 'desk-risk',
          description: 'Desk risk controls',
          rules: [],
          compositions: [],
          createdAt: '2026-04-11T12:00:00.000Z',
          updatedAt: '2026-04-11T12:00:00.000Z',
        },
      ];
    },
    listPolicyRules: async () => {
      calls.listPolicyRules.push(true);
      return {
        rules: [
          {
            ruleId: 'max-order-size',
            hasConfigSchema: true,
            source: 'default',
            enabled: true,
            kind: 'rule',
          },
        ],
      };
    },
    evaluatePolicy: async (body: unknown) => {
      calls.evaluatePolicy.push(body);
      return {
        decision: {
          allowed: true,
          reasons: [],
          contributions: [],
        },
        rules: [],
        effectiveConfig: {
          maxOrderSize: 1_000_000,
          maxSlippageBps: 100,
          venueAllowlist: [],
          assetAllowlist: [],
          liveModeEnabled: false,
        },
        policyPack: {
          id: '550e8400-e29b-41d4-a716-446655440120',
          name: 'desk-risk',
          source: 'request',
        },
      };
    },
    createPolicyPack: async (body: unknown) => {
      calls.createPolicyPack.push(body);
      return {
        id: '550e8400-e29b-41d4-a716-446655440121',
        name: (body as { name: string }).name,
        description: (body as { description?: string | null }).description ?? null,
        rules: (body as { rules?: unknown[] }).rules ?? [],
        compositions: (body as { compositions?: unknown[] }).compositions ?? [],
        createdAt: '2026-04-11T12:00:00.000Z',
        updatedAt: '2026-04-11T12:00:00.000Z',
      };
    },
    updatePolicyPack: async (id: string, body: unknown) => {
      calls.updatePolicyPack.push({ id, body });
      return {
        id,
        name: (body as { name?: string }).name ?? 'desk-risk',
        description: (body as { description?: string | null }).description ?? null,
        rules: (body as { rules?: unknown[] }).rules ?? [],
        compositions: (body as { compositions?: unknown[] }).compositions ?? [],
        createdAt: '2026-04-11T12:00:00.000Z',
        updatedAt: '2026-04-11T12:00:01.000Z',
      };
    },
    deletePolicyPack: async (id: string) => {
      calls.deletePolicyPack.push(id);
    },
    getStrategyPolicyPack: async (strategyId: string) => {
      calls.getStrategyPolicyPack.push(strategyId);
      return {
        strategyId,
        policyPackId: '550e8400-e29b-41d4-a716-446655440120',
      };
    },
    setStrategyPolicyPack: async (strategyId: string, policyPackId: string) => {
      calls.setStrategyPolicyPack.push({ strategyId, policyPackId });
      return {
        strategyId,
        policyPackId,
      };
    },
    clearStrategyPolicyPack: async (strategyId: string) => {
      calls.clearStrategyPolicyPack.push(strategyId);
      return {
        strategyId,
        policyPackId: null,
      };
    },
    getWalletBalances: async (walletId: string) => {
      calls.getWalletBalances.push(walletId);
      return {
        snapshots: [],
        keeta: [{ assetId: 'KTA', amount: '1000' }],
        network: 'test',
      };
    },
    getChainHealth: async () => {
      calls.getChainHealth.push(true);
      return {
        network: 'test',
        measuredAt: '2026-04-11T12:00:00.000Z',
        latencyMs: 12,
        ledger: { blockCount: 10, transactionCount: 20, representativeCount: 3 },
        ok: true,
      };
    },
    getConfigModes: async () => {
      calls.getConfigModes.push(true);
      return {
        liveMode: false,
        keetaNetwork: 'test',
        mockAdapters: true,
        executionKillSwitch: false,
      };
    },
    getStrategyTemplates: async () => {
      calls.getStrategyTemplates.push(true);
      return [];
    },
    getOpsMetrics: async () => {
      calls.getOpsMetrics.push(true);
      return { samples: [] };
    },
    listAvailableRails: async () => {
      calls.listAvailableRails.push(true);
      return [
        {
          id: 'mock-dex',
          name: 'Mock DEX',
          production: false,
          kind: 'dex',
          description: 'Non-production demo adapter.',
        },
      ];
    },
    createWebhook: async (body: unknown) => {
      calls.createWebhook.push(body);
      return {
        webhook: {
          id: '550e8400-e29b-41d4-a716-446655440102',
          targetUrl: 'https://example.com/webhook',
          eventTypes: ['execution.completed'],
          status: 'active',
          secretPresent: true,
          createdAt: '2026-04-11T12:00:00.000Z',
          updatedAt: '2026-04-11T12:00:00.000Z',
        },
      };
    },
    listWebhooks: async () => {
      calls.listWebhooks.push(true);
      return { webhooks: [] };
    },
    listEvents: async (filter: unknown) => {
      calls.listEvents.push(filter);
      return { events: [] };
    },
    subscribeEvents: (
      filter: unknown,
      handlers?: {
        onEvent?: (event: {
          id: string;
          source: string;
          eventType: string;
          payload: Record<string, unknown>;
          createdAt: string;
        }) => void;
      }
    ) => {
      calls.subscribeEvents.push(filter);
      const handle = {
        close: () => undefined,
        done: Promise.resolve(),
      };
      queueMicrotask(() => {
        handlers?.onEvent?.({
          id: '550e8400-e29b-41d4-a716-446655440103',
          source: 'audit',
          eventType: 'execution.completed',
          payload: { ok: true },
          createdAt: '2026-04-11T12:00:00.000Z',
        });
        handlers?.onEvent?.({
          id: '550e8400-e29b-41d4-a716-446655440104',
          source: 'anchor',
          eventType: 'anchor.updated',
          payload: { ok: true },
          createdAt: '2026-04-11T12:00:01.000Z',
        });
      });
      return handle;
    },
  } as unknown as ControlPlaneSdkClient;

  return { calls, client };
}

describe('control-plane MCP tools', () => {
  it('defines the expected tool inventory with valid zod schemas', () => {
    const { client } = buildFakeClient();
    const specs = buildControlPlaneToolSpecs(() => client);
    const names = specs.map((spec) => spec.name);

    expect(names).toEqual([
      'keeta_create_intent',
      'keeta_quote_intent',
      'keeta_route_intent',
      'keeta_evaluate_policy',
      'keeta_execute_intent',
      'keeta_hold_intent',
      'keeta_release_intent',
      'keeta_approve_intent',
      'keeta_override_intent_route',
      'keeta_list_policy_packs',
      'keeta_list_policy_rules',
      'keeta_preview_policy',
      'keeta_create_policy_pack',
      'keeta_update_policy_pack',
      'keeta_delete_policy_pack',
      'keeta_get_strategy_policy_pack',
      'keeta_set_strategy_policy_pack',
      'keeta_clear_strategy_policy_pack',
      'keeta_get_wallet_balances',
      'keeta_get_chain_health',
      'keeta_get_config_modes',
      'keeta_get_strategy_templates',
      'keeta_get_ops_metrics',
      'keeta_list_available_rails',
      'keeta_subscribe_webhook',
      'keeta_list_webhooks',
      'keeta_list_events',
      'keeta_stream_events',
    ]);

    const createIntent = specs.find((spec) => spec.name === 'keeta_create_intent');
    const createPolicyPack = specs.find((spec) => spec.name === 'keeta_create_policy_pack');
    const previewPolicy = specs.find((spec) => spec.name === 'keeta_preview_policy');
    const streamEvents = specs.find((spec) => spec.name === 'keeta_stream_events');
    expect(createIntent).toBeDefined();
    expect(createPolicyPack).toBeDefined();
    expect(previewPolicy).toBeDefined();
    expect(streamEvents).toBeDefined();

    const createIntentSchema = z.object(createIntent!.inputSchema);
    expect(
      createIntentSchema.parse({
        walletId: '550e8400-e29b-41d4-a716-446655440111',
        baseAsset: 'KTA',
        quoteAsset: 'USDC',
        side: 'sell',
        size: '10',
        maxSlippageBps: 50,
        mode: 'simulate',
        requiresApproval: true,
      })
    ).toMatchObject({ requiresApproval: true });

    const createPolicyPackSchema = z.object(createPolicyPack!.inputSchema);
    expect(
      createPolicyPackSchema.parse({
        name: 'desk-risk',
        rules: [{ ruleId: 'max-order-size', enabled: true }],
        compositions: [{ ruleId: 'desk-all', operator: 'allOf', children: ['max-order-size'] }],
      })
    ).toMatchObject({ name: 'desk-risk' });

    const previewPolicySchema = z.object(previewPolicy!.inputSchema);
    expect(
      previewPolicySchema.parse({
        intentId: '550e8400-e29b-41d4-a716-446655440122',
        reason: 'preflight',
        policyPackId: '550e8400-e29b-41d4-a716-446655440120',
      })
    ).toMatchObject({ reason: 'preflight' });

    const streamEventsSchema = z.object(streamEvents!.inputSchema);
    expect(
      streamEventsSchema.parse({
        eventType: 'execution.completed',
        maxEvents: 2,
        timeoutMs: 500,
      })
    ).toMatchObject({ maxEvents: 2, timeoutMs: 500 });
  });

  it('registers the tools and wires each handler through the SDK client', async () => {
    const { calls, client } = buildFakeClient();
    const registered: Array<{
      name: string;
      handler: (args: Record<string, unknown>) => Promise<unknown>;
    }> = [];
    const server = {
      tool: (
        name: string,
        _description: string,
        _schema: Record<string, z.ZodTypeAny>,
        handler: (args: Record<string, unknown>) => Promise<unknown>
      ) => {
        registered.push({ name, handler });
      },
    } as unknown as Pick<McpServer, 'tool'>;

    registerControlPlaneTools(server, () => client);

    const tool = (name: string) => {
      const found = registered.find((entry) => entry.name === name);
      if (!found) {
        throw new Error(`Tool not registered: ${name}`);
      }
      return found.handler;
    };

    await tool('keeta_create_intent')({
      walletId: '550e8400-e29b-41d4-a716-446655440111',
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'sell',
      size: '10',
      maxSlippageBps: 50,
      mode: 'simulate',
    });
    await tool('keeta_quote_intent')({ intentId: '550e8400-e29b-41d4-a716-446655440112' });
    await tool('keeta_route_intent')({ intentId: '550e8400-e29b-41d4-a716-446655440113' });
    await tool('keeta_evaluate_policy')({
      intentId: '550e8400-e29b-41d4-a716-446655440114',
      policyPackId: '550e8400-e29b-41d4-a716-446655440141',
    });
    await tool('keeta_execute_intent')({ intentId: '550e8400-e29b-41d4-a716-446655440115' });
    await tool('keeta_hold_intent')({ intentId: '550e8400-e29b-41d4-a716-446655440116' });
    await tool('keeta_release_intent')({ intentId: '550e8400-e29b-41d4-a716-446655440117' });
    await tool('keeta_approve_intent')({ intentId: '550e8400-e29b-41d4-a716-446655440118' });
    await tool('keeta_override_intent_route')({
      intentId: '550e8400-e29b-41d4-a716-446655440118',
      routePlanId: '550e8400-e29b-41d4-a716-446655440140',
    });
    await tool('keeta_list_policy_packs')({});
    await tool('keeta_list_policy_rules')({});
    await tool('keeta_preview_policy')({
      intentId: '550e8400-e29b-41d4-a716-446655440122',
      reason: 'preflight',
      policyPackId: '550e8400-e29b-41d4-a716-446655440120',
    });
    await tool('keeta_create_policy_pack')({
      name: 'desk-risk',
      description: 'Desk risk controls',
      rules: [{ ruleId: 'max-order-size', enabled: true }],
    });
    await tool('keeta_update_policy_pack')({
      policyPackId: '550e8400-e29b-41d4-a716-446655440120',
      description: 'Updated desk controls',
    });
    await tool('keeta_delete_policy_pack')({
      policyPackId: '550e8400-e29b-41d4-a716-446655440120',
    });
    await tool('keeta_get_strategy_policy_pack')({
      strategyId: '550e8400-e29b-41d4-a716-446655440130',
    });
    await tool('keeta_set_strategy_policy_pack')({
      strategyId: '550e8400-e29b-41d4-a716-446655440130',
      policyPackId: '550e8400-e29b-41d4-a716-446655440120',
    });
    await tool('keeta_clear_strategy_policy_pack')({
      strategyId: '550e8400-e29b-41d4-a716-446655440130',
    });
    await tool('keeta_get_wallet_balances')({
      walletId: '550e8400-e29b-41d4-a716-446655440150',
    });
    await tool('keeta_get_chain_health')({});
    await tool('keeta_get_config_modes')({});
    await tool('keeta_get_strategy_templates')({});
    await tool('keeta_get_ops_metrics')({});
    await tool('keeta_list_available_rails')({});
    await tool('keeta_subscribe_webhook')({
      targetUrl: 'https://example.com/webhook',
      eventTypes: ['execution.completed'],
      secret: 'topsecret',
      status: 'active',
    });
    await tool('keeta_list_webhooks')({});
    await tool('keeta_list_events')({
      eventType: 'execution.completed',
      paymentAnchorId: '550e8400-e29b-41d4-a716-446655440119',
      limit: 10,
    });
    const streamResult = (await tool('keeta_stream_events')({
      eventType: 'execution.completed',
      maxEvents: 2,
      timeoutMs: 250,
    })) as { content: Array<{ text: string }> };

    expect(calls.createIntent).toHaveLength(1);
    expect(calls.quoteIntent).toEqual(['550e8400-e29b-41d4-a716-446655440112']);
    expect(calls.routeIntent).toEqual(['550e8400-e29b-41d4-a716-446655440113']);
    expect(calls.policyIntent).toEqual([
      {
        intentId: '550e8400-e29b-41d4-a716-446655440114',
        body: { policyPackId: '550e8400-e29b-41d4-a716-446655440141' },
      },
    ]);
    expect(calls.executeIntent).toEqual(['550e8400-e29b-41d4-a716-446655440115']);
    expect(calls.holdIntent).toEqual(['550e8400-e29b-41d4-a716-446655440116']);
    expect(calls.releaseIntent).toEqual(['550e8400-e29b-41d4-a716-446655440117']);
    expect(calls.approveIntent).toEqual(['550e8400-e29b-41d4-a716-446655440118']);
    expect(calls.registerRouteOverride).toEqual([
      {
        intentId: '550e8400-e29b-41d4-a716-446655440118',
        body: { routePlanId: '550e8400-e29b-41d4-a716-446655440140' },
      },
    ]);
    expect(calls.listPolicyPacks).toHaveLength(1);
    expect(calls.listPolicyRules).toHaveLength(1);
    expect(calls.evaluatePolicy).toEqual([
      {
        intentId: '550e8400-e29b-41d4-a716-446655440122',
        reason: 'preflight',
        policyPackId: '550e8400-e29b-41d4-a716-446655440120',
      },
    ]);
    expect(calls.createPolicyPack).toEqual([
      {
        name: 'desk-risk',
        description: 'Desk risk controls',
        rules: [{ ruleId: 'max-order-size', enabled: true }],
      },
    ]);
    expect(calls.updatePolicyPack).toEqual([
      {
        id: '550e8400-e29b-41d4-a716-446655440120',
        body: { description: 'Updated desk controls' },
      },
    ]);
    expect(calls.deletePolicyPack).toEqual(['550e8400-e29b-41d4-a716-446655440120']);
    expect(calls.getStrategyPolicyPack).toEqual(['550e8400-e29b-41d4-a716-446655440130']);
    expect(calls.setStrategyPolicyPack).toEqual([
      {
        strategyId: '550e8400-e29b-41d4-a716-446655440130',
        policyPackId: '550e8400-e29b-41d4-a716-446655440120',
      },
    ]);
    expect(calls.clearStrategyPolicyPack).toEqual(['550e8400-e29b-41d4-a716-446655440130']);
    expect(calls.getWalletBalances).toEqual(['550e8400-e29b-41d4-a716-446655440150']);
    expect(calls.getChainHealth).toHaveLength(1);
    expect(calls.getConfigModes).toHaveLength(1);
    expect(calls.getStrategyTemplates).toHaveLength(1);
    expect(calls.getOpsMetrics).toHaveLength(1);
    expect(calls.listAvailableRails).toHaveLength(1);
    expect(calls.createWebhook).toHaveLength(1);
    expect(calls.listWebhooks).toHaveLength(1);
    expect(calls.listEvents).toEqual([
      {
        eventType: 'execution.completed',
        paymentAnchorId: '550e8400-e29b-41d4-a716-446655440119',
        limit: 10,
      },
    ]);
    expect(calls.subscribeEvents).toEqual([{ eventType: 'execution.completed' }]);
    expect(streamResult.content[0]?.text).toContain('"count": 2');
  });
});
