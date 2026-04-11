import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

export function ruleAnchorBondActive(ctx: PolicyContext): PolicyRuleContribution {
  if (ctx.intent.mode !== 'live') {
    return { ruleId: 'anchor_bond_active', passed: true };
  }
  const anchorSteps = ctx.routePlan?.steps.filter((step) => step.venueKind === 'anchor') ?? [];
  if (anchorSteps.length === 0) {
    return { ruleId: 'anchor_bond_active', passed: true };
  }

  for (const step of anchorSteps) {
    const hint = ctx.anchorBonds?.[step.adapterId];
    if (!hint) {
      return {
        ruleId: 'anchor_bond_active',
        passed: false,
        reason: `No payment anchor bond hint for adapter ${step.adapterId}`,
      };
    }
    if (hint.anchorStatus !== 'active') {
      return {
        ruleId: 'anchor_bond_active',
        passed: false,
        reason: `Anchor ${step.adapterId} is not active`,
        limits: { anchorStatus: hint.anchorStatus },
      };
    }
    if (hint.bondStatus !== 'active') {
      return {
        ruleId: 'anchor_bond_active',
        passed: false,
        reason: `Anchor ${step.adapterId} bond is not active`,
        limits: { bondStatus: hint.bondStatus },
      };
    }
    if (ctx.config.anchorBondVerificationRequired === true && hint.verified !== true) {
      return {
        ruleId: 'anchor_bond_active',
        passed: false,
        reason: `Anchor ${step.adapterId} bond is not verified`,
        limits: { verificationSource: hint.verificationSource ?? 'missing' },
      };
    }
  }

  return {
    ruleId: 'anchor_bond_active',
    passed: true,
    reason: 'All live anchor route steps have active bond coverage',
  };
}
