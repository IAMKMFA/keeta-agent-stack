import type { RouteStep } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

export function agentPaymentSteps(ctx: PolicyContext): RouteStep[] {
  return ctx.routePlan?.steps.filter((step) => step.venueKind === 'agent-payment') ?? [];
}

export function readAgentPaymentEstimatedUsd(step: RouteStep): number {
  const agentPayment = step.quote?.raw?.agentPayment;
  if (typeof agentPayment !== 'object' || agentPayment === null || Array.isArray(agentPayment)) {
    return 0;
  }
  const estimatedUsd = (agentPayment as Record<string, unknown>).estimatedUsd;
  const parsed =
    typeof estimatedUsd === 'number'
      ? estimatedUsd
      : typeof estimatedUsd === 'string'
        ? Number(estimatedUsd)
        : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}
