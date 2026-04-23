import { z } from 'zod';
import { NormalizedReceiptSchema } from './normalized-receipt.js';
import { PolicyPackSourceSchema } from './policy.js';

export const ExecutionStatusSchema = z.enum(['pending', 'submitted', 'confirmed', 'failed']);

/**
 * Lightweight shape for Keeta anchor chaining resolved assets (mirrors
 * `AnchorChainingAssetInfo` from `@keetanetwork/anchor` 0.0.58, flattened so it can cross
 * package boundaries without pulling anchor types into shared schemas).
 */
export const ResolvedAssetInfoSchema = z.object({
  asset: z.string().min(1),
  location: z.string().min(1),
  railsInbound: z.array(z.string().min(1)).default([]),
  railsOutbound: z.array(z.string().min(1)).default([]),
  /** Hops from source in the chaining graph (null when distance unknown). */
  pathLength: z.number().int().nonnegative().nullable().optional(),
});

export const PathOwnerInfoSchema = z.object({
  providerId: z.string().min(1),
  accountAddress: z.string().min(1).optional(),
  /** e.g. `anchor`, `fx`, `keeta-native`. */
  kind: z.string().min(1).optional(),
});

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

  /**
   * Anchor-chaining enrichment (populated when execution ran through
   * `@keetanetwork/anchor` anchor chaining — owner of the path, path distance,
   * and resolved asset metadata from `AnchorChainingResolveAssetsResult`).
   */
  pathOwner: PathOwnerInfoSchema.optional(),
  pathLength: z.number().int().nonnegative().optional(),
  resolvedAssets: z
    .object({
      from: z.array(ResolvedAssetInfoSchema).default([]),
      to: z.array(ResolvedAssetInfoSchema).default([]),
    })
    .optional(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export type ResolvedAssetInfo = z.infer<typeof ResolvedAssetInfoSchema>;
export type PathOwnerInfo = z.infer<typeof PathOwnerInfoSchema>;
