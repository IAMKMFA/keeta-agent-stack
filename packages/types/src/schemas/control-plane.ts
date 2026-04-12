import { z } from 'zod';
import { VenueKindSchema } from './common.js';

export const WalletBalanceSnapshotSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  assetId: z.string().uuid(),
  amount: z.string().min(1),
  capturedAt: z.string().datetime(),
});

export const KeetaBalanceSchema = z.object({
  assetId: z.string().min(1),
  amount: z.string().min(1),
});

export const WalletBalancesErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

export const WalletBalancesSuccessSchema = z.object({
  snapshots: z.array(WalletBalanceSnapshotSchema),
  keeta: z.array(KeetaBalanceSchema),
  network: z.string().min(1),
});

export const WalletBalancesUnavailableSchema = z.object({
  snapshots: z.array(WalletBalanceSnapshotSchema),
  error: WalletBalancesErrorSchema,
  network: z.string().min(1),
});

export const WalletBalancesResponseSchema = z.union([
  WalletBalancesSuccessSchema,
  WalletBalancesUnavailableSchema,
]);

export const ChainLedgerStatsSchema = z.object({
  blockCount: z.number().int().nonnegative(),
  transactionCount: z.number().int().nonnegative(),
  representativeCount: z.number().int().nonnegative(),
});

export const ChainNetworkInfoSchema = z.object({
  baseToken: z.string().min(1),
  networkAddress: z.string().min(1),
});

export const ChainHealthResponseSchema = z.object({
  network: z.string().min(1),
  measuredAt: z.string().datetime(),
  latencyMs: z.number().finite().nonnegative(),
  ledger: ChainLedgerStatsSchema.optional(),
  ok: z.boolean(),
  errorMessage: z.string().optional(),
  apiLatencyMs: z.number().finite().nonnegative(),
  networkInfo: ChainNetworkInfoSchema.nullable(),
});

export const ConfigModesSchema = z.object({
  liveMode: z.boolean(),
  keetaNetwork: z.string().min(1),
  mockAdapters: z.boolean(),
  executionKillSwitch: z.boolean(),
});

export const StrategyTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  config: z.record(z.unknown()),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isTemplate: z.boolean(),
  paused: z.boolean(),
  createdAt: z.string().datetime(),
});

export const OpsMetricSampleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  labels: z.record(z.unknown()),
  value: z.number().finite(),
  capturedAt: z.string().datetime(),
});

export const AdapterSummarySchema = z.object({
  id: z.string().min(1),
  kind: VenueKindSchema,
});

export const AvailableRailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  production: z.boolean(),
  kind: VenueKindSchema,
  description: z.string().optional(),
});

export type WalletBalanceSnapshot = z.infer<typeof WalletBalanceSnapshotSchema>;
export type KeetaBalance = z.infer<typeof KeetaBalanceSchema>;
export type WalletBalancesError = z.infer<typeof WalletBalancesErrorSchema>;
export type WalletBalancesSuccess = z.infer<typeof WalletBalancesSuccessSchema>;
export type WalletBalancesUnavailable = z.infer<typeof WalletBalancesUnavailableSchema>;
export type WalletBalancesResponse = z.infer<typeof WalletBalancesResponseSchema>;
export type ChainLedgerStats = z.infer<typeof ChainLedgerStatsSchema>;
export type ChainNetworkInfo = z.infer<typeof ChainNetworkInfoSchema>;
export type ChainHealthResponse = z.infer<typeof ChainHealthResponseSchema>;
export type ConfigModes = z.infer<typeof ConfigModesSchema>;
export type StrategyTemplate = z.infer<typeof StrategyTemplateSchema>;
export type OpsMetricSample = z.infer<typeof OpsMetricSampleSchema>;
export type AdapterSummary = z.infer<typeof AdapterSummarySchema>;
export type AvailableRail = z.infer<typeof AvailableRailSchema>;
