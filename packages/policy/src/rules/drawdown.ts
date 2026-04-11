import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

/** Placeholder: does not enforce drawdown until equity history exists. */
export function ruleDrawdown(ctx: PolicyContext): PolicyRuleContribution {
  const maxBps = ctx.config.maxDrawdownBps;
  if (maxBps === undefined || maxBps <= 0) {
    return { ruleId: 'drawdown', passed: true };
  }
  return {
    ruleId: 'drawdown',
    passed: true,
    reason: 'Drawdown cap configured but enforcement pending equity history',
    limits: { maxDrawdownBps: maxBps, enforced: false },
  };
}
