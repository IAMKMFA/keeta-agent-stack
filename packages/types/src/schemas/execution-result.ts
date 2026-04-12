import { z } from 'zod';
import { NormalizedReceiptSchema } from './normalized-receipt.js';
import { PolicyPackSourceSchema } from './policy.js';

export const ExecutionStatusSchema = z.enum(['pending', 'submitted', 'confirmed', 'failed']);

export const ExecutionResultSchema = z.object({
  id: z.string().uuid(),
  intentId: z.string().uuid(),
  adapterId: z.string(),
  status: ExecutionStatusSchema,
  effectivePolicyPackId: z.string().uuid().optional(),
  effectivePolicyPackName: z.string().min(1).optional(),
  effectivePolicyPackSource: PolicyPackSourceSchema.optional(),
  /** Primary on-chain reference (e.g. vote-staple block hash) */
  txId: z.string().optional(),
  blockHeight: z.string().optional(),
  blockHash: z.string().optional(),
  settlementState: z.enum(['unknown', 'submitted', 'confirmed', 'failed']).optional(),
  explorerUrl: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  filledSize: z.string().optional(),
  avgPrice: z.string().optional(),
  /** Adapter-supplied normalized receipt (merged with DB row in the worker). */
  normalizedReceipt: NormalizedReceiptSchema.partial().optional(),
  raw: z.record(z.unknown()).optional(),
  completedAt: z.string().datetime().optional(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
