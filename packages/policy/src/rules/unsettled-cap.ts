import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

export function ruleUnsettledCap(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxUnsettledExecutions;
  if (max === undefined || max <= 0) {
    return { ruleId: 'unsettled_cap', passed: true };
  }
  const n = ctx.portfolioStats?.unsettledExecutions ?? 0;
  const passed = n < max;
  return {
    ruleId: 'unsettled_cap',
    passed,
    reason: passed ? undefined : `Unsettled executions ${n} exceeds cap ${max}`,
    limits: { unsettledExecutions: n, maxUnsettledExecutions: max },
  };
}
