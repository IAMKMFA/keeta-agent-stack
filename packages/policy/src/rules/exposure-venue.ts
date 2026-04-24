import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

function parseSize(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function ruleExposurePerVenue(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxExposurePerVenue;
  if (max === undefined || max <= 0) {
    return { ruleId: 'exposure_per_venue', passed: true };
  }
  const venue = ctx.routePlan?.steps[0]?.adapterId ?? 'unknown';
  const open = ctx.portfolioStats?.openExposureByVenue?.[venue] ?? 0;
  const add = parseSize(ctx.intent.size);
  const passed = open + add <= max;
  return {
    ruleId: 'exposure_per_venue',
    passed,
    reason: passed ? undefined : `Venue ${venue} exposure would exceed cap`,
    limits: { venue, openExposure: open, add, maxExposurePerVenue: max },
  };
}
