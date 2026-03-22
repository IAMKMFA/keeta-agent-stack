import { z } from 'zod';
import { AssetIdSchema, SideSchema } from './common.js';

export const QuoteRequestSchema = z.object({
  adapterId: z.string().min(1),
  baseAsset: AssetIdSchema,
  quoteAsset: AssetIdSchema,
  side: SideSchema,
  size: z.string().regex(/^\d+(\.\d+)?$/),
  intentId: z.string().uuid().optional(),
});

export const QuoteResponseSchema = z.object({
  adapterId: z.string(),
  baseAsset: AssetIdSchema,
  quoteAsset: AssetIdSchema,
  side: SideSchema,
  sizeIn: z.string(),
  sizeOut: z.string(),
  price: z.string(),
  feeBps: z.number(),
  expectedSlippageBps: z.number(),
  validUntil: z.string().datetime().optional(),
  raw: z.record(z.unknown()).optional(),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
