import type { ExecutionMode, RouteStep } from '@keeta-agent-stack/types';

export interface ExecuteContext {
  intentId: string;
  walletId: string;
  mode: ExecutionMode;
  /** When executing a specific hop */
  step?: RouteStep;
  /** Intent payload.metadata from DB — worker fills for transfer routing, etc. */
  intentMetadata?: Record<string, unknown>;
  /**
   * Worker-only extension slot. Keys are defined by adapters (e.g. Keeta `UserClient` handle).
   * Never set from the public API.
   */
  extensions?: Record<string, unknown>;
}
