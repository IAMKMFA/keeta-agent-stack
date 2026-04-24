import type { PolicyRuleContribution } from '@keeta-agent-stack/types';
import type { PolicyContext } from '../types.js';

/**
 * Keeta-aware policy extension point.
 *
 * When `config.keetaPolicyEnabled` is true, intents must include `keetaHints` from a
 * preflight pass (worker) that reads chain/account state. Certificate-specific checks
 * can be added here once product requirements and SDK APIs are fixed.
 */
export function ruleKeetaExtension(ctx: PolicyContext): PolicyRuleContribution {
  if (ctx.config.keetaPolicyEnabled !== true) {
    return {
      ruleId: 'keeta_extension',
      passed: true,
      reason: 'Keeta policy disabled',
    };
  }
  if (!ctx.keetaHints) {
    return {
      ruleId: 'keeta_extension',
      passed: false,
      reason: 'Keeta policy enabled but no keetaHints — run worker preflight',
    };
  }
  return {
    ruleId: 'keeta_extension',
    passed: true,
    reason: ctx.keetaHints.identity?.certificateFingerprintPresent
      ? 'Keeta hints present; certificate fingerprint signal in metadata'
      : 'Keeta hints present (chain-level certificate verification is a future SDK extension)',
    limits: { network: ctx.keetaHints.network },
  };
}
