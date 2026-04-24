import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

export function ruleDailyTrades(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxDailyTrades;
  if (max === undefined || max <= 0) {
    return { ruleId: 'daily_trades', passed: true };
  }
  const count = ctx.portfolioStats?.dailyTradeCount ?? 0;
  const passed = count < max;
  return {
    ruleId: 'daily_trades',
    passed,
    reason: passed ? undefined : `Daily trade count ${count} exceeds cap ${max}`,
    limits: { dailyTradeCount: count, maxDailyTrades: max },
  };
}
