/**
 * Treasury rebalancer policy pack.
 *
 * The pack is registered against the API on startup (idempotent — looked up by
 * name, created or refreshed) and pinned to every emitted intent.
 *
 * Composition:
 *   - max_order_size      : hard notional cap per leg
 *   - max_slippage_bps    : refuse legs that would tolerate >N bps slippage
 *   - venue_allowlist     : only the live integration adapters
 *   - asset_allowlist     : only the assets we know how to value
 *   - daily_trades_cap    : cheap circuit breaker
 *   - unsettled_cap       : refuse to start a new leg while one is open
 */
import type { CreatePolicyPackRequest } from '@keeta-agent-stack/sdk';
import type { RebalancerConfig } from './config.js';

export const POLICY_PACK_NAME = 'treasury-rebalancer';

export function buildPolicyPack(cfg: RebalancerConfig): CreatePolicyPackRequest {
  const allowedAssets = Array.from(
    new Set([cfg.baseAsset, ...cfg.targets.map((target) => target.asset)])
  );

  return {
    name: POLICY_PACK_NAME,
    description:
      'Treasury rebalancer guardrails: caps notional per leg, slippage, venue + asset allowlists, daily trade count, and concurrent unsettled executions.',
    rules: [
      {
        ruleId: 'max_order_size',
        configKey: 'maxOrderSize',
        config: { maxOrderSize: cfg.maxLegNotional },
      },
      {
        ruleId: 'max_slippage',
        configKey: 'maxSlippageBps',
        config: { maxSlippageBps: cfg.maxSlippageBps },
      },
      {
        ruleId: 'venue_allowlist',
        configKey: 'venueAllowlist',
        config: { venueAllowlist: ['keeta-transfer', 'oracle-rail'] },
      },
      {
        ruleId: 'asset_allowlist',
        configKey: 'assetAllowlist',
        config: { assetAllowlist: allowedAssets },
      },
      {
        ruleId: 'daily_trades',
        configKey: 'maxDailyTrades',
        config: { maxDailyTrades: 24 },
      },
      {
        ruleId: 'unsettled_cap',
        configKey: 'maxUnsettledExecutions',
        config: { maxUnsettledExecutions: 1 },
      },
    ],
  };
}
