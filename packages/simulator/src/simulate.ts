import type {
  ExecutionIntent,
  KeetaSimulationSnapshot,
  RoutePlan,
  SimulationResult,
  SimulationScenario,
} from '@keeta-agent-stack/types';
import { sleep } from '@keeta-agent-stack/utils';
import { randomUUID } from 'node:crypto';

function rng(seed?: string): () => number {
  let s = 777;
  if (seed) {
    for (let i = 0; i < seed.length; i++) s = (Math.imul(s, 131) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export async function simulate(
  intent: ExecutionIntent,
  route: RoutePlan,
  scenario: SimulationScenario,
  keetaSnapshot?: KeetaSimulationSnapshot | null
): Promise<SimulationResult> {
  const rand = rng(scenario.seed);
  const latency = Math.floor(scenario.latencyMs * (0.8 + 0.4 * rand()));
  if (latency > 0) await sleep(latency);

  const failRoll = rand();
  const failed = failRoll < scenario.failureProbability;

  const baseSlip = route.expectedSlippageBps;
  const slip = Math.min(
    10_000,
    Math.floor(baseSlip * scenario.slippageMultiplier * (1 + scenario.volatility * rand()))
  );

  const now = new Date().toISOString();

  if (failed) {
    return {
      id: randomUUID(),
      intentId: intent.id,
      routePlanId: route.id,
      scenario,
      success: false,
      simulatedSlippageBps: slip,
      simulatedLatencyMs: latency,
      failureReason: 'Scenario failure probability triggered',
      pnlQuote: null,
      pnlNote: 'PnL not yet connected',
      keetaSnapshot: keetaSnapshot ?? undefined,
      completedAt: now,
    };
  }

  return {
    id: randomUUID(),
    intentId: intent.id,
    routePlanId: route.id,
    scenario,
    success: true,
    simulatedSlippageBps: slip,
    simulatedLatencyMs: latency,
    pnlQuote: null,
    pnlNote: 'PnL not yet connected',
    keetaSnapshot: keetaSnapshot ?? undefined,
    completedAt: now,
  };
}
