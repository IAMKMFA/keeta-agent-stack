export interface UseCase {
  readonly id: string;
  readonly title: string;
  readonly persona: string;
  readonly summary: string;
  readonly outcomes: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<string>;
}

/**
 * Six representative use cases. Every one is grounded in a real
 * template, example, or package in the repo. Marketing-only flows
 * (anything we cannot point a path at) are deliberately excluded.
 */
export const useCases: ReadonlyArray<UseCase> = [
  {
    id: 'treasury-rebalancer',
    title: 'Treasury rebalancer',
    persona: 'Operations + finance',
    summary:
      'A finance agent rebalances a multi-asset treasury against a target allocation on a fixed cadence. The agent never holds signing material; the worker signs after policy passes.',
    outcomes: [
      'Time-bounded rebalances with no manual intent authoring.',
      'Per-asset caps, allowlists, and review thresholds enforced by named policy packs.',
      'Audit-trailed activity with redacted logs and HMAC-signed webhooks.',
    ],
    evidence: ['templates/treasury-rebalancer', 'packages/agent-runtime', 'packages/policy'],
  },
  {
    id: 'payment-routing-agent',
    title: 'Payment-routing agent',
    persona: 'Developer infrastructure',
    summary:
      'An agent picks the best route across registered adapters for each outbound payment — single-rail or multi-hop — then settles through the worker. Routing decisions are scored, not guessed.',
    outcomes: [
      'Multi-hop plans across `@keeta-agent-stack/routing` with explicit fee and latency budgets.',
      'Quote freshness windows enforced before execution; stale quotes are rejected, not retried.',
      'Per-rail capabilities discovered via `@keeta-agent-stack/adapter-registry`.',
    ],
    evidence: [
      'packages/routing',
      'packages/adapter-registry',
      'examples/agent-api-payment',
      'packages/adapter-x402',
    ],
  },
  {
    id: 'oracle-assisted-settlement',
    title: 'Oracle-assisted settlement',
    persona: 'Treasury operations',
    summary:
      'Agents request settlement assistance via the oracle rail — price feeds, reconciliation hints, and confirmation hooks — while the worker continues to own custody of the seed.',
    outcomes: [
      'Tier-aware checks before settlement can proceed.',
      'Reconciliation worker chases anchor bonds until settlement is confirmed.',
      'Operator-visible kill switch interrupts every queue at runtime.',
    ],
    evidence: [
      'packages/adapter-oracle-rail',
      'examples/oracle-payment-playbook',
      'apps/worker',
    ],
  },
  {
    id: 'policy-gated-trading-agent',
    title: 'Policy-gated trading agent',
    persona: 'Quant + research',
    summary:
      'A research agent runs strategies against deterministic mock venues, then graduates to live adapters under a strict policy pack. Simulator parity tests freeze the diff into CI.',
    outcomes: [
      'Bit-for-bit parity tests between simulator and adapter contracts.',
      'A/B between policy packs without touching the worker.',
      'Per-strategy budgets, drawdown caps, and freshness windows enforced before execution.',
    ],
    evidence: [
      'examples/paper-trader',
      'examples/simulation-fidelity',
      'packages/simulator',
      'packages/policy',
    ],
  },
  {
    id: 'operator-monitoring',
    title: 'Operator monitoring',
    persona: 'Operations',
    summary:
      'Operators watch live intents, kill switches, anchor bonds, and webhook deliveries from a role-based Next.js console — without touching signing material.',
    outcomes: [
      'Role-based access (viewer / operator / admin) enforced at the API layer on every protected route.',
      'Live SSE feed for intents, executions, and reconciliations.',
      'One-click kill switch that the worker re-checks before every job dequeue.',
    ],
    evidence: ['apps/dashboard', 'apps/worker', 'apps/api/src/lib/auth.ts'],
  },
  {
    id: 'mcp-powered-agent-operations',
    title: 'MCP-powered agent operations',
    persona: 'Agent platform team',
    summary:
      'An LLM agent reads, routes, and (with explicit operator opt-in) executes via the 40+ tool MCP catalogue. Inline seeds are rejected by default; signing-class tools delegate to the worker.',
    outcomes: [
      'Read-only tools safe by default; signing-class tools off until env opt-in.',
      'No raw seed material handled by the LLM in the canonical pipeline.',
      'Per-tool surface and signing posture documented in `apps/mcp/TOOLS.md`.',
    ],
    evidence: [
      'apps/mcp',
      'apps/mcp/TOOLS.md',
      'examples/mcp-llm-integration.md',
      'apps/mcp/src/tools/execute.ts',
    ],
  },
];
