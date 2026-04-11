import { createClient } from '@keeta-agent-sdk/sdk';

const baseUrl = process.env.API_URL ?? 'http://localhost:3001';
const client = createClient({ baseUrl });

async function main() {
  const health = await client.health();
  console.log('health', health);
  console.log('Paper trader example — wire intents + simulations against a running API.');
}

main().catch(console.error);
