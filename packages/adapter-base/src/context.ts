import type { ExecutionMode, RouteStep } from '@keeta-agent-sdk/types';

export interface ExecuteContext {
  intentId: string;
  walletId: string;
  mode: ExecutionMode;
  /** When executing a specific hop */
  step?: RouteStep;
}
