import { z } from 'zod';
import { AssetIdSchema, SideSchema, SupportLevelSchema, VenueKindSchema } from './common.js';
import { QuoteResponseSchema } from './quote.js';

export const RouteScoreAdjustmentSchema = z.object({
  source: z.string().min(1),
  value: z.number(),
});

export const RouteStepRoutingContextSchema = z.object({
  corridorKey: z.string().optional(),
  corridorMatch: z.enum(['exact', 'listed', 'unscoped']).optional(),
  readinessStatus: z.enum(['ready', 'needs_attention', 'blocked']).optional(),
  commercialVolumeFeeBps: z.number().nonnegative().optional(),
  operatorPriority: z.number().optional(),
  operatorSuccessRate: z.number().min(0).max(100).optional(),
  operatorP95LatencyMs: z.number().min(0).optional(),
  operatorUnsettledVolume: z.number().min(0).optional(),
  operatorBondVerified: z.boolean().optional(),
  scoreAdjustment: z.number(),
  scoreAdjustments: z.array(RouteScoreAdjustmentSchema).default([]),
});

export const RouteStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  adapterId: z.string(),
  venueKind: VenueKindSchema.optional(),
  supportLevel: SupportLevelSchema.optional(),
  paymentAnchorId: z.string().uuid().optional(),
  routingContext: RouteStepRoutingContextSchema.optional(),
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
  supportLevel: SupportLevelSchema.optional(),
  createdAt: z.string().datetime(),
});

export type RouteStep = z.infer<typeof RouteStepSchema>;
export type RoutePlan = z.infer<typeof RoutePlanSchema>;
export type RouteScoreAdjustment = z.infer<typeof RouteScoreAdjustmentSchema>;
export type RouteStepRoutingContext = z.infer<typeof RouteStepRoutingContextSchema>;
