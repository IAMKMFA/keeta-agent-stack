import { z } from 'zod';

/** Live Keeta context captured at simulation time (shadow / replay modes). */
export const KeetaSimulationSnapshotSchema = z.object({
  network: z.string(),
  capturedAt: z.string().datetime(),
  fidelityMode: z.enum(['standard', 'shadow', 'replay']),
  ledgerBlockCount: z.number().optional(),
  representativeCount: z.number().optional(),
  chainLatencyMs: z.number().optional(),
  walletBalances: z.array(z.object({ assetId: z.string(), amount: z.string() })).optional(),
  /** For replay: stable anchor string (e.g. ledger height + timestamp) */
  replayAnchor: z.string().optional(),
});

export type KeetaSimulationSnapshot = z.infer<typeof KeetaSimulationSnapshotSchema>;

export const SimulationScenarioSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional(),
  volatility: z.number().min(0).default(0),
  latencyMs: z.number().min(0).default(0),
  failureProbability: z.number().min(0).max(1).default(0),
  slippageMultiplier: z.number().min(0).default(1),
  seed: z.string().optional(),
  /**
   * `standard` — synthetic math only.
   * `shadow` — attach live Keeta chain + wallet balance reads (no submit).
   * `replay` — same as shadow plus a `replayAnchor` for audit/backtest correlation.
   */
  fidelityMode: z.enum(['standard', 'shadow', 'replay']).default('standard'),
});

export const SimulationResultSchema = z.object({
  id: z.string().uuid(),
  intentId: z.string().uuid(),
  routePlanId: z.string().uuid(),
  scenario: SimulationScenarioSchema,
  success: z.boolean(),
  simulatedSlippageBps: z.number(),
  simulatedLatencyMs: z.number(),
  failureReason: z.string().optional(),
  /** Placeholder until real PnL wiring exists */
  pnlQuote: z.string().nullable(),
  pnlNote: z.string(),
  raw: z.record(z.unknown()).optional(),
  keetaSnapshot: KeetaSimulationSnapshotSchema.optional(),
  completedAt: z.string().datetime(),
});

export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
