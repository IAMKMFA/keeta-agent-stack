import { z } from 'zod';

export const PolicyPackSourceSchema = z.enum([
  'request',
  'intent',
  'intent_metadata',
  'wallet_default',
  'strategy_config',
  'global_default',
]);

export const EffectivePolicyPackSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  source: PolicyPackSourceSchema,
});

export const PolicyRuleContributionSchema = z.object({
  ruleId: z.string(),
  passed: z.boolean(),
  reason: z.string().optional(),
  limits: z.record(z.unknown()).optional(),
});

export const PolicyDecisionSchema = z.object({
  intentId: z.string().uuid(),
  allowed: z.boolean(),
  summary: z.string(),
  contributions: z.array(PolicyRuleContributionSchema),
  effectivePolicyPackId: z.string().uuid().optional(),
  effectivePolicyPackName: z.string().min(1).optional(),
  effectivePolicyPackSource: PolicyPackSourceSchema.optional(),
  policyPack: EffectivePolicyPackSchema.optional(),
  policyPackWarnings: z.array(z.string().min(1)).optional(),
  evaluatedAt: z.string().datetime(),
});

export type PolicyPackSource = z.infer<typeof PolicyPackSourceSchema>;
export type EffectivePolicyPack = z.infer<typeof EffectivePolicyPackSchema>;
export type PolicyRuleContribution = z.infer<typeof PolicyRuleContributionSchema>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
