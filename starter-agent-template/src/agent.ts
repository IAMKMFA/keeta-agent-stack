import { createKeetaAgent, type KeetaAgent } from '@keeta-agent-stack/agent-runtime';
import { createClient } from '@keeta-agent-stack/sdk';
import type { ExecutionIntent } from '@keeta-agent-stack/types';

export interface BuildAgentOptions {
  apiUrl: string;
  apiToken?: string;
}

function log(stage: string, payload: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), stage, ...payload }));
}

export function buildAgent(opts: BuildAgentOptions): KeetaAgent {
  const sdk = createClient({
    baseUrl: opts.apiUrl,
    defaultHeaders: opts.apiToken ? { Authorization: `Bearer ${opts.apiToken}` } : undefined,
  });

  return createKeetaAgent({
    name: 'keeta-starter-agent',
    sdk,
    hooks: {
      onIntent: (ctx) => log('intent.received', { intentId: ctx.intent.id, mode: ctx.intent.mode }),
      beforeRoute: (ctx) => log('route.start', { intentId: ctx.intent.id }),
      afterRoute: (ctx) =>
        log('route.done', {
          intentId: ctx.intent.id,
          bestRouteId: ctx.routes?.best.id,
          alternates: ctx.routes?.alternates.length,
        }),
      beforePolicy: (ctx) => log('policy.start', { intentId: ctx.intent.id }),
      afterPolicy: (ctx) =>
        log('policy.done', { intentId: ctx.intent.id, allowed: ctx.policyDecision?.allowed }),
      beforeSimulation: (ctx) => log('simulation.start', { intentId: ctx.intent.id }),
      afterSimulation: (ctx) =>
        log('simulation.done', {
          intentId: ctx.intent.id,
          slippageBps: ctx.simulationResult?.simulatedSlippageBps,
        }),
      beforeExecution: (ctx) => log('execution.start', { intentId: ctx.intent.id }),
      afterExecution: (ctx) => log('execution.done', { intentId: ctx.intent.id }),
      onError: (ctx) =>
        log('agent.error', { intentId: ctx.intent.id, error: String(ctx.metadata.error) }),
    },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

export function buildPaymentIntent(walletId: string): ExecutionIntent {
  return {
    id: uuid(),
    walletId,
    baseAsset: 'USDC',
    quoteAsset: 'KTA',
    side: 'buy',
    size: '100',
    maxSlippageBps: 50,
    mode: 'simulate',
    createdAt: nowIso(),
    metadata: { kind: 'payment', source: 'starter-agent-template' },
  };
}

export function buildRebalanceIntent(walletId: string): ExecutionIntent {
  return {
    id: uuid(),
    walletId,
    baseAsset: 'KTA',
    quoteAsset: 'USDC',
    side: 'sell',
    size: '250',
    maxSlippageBps: 25,
    mode: 'simulate',
    createdAt: nowIso(),
    metadata: { kind: 'rebalance', source: 'starter-agent-template' },
  };
}
