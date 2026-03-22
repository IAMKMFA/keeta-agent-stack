import { z } from 'zod';

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
  evaluatedAt: z.string().datetime(),
});

export type PolicyRuleContribution = z.infer<typeof PolicyRuleContributionSchema>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
