/**
 * Demo data for the visualizer package.
 *
 * Plain TypeScript constants — no React, no Node APIs, no fetch.
 * Imported by both the server-safe entry (`index`) and the client
 * components (`client`). Consumers can replace any field with live
 * data when they wire the visualizer up to a real API later.
 */

export type PipelineStageId =
  | 'intent_created'
  | 'quotes_gathered'
  | 'route_selected'
  | 'policy_allowed'
  | 'simulation_passed'
  | 'worker_executed'
  | 'audit_emitted';

export const PIPELINE_STAGE_ORDER: ReadonlyArray<PipelineStageId> = [
  'intent_created',
  'quotes_gathered',
  'route_selected',
  'policy_allowed',
  'simulation_passed',
  'worker_executed',
  'audit_emitted',
];

export interface PipelineStageMeta {
  readonly id: PipelineStageId;
  /** Short label for diagram nodes. */
  readonly label: string;
  /** One-sentence description for tooltips and timeline rows. */
  readonly summary: string;
  /** Expected dwell time in the demo, in milliseconds. */
  readonly dwellMs: number;
  /** Repo evidence path. Used in tooltips. */
  readonly evidence: string;
}

export const PIPELINE_STAGES: ReadonlyArray<PipelineStageMeta> = [
  {
    id: 'intent_created',
    label: 'Intent',
    summary: 'Typed payment intent submitted via SDK or MCP.',
    dwellMs: 600,
    evidence: 'packages/sdk/src/client.ts',
  },
  {
    id: 'quotes_gathered',
    label: 'Quote',
    summary: 'Adapters return priced offers in parallel.',
    dwellMs: 800,
    evidence: 'packages/adapter-keeta-transfer',
  },
  {
    id: 'route_selected',
    label: 'Route',
    summary: 'Router scores hops and picks the best plan.',
    dwellMs: 700,
    evidence: 'packages/routing',
  },
  {
    id: 'policy_allowed',
    label: 'Policy',
    summary: 'Policy pack evaluates limits, allowlists, freshness.',
    dwellMs: 900,
    evidence: 'packages/policy',
  },
  {
    id: 'simulation_passed',
    label: 'Simulate',
    summary: 'Simulator computes balance deltas before execution.',
    dwellMs: 900,
    evidence: 'packages/simulator',
  },
  {
    id: 'worker_executed',
    label: 'Execute',
    summary: 'Worker signs and submits — the only signer in the path.',
    dwellMs: 1200,
    evidence: 'apps/worker',
  },
  {
    id: 'audit_emitted',
    label: 'Audit',
    summary: 'Receipt, audit hash, and webhook event emitted.',
    dwellMs: 700,
    evidence: 'packages/events',
  },
];

export interface DemoQuote {
  readonly venue: string;
  readonly outDisplay: string;
  readonly feeBps: number;
  readonly latencyMs: number;
  readonly chosen: boolean;
}

export interface DemoRouteHop {
  readonly id: string;
  readonly label: string;
  readonly venue: string;
}

export interface DemoPolicyCheck {
  readonly id: string;
  readonly summary: string;
  readonly outcome: 'pass' | 'warn' | 'fail';
}

export interface DemoSimulationLine {
  readonly account: string;
  readonly delta: string;
  readonly balanceAfter: string;
}

export interface DemoExecutionStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly txHash?: string;
  readonly status: 'pending' | 'submitted' | 'confirmed';
}

export interface DemoAuditEvent {
  readonly id: string;
  readonly auditHash: string;
  readonly receiptId: string;
  readonly emittedAtIso: string;
}

export interface DemoMetric {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly suffix?: string;
  readonly precision?: number;
}

export interface DemoSettlementRail {
  readonly id: string;
  readonly label: string;
  readonly chain: string;
  readonly status: 'live' | 'demo' | 'paused';
  readonly latencyMs: number;
  readonly description: string;
}

export const DEMO_INTENT = {
  id: 'intent_4f1e9c',
  purpose: 'Treasury rebalance — USDC → KTA',
  source: { asset: 'USDC', amount: '12,500.00', chain: 'base' },
  destination: { asset: 'KTA', amount: '12,427.83', chain: 'keeta' },
  policyPack: 'treasury-default@v3',
} as const;

export const DEMO_QUOTES: ReadonlyArray<DemoQuote> = [
  { venue: 'keeta-native', outDisplay: '12,427.83 KTA', feeBps: 8, latencyMs: 612, chosen: true },
  { venue: 'aerodrome', outDisplay: '12,401.40 KTA', feeBps: 18, latencyMs: 1420, chosen: false },
  { venue: 'cctp+swap', outDisplay: '12,388.12 KTA', feeBps: 31, latencyMs: 2210, chosen: false },
];

export const DEMO_ROUTE: ReadonlyArray<DemoRouteHop> = [
  { id: 'src', label: 'USDC · base', venue: 'wallet' },
  { id: 'bridge', label: 'CCTP', venue: 'native' },
  { id: 'dest', label: 'KTA · keeta', venue: 'keeta-native' },
];

export const DEMO_POLICY = {
  decision: 'allow' as const,
  pack: DEMO_INTENT.policyPack,
  checks: [
    { id: 'limit', summary: 'Per-intent limit ≤ $50,000', outcome: 'pass' },
    { id: 'allowlist', summary: 'Destination on operator allowlist', outcome: 'pass' },
    { id: 'freshness', summary: 'Quote freshness ≤ 30s', outcome: 'pass' },
    { id: 'kill', summary: 'Kill switch disengaged', outcome: 'pass' },
    { id: 'tax', summary: 'No tax-changed delta since quote', outcome: 'pass' },
  ] satisfies ReadonlyArray<DemoPolicyCheck>,
};

export const DEMO_SIMULATION: ReadonlyArray<DemoSimulationLine> = [
  { account: 'treasury.base.usdc', delta: '-12,500.00', balanceAfter: '187,500.00' },
  { account: 'treasury.keeta.kta', delta: '+12,427.83', balanceAfter: '88,427.83' },
  { account: 'fee.adapter.keeta', delta: '+10.00', balanceAfter: '— internal —' },
];

export const DEMO_EXECUTION: ReadonlyArray<DemoExecutionStep> = [
  {
    id: 'queue',
    label: 'Queued in worker',
    detail: 'BullMQ job → custody-aware signer registry',
    status: 'confirmed',
  },
  {
    id: 'sign',
    label: 'KMS sign',
    detail: 'Signed by AWS KMS (alias/keeta-prod-treasury-1)',
    status: 'confirmed',
  },
  {
    id: 'submit',
    label: 'Submit',
    detail: 'Broadcast to keeta network',
    status: 'submitted',
    txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
  },
  {
    id: 'confirm',
    label: 'Confirmation',
    detail: 'Finalized at block 17,238,402',
    status: 'confirmed',
    txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
  },
];

export const DEMO_AUDIT: DemoAuditEvent = {
  id: 'audit_a019f2',
  auditHash: 'sha256:24a9f0b3c7…',
  receiptId: 'rcpt_5a2c1f',
  emittedAtIso: '2026-05-06T11:21:43.184Z',
};

export const DEMO_METRICS: ReadonlyArray<DemoMetric> = [
  { id: 'intents-1d', label: 'Intents (24h)', value: 2148, suffix: '' },
  { id: 'p95', label: 'P95 quote→audit', value: 4.2, suffix: 's', precision: 1 },
  { id: 'success', label: 'Success rate (7d)', value: 99.6, suffix: '%', precision: 1 },
  { id: 'rails', label: 'Active rails', value: 5 },
];

export const DEMO_RAILS: ReadonlyArray<DemoSettlementRail> = [
  {
    id: 'native-kt',
    label: 'Keeta native',
    chain: 'keeta',
    status: 'live',
    latencyMs: 410,
    description: 'Atomic native KT transfers.',
  },
  {
    id: 'cctp',
    label: 'USDC · CCTP',
    chain: 'base ↔ keeta',
    status: 'live',
    latencyMs: 1820,
    description: 'Circle CCTP bridge with reconciliation.',
  },
  {
    id: 'aerodrome',
    label: 'KTA · aerodrome',
    chain: 'base',
    status: 'demo',
    latencyMs: 1310,
    description: 'Fee-on-transfer-safe swap path.',
  },
  {
    id: 'fiat',
    label: 'Fiat · ACH',
    chain: 'rail-only',
    status: 'paused',
    latencyMs: 0,
    description: 'Behind operator opt-in; no signers configured.',
  },
  {
    id: 'swift',
    label: 'SWIFT GPI',
    chain: 'rail-only',
    status: 'demo',
    latencyMs: 0,
    description: 'Receipt mapping only; signing not enabled.',
  },
];
