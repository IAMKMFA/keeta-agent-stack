import type { PolicyConfig } from './types.js';

/**
 * Subset of `AppEnv` relevant to building a `PolicyConfig`. Callers can pass the full
 * `AppEnv` from `@keeta-agent-sdk/config` — this interface type matches structurally.
 *
 * Keeping the type structural avoids a circular dependency between `@keeta-agent-sdk/policy`
 * and `@keeta-agent-sdk/config` (config doesn't depend on policy today; this inverts cleanly).
 */
export interface PolicyEnvInputs {
  KEETA_POLICY_ENABLED?: boolean;
  IDENTITY_POLICY_ENABLED?: boolean;
  ANCHOR_BOND_STRICT?: boolean;
}

function readNumEnv(env: NodeJS.ProcessEnv, key: string, defaultVal?: number): number | undefined {
  const v = env[key];
  if (v === undefined || v === '') return defaultVal;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultVal;
}

function readBoolEnv(env: NodeJS.ProcessEnv, key: string): boolean {
  const v = env[key];
  return v === 'true' || v === '1';
}

function readCsvEnv(env: NodeJS.ProcessEnv, key: string): string[] {
  return (env[key] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build the default `PolicyConfig` from process.env + app-env toggles. Used by both
 * `apps/api/src/routes/policy-admin.ts` and `apps/worker/src/run.ts` so policy defaults stay
 * consistent regardless of which process evaluates them first.
 *
 * Callers may pass an alternate process.env source (e.g. for tests).
 */
export function defaultPolicyConfigFromEnv(
  appEnv: PolicyEnvInputs,
  processEnv: NodeJS.ProcessEnv = process.env
): PolicyConfig {
  return {
    maxOrderSize: Number(processEnv.POLICY_MAX_ORDER_SIZE ?? 1_000_000),
    maxSlippageBps: Number(processEnv.POLICY_MAX_SLIPPAGE_BPS ?? 500),
    venueAllowlist: readCsvEnv(processEnv, 'POLICY_VENUE_ALLOWLIST'),
    assetAllowlist: readCsvEnv(processEnv, 'POLICY_ASSET_ALLOWLIST'),
    liveModeEnabled: readBoolEnv(processEnv, 'LIVE_MODE_ENABLED'),
    keetaPolicyEnabled: appEnv.KEETA_POLICY_ENABLED === true,
    identityPolicyEnabled: appEnv.IDENTITY_POLICY_ENABLED === true,
    anchorBondVerificationRequired: appEnv.ANCHOR_BOND_STRICT === true,
    maxExposurePerAsset: readNumEnv(processEnv, 'POLICY_MAX_EXPOSURE_PER_ASSET'),
    maxExposurePerWallet: readNumEnv(processEnv, 'POLICY_MAX_EXPOSURE_PER_WALLET'),
    maxExposurePerVenue: readNumEnv(processEnv, 'POLICY_MAX_EXPOSURE_PER_VENUE'),
    maxNotionalPerStrategy: readNumEnv(processEnv, 'POLICY_MAX_NOTIONAL_PER_STRATEGY'),
    maxDailyTrades: readNumEnv(processEnv, 'POLICY_MAX_DAILY_TRADES', 50_000),
    maxUnsettledExecutions: readNumEnv(processEnv, 'POLICY_MAX_UNSETTLED', 5000),
    maxDrawdownBps: readNumEnv(processEnv, 'POLICY_MAX_DRAWDOWN_BPS'),
  };
}
