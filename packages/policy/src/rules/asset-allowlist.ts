import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

export function ruleAssetAllowlist(ctx: PolicyContext): PolicyRuleContribution {
  const allow = new Set(ctx.config.assetAllowlist);
  if (allow.size === 0) {
    return { ruleId: 'asset_allowlist', passed: true };
  }
  const ok = allow.has(ctx.intent.baseAsset) && allow.has(ctx.intent.quoteAsset);
  return {
    ruleId: 'asset_allowlist',
    passed: ok,
    reason: ok ? undefined : 'Base or quote asset not on allowlist',
    limits: { allowlist: [...allow] },
  };
}
