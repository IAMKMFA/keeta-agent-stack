import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ExecutionIntentSchema,
  type CreateIntentRequest,
  type EventStreamEvent,
  type PolicyEvaluateRequest,
} from '@keeta-agent-sdk/sdk';
import { PolicyCompositionSchema, PolicyRuleSchema } from '@keeta-agent-sdk/policy';
import { formatResult } from './helpers.js';
import { createControlPlaneClient, type ControlPlaneSdkClient } from './sdk-client.js';

type ToolRegistrar = Pick<McpServer, 'tool'>;

type ControlPlaneToolResult = {
  content: Array<{ type: 'text'; text: string }>;
};

type ControlPlaneToolSpec = {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (args: Record<string, unknown>) => Promise<ControlPlaneToolResult>;
};

function textResult(value: unknown): ControlPlaneToolResult {
  return {
    content: [{ type: 'text', text: formatResult(value) }],
  };
}

export function buildControlPlaneToolSpecs(
  getClient: () => ControlPlaneSdkClient = createControlPlaneClient
): ControlPlaneToolSpec[] {
  const policyRuleArraySchema = z
    .array(PolicyRuleSchema)
    .describe('Policy rule overrides to include in the persisted pack.');
  const policyCompositionArraySchema = z
    .array(PolicyCompositionSchema)
    .describe('Rule composition entries using allOf/anyOf/not semantics.');
  const policyPreviewSchema = {
    intentId: z.string().uuid().optional().describe('Persisted intent id to evaluate.'),
    intent: ExecutionIntentSchema.optional().describe('Optional inline intent payload for preview evaluation.'),
    reason: z.string().min(1).describe('Short operator reason recorded in audit history.'),
    policyPackId: z.string().uuid().optional().describe('Optional persisted policy pack id to apply explicitly.'),
    configOverrides: z.record(z.unknown()).optional().describe('Optional policy-config overrides for preview only.'),
    contextOverrides: z.record(z.unknown()).optional().describe('Optional evaluation-context overrides for preview only.'),
  } satisfies Record<keyof Pick<PolicyEvaluateRequest, 'intentId' | 'intent' | 'reason' | 'policyPackId' | 'configOverrides' | 'contextOverrides'>, z.ZodTypeAny>;
  const createIntentBodySchema = ExecutionIntentSchema.omit({
    id: true,
    createdAt: true,
    effectivePolicyPackId: true,
    effectivePolicyPackName: true,
    effectivePolicyPackSource: true,
  })
    .partial({
      strategyId: true,
      policyPackId: true,
      venueAllowlist: true,
      metadata: true,
    })
    .extend({
      requiresApproval: z.boolean().optional().describe('Require explicit admin approval before live execution.'),
    });

  return [
    {
      name: 'keeta_create_intent',
      description:
        'Create a new execution intent in the control plane. Use this before quote, route, policy, and execute steps.',
      inputSchema: createIntentBodySchema.shape,
      handler: async (args) => {
        const client = getClient();
        return textResult(await client.createIntent(args as unknown as CreateIntentRequest));
      },
    },
    {
      name: 'keeta_quote_intent',
      description: 'Queue the quote-generation stage for an existing intent and return the job id and queue.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to quote.'),
      },
      handler: async ({ intentId }) => {
        const client = getClient();
        return textResult(await client.quoteIntent(String(intentId)));
      },
    },
    {
      name: 'keeta_route_intent',
      description: 'Queue the route-generation stage for an existing intent and return the job id and queue.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to route.'),
      },
      handler: async ({ intentId }) => {
        const client = getClient();
        return textResult(await client.routeIntent(String(intentId)));
      },
    },
    {
      name: 'keeta_evaluate_policy',
      description:
        'Queue the intent pipeline policy-evaluation stage (`POST /intents/:id/policy`). This is not the admin preview endpoint.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to evaluate through the pipeline policy stage.'),
        policyPackId: z.string().uuid().optional().describe('Optional override policy pack id to persist on the intent before evaluation.'),
      },
      handler: async ({ intentId, policyPackId }) => {
        const client = getClient();
        return textResult(
          await client.policyIntent(String(intentId), {
            ...(typeof policyPackId === 'string' ? { policyPackId } : {}),
          })
        );
      },
    },
    {
      name: 'keeta_execute_intent',
      description: 'Queue the execution stage for an existing intent and return the job id and queue.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to execute.'),
      },
      handler: async ({ intentId }) => {
        const client = getClient();
        return textResult(await client.executeIntent(String(intentId)));
      },
    },
    {
      name: 'keeta_hold_intent',
      description: 'Place an intent on hold using the control-plane hold endpoint.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to hold.'),
      },
      handler: async ({ intentId }) => {
        const client = getClient();
        await client.holdIntent(String(intentId));
        return textResult({ intentId, status: 'held' });
      },
    },
    {
      name: 'keeta_release_intent',
      description: 'Release a previously held intent and allow the pipeline to resume from the next backend stage.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to release.'),
      },
      handler: async ({ intentId }) => {
        const client = getClient();
        await client.releaseIntent(String(intentId));
        return textResult({ intentId, status: 'released' });
      },
    },
    {
      name: 'keeta_approve_intent',
      description: 'Approve an intent that requires admin approval before execution.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to approve.'),
      },
      handler: async ({ intentId }) => {
        const client = getClient();
        await client.approveIntent(String(intentId));
        return textResult({ intentId, approvalStatus: 'approved' });
      },
    },
    {
      name: 'keeta_override_intent_route',
      description: 'Override the selected route plan for an intent using an existing route plan id.',
      inputSchema: {
        intentId: z.string().uuid().describe('Intent id to update.'),
        routePlanId: z.string().uuid().describe('Route plan id that should become the explicit override.'),
      },
      handler: async ({ intentId, routePlanId }) => {
        const client = getClient();
        return textResult(
          await client.registerRouteOverride(String(intentId), {
            routePlanId: String(routePlanId),
          })
        );
      },
    },
    {
      name: 'keeta_list_policy_packs',
      description:
        'List persisted policy packs that can be applied to admin policy previews or assigned to strategies.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.listPolicyPacks());
      },
    },
    {
      name: 'keeta_list_policy_rules',
      description: 'List the available policy rules and compositions known to the policy engine.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.listPolicyRules());
      },
    },
    {
      name: 'keeta_preview_policy',
      description:
        'Run the admin policy preview endpoint. Use this to test an intent or policy pack without enqueuing the pipeline policy stage.',
      inputSchema: policyPreviewSchema,
      handler: async ({ intentId, intent, reason, policyPackId, configOverrides, contextOverrides }) => {
        const client = getClient();
        return textResult(
          await client.evaluatePolicy({
            ...(typeof intentId === 'string' ? { intentId } : {}),
            ...(intent && typeof intent === 'object' ? { intent: intent as PolicyEvaluateRequest['intent'] } : {}),
            reason: String(reason),
            ...(typeof policyPackId === 'string' ? { policyPackId } : {}),
            ...(configOverrides && typeof configOverrides === 'object'
              ? { configOverrides: configOverrides as PolicyEvaluateRequest['configOverrides'] }
              : {}),
            ...(contextOverrides && typeof contextOverrides === 'object'
              ? { contextOverrides: contextOverrides as PolicyEvaluateRequest['contextOverrides'] }
              : {}),
          })
        );
      },
    },
    {
      name: 'keeta_create_policy_pack',
      description:
        'Create a persisted policy pack using existing rule ids and composition semantics. Use this to store reusable policy overlays.',
      inputSchema: {
        name: z.string().min(1).describe('Human-readable policy pack name.'),
        description: z.string().min(1).nullable().optional().describe('Optional pack description.'),
        rules: policyRuleArraySchema.optional(),
        compositions: policyCompositionArraySchema.optional(),
      },
      handler: async ({ name, description, rules, compositions }) => {
        const client = getClient();
        return textResult(
          await client.createPolicyPack({
            name: String(name),
            ...(description === null || typeof description === 'string' ? { description } : {}),
            ...(Array.isArray(rules) ? { rules } : {}),
            ...(Array.isArray(compositions) ? { compositions } : {}),
          })
        );
      },
    },
    {
      name: 'keeta_update_policy_pack',
      description:
        'Update an existing persisted policy pack. Provide only the fields that should change.',
      inputSchema: {
        policyPackId: z.string().uuid().describe('Policy pack id to update.'),
        name: z.string().min(1).optional().describe('Updated pack name.'),
        description: z.string().min(1).nullable().optional().describe('Updated pack description.'),
        rules: policyRuleArraySchema.optional(),
        compositions: policyCompositionArraySchema.optional(),
      },
      handler: async ({ policyPackId, name, description, rules, compositions }) => {
        const client = getClient();
        return textResult(
          await client.updatePolicyPack(String(policyPackId), {
            ...(typeof name === 'string' ? { name } : {}),
            ...(description === null || typeof description === 'string' ? { description } : {}),
            ...(Array.isArray(rules) ? { rules } : {}),
            ...(Array.isArray(compositions) ? { compositions } : {}),
          })
        );
      },
    },
    {
      name: 'keeta_delete_policy_pack',
      description: 'Delete a persisted policy pack when it is no longer needed.',
      inputSchema: {
        policyPackId: z.string().uuid().describe('Policy pack id to delete.'),
      },
      handler: async ({ policyPackId }) => {
        const client = getClient();
        await client.deletePolicyPack(String(policyPackId));
        return textResult({ policyPackId, deleted: true });
      },
    },
    {
      name: 'keeta_get_strategy_policy_pack',
      description: 'Read the explicit policy-pack assignment for a strategy.',
      inputSchema: {
        strategyId: z.string().uuid().describe('Strategy id to inspect.'),
      },
      handler: async ({ strategyId }) => {
        const client = getClient();
        return textResult(await client.getStrategyPolicyPack(String(strategyId)));
      },
    },
    {
      name: 'keeta_set_strategy_policy_pack',
      description:
        'Assign a persisted policy pack to a strategy so future policy evaluation can resolve it by strategy.',
      inputSchema: {
        strategyId: z.string().uuid().describe('Strategy id to update.'),
        policyPackId: z.string().uuid().describe('Persisted policy pack id to assign.'),
      },
      handler: async ({ strategyId, policyPackId }) => {
        const client = getClient();
        return textResult(await client.setStrategyPolicyPack(String(strategyId), String(policyPackId)));
      },
    },
    {
      name: 'keeta_clear_strategy_policy_pack',
      description: 'Remove an explicit strategy-level policy-pack assignment.',
      inputSchema: {
        strategyId: z.string().uuid().describe('Strategy id to update.'),
      },
      handler: async ({ strategyId }) => {
        const client = getClient();
        return textResult(await client.clearStrategyPolicyPack(String(strategyId)));
      },
    },
    {
      name: 'keeta_get_wallet_balances',
      description: 'Fetch wallet balances from the control plane, including stored snapshots and Keeta network balances.',
      inputSchema: {
        walletId: z.string().uuid().describe('Wallet id to inspect.'),
      },
      handler: async ({ walletId }) => {
        const client = getClient();
        return textResult(await client.getWalletBalances(String(walletId)));
      },
    },
    {
      name: 'keeta_get_chain_health',
      description: 'Read current Keeta chain health and network telemetry from the control plane.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.getChainHealth());
      },
    },
    {
      name: 'keeta_get_config_modes',
      description: 'Read current runtime modes such as live mode, network selection, and mock-adapter usage.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.getConfigModes());
      },
    },
    {
      name: 'keeta_get_strategy_templates',
      description: 'List strategy templates available to seed new strategies or inspect default configs.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.getStrategyTemplates());
      },
    },
    {
      name: 'keeta_get_ops_metrics',
      description: 'Read recent operational metrics samples from the control plane.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.getOpsMetrics());
      },
    },
    {
      name: 'keeta_list_available_rails',
      description:
        'List available rails and adapters with explicit production vs mock labeling. Non-production rails are marked with production=false.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.listAvailableRails());
      },
    },
    {
      name: 'keeta_subscribe_webhook',
      description: 'Create a webhook subscription for audit and anchor event delivery from the control plane.',
      inputSchema: {
        targetUrl: z.string().url().describe('Webhook receiver URL.'),
        eventTypes: z.array(z.string().min(1)).min(1).describe('Event type allowlist for deliveries.'),
        secret: z.string().optional().describe('Optional HMAC secret for signed webhook payloads.'),
        status: z.enum(['active', 'paused']).optional().describe('Initial webhook subscription status.'),
      },
      handler: async ({ targetUrl, eventTypes, secret, status }) => {
        const client = getClient();
        return textResult(
          await client.createWebhook({
            targetUrl: String(targetUrl),
            eventTypes: eventTypes as string[],
            ...(typeof secret === 'string' ? { secret } : {}),
            ...(status === 'active' || status === 'paused' ? { status } : {}),
          })
        );
      },
    },
    {
      name: 'keeta_list_webhooks',
      description: 'List currently registered webhook subscriptions.',
      inputSchema: {},
      handler: async () => {
        const client = getClient();
        return textResult(await client.listWebhooks());
      },
    },
    {
      name: 'keeta_list_events',
      description: 'List recent control-plane events with the same filters supported by the `/events` API route.',
      inputSchema: {
        after: z.string().datetime().optional().describe('Only include events created at or after this ISO timestamp.'),
        eventType: z.string().min(1).optional().describe('Filter by exact event type.'),
        intentId: z.string().uuid().optional().describe('Filter by intent id.'),
        paymentAnchorId: z.string().uuid().optional().describe('Filter by payment anchor id.'),
        limit: z.number().int().min(1).max(500).optional().describe('Maximum events to return.'),
      },
      handler: async ({ after, eventType, intentId, paymentAnchorId, limit }) => {
        const client = getClient();
        return textResult(
          await client.listEvents({
            ...(typeof after === 'string' ? { after } : {}),
            ...(typeof eventType === 'string' ? { eventType } : {}),
            ...(typeof intentId === 'string' ? { intentId } : {}),
            ...(typeof paymentAnchorId === 'string' ? { paymentAnchorId } : {}),
            ...(typeof limit === 'number' ? { limit } : {}),
          })
        );
      },
    },
    {
      name: 'keeta_stream_events',
      description:
        'Open the existing SSE event stream, collect events for a bounded window, and return the captured payloads as JSON.',
      inputSchema: {
        after: z.string().datetime().optional().describe('Only stream events created at or after this ISO timestamp.'),
        eventType: z.string().min(1).optional().describe('Filter by exact event type.'),
        intentId: z.string().uuid().optional().describe('Filter by intent id.'),
        paymentAnchorId: z.string().uuid().optional().describe('Filter by payment anchor id.'),
        limit: z.number().int().min(1).max(500).optional().describe('Backend fetch limit used for each SSE poll cycle.'),
        maxEvents: z.number().int().min(1).max(200).default(25).describe('Maximum number of events to collect before closing the stream.'),
        timeoutMs: z.number().int().min(250).max(60_000).default(5_000).describe('How long to keep the SSE stream open before returning.'),
      },
      handler: async ({ after, eventType, intentId, paymentAnchorId, limit, maxEvents, timeoutMs }) => {
        const client = getClient();
        const events: EventStreamEvent[] = [];
        let timedOut = false;
        let closeStream: (() => void) | null = null;

        const subscription = client.subscribeEvents(
          {
            ...(typeof after === 'string' ? { after } : {}),
            ...(typeof eventType === 'string' ? { eventType } : {}),
            ...(typeof intentId === 'string' ? { intentId } : {}),
            ...(typeof paymentAnchorId === 'string' ? { paymentAnchorId } : {}),
            ...(typeof limit === 'number' ? { limit } : {}),
          },
          {
            onEvent: (event: EventStreamEvent) => {
              events.push(event);
              if (events.length >= Number(maxEvents)) {
                closeStream?.();
              }
            },
          }
        );
        closeStream = subscription.close;

        const timer = setTimeout(() => {
          timedOut = true;
          closeStream?.();
        }, Number(timeoutMs));

        try {
          await subscription.done;
        } finally {
          clearTimeout(timer);
        }

        return textResult({
          events,
          count: events.length,
          maxEvents: Number(maxEvents),
          timeoutMs: Number(timeoutMs),
          timedOut,
        });
      },
    },
  ];
}

export function registerControlPlaneTools(
  server: ToolRegistrar,
  getClient: () => ControlPlaneSdkClient = createControlPlaneClient
): void {
  for (const tool of buildControlPlaneToolSpecs(getClient)) {
    server.tool(tool.name, tool.description, tool.inputSchema, tool.handler);
  }
}
