/**
 * Centralised env loading + validation for the treasury rebalancer template.
 *
 * The agent loop reads one frozen `RebalancerConfig` per process; nothing else
 * touches `process.env` directly.
 */

export interface AllocationTarget {
  asset: string;
  /** Target weight expressed as a fraction (0..1). All targets must sum to 1. */
  weight: number;
}

export interface RebalancerConfig {
  apiUrl: string;
  apiToken: string | undefined;
  walletId: string;
  intervalMs: number;
  driftThresholdBps: number;
  maxLegNotional: number;
  maxSlippageBps: number;
  intentMode: 'simulate' | 'live';
  /** Asset that we treat as the numéraire when computing notional drift. */
  baseAsset: string;
  targets: AllocationTarget[];
}

const DEFAULT_TARGETS: AllocationTarget[] = [
  { asset: 'KTA', weight: 0.6 },
  { asset: 'USDC', weight: 0.4 },
];

function num(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${envName} must be a finite number, got ${raw}`);
  }
  return parsed;
}

export function loadConfig(): RebalancerConfig {
  const apiUrl = process.env.KEETA_API_URL ?? 'http://localhost:3001';
  const apiToken = process.env.KEETA_API_TOKEN || undefined;
  const walletId = process.env.KEETA_WALLET_ID;
  if (!walletId) {
    throw new Error(
      'KEETA_WALLET_ID is required. Create one with `curl -X POST $KEETA_API_URL/wallets -d \'{"label":"treasury"}\'` and copy the returned id.'
    );
  }

  const intentMode = (process.env.REBALANCE_INTENT_MODE ?? 'simulate') as 'simulate' | 'live';
  if (intentMode !== 'simulate' && intentMode !== 'live') {
    throw new Error(`REBALANCE_INTENT_MODE must be 'simulate' or 'live', got ${intentMode}`);
  }

  return {
    apiUrl,
    apiToken,
    walletId,
    intervalMs: num('REBALANCE_INTERVAL_SECONDS', 60) * 1000,
    driftThresholdBps: num('REBALANCE_DRIFT_THRESHOLD_BPS', 200),
    maxLegNotional: num('REBALANCE_MAX_LEG_NOTIONAL', 10_000),
    maxSlippageBps: num('REBALANCE_MAX_SLIPPAGE_BPS', 50),
    intentMode,
    baseAsset: process.env.REBALANCE_BASE_ASSET ?? 'USDC',
    targets: DEFAULT_TARGETS,
  };
}
