import 'dotenv/config';
import { buildAgent, buildPaymentIntent, buildRebalanceIntent } from './agent.js';

async function main(): Promise<void> {
  const apiUrl = process.env.KEETA_API_URL ?? 'http://localhost:3001';
  const apiToken = process.env.KEETA_API_TOKEN || undefined;
  const intentKind = (process.env.INTENT_KIND ?? 'payment').toLowerCase();
  const walletId = process.env.KEETA_WALLET_ID ?? globalThis.crypto.randomUUID();

  const agent = buildAgent({ apiUrl, apiToken });

  const intent =
    intentKind === 'rebalance' ? buildRebalanceIntent(walletId) : buildPaymentIntent(walletId);

  const result = await agent.execute(intent);
  console.log(JSON.stringify({ stage: 'agent.result', kind: result.kind, result }, null, 2));

  if (result.kind === 'failed') {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('starter-agent crashed', err);
  process.exit(1);
});
