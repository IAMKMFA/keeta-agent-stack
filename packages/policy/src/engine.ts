import type { PolicyDecision } from '@keeta-agent-sdk/types';
import type { PolicyContext } from './types.js';
import { ruleAssetAllowlist } from './rules/asset-allowlist.js';
import { ruleCooldownPlaceholder } from './rules/cooldown.js';
import { ruleLiveMode } from './rules/live-mode.js';
import { ruleMaxOrderSize } from './rules/max-order-size.js';
import { ruleMaxSlippage } from './rules/max-slippage.js';
import { ruleUnsupportedRoute } from './rules/unsupported-route.js';
import { ruleVenueAllowlist } from './rules/venue-allowlist.js';

const rules = [
  ruleMaxOrderSize,
  ruleMaxSlippage,
  ruleVenueAllowlist,
  ruleAssetAllowlist,
  ruleLiveMode,
  ruleUnsupportedRoute,
  ruleCooldownPlaceholder,
] as const;

export class PolicyEngine {
  evaluate(ctx: PolicyContext): PolicyDecision {
    const contributions = rules.map((r) => r(ctx));
    const allowed = contributions.every((c) => c.passed);
    const summary = allowed
      ? 'All policy rules passed'
      : `Blocked: ${contributions.filter((c) => !c.passed).map((c) => c.ruleId).join(', ')}`;
    return {
      intentId: ctx.intent.id,
      allowed,
      summary,
      contributions,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
