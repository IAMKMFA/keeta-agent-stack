/**
 * Golden path: simulation with shadow-style Keeta snapshot (ledger + balances stub).
 * For live chain + wallet snapshots without submit, use POST /simulations/run with fidelityMode shadow.
 */
import { AdapterRegistry, createDefaultDevAdapters } from '@keeta-agent-sdk/adapter-registry';
import { Router } from '@keeta-agent-sdk/routing';
import { simulate } from '@keeta-agent-sdk/simulator';
import type { ExecutionIntent, KeetaSimulationSnapshot } from '@keeta-agent-sdk/types';

async function main() {
  const registry = new AdapterRegistry();
  for (const a of createDefaultDevAdapters()) registry.register(a);
  const router = new Router(registry);
  const intent: ExecutionIntent = {
    id: '00000000-0000-4000-8000-000000000020',
    walletId: '00000000-0000-4000-8000-000000000021',
    baseAsset: 'KTA',
    quoteAsset: 'USDC',
    side: 'buy',
    size: '10',
    maxSlippageBps: 30,
    mode: 'simulate',
    createdAt: new Date().toISOString(),
  };
  const { best } = await router.buildPlans(intent);
  const keetaSnapshot: KeetaSimulationSnapshot = {
    network: 'test',
    capturedAt: new Date().toISOString(),
    fidelityMode: 'shadow',
    ledgerBlockCount: 1,
    walletBalances: [{ assetId: 'KTA', amount: '1000' }],
  };
  const result = await simulate(
    intent,
    best,
    {
      fidelityMode: 'shadow',
      volatility: 0.02,
      latencyMs: 5,
      failureProbability: 0,
      slippageMultiplier: 1,
      seed: 'fidelity-demo',
    },
    keetaSnapshot
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
