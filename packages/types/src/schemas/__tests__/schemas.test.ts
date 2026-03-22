import { describe, expect, it } from 'vitest';
import {
  AdapterHealthSchema,
  AgentProposalSchema,
  CapabilityMapSchema,
  ExecutionIntentSchema,
  ExecutionResultSchema,
  PolicyDecisionSchema,
  QuoteRequestSchema,
  QuoteResponseSchema,
  RoutePlanSchema,
  SimulationResultSchema,
  SimulationScenarioSchema,
} from '../../index.js';

describe('Zod schemas', () => {
  const now = new Date().toISOString();

  it('round-trips ExecutionIntent', () => {
    const v = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'sell' as const,
      size: '100.5',
      maxSlippageBps: 50,
      mode: 'simulate' as const,
      createdAt: now,
    };
    expect(ExecutionIntentSchema.parse(v)).toEqual(v);
  });

  it('round-trips QuoteRequest and QuoteResponse', () => {
    const req = {
      adapterId: 'mock-dex',
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'buy' as const,
      size: '10',
    };
    expect(QuoteRequestSchema.parse(req)).toEqual(req);
    const res = {
      adapterId: 'mock-dex',
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'buy' as const,
      sizeIn: '10',
      sizeOut: '9.99',
      price: '0.999',
      feeBps: 5,
      expectedSlippageBps: 2,
    };
    expect(QuoteResponseSchema.parse(res)).toEqual(res);
  });

  it('round-trips RoutePlan', () => {
    const plan = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      steps: [
        {
          stepIndex: 0,
          adapterId: 'mock-dex',
          baseAsset: 'KTA',
          quoteAsset: 'USDC',
          side: 'sell' as const,
          sizeIn: '10',
          sizeOutEstimate: '9.9',
          feeBps: 5,
        },
      ],
      totalFeeBps: 5,
      expectedSlippageBps: 2,
      hopCount: 1,
      score: -1.2,
      createdAt: now,
    };
    expect(RoutePlanSchema.parse(plan)).toEqual(plan);
  });

  it('round-trips PolicyDecision', () => {
    const d = {
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      allowed: true,
      summary: 'ok',
      contributions: [
        { ruleId: 'max_order_size', passed: true },
      ],
      evaluatedAt: now,
    };
    expect(PolicyDecisionSchema.parse(d)).toEqual(d);
  });

  it('round-trips ExecutionResult', () => {
    const e = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      adapterId: 'mock-dex',
      status: 'confirmed' as const,
      txId: '0xabc',
      completedAt: now,
    };
    expect(ExecutionResultSchema.parse(e)).toEqual(e);
  });

  it('round-trips AdapterHealth and CapabilityMap', () => {
    const h = {
      adapterId: 'mock-dex',
      ok: true,
      checkedAt: now,
    };
    expect(AdapterHealthSchema.parse(h)).toEqual(h);
    const c = {
      adapterId: 'mock-dex',
      kind: 'dex' as const,
      pairs: [{ base: 'KTA', quote: 'USDC' }],
      features: ['swap'],
    };
    expect(CapabilityMapSchema.parse(c)).toEqual(c);
  });

  it('round-trips AgentProposal', () => {
    const intent = ExecutionIntentSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'buy',
      size: '1',
      maxSlippageBps: 10,
      mode: 'simulate',
      createdAt: now,
    });
    const p = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      intent,
      createdAt: now,
    };
    expect(AgentProposalSchema.parse(p)).toEqual(p);
  });

  it('round-trips SimulationScenario and SimulationResult', () => {
    const s = SimulationScenarioSchema.parse({
      volatility: 0.1,
      latencyMs: 50,
      failureProbability: 0.01,
      slippageMultiplier: 1.2,
    });
    const r = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      routePlanId: '550e8400-e29b-41d4-a716-446655440001',
      scenario: s,
      success: true,
      simulatedSlippageBps: 12,
      simulatedLatencyMs: 48,
      pnlQuote: null,
      pnlNote: 'PnL not yet connected',
      completedAt: now,
    };
    expect(SimulationResultSchema.parse(r)).toEqual(r);
  });
});
