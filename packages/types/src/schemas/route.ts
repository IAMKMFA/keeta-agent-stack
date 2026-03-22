import { z } from 'zod';
import { AssetIdSchema, SideSchema } from './common.js';
import { QuoteResponseSchema } from './quote.js';

export const RouteStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  adapterId: z.string(),
  baseAsset: AssetIdSchema,
  quoteAsset: AssetIdSchema,
  side: SideSchema,
  sizeIn: z.string(),
  sizeOutEstimate: z.string(),
  feeBps: z.number(),
  quote: QuoteResponseSchema.optional(),
});

export const RoutePlanSchema = z.object({
  id: z.string().uuid(),
  intentId: z.string().uuid(),
  steps: z.array(RouteStepSchema).min(1),
  totalFeeBps: z.number(),
  expectedSlippageBps: z.number(),
  hopCount: z.number().int().min(1),
  score: z.number(),
  createdAt: z.string().datetime(),
});

export type RouteStep = z.infer<typeof RouteStepSchema>;
export type RoutePlan = z.infer<typeof RoutePlanSchema>;
