import type { PolicyDecision, PolicyRuleContribution } from '@keeta-agent-stack/types';
import type {
  PolicyEngineOptions,
  PolicyEntryKind,
  PolicyRuleCompositionDefinition,
  PolicyContext,
  PolicyRuleDefinition,
  PolicyRuleMetadata,
  PolicyRuleSource,
} from './types.js';
import { ruleAssetAllowlist } from './rules/asset-allowlist.js';
import { ruleCooldownPlaceholder } from './rules/cooldown.js';
import { ruleLiveMode } from './rules/live-mode.js';
import { ruleMaxOrderSize } from './rules/max-order-size.js';
import { ruleMaxSlippage } from './rules/max-slippage.js';
import { ruleUnsupportedRoute } from './rules/unsupported-route.js';
import { ruleVenueAllowlist } from './rules/venue-allowlist.js';
import { ruleKeetaExtension } from './rules/keeta-extension.js';
import { ruleDailyTrades } from './rules/daily-trades.js';
import { ruleUnsettledCap } from './rules/unsettled-cap.js';
import { ruleNotionalPerStrategy } from './rules/notional-cap.js';
import { ruleExposurePerAsset } from './rules/exposure-caps.js';
import { ruleExposurePerVenue } from './rules/exposure-venue.js';
import { ruleExposurePerWallet } from './rules/exposure-wallet.js';
import { ruleDrawdown } from './rules/drawdown.js';
import { ruleAnchorBondActive } from './rules/anchor-bond-active.js';
import { ruleIdentityAttestation } from './rules/identity-attestation.js';

type RegisteredPolicyEntry = {
  definition: PolicyRuleDefinition<unknown> | PolicyRuleCompositionDefinition;
  kind: PolicyEntryKind;
  order: number;
  source: PolicyRuleSource;
  enabled: boolean;
};

function wrapRule(
  ruleId: string,
  description: string,
  evaluate: (ctx: PolicyContext) => PolicyRuleContribution
): PolicyRuleDefinition {
  return {
    ruleId,
    description,
    evaluate: (ctx) => evaluate(ctx),
  };
}

const defaultPolicyRules: PolicyRuleDefinition[] = [
  wrapRule('max_order_size', 'Reject intents that exceed the configured maximum order size.', ruleMaxOrderSize),
  wrapRule('max_slippage', 'Reject intents whose slippage budget exceeds the configured maximum.', ruleMaxSlippage),
  wrapRule('venue_allowlist', 'Restrict route steps to approved venue adapter ids when configured.', ruleVenueAllowlist),
  wrapRule('asset_allowlist', 'Restrict intents to approved base and quote assets when configured.', ruleAssetAllowlist),
  wrapRule('live_mode_enabled', 'Prevent live execution when the environment disables live mode.', ruleLiveMode),
  wrapRule('identity_attestation', 'Require identity hints for live-adjacent flows when enabled.', ruleIdentityAttestation),
  wrapRule('keeta_extension', 'Require Keeta network preflight hints when Keeta-aware policy is enabled.', ruleKeetaExtension),
  wrapRule('anchor_bond_active', 'Require live payment-anchor routes to have an active verified bond.', ruleAnchorBondActive),
  wrapRule('unsupported_route', 'Reject route plans that contain unsupported or missing execution steps.', ruleUnsupportedRoute),
  wrapRule('cooldown', 'Placeholder cooldown rule for future trade pacing controls.', ruleCooldownPlaceholder),
  wrapRule('daily_trades', 'Cap daily execution count using worker-supplied portfolio statistics.', ruleDailyTrades),
  wrapRule('unsettled_cap', 'Cap unsettled executions using worker-supplied portfolio statistics.', ruleUnsettledCap),
  wrapRule('notional_per_strategy', 'Cap notional exposure per strategy using worker-supplied identity hints.', ruleNotionalPerStrategy),
  wrapRule('exposure_per_asset', 'Cap open exposure by asset using worker-supplied portfolio statistics.', ruleExposurePerAsset),
  wrapRule('exposure_per_venue', 'Cap open exposure by venue using worker-supplied portfolio statistics.', ruleExposurePerVenue),
  wrapRule('exposure_per_wallet', 'Cap wallet exposure using worker-supplied portfolio statistics.', ruleExposurePerWallet),
  wrapRule('drawdown', 'Reserved drawdown guardrail awaiting equity-history integration.', ruleDrawdown),
];

export function createDefaultPolicyRules(): PolicyRuleDefinition[] {
  return defaultPolicyRules.map((rule) => ({ ...rule }));
}

export function definePolicyRule<TConfig = unknown>(definition: PolicyRuleDefinition<TConfig>): PolicyRuleDefinition<TConfig> {
  return definition;
}

export function definePolicyComposition(
  definition: PolicyRuleCompositionDefinition
): PolicyRuleCompositionDefinition {
  return definition;
}

export class PolicyEngine {
  private readonly rules = new Map<string, RegisteredPolicyEntry>();
  private orderCounter = 0;

  constructor(options: PolicyEngineOptions = {}) {
    if (options.includeDefaultRules !== false) {
      for (const rule of createDefaultPolicyRules()) {
        this.registerInternal(rule, 'default', 'rule');
      }
    }
    for (const rule of options.rules ?? []) {
      this.register(rule);
    }
    for (const composition of options.compositions ?? []) {
      this.registerComposition(composition);
    }
    for (const ruleId of options.disabledRuleIds ?? []) {
      this.disable(ruleId);
    }
  }

  private registerInternal<TConfig>(
    definition: PolicyRuleDefinition<TConfig> | PolicyRuleCompositionDefinition,
    source: PolicyRuleSource,
    kind: PolicyEntryKind
  ): this {
    if (this.rules.has(definition.ruleId)) {
      throw new Error(`Policy rule already registered: ${definition.ruleId}`);
    }
    const composition = kind === 'composition' ? (definition as PolicyRuleCompositionDefinition) : undefined;
    if (composition && composition.operator === 'not' && composition.children.length !== 1) {
      throw new Error('Policy composition "not" requires exactly one child rule');
    }
    this.rules.set(definition.ruleId, {
      definition: definition as PolicyRuleDefinition | PolicyRuleCompositionDefinition,
      kind,
      order: this.orderCounter++,
      source,
      enabled: true,
    });
    return this;
  }

  register<TConfig = unknown>(rule: PolicyRuleDefinition<TConfig>): this {
    return this.registerInternal(rule, 'custom', 'rule');
  }

  registerComposition(definition: PolicyRuleCompositionDefinition): this {
    return this.registerInternal(definition, 'custom', 'composition');
  }

  unregister(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  has(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }

  enable(ruleId: string): boolean {
    const entry = this.rules.get(ruleId);
    if (!entry) return false;
    entry.enabled = true;
    return true;
  }

  disable(ruleId: string): boolean {
    const entry = this.rules.get(ruleId);
    if (!entry) return false;
    entry.enabled = false;
    return true;
  }

  isEnabled(ruleId: string): boolean {
    return this.rules.get(ruleId)?.enabled === true;
  }

  listRules(): Array<PolicyRuleDefinition | PolicyRuleCompositionDefinition> {
    return this.sortedEntries().map((entry) => entry.definition);
  }

  listRuleMetadata(): PolicyRuleMetadata[] {
    return this.sortedEntries().map((entry) => ({
      ruleId: entry.definition.ruleId,
      priority: entry.definition.priority,
      configKey: 'configKey' in entry.definition ? entry.definition.configKey : undefined,
      description: entry.definition.description,
      hasConfigSchema: 'configSchema' in entry.definition && entry.definition.configSchema !== undefined,
      source: entry.source,
      enabled: entry.enabled,
      kind: entry.kind,
      operator:
        entry.kind === 'composition'
          ? (entry.definition as PolicyRuleCompositionDefinition).operator
          : undefined,
      children:
        entry.kind === 'composition'
          ? [...(entry.definition as PolicyRuleCompositionDefinition).children]
          : undefined,
    }));
  }

  private sortedEntries(): RegisteredPolicyEntry[] {
    return [...this.rules.values()].sort((a, b) => {
      const priorityDiff = (b.definition.priority ?? 0) - (a.definition.priority ?? 0);
      return priorityDiff !== 0 ? priorityDiff : a.order - b.order;
    });
  }

  private evaluateRule(
    rule: PolicyRuleDefinition<unknown>,
    ctx: PolicyContext
  ): PolicyRuleContribution {
    const rawConfig = ctx.customRuleConfig?.[rule.configKey ?? rule.ruleId];
    if (!rule.configSchema) {
      return rule.evaluate(ctx, undefined);
    }
    const parsed = rule.configSchema.safeParse(rawConfig);
    if (!parsed.success) {
      return {
        ruleId: rule.ruleId,
        passed: false,
        reason: `Invalid custom rule config for ${rule.ruleId}`,
        limits: {
          issues: parsed.error.issues.map((issue: { message: string }) => issue.message),
        },
      };
    }
    return rule.evaluate(ctx, parsed.data);
  }

  private evaluateEntry(
    entry: RegisteredPolicyEntry,
    ctx: PolicyContext,
    visiting = new Set<string>()
  ): PolicyRuleContribution {
    if (entry.kind === 'rule') {
      return this.evaluateRule(entry.definition as PolicyRuleDefinition<unknown>, ctx);
    }

    const definition = entry.definition as PolicyRuleCompositionDefinition;
    if (visiting.has(definition.ruleId)) {
      return {
        ruleId: definition.ruleId,
        passed: false,
        reason: `Policy composition cycle detected at ${definition.ruleId}`,
      };
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(definition.ruleId);

    const children = definition.children
      .map((ruleId) => this.rules.get(ruleId))
      .filter((child): child is RegisteredPolicyEntry => Boolean(child));

    if (children.length === 0) {
      return {
        ruleId: definition.ruleId,
        passed: false,
        reason: `Policy composition ${definition.ruleId} has no registered child rules`,
        limits: {
          operator: definition.operator,
          children: definition.children,
        },
      };
    }

    const childContributions = children.map((child) => this.evaluateEntry(child, ctx, nextVisiting));
    const passed =
      definition.operator === 'allOf'
        ? childContributions.every((contribution) => contribution.passed)
        : definition.operator === 'anyOf'
        ? childContributions.some((contribution) => contribution.passed)
        : !childContributions[0]!.passed;

    const reason = passed
      ? `${definition.operator} composition passed`
      : definition.operator === 'allOf'
      ? `Blocked by ${childContributions.filter((contribution) => !contribution.passed).map((contribution) => contribution.ruleId).join(', ')}`
      : definition.operator === 'anyOf'
      ? `None of the child rules passed (${childContributions.map((contribution) => contribution.ruleId).join(', ')})`
      : `Negated child rule ${childContributions[0]!.ruleId} passed`;

    return {
      ruleId: definition.ruleId,
      passed,
      reason,
      limits: {
        operator: definition.operator,
        childContributions,
      },
    };
  }

  evaluate(ctx: PolicyContext): PolicyDecision {
    const contributions = this.sortedEntries()
      .filter((entry) => entry.enabled)
      .map((entry) => this.evaluateEntry(entry, ctx));

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
