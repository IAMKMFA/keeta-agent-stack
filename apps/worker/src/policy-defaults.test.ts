import { describe, expect, it } from 'vitest';
import { defaultPolicyConfigFromEnv } from '@keeta-agent-stack/policy';

describe('defaultPolicyConfigFromEnv (consumed by worker bootstrap)', () => {
  it('parses numeric env vars and CSV allowlists', () => {
    const cfg = defaultPolicyConfigFromEnv(
      {
        KEETA_POLICY_ENABLED: true,
        IDENTITY_POLICY_ENABLED: false,
        ANCHOR_BOND_STRICT: true,
      },
      {
        POLICY_MAX_ORDER_SIZE: '250',
        POLICY_MAX_SLIPPAGE_BPS: '25',
        POLICY_VENUE_ALLOWLIST: 'a, b ,c',
        POLICY_ASSET_ALLOWLIST: 'USD,EUR',
        LIVE_MODE_ENABLED: 'true',
        POLICY_MAX_DAILY_TRADES: '100',
      } as NodeJS.ProcessEnv
    );

    expect(cfg.maxOrderSize).toBe(250);
    expect(cfg.maxSlippageBps).toBe(25);
    expect(cfg.venueAllowlist).toEqual(['a', 'b', 'c']);
    expect(cfg.assetAllowlist).toEqual(['USD', 'EUR']);
    expect(cfg.liveModeEnabled).toBe(true);
    expect(cfg.keetaPolicyEnabled).toBe(true);
    expect(cfg.identityPolicyEnabled).toBe(false);
    expect(cfg.anchorBondVerificationRequired).toBe(true);
    expect(cfg.maxDailyTrades).toBe(100);
  });

  it('falls back to sensible defaults when env is empty', () => {
    const cfg = defaultPolicyConfigFromEnv({}, {} as NodeJS.ProcessEnv);
    expect(cfg.maxOrderSize).toBe(1_000_000);
    expect(cfg.maxSlippageBps).toBe(500);
    expect(cfg.liveModeEnabled).toBe(false);
    expect(cfg.venueAllowlist).toEqual([]);
    expect(cfg.maxDailyTrades).toBe(50_000);
    expect(cfg.maxUnsettledExecutions).toBe(5000);
  });
});
