import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

export function ruleMaxOrderSize(ctx: PolicyContext): PolicyRuleContribution {
  const size = Number(ctx.intent.size);
  const max = ctx.config.maxOrderSize;
  const passed = size <= max;
  return {
    ruleId: 'max_order_size',
    passed,
    reason: passed ? undefined : `Order size ${size} exceeds max ${max}`,
    limits: { maxOrderSize: max },
  };
}
