import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';
import { agentPaymentSteps } from './agent-payment-utils.js';

export function ruleAllowedAgentPaymentRails(ctx: PolicyContext): PolicyRuleContribution {
  const allowlist = ctx.config.allowedAgentPaymentRails ?? [];
  const steps = agentPaymentSteps(ctx);
  if (steps.length === 0 || allowlist.length === 0) {
    return {
      ruleId: 'allowed_agent_payment_rails',
      passed: true,
      limits: { allowlist, routeRails: steps.map((step) => step.adapterId) },
    };
  }

  const allowed = new Set(allowlist);
  const routeRails = steps.map((step) => step.adapterId);
  const blockedRails = routeRails.filter((rail) => !allowed.has(rail));
  const passed = blockedRails.length === 0;

  return {
    ruleId: 'allowed_agent_payment_rails',
    passed,
    reason: passed
      ? undefined
      : `Route uses agent-payment rails outside allowlist: ${blockedRails.join(', ')}`,
    limits: { allowlist, routeRails, blockedRails },
  };
}
