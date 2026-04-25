import { describe, expect, it } from 'vitest';
import {
  AdapterSummarySchema,
  AdapterHealthSchema,
  AgentProposalSchema,
  AvailableRailSchema,
  canTransitionPaymentAnchorStatus,
  CapabilityMapSchema,
  ChainHealthResponseSchema,
  ConfigModesSchema,
  evaluatePaymentAnchorOnboarding,
  evaluatePaymentAnchorReadiness,
  ExecutionIntentSchema,
  ExecutionResultSchema,
  EventStreamEventSchema,
  KeetaBalanceSchema,
  OpsMetricSampleSchema,
  PaymentAnchorDetailSchema,
  PolicyDecisionSchema,
  PaymentAnchorWithBondSchema,
  QuoteRequestSchema,
  QuoteResponseSchema,
  RoutePlanSchema,
  SimulationResultSchema,
  SimulationScenarioSchema,
  StrategyTemplateSchema,
  WalletBalancesResponseSchema,
  WalletBalanceSnapshotSchema,
  WalletSettingsSchema,
  WebhookDeliverySchema,
  WebhookSubscriptionSchema,
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
      policyPackId: '550e8400-e29b-41d4-a716-446655440010',
      effectivePolicyPackId: '550e8400-e29b-41d4-a716-446655440011',
      effectivePolicyPackName: 'desk-risk',
      effectivePolicyPackSource: 'intent' as const,
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
          venueKind: 'dex' as const,
          routingContext: {
            operatorSuccessRate: 99.5,
            operatorP95LatencyMs: 240,
            operatorUnsettledVolume: 1,
            operatorBondVerified: true,
            scoreAdjustment: 0,
            scoreAdjustments: [],
          },
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

  it('round-trips event-stream webhook models', () => {
    const event = {
      id: '550e8400-e29b-41d4-a716-446655440020',
      source: 'anchor' as const,
      eventType: 'execution.completed',
      paymentAnchorId: '550e8400-e29b-41d4-a716-446655440024',
      executionId: '550e8400-e29b-41d4-a716-446655440021',
      payload: { hopCount: 2 },
      correlationId: 'job-123',
      createdAt: now,
    };
    expect(EventStreamEventSchema.parse(event)).toEqual(event);

    const subscription = {
      id: '550e8400-e29b-41d4-a716-446655440022',
      targetUrl: 'https://example.com/webhook',
      eventTypes: ['execution.completed', 'policy.evaluated'],
      status: 'active' as const,
      secretPresent: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(WebhookSubscriptionSchema.parse(subscription)).toEqual(subscription);

    const delivery = {
      id: '550e8400-e29b-41d4-a716-446655440023',
      subscriptionId: subscription.id,
      eventSource: 'audit' as const,
      eventId: event.id,
      auditEventId: event.id,
      status: 'delivered' as const,
      attemptCount: 1,
      responseStatus: 202,
      responseBody: 'accepted',
      deliveredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    expect(WebhookDeliverySchema.parse(delivery)).toEqual(delivery);
  });

  it('round-trips control-plane models', () => {
    const snapshot = {
      id: '550e8400-e29b-41d4-a716-446655440031',
      walletId: '550e8400-e29b-41d4-a716-446655440032',
      assetId: '550e8400-e29b-41d4-a716-446655440033',
      amount: '1000',
      capturedAt: now,
    };
    expect(WalletBalanceSnapshotSchema.parse(snapshot)).toEqual(snapshot);

    const keetaBalance = {
      assetId: 'KTA',
      amount: '500000000',
    };
    expect(KeetaBalanceSchema.parse(keetaBalance)).toEqual(keetaBalance);

    const balances = {
      snapshots: [snapshot],
      keeta: [keetaBalance],
      network: 'test',
    };
    expect(WalletBalancesResponseSchema.parse(balances)).toEqual(balances);

    const chainHealth = {
      network: 'test',
      measuredAt: now,
      latencyMs: 12,
      ledger: {
        blockCount: 10,
        transactionCount: 20,
        representativeCount: 3,
      },
      ok: true,
      apiLatencyMs: 14,
      networkInfo: {
        baseToken: 'keeta_token',
        networkAddress: 'keeta_network',
      },
    };
    expect(ChainHealthResponseSchema.parse(chainHealth)).toEqual(chainHealth);

    const modes = {
      liveMode: false,
      keetaNetwork: 'test',
      mockAdapters: true,
      executionKillSwitch: false,
    };
    expect(ConfigModesSchema.parse(modes)).toEqual(modes);

    const template = {
      id: '550e8400-e29b-41d4-a716-446655440034',
      name: 'Paper Trader',
      config: { risk: 'low' },
      slug: 'paper-trader',
      description: 'Template',
      isTemplate: true,
      paused: false,
      createdAt: now,
    };
    expect(StrategyTemplateSchema.parse(template)).toEqual(template);

    const sample = {
      id: '550e8400-e29b-41d4-a716-446655440035',
      name: 'orders_total',
      labels: { adapterId: 'mock-dex' },
      value: 42,
      capturedAt: now,
    };
    expect(OpsMetricSampleSchema.parse(sample)).toEqual(sample);

    const adapter = {
      id: 'mock-dex',
      kind: 'dex' as const,
    };
    expect(AdapterSummarySchema.parse(adapter)).toEqual(adapter);

    const rail = {
      id: 'mock-dex',
      name: 'Mock DEX',
      production: false,
      kind: 'dex' as const,
      description: 'Non-production demo adapter.',
    };
    expect(AvailableRailSchema.parse(rail)).toEqual(rail);
  });

  it('round-trips PaymentAnchor with current bond', () => {
    const anchor = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      adapterId: 'mock-anchor',
      label: 'Demo AED Anchor',
      status: 'active' as const,
      corridorKey: 'USD:AED',
      operatorRef: 'demo-operator',
      publicLabel: true,
      corridorConfig: { region: 'AE' },
      supportedAssets: ['USD', 'AED', 'KTA'],
      commercialTerms: {
        setupFeeNote: 'Operator configured',
        volumeFeeBps: 18,
      },
      metadata: {},
      createdAt: now,
      updatedAt: now,
      currentBond: {
        id: '550e8400-e29b-41d4-a716-446655440011',
        paymentAnchorId: '550e8400-e29b-41d4-a716-446655440010',
        amountAtomic: '5000000000',
        assetId: 'KTA',
        delayDays: 90 as const,
        status: 'active' as const,
        lockTxHash: 'bond_tx_hash',
        lockAccount: 'kta_anchor_bond_demo',
        verified: true,
        verificationSource: 'database' as const,
        verificationDetails: { source: 'seed' },
        createdAt: now,
        updatedAt: now,
      },
    };
    expect(PaymentAnchorWithBondSchema.parse(anchor)).toEqual(anchor);
  });

  it('enforces sensible payment anchor lifecycle transitions', () => {
    expect(canTransitionPaymentAnchorStatus('draft', 'commercial_defined')).toBe(true);
    expect(canTransitionPaymentAnchorStatus('active', 'withdrawal_requested')).toBe(true);
    expect(canTransitionPaymentAnchorStatus('draft', 'active')).toBe(false);
  });

  it('evaluates payment anchor readiness for activation and live traffic', () => {
    const readiness = evaluatePaymentAnchorReadiness(
      {
        status: 'bond_pending_lock',
        commercialTerms: {
          setupFeeNote: 'Signed',
          volumeFeeBps: 12,
        },
        currentBond: {
          id: '550e8400-e29b-41d4-a716-446655440011',
          paymentAnchorId: '550e8400-e29b-41d4-a716-446655440010',
          amountAtomic: '5000000000',
          assetId: 'KTA',
          delayDays: 90,
          status: 'active',
          lockTxHash: 'bond_tx_hash',
          lockAccount: 'kta_anchor_bond_demo',
          verified: true,
          verificationSource: 'database',
          verificationDetails: { source: 'seed' },
          createdAt: now,
          updatedAt: now,
        },
      },
      { strictBondVerification: true }
    );

    expect(readiness.canActivate).toBe(true);
    expect(readiness.canServeLiveTraffic).toBe(false);
    expect(readiness.nextRecommendedStatus).toBe('active');
    expect(readiness.issues.some((issue) => issue.code === 'anchor_not_active')).toBe(true);
  });

  it('round-trips PaymentAnchor detail with readiness', () => {
    const detail = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      adapterId: 'mock-anchor',
      label: 'Demo AED Anchor',
      status: 'active' as const,
      corridorKey: 'USD:AED',
      operatorRef: 'demo-operator',
      publicLabel: true,
      corridorConfig: { region: 'AE' },
      supportedAssets: ['USD', 'AED', 'KTA'],
      commercialTerms: {
        setupFeeNote: 'Operator configured',
        volumeFeeBps: 18,
      },
      metadata: {},
      createdAt: now,
      updatedAt: now,
      currentBond: {
        id: '550e8400-e29b-41d4-a716-446655440011',
        paymentAnchorId: '550e8400-e29b-41d4-a716-446655440010',
        amountAtomic: '5000000000',
        assetId: 'KTA',
        delayDays: 90 as const,
        status: 'active' as const,
        lockTxHash: 'bond_tx_hash',
        lockAccount: 'kta_anchor_bond_demo',
        verified: true,
        verificationSource: 'database' as const,
        verificationDetails: { source: 'seed' },
        createdAt: now,
        updatedAt: now,
      },
      readiness: {
        status: 'ready' as const,
        canActivate: true,
        canServeLiveTraffic: true,
        issues: [],
      },
      onboarding: {
        status: 'stable' as const,
        currentStatus: 'active' as const,
        reason: 'Anchor is active and eligible for live traffic.',
      },
      operatorMetrics: {
        successRate: 99.2,
        p50LatencyMs: 180,
        p95LatencyMs: 450,
        unsettledVolume: 2,
        bondAgeDays: 14.5,
        bondVerified: true,
        sampledAt: now,
      },
      events: [
        {
          id: '550e8400-e29b-41d4-a716-446655440012',
          paymentAnchorId: '550e8400-e29b-41d4-a716-446655440010',
          eventType: 'payment_anchor.created',
          payload: {},
          createdAt: now,
        },
      ],
    };
    expect(PaymentAnchorDetailSchema.parse(detail)).toEqual(detail);
  });

  it('evaluates payment anchor onboarding progression', () => {
    const onboarding = evaluatePaymentAnchorOnboarding(
      {
        status: 'bond_pending_lock',
        commercialTerms: {
          setupFeeNote: 'Signed',
          volumeFeeBps: 12,
        },
        currentBond: {
          id: '550e8400-e29b-41d4-a716-446655440011',
          paymentAnchorId: '550e8400-e29b-41d4-a716-446655440010',
          amountAtomic: '5000000000',
          assetId: 'KTA',
          delayDays: 90,
          status: 'active',
          lockTxHash: 'bond_tx_hash',
          lockAccount: 'kta_anchor_bond_demo',
          verified: true,
          verificationSource: 'database',
          verificationDetails: { source: 'seed' },
          createdAt: now,
          updatedAt: now,
        },
      },
      { strictBondVerification: true }
    );

    expect(onboarding.status).toBe('advance');
    expect(onboarding.nextStatus).toBe('active');
  });

  it('round-trips PolicyDecision', () => {
    const d = {
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      allowed: true,
      summary: 'ok',
      contributions: [{ ruleId: 'max_order_size', passed: true }],
      effectivePolicyPackId: '550e8400-e29b-41d4-a716-446655440012',
      effectivePolicyPackName: 'wallet-default',
      effectivePolicyPackSource: 'wallet_default' as const,
      policyPack: {
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'wallet-default',
        source: 'wallet_default' as const,
      },
      policyPackWarnings: ['warning'],
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
      effectivePolicyPackId: '550e8400-e29b-41d4-a716-446655440013',
      effectivePolicyPackName: 'global-default',
      effectivePolicyPackSource: 'global_default' as const,
      txId: '0xabc',
      completedAt: now,
    };
    expect(ExecutionResultSchema.parse(e)).toEqual(e);
  });

  it('round-trips WalletSettings', () => {
    const settings = {
      defaultPolicyPackId: '550e8400-e29b-41d4-a716-446655440014',
    };
    expect(WalletSettingsSchema.parse(settings)).toEqual(settings);
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
