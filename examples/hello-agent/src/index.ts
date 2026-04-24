/**
 * The 60-second hello agent.
 *
 * Prereqs: a running Keeta Agent SDK API at $KEETA_API_URL (default
 * http://localhost:3001). Start one with `pnpm dev:all` from the repo root.
 *
 * What this does:
 *   1. Pings /health to confirm the API is reachable.
 *   2. Creates a server-managed wallet (no signing seed leaves the worker).
 *   3. Creates a USDC -> KTA buy intent in `simulate` mode.
 *   4. Queues a quote and prints the resulting job descriptor.
 *
 * That's enough to know the SDK is wired correctly. Extend by calling
 * `client.routeIntent(...)`, `client.policyIntent(...)`, then
 * `client.executeIntent(...)`.
 */
import { createClient } from '@keeta-agent-sdk/sdk';

const baseUrl = process.env.KEETA_API_URL ?? 'http://localhost:3001';
const client = createClient({ baseUrl });

async function main() {
  const health = await client.health();
  console.log('health', health);

  const wallet = await client.wallets.createServer({
    label: `hello-agent-${Date.now()}`,
    includeSeed: false,
  });
  console.log('wallet', { id: wallet.id, address: wallet.address });

  const intent = await client.createIntent({
    walletId: wallet.id,
    baseAsset: 'USDC',
    quoteAsset: 'KTA',
    side: 'buy',
    size: '10',
    maxSlippageBps: 50,
    mode: 'simulate',
  });
  console.log('intent', { id: intent.id, side: intent.side, size: intent.size });

  const quote = await client.quoteIntent(intent.id);
  console.log('quote queued', quote);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
