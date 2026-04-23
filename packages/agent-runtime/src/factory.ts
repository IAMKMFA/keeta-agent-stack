import type { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import type { PolicyConfig, PolicyRuleDefinition } from '@keeta-agent-sdk/policy';
import { createClient, type CreateIntentRequest, type EventSubscription } from '@keeta-agent-sdk/sdk';
import type { EventStreamEvent, ExecutionIntent, PolicyDecision, RoutePlan, SimulationResult } from '@keeta-agent-sdk/types';
import {
  AgentRuntime,
  type AgentRuntimeHook,
  type AgentRuntimeHookContext,
  type AgentRuntimeHooks,
} from './runtime.js';

/**
 * Loose alias for the SDK client returned by `createClient`.
 * The agent-runtime package only depends on the published surface, so we widen
 * the type to avoid a hard re-export from `@keeta-agent-sdk/sdk`.
 */
export type KeetaSDK = ReturnType<typeof createClient>;

/**
 * Tutorial-aligned hook surface. Every callback is optional and is executed in
 * sequence around the intent pipeline. Internally these aliases map onto the
 * existing `AgentRuntimeHooks` callbacks.
 */
export interface KeetaAgentHooks {
  /** Fires once at the start of `.execute` with the raw intent. */
  onIntent?: AgentRuntimeHook;
  /** Fires immediately before the routing pipeline runs (alias for beforeQuote). */
  beforeRoute?: AgentRuntimeHook;
  /** Fires after routing has resolved best + alternates. */
  afterRoute?: AgentRuntimeHook;
  beforePolicy?: AgentRuntimeHook;
  afterPolicy?: AgentRuntimeHook;
  beforeSimulation?: AgentRuntimeHook;
  afterSimulation?: AgentRuntimeHook;
  /** Fires immediately before the SDK execute call (alias for beforeExecute). */
  beforeExecution?: AgentRuntimeHook;
  /** Fires after a terminal execution event arrives (alias for afterExecute). */
  afterExecution?: AgentRuntimeHook;
  /** Fires whenever any pipeline step throws. The error is passed in `ctx.metadata.error`. */
  onError?: AgentRuntimeHook;
}

export interface CreateKeetaAgentOptions {
  name: string;
  sdk?: KeetaSDK;
  registry?: AdapterRegistry;
  /**
   * When provided alongside `registry`, the agent runs the offline pipeline
   * (route → policy → simulate) without needing the SDK.
   */
  policy?: PolicyConfig;
  policyRules?: PolicyRuleDefinition[];
  hooks?: KeetaAgentHooks;
  /** Optional override for terminal-state polling timeout (default: 60_000 ms). */
  pollTimeoutMs?: number;
}

export type ExecutionResult =
  | { kind: 'denied'; detail: PolicyDecision; events?: EventStreamEvent[] }
  | { kind: 'simulated'; detail: SimulationResult; route: RoutePlan; events?: EventStreamEvent[] }
  | {
      kind: 'executed';
      detail: { intentId: string };
      executionId?: string;
      events?: EventStreamEvent[];
    }
  | { kind: 'failed'; detail: { error: string; cause?: unknown }; events?: EventStreamEvent[] };

export interface KeetaAgent {
  name: string;
  execute: (intent: ExecutionIntent) => Promise<ExecutionResult>;
  /** Lower-level handle for advanced callers. Undefined when running purely SDK-delegated. */
  runtime?: AgentRuntime;
}

const DEFAULT_POLL_TIMEOUT_MS = 60_000;

const TERMINAL_INTENT_EVENT_TYPES = new Set([
  'intent.executed',
  'intent.failed',
  'execution.confirmed',
  'execution.failed',
]);

function buildRuntimeHooks(hooks: KeetaAgentHooks | undefined): AgentRuntimeHooks {
  if (!hooks) return {};
  return {
    beforeQuote: hooks.beforeRoute,
    afterRoute: hooks.afterRoute,
    beforePolicy: hooks.beforePolicy,
    afterPolicy: hooks.afterPolicy,
    beforeSimulation: hooks.beforeSimulation,
    afterSimulation: hooks.afterSimulation,
    beforeExecute: hooks.beforeExecution,
    afterExecute: hooks.afterExecution,
  };
}

async function runHook(
  hook: AgentRuntimeHook | undefined,
  ctx: AgentRuntimeHookContext
): Promise<void> {
  if (!hook) return;
  await hook(ctx);
}

function toCreateIntentRequest(intent: ExecutionIntent): CreateIntentRequest {
  const {
    id: _id,
    createdAt: _createdAt,
    effectivePolicyPackId: _effectivePolicyPackId,
    effectivePolicyPackName: _effectivePolicyPackName,
    effectivePolicyPackSource: _effectivePolicyPackSource,
    ...rest
  } = intent;
  void _id;
  void _createdAt;
  void _effectivePolicyPackId;
  void _effectivePolicyPackName;
  void _effectivePolicyPackSource;
  return rest;
}

async function pollForTerminalEvents(
  sdk: KeetaSDK,
  intentId: string,
  timeoutMs: number
): Promise<{ events: EventStreamEvent[]; executionId?: string; failed: boolean }> {
  const events: EventStreamEvent[] = [];
  let executionId: string | undefined;
  let failed = false;

  const stream: EventSubscription = sdk.subscribeEvents(
    { intentId },
    {
      onEvent: (event: EventStreamEvent) => {
        events.push(event);
        if (event.executionId) executionId = event.executionId;
        if (TERMINAL_INTENT_EVENT_TYPES.has(event.eventType)) {
          if (event.eventType.endsWith('.failed')) failed = true;
          stream.close();
        }
      },
    }
  );

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      stream.close();
      resolve();
    }, timeoutMs).unref?.();
  });

  await Promise.race([
    stream.done.catch(() => undefined),
    timeoutPromise,
  ]);

  return { events, executionId, failed };
}

export function createKeetaAgent(opts: CreateKeetaAgentOptions): KeetaAgent {
  const { name, sdk, registry, policy, policyRules, hooks, pollTimeoutMs } = opts;
  const runtimeHooks = buildRuntimeHooks(hooks);
  const runtime =
    registry && policy
      ? new AgentRuntime({
          registry,
          policy,
          policyRules,
          hooks: runtimeHooks,
        })
      : undefined;

  async function execute(intent: ExecutionIntent): Promise<ExecutionResult> {
    const ctx: AgentRuntimeHookContext = { intent, metadata: {} };

    try {
      await runHook(hooks?.onIntent, ctx);

      if (runtime) {
        const built = await runtime.quoteAndRoute(ctx.intent);
        const decision = runtime.evaluatePolicy(ctx.intent, built.best);

        if (!decision.allowed) {
          return { kind: 'denied', detail: decision };
        }

        const simulation = await runtime.runSimulation(ctx.intent, built.best);

        if (!sdk || ctx.intent.mode === 'simulate') {
          return { kind: 'simulated', detail: simulation, route: built.best };
        }
      }

      if (!sdk) {
        return {
          kind: 'failed',
          detail: {
            error:
              'No SDK supplied. createKeetaAgent needs either { registry, policy } for offline use or { sdk } for live submission.',
          },
        };
      }

      const created = await sdk.createIntent(toCreateIntentRequest(ctx.intent));
      await runHook(hooks?.beforeExecution, ctx);

      try {
        await sdk.quoteIntent(created.id);
        await sdk.routeIntent(created.id);
        await sdk.policyIntent(created.id);
        await sdk.executeIntent(created.id);
      } catch (jobError) {
        return {
          kind: 'failed',
          detail: {
            error: 'Pipeline job submission failed',
            cause: jobError instanceof Error ? jobError.message : jobError,
          },
        };
      }

      const { events, executionId, failed } = await pollForTerminalEvents(
        sdk,
        created.id,
        pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS
      );

      await runHook(hooks?.afterExecution, ctx);

      if (failed) {
        return {
          kind: 'failed',
          detail: { error: 'Intent reached terminal failed state' },
          events,
        };
      }

      return {
        kind: 'executed',
        detail: { intentId: created.id },
        executionId,
        events,
      };
    } catch (error) {
      ctx.metadata.error = error;
      await runHook(hooks?.onError, ctx).catch(() => undefined);
      return {
        kind: 'failed',
        detail: {
          error: error instanceof Error ? error.message : String(error),
          cause: error,
        },
      };
    }
  }

  return {
    name,
    execute,
    runtime,
  };
}
