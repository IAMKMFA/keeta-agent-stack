import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

function parseSize(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Simple per-asset exposure check using intent base asset size vs configured cap. */
export function ruleExposurePerAsset(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxExposurePerAsset;
  if (max === undefined || max <= 0) {
    return { ruleId: 'exposure_per_asset', passed: true };
  }
  const open = ctx.portfolioStats?.openExposureByAsset?.[ctx.intent.baseAsset] ?? 0;
  const add = parseSize(ctx.intent.size);
  const passed = open + add <= max;
  return {
    ruleId: 'exposure_per_asset',
    passed,
    reason: passed ? undefined : `Exposure on ${ctx.intent.baseAsset} would exceed cap`,
    limits: { openExposure: open, add, maxExposurePerAsset: max },
  };
}
