import { z } from 'zod';
import { EffectivePolicyPackSchema } from '@keeta-agent-stack/types';

export const IntentCreatedPayloadSchema = z.object({
  intentId: z.string().uuid(),
  policyPackId: z.string().uuid().optional(),
});

export const PolicyEvaluatedPayloadSchema = z.object({
  allowed: z.boolean(),
  summary: z.string(),
  effectivePolicyPackId: z.string().uuid().optional(),
  effectivePolicyPackName: z.string().min(1).optional(),
  effectivePolicyPackSource: EffectivePolicyPackSchema.shape.source.optional(),
  policyPack: EffectivePolicyPackSchema.optional(),
  policyPackWarnings: z.array(z.string().min(1)).optional(),
});

export const ExecutionCompletedPayloadSchema = z.object({
  executionId: z.string().uuid().optional(),
  effectivePolicyPackId: z.string().uuid().optional(),
  effectivePolicyPackName: z.string().min(1).optional(),
  effectivePolicyPackSource: EffectivePolicyPackSchema.shape.source.optional(),
  hopCount: z.number().int().nonnegative(),
  stepCount: z.number().int().nonnegative(),
});

export type IntentCreatedPayload = z.infer<typeof IntentCreatedPayloadSchema>;
export type PolicyEvaluatedPayload = z.infer<typeof PolicyEvaluatedPayloadSchema>;
export type ExecutionCompletedPayload = z.infer<typeof ExecutionCompletedPayloadSchema>;
