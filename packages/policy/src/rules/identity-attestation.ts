import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

/**
 * When identity policy is enabled, require a minimal identity signal for live-adjacent flows:
 * opaque attestation blob and/or certificate fingerprint in intent metadata.
 * Extend when Keeta certificate APIs are wired into worker preflight.
 */
export function ruleIdentityAttestation(ctx: PolicyContext): PolicyRuleContribution {
  if (ctx.config.identityPolicyEnabled !== true) {
    return {
      ruleId: 'identity_attestation',
      passed: true,
      reason: 'Identity policy disabled',
    };
  }
  const id = ctx.identityHints;
  if (!id) {
    return {
      ruleId: 'identity_attestation',
      passed: false,
      reason: 'Identity policy enabled but no identityHints from worker',
    };
  }
  const ok =
    id.hasAttestation ||
    Boolean(id.certificateFingerprint && id.certificateFingerprint.length > 0) ||
    Boolean(id.agentId && id.agentId.length > 0);
  return {
    ruleId: 'identity_attestation',
    passed: ok,
    reason: ok
      ? 'Identity context present'
      : 'Requires metadata.identityAttestation, identityCertFingerprint, or agentId when identity policy is enabled',
    limits: {
      strategyId: id.strategyId,
      agentId: id.agentId,
    },
  };
}
