import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

function parseSize(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function ruleExposurePerWallet(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxExposurePerWallet;
  if (max === undefined || max <= 0) {
    return { ruleId: 'exposure_per_wallet', passed: true };
  }
  const open = ctx.portfolioStats?.walletExposure ?? 0;
  const add = parseSize(ctx.intent.size);
  const passed = open + add <= max;
  return {
    ruleId: 'exposure_per_wallet',
    passed,
    reason: passed ? undefined : 'Wallet exposure would exceed cap',
    limits: { openExposure: open, add, maxExposurePerWallet: max },
  };
}
