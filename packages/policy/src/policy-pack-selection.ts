import type { ExecutionIntent, PolicyPackSource } from '@keeta-agent-sdk/types';
import type { PolicyPack } from './types.js';

export interface PolicyPackSelectionInput {
  intent: Pick<ExecutionIntent, 'policyPackId' | 'walletId' | 'strategyId' | 'metadata'>;
  loadPolicyPack: (id: string) => Promise<PolicyPack | null>;
  explicitPolicyPackId?: string;
  walletDefaultPolicyPackId?: string | null;
  strategyPolicyPackId?: string | null;
  globalDefaultPolicyPackId?: string | null;
}

export type ResolvedPolicyPackSelection =
  | { policyPack: null }
  | { policyPack: PolicyPack; source: PolicyPackSource }
  | {
      error: {
        code: 'NOT_FOUND';
        message: string;
        policyPackId: string;
        source: PolicyPackSource;
      };
    };

function metadataPolicyPackId(intent: Pick<ExecutionIntent, 'metadata'>): string | undefined {
  const value = intent.metadata?.policyPackId;
  return typeof value === 'string' ? value : undefined;
}

async function resolveById(
  loadPolicyPack: (id: string) => Promise<PolicyPack | null>,
  policyPackId: string,
  source: PolicyPackSource
): Promise<ResolvedPolicyPackSelection> {
  const pack = await loadPolicyPack(policyPackId);
  if (!pack) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: `Policy pack not found: ${policyPackId}`,
        policyPackId,
        source,
      },
    };
  }
  return {
    policyPack: pack,
    source,
  };
}

/**
 * Resolve the effective persisted policy pack for an execution path.
 *
 * Order of precedence preserves existing behavior while adding first-class selectors:
 * 1. explicit request override
 * 2. intent.policyPackId
 * 3. legacy intent.metadata.policyPackId
 * 4. wallet default
 * 5. legacy strategy assignment
 * 6. global default
 */
export async function resolvePolicyPackSelection(
  input: PolicyPackSelectionInput
): Promise<ResolvedPolicyPackSelection> {
  if (input.explicitPolicyPackId) {
    return resolveById(input.loadPolicyPack, input.explicitPolicyPackId, 'request');
  }

  if (input.intent.policyPackId) {
    return resolveById(input.loadPolicyPack, input.intent.policyPackId, 'intent');
  }

  const legacyIntentPolicyPackId = metadataPolicyPackId(input.intent);
  if (legacyIntentPolicyPackId) {
    return resolveById(input.loadPolicyPack, legacyIntentPolicyPackId, 'intent_metadata');
  }

  if (input.walletDefaultPolicyPackId) {
    return resolveById(input.loadPolicyPack, input.walletDefaultPolicyPackId, 'wallet_default');
  }

  if (input.strategyPolicyPackId) {
    return resolveById(input.loadPolicyPack, input.strategyPolicyPackId, 'strategy_config');
  }

  if (input.globalDefaultPolicyPackId) {
    return resolveById(input.loadPolicyPack, input.globalDefaultPolicyPackId, 'global_default');
  }

  return { policyPack: null };
}
