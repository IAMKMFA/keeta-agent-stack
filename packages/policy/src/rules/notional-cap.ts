import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

function parseSize(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Caps notional per intent when `maxNotionalPerStrategy` is set (strategy-scoped). */
export function ruleNotionalPerStrategy(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxNotionalPerStrategy;
  if (max === undefined || max <= 0) {
    return { ruleId: 'notional_per_strategy', passed: true };
  }
  const notional = parseSize(ctx.intent.size);
  const passed = notional <= max;
  return {
    ruleId: 'notional_per_strategy',
    passed,
    reason: passed ? undefined : `Intent notional ${notional} exceeds strategy cap ${max}`,
    limits: { notional, maxNotionalPerStrategy: max },
  };
}
