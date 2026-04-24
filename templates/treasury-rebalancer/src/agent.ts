/**
 * Wires the SDK client + agent runtime + policy pack into a single
 * `runRebalanceTick(cfg)` callable that the loop in `index.ts` invokes.
 */
import { createKeetaAgent, type KeetaAgent } from '@keeta-agent-stack/agent-runtime';
import { createClient, type CreatePolicyPackRequest } from '@keeta-agent-stack/sdk';
import type { PolicyPack } from '@keeta-agent-stack/policy';
import type { ExecutionIntent, WalletBalancesResponse } from '@keeta-agent-stack/types';
import type { RebalancerConfig } from './config.js';
import { POLICY_PACK_NAME, buildPolicyPack } from './policy.js';
import {
  decideRebalance,
  type BalanceSnapshot,
  type RebalanceDecision,
} from './rebalancer.js';

type SdkClient = ReturnType<typeof createClient>;

interface AgentBundle {
  sdk: SdkClient;
  agent: KeetaAgent;
  policyPackId: string;
}

function log(stage: string, payload: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), stage, ...payload }));
}

function buildSdk(cfg: RebalancerConfig): SdkClient {
  return createClient({
    baseUrl: cfg.apiUrl,
    defaultHeaders: cfg.apiToken ? { Authorization: `Bearer ${cfg.apiToken}` } : undefined,
  });
}

async function ensurePolicyPack(
  sdk: SdkClient,
  request: CreatePolicyPackRequest
): Promise<PolicyPack> {
  const existing = await sdk.listPolicyPacks();
  const match = existing.find((pack) => pack.name === request.name);
  if (match) {
    log('policy.pack.refresh', { id: match.id, name: match.name });
    return sdk.updatePolicyPack(match.id, {
      description: request.description ?? null,
      rules: request.rules,
      compositions: request.compositions,
    });
  }
  log('policy.pack.create', { name: request.name });
  return sdk.createPolicyPack(request);
}

export async function buildBundle(cfg: RebalancerConfig): Promise<AgentBundle> {
  const sdk = buildSdk(cfg);

  const pack = await ensurePolicyPack(sdk, buildPolicyPack(cfg));

  const agent = createKeetaAgent({
    name: 'keeta-treasury-rebalancer',
    sdk,
    hooks: {
      onIntent:        (ctx) => log('intent.received',  { intentId: ctx.intent.id, mode: ctx.intent.mode }),
      afterRoute:      (ctx) => log('route.done',       { intentId: ctx.intent.id, bestRouteId: ctx.routes?.best.id, alternates: ctx.routes?.alternates.length }),
      afterPolicy:     (ctx) => log('policy.done',      { intentId: ctx.intent.id, allowed: ctx.policyDecision?.allowed, packId: pack.id }),
      afterSimulation: (ctx) => log('simulation.done',  { intentId: ctx.intent.id, slippageBps: ctx.simulationResult?.simulatedSlippageBps }),
      afterExecution:  (ctx) => log('execution.done',   { intentId: ctx.intent.id }),
      onError:         (ctx) => log('agent.error',      { intentId: ctx.intent.id, error: String(ctx.metadata.error) }),
    },
  });

  return { sdk, agent, policyPackId: pack.id };
}

/**
 * Read on-chain balances. Returns synthetic balances from the env when the
 * wallet is brand-new (the sandbox wallets are unfunded), so the loop still
 * exercises route/policy/simulation end-to-end.
 */
export async function loadBalances(
  sdk: SdkClient,
  cfg: RebalancerConfig
): Promise<BalanceSnapshot[]> {
  let response: WalletBalancesResponse | undefined;
  try {
    response = await sdk.getWalletBalances(cfg.walletId);
  } catch (error) {
    log('balances.fetch.error', { error: String(error) });
  }

  const live = response && 'keeta' in response
    ? response.keeta.map((entry) => ({ asset: entry.assetId, amount: Number(entry.amount) }))
    : [];

  if (live.length > 0) return live;

  // Sandbox path: synthesise a starting allocation so the loop produces work.
  log('balances.synthetic', { reason: 'wallet has no on-chain balances; using synthetic 70/30 split for demo' });
  return [
    { asset: 'KTA', amount: 7000 },
    { asset: 'USDC', amount: 3000 },
  ];
}

function buildIntent(
  decision: Extract<RebalanceDecision, { kind: 'leg' }>,
  cfg: RebalancerConfig,
  policyPackId: string
): ExecutionIntent {
  return {
    id: globalThis.crypto.randomUUID(),
    walletId: cfg.walletId,
    baseAsset: decision.leg.baseAsset,
    quoteAsset: decision.leg.quoteAsset,
    side: decision.leg.side,
    size: decision.leg.size,
    maxSlippageBps: cfg.maxSlippageBps,
    mode: cfg.intentMode,
    createdAt: new Date().toISOString(),
    metadata: {
      kind: 'rebalance',
      source: 'treasury-rebalancer',
      driftBps: decision.leg.driftBps,
      rationale: decision.leg.rationale,
    },
    effectivePolicyPackId: policyPackId,
    effectivePolicyPackName: POLICY_PACK_NAME,
    effectivePolicyPackSource: 'intent',
  };
}

export async function runRebalanceTick(
  cfg: RebalancerConfig,
  bundle: AgentBundle
): Promise<RebalanceDecision> {
  const balances = await loadBalances(bundle.sdk, cfg);
  log('balances.snapshot', { balances });

  const decision = decideRebalance(balances, cfg);
  log('decision', decision);

  if (decision.kind !== 'leg') return decision;

  const intent = buildIntent(decision, cfg, bundle.policyPackId);
  const result = await bundle.agent.execute(intent);
  log('agent.result', { kind: result.kind });
  return decision;
}
