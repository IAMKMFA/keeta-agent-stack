import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

export function ruleCooldownPlaceholder(_ctx: PolicyContext): PolicyRuleContribution {
  void _ctx;
  return {
    ruleId: 'cooldown',
    passed: true,
    reason: undefined,
    limits: { cooldown: 'not_implemented' },
  };
}
