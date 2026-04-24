import { createClient, type SdkClientOptions } from '@keeta-agent-stack/sdk';

const DEFAULT_API_URL = 'http://localhost:3001';

export type ControlPlaneSdkClient = ReturnType<typeof createClient>;

export function getApiUrl(): string {
  return (process.env.API_URL ?? process.env.KEETA_AGENT_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

export function hasOpsApiKey(): boolean {
  return typeof process.env.OPS_API_KEY === 'string' && process.env.OPS_API_KEY.length > 0;
}

export function createControlPlaneSdkOptions(): SdkClientOptions {
  if (!hasOpsApiKey()) {
    throw new Error('OPS_API_KEY is required for MCP control-plane API tools.');
  }
  return {
    baseUrl: getApiUrl(),
    defaultHeaders: {
      'x-ops-key': process.env.OPS_API_KEY as string,
    },
  };
}

export function createControlPlaneClient(): ControlPlaneSdkClient {
  return createClient(createControlPlaneSdkOptions());
}
