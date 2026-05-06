import { z } from 'zod';
import { AssetIdSchema, SupportLevelSchema, VenueKindSchema } from './common.js';

export const AdapterHealthSchema = z.object({
  adapterId: z.string(),
  ok: z.boolean(),
  latencyMs: z.number().optional(),
  message: z.string().optional(),
  checkedAt: z.string().datetime(),
});

export const CapabilityPairSchema = z.object({
  base: AssetIdSchema,
  quote: AssetIdSchema,
});

export const CapabilityMapSchema = z.object({
  adapterId: z.string(),
  kind: VenueKindSchema,
  pairs: z.array(CapabilityPairSchema),
  features: z.array(z.string()),
  supportLevel: SupportLevelSchema.optional(),
});

export type AdapterHealth = z.infer<typeof AdapterHealthSchema>;
export type CapabilityMap = z.infer<typeof CapabilityMapSchema>;
