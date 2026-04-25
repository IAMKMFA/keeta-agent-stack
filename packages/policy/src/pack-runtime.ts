import { PolicyEngine } from './engine.js';
import type {
  PolicyComposition,
  PolicyPack,
} from './types.js';

export interface AppliedPolicyPackSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface ApplyPolicyPackResult {
  customRuleConfig: Record<string, unknown>;
  warnings: string[];
}

function compositionDefinition(composition: PolicyComposition) {
  return {
    ruleId: composition.ruleId,
    priority: composition.priority,
    description: composition.description,
    operator: composition.operator,
    children: composition.children,
  } as const;
}

export function applyPolicyPack(engine: PolicyEngine, pack: PolicyPack): ApplyPolicyPackResult {
  const customRuleConfig: Record<string, unknown> = {};
  const warnings: string[] = [];
  const ruleMetadata = new Map(engine.listRuleMetadata().map((rule) => [rule.ruleId, rule]));

  for (const rule of pack.rules) {
    if (!engine.has(rule.ruleId)) {
      warnings.push(`Policy pack "${pack.name}" references unknown rule "${rule.ruleId}"`);
    }

    if (rule.enabled === false && !engine.disable(rule.ruleId)) {
      warnings.push(`Policy pack "${pack.name}" could not disable rule "${rule.ruleId}"`);
    }
    if (rule.enabled === true && !engine.enable(rule.ruleId)) {
      warnings.push(`Policy pack "${pack.name}" could not enable rule "${rule.ruleId}"`);
    }

    if (rule.config !== undefined) {
      customRuleConfig[rule.configKey ?? ruleMetadata.get(rule.ruleId)?.configKey ?? rule.ruleId] = rule.config;
    }
  }

  for (const composition of pack.compositions) {
    if (engine.has(composition.ruleId)) {
      warnings.push(`Policy pack "${pack.name}" composition "${composition.ruleId}" conflicts with an existing rule id`);
      continue;
    }

    try {
      engine.registerComposition(compositionDefinition(composition));
      if (composition.enabled === false) {
        engine.disable(composition.ruleId);
      }
    } catch (error) {
      warnings.push(
        `Policy pack "${pack.name}" composition "${composition.ruleId}" could not be registered: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return {
    customRuleConfig,
    warnings,
  };
}
