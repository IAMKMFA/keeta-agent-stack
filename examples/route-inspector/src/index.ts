import { AdapterRegistry, createDefaultDevAdapters } from '@keeta-agent-sdk/adapter-registry';
import { Router } from '@keeta-agent-sdk/routing';
import type { ExecutionIntent } from '@keeta-agent-sdk/types';

async function main() {
  const registry = new AdapterRegistry();
  for (const a of createDefaultDevAdapters()) registry.register(a);
  const router = new Router(registry);
  const intent: ExecutionIntent = {
    id: '00000000-0000-4000-8000-000000000001',
    walletId: '00000000-0000-4000-8000-000000000002',
    baseAsset: 'KTA',
    quoteAsset: 'USDC',
    side: 'sell',
    size: '10',
    maxSlippageBps: 40,
    mode: 'simulate',
    createdAt: new Date().toISOString(),
  };
  const { best, alternates } = await router.buildPlans(intent);
  console.log('best', best);
  console.log('alternates', alternates.length);
}

main().catch(console.error);
