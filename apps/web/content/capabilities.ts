import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Compass,
  FlaskConical,
  Gauge,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Terminal,
  Workflow,
} from 'lucide-react';

export interface Capability {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly evidence: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

/**
 * Nine capability cards, in the order defined by the homepage build
 * plan. Each card cites the package or app that backs it. Anything
 * marketing-only is removed; the website only ships claims that point
 * at real code.
 */
export const capabilities: ReadonlyArray<Capability> = [
  {
    id: 'sdk-client',
    title: 'SDK client',
    summary:
      'Typed REST client over the API control plane. The same client the website itself uses for its read-only previews.',
    evidence: 'packages/sdk',
    href: '/developers#sdk',
    icon: Terminal,
  },
  {
    id: 'agent-runtime',
    title: 'Agent runtime',
    summary:
      'Long-running loop with deterministic factories for intents and plans. Clean hook surface, typed lifecycle.',
    evidence: 'packages/agent-runtime',
    href: '/use-cases#runtime',
    icon: Workflow,
  },
  {
    id: 'route-engine',
    title: 'Route engine',
    summary:
      'Composes single- and multi-hop paths across registered adapters. Picks routes by score, never by guess.',
    evidence: 'packages/routing',
    href: '/stack#routing',
    icon: Compass,
  },
  {
    id: 'policy-engine',
    title: 'Policy engine',
    summary:
      'Pack-driven evaluator for limits, allowlists, freshness, and kill-switch state. Always runs before the worker.',
    evidence: 'packages/policy',
    href: '/security#policy',
    icon: ShieldCheck,
  },
  {
    id: 'simulation-layer',
    title: 'Simulation layer',
    summary:
      'Pre-execute previews of account deltas with parity tests against the real adapter contracts.',
    evidence: 'packages/simulator',
    href: '/stack#simulator',
    icon: FlaskConical,
  },
  {
    id: 'worker-signing',
    title: 'Worker signing',
    summary:
      'In the canonical pipeline the worker is the signer. BYOK via Cloud KMS so the seed never leaves the HSM-backed boundary.',
    evidence: 'apps/worker · packages/keeta',
    href: '/security#worker',
    icon: KeyRound,
  },
  {
    id: 'mcp-tools',
    title: 'MCP tools',
    summary:
      '40+ tools so an LLM agent can read, route, and (with explicit opt-in) execute. Inline seeds rejected by default.',
    evidence: 'apps/mcp',
    href: '/developers#mcp',
    icon: Boxes,
  },
  {
    id: 'event-webhook-system',
    title: 'Event/webhook system',
    summary:
      'Typed event names, HMAC-signed webhook deliveries, redacted Pino logs, Prometheus exposition.',
    evidence: 'packages/events · packages/telemetry',
    href: '/stack#events',
    icon: ScrollText,
  },
  {
    id: 'operator-dashboard',
    title: 'Operator dashboard',
    summary:
      'Role-based Next.js console with intent drill-down, kill switch, anchor reconciliation, and live SSE.',
    evidence: 'apps/dashboard',
    href: '/stack#dashboard',
    icon: Gauge,
  },
];
