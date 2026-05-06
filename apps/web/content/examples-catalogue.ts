import { siteConfig } from '../lib/site-config';

export interface ExampleEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly path: string;
  readonly href: string;
  readonly tags: ReadonlyArray<string>;
}

const repo = (path: string) => `${siteConfig.repoUrl}/tree/main/${path}`;
const repoFile = (path: string) => `${siteConfig.repoUrl}/blob/main/${path}`;

/**
 * Real example projects in the repo. Each one is shipped today and
 * runs locally with `pnpm install && pnpm dev:all`. No marketing-only
 * examples on this page.
 */
export const examplesCatalogue: ReadonlyArray<ExampleEntry> = [
  {
    id: 'hello-agent',
    title: 'hello-agent',
    summary: 'Smallest possible agent — clone, install, submit one intent, and watch the pipeline.',
    path: 'examples/hello-agent',
    href: repo('examples/hello-agent'),
    tags: ['SDK', 'agent-runtime'],
  },
  {
    id: 'paper-trader',
    title: 'paper-trader',
    summary: 'Run agent strategies against deterministic mock venues with simulator parity.',
    path: 'examples/paper-trader',
    href: repo('examples/paper-trader'),
    tags: ['simulator', 'policy'],
  },
  {
    id: 'simulation-fidelity',
    title: 'simulation-fidelity',
    summary: 'Frozen diff between simulator output and live adapter contracts. Runs in CI.',
    path: 'examples/simulation-fidelity',
    href: repo('examples/simulation-fidelity'),
    tags: ['simulator', 'CI'],
  },
  {
    id: 'rebalance-bot',
    title: 'rebalance-bot',
    summary: 'A small portfolio rebalancer that drives the canonical pipeline on a fixed cadence.',
    path: 'examples/rebalance-bot',
    href: repo('examples/rebalance-bot'),
    tags: ['agent-runtime', 'policy'],
  },
  {
    id: 'route-inspector',
    title: 'route-inspector',
    summary: 'Inspect the multi-hop router across registered adapters without executing anything.',
    path: 'examples/route-inspector',
    href: repo('examples/route-inspector'),
    tags: ['routing', 'adapters'],
  },
  {
    id: 'agent-api-payment',
    title: 'agent-api-payment',
    summary: 'Agent settles a metered third-party API call through the x402 adapter.',
    path: 'examples/agent-api-payment',
    href: repo('examples/agent-api-payment'),
    tags: ['x402', 'MCP'],
  },
  {
    id: 'oracle-payment-playbook',
    title: 'oracle-payment-playbook',
    summary: 'End-to-end playbook for oracle-assisted settlement and reconciliation.',
    path: 'examples/oracle-payment-playbook',
    href: repo('examples/oracle-payment-playbook'),
    tags: ['oracle', 'reconciliation'],
  },
  {
    id: 'mock-live-run',
    title: 'mock-live-run',
    summary: 'Toggle between mock adapters and live execution against the same pipeline contract.',
    path: 'examples/mock-live-run',
    href: repo('examples/mock-live-run'),
    tags: ['live mode', 'mock'],
  },
  {
    id: 'mcp-llm-integration',
    title: 'mcp-llm-integration.md',
    summary:
      'Walkthrough for wiring an LLM agent into the MCP server with the right inline-seed posture.',
    path: 'examples/mcp-llm-integration.md',
    href: repoFile('examples/mcp-llm-integration.md'),
    tags: ['MCP', 'LLM'],
  },
  {
    id: 'treasury-rebalancer-template',
    title: 'treasury-rebalancer (template)',
    summary: 'Production-shaped template you can fork. Same guardrails as the rest of the stack.',
    path: 'templates/treasury-rebalancer',
    href: repo('templates/treasury-rebalancer'),
    tags: ['template', 'treasury'],
  },
];
