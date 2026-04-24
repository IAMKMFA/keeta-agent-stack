import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

export function ruleMaxSlippage(ctx: PolicyContext): PolicyRuleContribution {
  const max = ctx.config.maxSlippageBps;
  const passed = ctx.intent.maxSlippageBps <= max;
  return {
    ruleId: 'max_slippage',
    passed,
    reason: passed ? undefined : `Slippage ${ctx.intent.maxSlippageBps} bps exceeds max ${max} bps`,
    limits: { maxSlippageBps: max },
  };
}
