/**
 * Scenario: paper trader.
 *
 * Connects to a running Keeta API and prints the health response. This is the
 * smallest possible "is the agent talking to the platform?" check — extend it
 * by creating an intent with `client.createIntent(...)` and walking it through
 * the quote → route → policy → execute pipeline in `mode: 'simulate'`.
 *
 * Maps to the "Paper trader" row in the root README's Common Agent Patterns.
 */
import { createClient } from '@keeta-agent-sdk/sdk';

const baseUrl = process.env.API_URL ?? 'http://localhost:3001';
const client = createClient({ baseUrl });

async function main() {
  const health = await client.health();
  console.log('health', health);
  console.log('Paper trader example — wire intents + simulations against a running API.');
}

main().catch(console.error);
