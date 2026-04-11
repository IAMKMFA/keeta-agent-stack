import { z } from 'zod';

/** Cross-rail classification for unified audit (Keeta native, CCTP, fiat rails, etc.). */
export const RailKindSchema = z.enum(['native_kt', 'cctp_usdc', 'fiat', 'swift', 'other']);

export type RailKind = z.infer<typeof RailKindSchema>;

/** Normalized on-chain receipt snapshot for audit and dashboards. */
export const NormalizedReceiptSchema = z.object({
  blockHash: z.string().optional(),
  txHash: z.string().optional(),
  published: z.boolean().optional(),
  settlementState: z.enum(['submitted', 'confirmed', 'failed', 'unknown']).optional(),
  adapterId: z.string().optional(),
  rawRef: z.string().optional(),
  /** How value moved (for multi-rail parity in logs and policy). */
  railKind: RailKindSchema.optional(),
  /** Partner/oracle reference (e.g. CCTP burn/mint, SWIFT UETR). */
  railRef: z.string().optional(),
  /** Logical network (e.g. keeta, base). */
  network: z.string().optional(),
});

export type NormalizedReceipt = z.infer<typeof NormalizedReceiptSchema>;
