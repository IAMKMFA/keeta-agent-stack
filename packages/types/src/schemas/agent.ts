import { z } from 'zod';
import { ExecutionIntentSchema } from './execution-intent.js';
import { RoutePlanSchema } from './route.js';

export const AgentProposalSchema = z.object({
  id: z.string().uuid(),
  intent: ExecutionIntentSchema,
  routePlan: RoutePlanSchema.optional(),
  rationale: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  createdAt: z.string().datetime(),
});

export type AgentProposal = z.infer<typeof AgentProposalSchema>;
