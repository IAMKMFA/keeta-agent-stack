import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

/** Reject routes with no steps or mismatched intent assets (placeholder for richer graph checks). */
export function ruleUnsupportedRoute(ctx: PolicyContext): PolicyRuleContribution {
  const plan = ctx.routePlan;
  if (!plan) {
    return { ruleId: 'unsupported_route', passed: true };
  }
  const first = plan.steps[0];
  const last = plan.steps[plan.steps.length - 1];
  if (!first || !last) {
    return {
      ruleId: 'unsupported_route',
      passed: false,
      reason: 'Route has no steps',
    };
  }
  const assetsOk =
    first.baseAsset === ctx.intent.baseAsset && last.quoteAsset === ctx.intent.quoteAsset;
  return {
    ruleId: 'unsupported_route',
    passed: assetsOk,
    reason: assetsOk ? undefined : 'Route does not connect intent assets',
  };
}
