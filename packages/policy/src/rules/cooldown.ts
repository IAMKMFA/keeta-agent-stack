import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
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
