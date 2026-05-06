/**
 * Scenario: agent API payment.
 *
 * Implements the existing `ExecutionIntent` + `createKeetaAgent` pipeline for a
 * simulated agent payment: KTA -> x402 API credit -> pay.sh Gemini API call.
 */
import { KeetaTransferAdapter } from '@keeta-agent-stack/adapter-keeta-transfer';
import { MppAdapter } from '@keeta-agent-stack/adapter-mpp';
import { PayShAdapter } from '@keeta-agent-stack/adapter-pay-sh';
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import { X402Adapter } from '@keeta-agent-stack/adapter-x402';
import { createKeetaAgent } from '@keeta-agent-stack/agent-runtime';
import type { PolicyDecision, RoutePlan } from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

function createRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(new KeetaTransferAdapter());
  registry.register(new X402Adapter());
  registry.register(new PayShAdapter());
  registry.register(new MppAdapter());
  return registry;
}

async function main() {
  const timings: Record<string, number> = {};
  let selectedRoute: RoutePlan | undefined;
  let policyDecision: PolicyDecision | undefined;
  const startedAt = Date.now();

  const agent = createKeetaAgent({
    name: 'agent-api-payment-demo',
    registry: createRegistry(),
    policy: {
      maxOrderSize: 10,
      maxSlippageBps: 100,
      venueAllowlist: [],
      assetAllowlist: ['KTA', 'X402_API_CREDIT', 'GEMINI_API_CALL'],
      liveModeEnabled: false,
      perSessionAgentSpendCapUsd: 1,
      allowedAgentPaymentRails: ['x402', 'pay-sh'],
    },
    simulationScenario: {
      fidelityMode: 'standard',
      volatility: 0.01,
      latencyMs: 25,
      failureProbability: 0,
      slippageMultiplier: 1,
      seed: 'agent-api-payment',
    },
    hooks: {
      beforeRoute: () => {
        timings.routeStartedMs = Date.now() - startedAt;
      },
      afterRoute: (ctx) => {
        timings.routeCompletedMs = Date.now() - startedAt;
        selectedRoute = ctx.routes?.best;
      },
      afterPolicy: (ctx) => {
        timings.policyCompletedMs = Date.now() - startedAt;
        policyDecision = ctx.policyDecision;
      },
      afterSimulation: () => {
        timings.simulationCompletedMs = Date.now() - startedAt;
      },
    },
  });

  const result = await agent.execute({
    id: randomUUID(),
    walletId: randomUUID(),
    baseAsset: 'KTA',
    quoteAsset: 'GEMINI_API_CALL',
    side: 'sell',
    size: '1',
    maxSlippageBps: 100,
    mode: 'simulate',
    createdAt: new Date().toISOString(),
    metadata: {
      apiId: 'gemini-generate-content',
      apiEndpoint: 'pay-sh://google-cloud/gemini/generate-content',
      requestSize: 1024,
    },
  });

  console.log(
    JSON.stringify(
      {
        summary: {
          kind: result.kind,
          mode: 'simulate',
          supportLevel: selectedRoute?.supportLevel,
        },
        selectedRoute: selectedRoute && {
          id: selectedRoute.id,
          score: selectedRoute.score,
          supportLevel: selectedRoute.supportLevel,
          steps: selectedRoute.steps.map((step) => ({
            adapterId: step.adapterId,
            venueKind: step.venueKind,
            supportLevel: step.supportLevel,
            pair: `${step.baseAsset} -> ${step.quoteAsset}`,
            feeBps: step.feeBps,
            estimatedUsd: step.quote.raw?.agentPayment,
          })),
        },
        policyDecision,
        simulatedReceipt:
          result.kind === 'simulated'
            ? {
                simulationId: result.detail.id,
                routePlanId: result.detail.routePlanId,
                success: result.detail.success,
                simulatedLatencyMs: result.detail.simulatedLatencyMs,
                simulatedSlippageBps: result.detail.simulatedSlippageBps,
                completedAt: result.detail.completedAt,
              }
            : result,
        timingBreakdownMs: {
          ...timings,
          totalMs: Date.now() - startedAt,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
