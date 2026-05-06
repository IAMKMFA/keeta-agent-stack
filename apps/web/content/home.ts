import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Cpu, GitBranch, Layers, Radar, ShieldCheck } from 'lucide-react';

export const heroContent = {
  eyebrow: 'Keeta Agent Stack',
  headline: 'The execution layer for autonomous financial agents.',
  subheadline:
    'Keeta Agent Stack turns intent into safe, explainable execution — quote, route, policy-check, simulate, execute, and audit in real time.',
  primaryCta: { label: 'Explore the Stack', href: '/stack' },
  secondaryCta: { label: 'Run the Demo', href: '/demo' },
  tertiaryCta: { label: 'Read the Docs', href: '/docs' },
} as const;

export interface PipelineStage {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly icon: LucideIcon;
}

export const pipelineStages: ReadonlyArray<PipelineStage> = [
  {
    id: 'intent',
    title: 'Intent',
    summary: 'Typed `ExecutionIntent` schema captures what the agent wants to do.',
    icon: Layers,
  },
  {
    id: 'quote',
    title: 'Quote',
    summary: 'Adapters return structured price quotes against the configured rails.',
    icon: Radar,
  },
  {
    id: 'route',
    title: 'Route',
    summary: 'The router composes single- or multi-hop paths across registered venues.',
    icon: GitBranch,
  },
  {
    id: 'policy',
    title: 'Policy',
    summary: 'Named policy packs gate the intent before any signing material is touched.',
    icon: ShieldCheck,
  },
  {
    id: 'simulate',
    title: 'Simulate',
    summary: 'A pre-execute simulator previews state deltas and surfaces failure modes.',
    icon: Cpu,
  },
  {
    id: 'execute',
    title: 'Execute',
    summary: 'The worker is the only canonical signer. Adapters never see the seed.',
    icon: CheckCircle2,
  },
  {
    id: 'audit',
    title: 'Audit',
    summary: 'Redacted audit rows, signed webhooks, and Prometheus metrics close the loop.',
    icon: ShieldCheck,
  },
];

export interface TrustStripItem {
  readonly label: string;
  readonly evidence: string;
}

export const trustStripItems: ReadonlyArray<TrustStripItem> = [
  { label: 'SDK', evidence: 'packages/sdk' },
  { label: 'API', evidence: 'apps/api' },
  { label: 'MCP', evidence: 'apps/mcp' },
  { label: 'Worker', evidence: 'apps/worker' },
  { label: 'Routing', evidence: 'packages/routing' },
  { label: 'Policy', evidence: 'packages/policy' },
  { label: 'Simulator', evidence: 'packages/simulator' },
  { label: 'Keeta Adapter', evidence: 'packages/adapter-keeta-transfer' },
  { label: 'Webhooks', evidence: 'packages/events' },
  { label: 'Metrics', evidence: 'packages/telemetry' },
  { label: 'Dashboard', evidence: 'apps/dashboard' },
  { label: 'Audit Trail', evidence: 'apps/api · /audits' },
];

export const ecosystemCards: ReadonlyArray<{
  readonly title: string;
  readonly summary: string;
  readonly category: string;
}> = [
  {
    category: 'Network',
    title: 'Keeta network',
    summary:
      'Native KTA transfers, anchor bonds, and oracle integration ride on the Keeta SDK wrapper.',
  },
  {
    category: 'Custody',
    title: 'Cloud KMS',
    summary:
      'Production-recommended path: GCP Cloud KMS so the signing key never leaves the HSM-backed boundary.',
  },
  {
    category: 'Agents',
    title: 'Model Context Protocol',
    summary:
      'Ship signing-class and read-only MCP tools so an LLM can author intents without ever touching seeds.',
  },
  {
    category: 'Runtime',
    title: 'Postgres + Redis + BullMQ',
    summary:
      'Drizzle-managed schema, BullMQ queues, and reconciliation workers compose a familiar Node runtime.',
  },
  {
    category: 'Operators',
    title: 'Next.js dashboard',
    summary:
      'A read-only operator console with role-based access, kill-switch, and full execution drill-down.',
  },
  {
    category: 'Observability',
    title: 'OpenTelemetry + Prometheus',
    summary:
      'Pino with redacted secrets, OTEL tracing across queues, and `/metrics` gated by operator auth.',
  },
];
