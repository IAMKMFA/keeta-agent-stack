/**
 * Deterministic demo data for the homepage and secondary pages.
 *
 * Nothing in this module performs network IO. The site renders these
 * fixtures whenever live mode is disabled or live calls fail, so the
 * shape here is stable across builds and never depends on a backend.
 */

export interface DemoIntent {
  readonly id: string;
  readonly label: string;
  readonly source: { readonly amount: string; readonly asset: string; readonly chain: string };
  readonly destination: { readonly amount: string; readonly asset: string; readonly chain: string };
  readonly purpose: string;
}

export interface DemoQuote {
  readonly intentId: string;
  readonly priceQuote: string;
  readonly slippageBps: number;
  readonly etaSeconds: number;
}

export interface DemoRoute {
  readonly intentId: string;
  readonly hops: ReadonlyArray<{
    readonly venueId: string;
    readonly kind: 'transfer' | 'dex' | 'anchor';
    readonly chain: string;
    readonly notional: string;
  }>;
  readonly estimatedFeeBps: number;
}

export interface DemoPolicyDecision {
  readonly intentId: string;
  readonly decision: 'allow' | 'deny' | 'simulate-only';
  readonly checks: ReadonlyArray<{
    readonly id: string;
    readonly outcome: 'pass' | 'fail' | 'warn';
    readonly summary: string;
  }>;
}

export interface DemoSimulation {
  readonly intentId: string;
  readonly success: boolean;
  readonly previewedDelta: string;
  readonly notes: string;
}

export interface DemoReceipt {
  readonly intentId: string;
  readonly settlementState: 'submitted' | 'confirmed' | 'failed' | 'unknown';
  readonly txReference: string;
  readonly auditTrailRows: number;
}

export interface DemoMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly suffix?: string;
  readonly hint?: string;
}

export const demoIntents: ReadonlyArray<DemoIntent> = [
  {
    id: 'demo-cross-chain-stable',
    label: 'Cross-chain stablecoin payout',
    source: { amount: '5,000', asset: 'USDC', chain: 'base' },
    destination: { amount: '5,000', asset: 'USDC', chain: 'keeta-test' },
    purpose: 'Vendor payout from a treasury wallet to a contractor on the Keeta network.',
  },
  {
    id: 'demo-fiat-on-ramp',
    label: 'Fiat-to-Keeta on-ramp',
    source: { amount: '2,500', asset: 'USD', chain: 'fiat' },
    destination: { amount: '2,495', asset: 'USDC', chain: 'keeta-test' },
    purpose: 'Operator funds an autonomous agent wallet ahead of a scheduled run.',
  },
  {
    id: 'demo-agent-api-payment',
    label: 'Agent paying a metered API',
    source: { amount: '0.42', asset: 'USDC', chain: 'keeta-test' },
    destination: { amount: '0.42', asset: 'USDC', chain: 'partner-rail' },
    purpose: 'Agent settles an x402 micropayment for a metered third-party API call.',
  },
];

export const demoQuotes: ReadonlyArray<DemoQuote> = demoIntents.map((intent) => ({
  intentId: intent.id,
  priceQuote: intent.destination.amount,
  slippageBps: 8,
  etaSeconds: 12,
}));

export const demoRoutes: ReadonlyArray<DemoRoute> = [
  {
    intentId: 'demo-cross-chain-stable',
    estimatedFeeBps: 7,
    hops: [
      { venueId: 'mock-anchor-base', kind: 'anchor', chain: 'base', notional: '5,000 USDC' },
      { venueId: 'keeta-transfer', kind: 'transfer', chain: 'keeta-test', notional: '5,000 USDC' },
    ],
  },
  {
    intentId: 'demo-fiat-on-ramp',
    estimatedFeeBps: 22,
    hops: [
      { venueId: 'oracle-rail-cctp', kind: 'anchor', chain: 'fiat', notional: '2,500 USD' },
      { venueId: 'keeta-transfer', kind: 'transfer', chain: 'keeta-test', notional: '2,495 USDC' },
    ],
  },
  {
    intentId: 'demo-agent-api-payment',
    estimatedFeeBps: 4,
    hops: [
      {
        venueId: 'adapter-x402',
        kind: 'transfer',
        chain: 'partner-rail',
        notional: '0.42 USDC',
      },
    ],
  },
];

export const demoPolicyDecisions: ReadonlyArray<DemoPolicyDecision> = [
  {
    intentId: 'demo-cross-chain-stable',
    decision: 'allow',
    checks: [
      {
        id: 'allowlist-recipient',
        outcome: 'pass',
        summary: 'Recipient is on the treasury allowlist.',
      },
      { id: 'amount-cap', outcome: 'pass', summary: 'Notional under the daily limit.' },
      { id: 'rail-cap', outcome: 'pass', summary: 'Anchor rail within the operator-defined cap.' },
    ],
  },
  {
    intentId: 'demo-fiat-on-ramp',
    decision: 'simulate-only',
    checks: [
      { id: 'kyc-tier', outcome: 'warn', summary: 'KYC tier requires manual review above $10k.' },
      { id: 'amount-cap', outcome: 'pass', summary: 'Notional within tier 1.' },
      { id: 'rail-cap', outcome: 'pass', summary: 'On-ramp rail within configured cap.' },
    ],
  },
  {
    intentId: 'demo-agent-api-payment',
    decision: 'allow',
    checks: [
      { id: 'agent-budget', outcome: 'pass', summary: 'Agent under daily compute budget.' },
      { id: 'rate-limit', outcome: 'pass', summary: 'Endpoint under per-minute rate limit.' },
    ],
  },
];

export const demoSimulations: ReadonlyArray<DemoSimulation> = [
  {
    intentId: 'demo-cross-chain-stable',
    success: true,
    previewedDelta: '+5,000 USDC',
    notes: 'Anchor bond verified; reconciliation window 90s.',
  },
  {
    intentId: 'demo-fiat-on-ramp',
    success: true,
    previewedDelta: '+2,495 USDC (5 USD on-ramp fee)',
    notes: 'Held until KYC manual review completes.',
  },
  {
    intentId: 'demo-agent-api-payment',
    success: true,
    previewedDelta: '+0.42 USDC (rail fee 0.0001 USDC)',
    notes: 'x402 micropayment, settles instantly on partner rail.',
  },
];

export const demoReceipts: ReadonlyArray<DemoReceipt> = [
  {
    intentId: 'demo-cross-chain-stable',
    settlementState: 'confirmed',
    txReference: 'demo:base→keeta:001',
    auditTrailRows: 7,
  },
  {
    intentId: 'demo-fiat-on-ramp',
    settlementState: 'submitted',
    txReference: 'demo:fiat-onramp:002',
    auditTrailRows: 5,
  },
  {
    intentId: 'demo-agent-api-payment',
    settlementState: 'confirmed',
    txReference: 'demo:x402:003',
    auditTrailRows: 3,
  },
];

export const demoMetrics: ReadonlyArray<DemoMetric> = [
  {
    id: 'adapters',
    label: 'Adapters in registry',
    value: '10',
    hint: 'Native KTA, MPP, x402, Pay.sh, oracle rail, and mock venues.',
  },
  {
    id: 'packages',
    label: 'Workspace packages',
    value: '28',
    hint: 'SDK, runtime, routing, policy, simulator, telemetry, types, and more.',
  },
  {
    id: 'examples',
    label: 'Runnable examples',
    value: '8',
    hint: 'Hello-agent, paper-trader, route inspector, simulation fidelity, and others.',
  },
  {
    id: 'mcp-tools',
    label: 'MCP tools shipped',
    value: '40+',
    hint: 'Agent-callable building blocks for read-only and signing-class flows.',
  },
];

export interface DemoPipelineRow {
  readonly intent: DemoIntent;
  readonly quote: DemoQuote;
  readonly route: DemoRoute;
  readonly policy: DemoPolicyDecision;
  readonly simulation: DemoSimulation;
  readonly receipt: DemoReceipt;
}

export function getDemoPipelineRows(): ReadonlyArray<DemoPipelineRow> {
  return demoIntents.map((intent) => {
    const quote = demoQuotes.find((row) => row.intentId === intent.id);
    const route = demoRoutes.find((row) => row.intentId === intent.id);
    const policy = demoPolicyDecisions.find((row) => row.intentId === intent.id);
    const simulation = demoSimulations.find((row) => row.intentId === intent.id);
    const receipt = demoReceipts.find((row) => row.intentId === intent.id);
    if (!quote || !route || !policy || !simulation || !receipt) {
      throw new Error(`Demo data is incomplete for intent ${intent.id}.`);
    }
    return { intent, quote, route, policy, simulation, receipt };
  });
}
