/**
 * Scenario: mock live run.
 *
 * End-to-end smoke harness: registers the default dev adapter set, picks
 * either KTA-native settlement or an Oracle-planned CCTP-style rail, and
 * runs the route → simulate path. Pass `--live` to flip the intent to live
 * mode (still safe in dev because the worker holds signing keys), and `--cctp`
 * to swap the rail. Useful for end-to-end smoke before promoting a build.
 *
 * Linked from the root README under Common Agent Patterns.
 */
import { AdapterRegistry, createDefaultDevAdapters } from '@keeta-agent-sdk/adapter-registry';
import { Router } from '@keeta-agent-sdk/routing';
import { simulate } from '@keeta-agent-sdk/simulator';
import type { ExecutionIntent } from '@keeta-agent-sdk/types';

const mode = process.argv.includes('--live') ? 'live' : 'simulate';
const rail = process.argv.includes('--cctp') ? 'cctp' : 'kta';

async function main() {
  const registry = new AdapterRegistry();
  for (const a of createDefaultDevAdapters()) registry.register(a);
  const router = new Router(registry);

  const intent: ExecutionIntent =
    rail === 'cctp'
      ? {
          id: '00000000-0000-4000-8000-000000000010',
          walletId: '00000000-0000-4000-8000-000000000011',
          baseAsset: 'USDC',
          quoteAsset: 'USDC',
          side: 'buy',
          size: '100',
          maxSlippageBps: 30,
          mode: mode === 'live' ? 'live' : 'simulate',
          metadata: {
            agentId: 'demo-agent',
            identityAttestation: 'opaque-attestation-blob',
          },
          createdAt: new Date().toISOString(),
        }
      : {
          id: '00000000-0000-4000-8000-000000000010',
          walletId: '00000000-0000-4000-8000-000000000011',
          baseAsset: 'KTA',
          quoteAsset: 'USDC',
          side: 'buy',
          size: '5',
          maxSlippageBps: 30,
          mode: mode === 'live' ? 'live' : 'simulate',
          createdAt: new Date().toISOString(),
        };

  const { best } = await router.buildPlans(intent);
  const sim = await simulate(intent, best, {
    volatility: 0.02,
    latencyMs: 10,
    failureProbability: 0,
    slippageMultiplier: 1,
    seed: 'mock-live',
  });
  console.log('rail', rail, 'route', best.id, 'simulation', sim);
}

main().catch(console.error);
