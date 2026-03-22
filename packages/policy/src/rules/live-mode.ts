import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

export function ruleLiveMode(ctx: PolicyContext): PolicyRuleContribution {
  const wantsLive = ctx.intent.mode === 'live';
  const allowed = ctx.config.liveModeEnabled;
  const passed = !wantsLive || allowed;
  return {
    ruleId: 'live_mode_enabled',
    passed,
    reason: passed ? undefined : 'Live execution disabled by policy',
    limits: { liveModeEnabled: allowed },
  };
}
