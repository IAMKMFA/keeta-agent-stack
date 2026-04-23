import { z } from 'zod';
import { AssetIdSchema, ExecutionModeSchema, SideSchema } from './common.js';
import { PolicyPackSourceSchema } from './policy.js';

/**
 * Structured validation context that can be threaded through the pipeline into the
 * Keeta anchor `context-based validation` surface added in `@keetanetwork/anchor` 0.0.53.
 * Callers pass arbitrary well-typed data (e.g. compliance flags, session identifiers,
 * operator notes); the worker forwards it to anchor clients that accept context.
 */
export const ExecutionValidationContextSchema = z.object({
  source: z.enum(['operator', 'agent', 'mcp', 'integration-test', 'webhook']).optional(),
  correlationId: z.string().min(1).optional(),
  /** Opaque additional context for downstream validators (compliance, routing, etc). */
  attributes: z.record(z.unknown()).optional(),
});

/**
 * Additional principal reference - mirrors Keeta anchor 0.0.52 `additionalPrincipals` support.
 * Principals are addresses (or resolvable references) that co-authorize the block in addition
 * to the primary signer.
 */
export const AdditionalPrincipalSchema = z.object({
  address: z.string().min(1),
  role: z.enum(['co-signer', 'witness', 'delegate']).default('co-signer'),
  note: z.string().max(256).optional(),
});

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
  policyPackId: z.string().uuid().optional(),
  effectivePolicyPackId: z.string().uuid().optional(),
  effectivePolicyPackName: z.string().min(1).optional(),
  effectivePolicyPackSource: PolicyPackSourceSchema.optional(),
  venueAllowlist: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  /**
   * Optional structured validation context forwarded to Keeta anchor context-based validation.
   * See `@keetanetwork/anchor` 0.0.53+.
   */
  validationContext: ExecutionValidationContextSchema.optional(),
  /**
   * Optional additional principals for multi-signer / co-authorized execution.
   * See `@keetanetwork/anchor` 0.0.52+.
   */
  additionalPrincipals: z.array(AdditionalPrincipalSchema).max(16).optional(),
  createdAt: z.string().datetime(),
});

export type ExecutionIntent = z.infer<typeof ExecutionIntentSchema>;
export type ExecutionValidationContext = z.infer<typeof ExecutionValidationContextSchema>;
export type AdditionalPrincipal = z.infer<typeof AdditionalPrincipalSchema>;
