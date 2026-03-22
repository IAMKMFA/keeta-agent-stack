import { z } from 'zod';
import { AssetIdSchema, ExecutionModeSchema, SideSchema } from './common.js';

export const ExecutionIntentSchema = z.object({
  id: z.string().uuid(),
  strategyId: z.string().uuid().optional(),
  walletId: z.string().uuid(),
  baseAsset: AssetIdSchema,
  quoteAsset: AssetIdSchema,
  side: SideSchema,
  size: z.string().regex(/^\d+(\.\d+)?$/, 'Decimal string'),
  maxSlippageBps: z.number().int().min(0).max(50_000),
  mode: ExecutionModeSchema,
  venueAllowlist: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export type ExecutionIntent = z.infer<typeof ExecutionIntentSchema>;
