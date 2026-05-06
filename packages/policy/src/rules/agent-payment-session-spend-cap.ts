import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';
import { agentPaymentSteps, readAgentPaymentEstimatedUsd } from './agent-payment-utils.js';

export function ruleAgentPaymentSessionSpendCap(ctx: PolicyContext): PolicyRuleContribution {
  const cap = ctx.config.perSessionAgentSpendCapUsd;
  const steps = agentPaymentSteps(ctx);
  if (steps.length === 0 || cap === undefined || cap <= 0) {
    return {
      ruleId: 'agent_payment_session_spend_cap',
      passed: true,
      limits: { capUsd: cap ?? null, agentPaymentSteps: steps.length },
    };
  }

  const estimatedIntentSpendUsd = steps.reduce(
    (sum, step) => sum + readAgentPaymentEstimatedUsd(step),
    0
  );
  const currentSessionSpendUsd = ctx.portfolioStats?.agentPaymentSessionSpendUsd ?? 0;
  const projectedSessionSpendUsd = currentSessionSpendUsd + estimatedIntentSpendUsd;
  const passed = projectedSessionSpendUsd <= cap;

  return {
    ruleId: 'agent_payment_session_spend_cap',
    passed,
    reason: passed
      ? undefined
      : `Projected agent-payment session spend ${projectedSessionSpendUsd.toFixed(
          4
        )} USD exceeds cap ${cap}`,
    limits: {
      capUsd: cap,
      currentSessionSpendUsd,
      estimatedIntentSpendUsd,
      projectedSessionSpendUsd,
    },
  };
}
