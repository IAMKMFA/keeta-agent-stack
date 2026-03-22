import { z } from 'zod';

export const SimulationScenarioSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional(),
  volatility: z.number().min(0).default(0),
  latencyMs: z.number().min(0).default(0),
  failureProbability: z.number().min(0).max(1).default(0),
  slippageMultiplier: z.number().min(0).default(1),
  seed: z.string().optional(),
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
  completedAt: z.string().datetime(),
});

export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
