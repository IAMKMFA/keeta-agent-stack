import type { ExecutionIntent, RoutePlan } from '@keeta-agent-sdk/types';

export interface PolicyConfig {
  maxOrderSize: number;
  maxSlippageBps: number;
  venueAllowlist: string[];
  assetAllowlist: string[];
  liveModeEnabled: boolean;
}

export interface PolicyContext {
  intent: ExecutionIntent;
  routePlan?: RoutePlan;
  config: PolicyConfig;
}
