import { createClient } from '@keeta-agent-stack/sdk';

export function createWebSdkClient() {
  return createClient({
    baseUrl: process.env.KEETA_AGENT_API_URL ?? 'http://localhost:3001',
  });
}
