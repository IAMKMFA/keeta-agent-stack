import { z } from 'zod';

export const ExecutionStatusSchema = z.enum(['pending', 'submitted', 'confirmed', 'failed']);

export const ExecutionResultSchema = z.object({
  id: z.string().uuid(),
  intentId: z.string().uuid(),
  adapterId: z.string(),
  status: ExecutionStatusSchema,
  txId: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  filledSize: z.string().optional(),
  avgPrice: z.string().optional(),
  raw: z.record(z.unknown()).optional(),
  completedAt: z.string().datetime().optional(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
