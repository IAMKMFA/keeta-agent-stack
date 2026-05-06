export interface FAQEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

/**
 * Homepage FAQ. Every answer maps to repo evidence — `SECURITY.md`,
 * a specific `apps/*` or `packages/*` path, or `docs/web/*`. We do
 * not paraphrase guarantees we cannot enforce.
 */
export const faqEntries: ReadonlyArray<FAQEntry> = [
  {
    id: 'what-is-it',
    question: 'What is Keeta Agent Stack?',
    answer:
      'A self-contained execution layer for autonomous financial agents. It turns a typed payment intent into a quoted, routed, policy-checked, simulated, signed, and audited execution. The repo ships the SDK, API, worker, MCP server, and operator dashboard that make that loop work end-to-end.',
  },
  {
    id: 'framework-or-platform',
    question: 'Is this an agent framework or an execution platform?',
    answer:
      'It is an execution platform with an agent-runtime convenience layer on top. The platform pieces (API, worker, policy, simulator, adapters) own the safety guarantees and run with or without an LLM. The `@keeta-agent-stack/agent-runtime` package is an optional ergonomic loop for teams that want a long-running agent host; you can ignore it and call the SDK directly.',
  },
  {
    id: 'where-do-keys-live',
    question: 'Where do signing keys live?',
    answer:
      'In the canonical execution pipeline the worker process is the signer. The API, dashboard, MCP, and this website never see the seed. Production deployments are recommended to rotate to GCP Cloud KMS so the private key never leaves the HSM-backed boundary. See `SECURITY.md` § Signing Key & Inline-Seed Policy.',
  },
  {
    id: 'simulate-before-execute',
    question: 'Can I run simulations before live execution?',
    answer:
      'Yes. The simulator runs in-process before any worker dispatch and previews account-level deltas. Operators can keep the pipeline in simulate-only mode (no signer invoked) until they explicitly approve execution. Parity tests in `packages/simulator` keep the previews honest against real adapter contracts.',
  },
  {
    id: 'mcp-support',
    question: 'Does it support MCP?',
    answer:
      'Yes. The `apps/mcp` server publishes 40+ Model Context Protocol tools, classified by surface and signing-posture. Read-only tools are safe by default; signing-class tools delegate to the worker through the Keeta package and are off by default. Inline seed arguments are rejected unless an operator explicitly opts in.',
  },
  {
    id: 'policy-layer',
    question: 'How does the policy layer work?',
    answer:
      'Named policy packs are evaluated server-side against an intent before any signing material is touched. Packs combine limits, allowlists, freshness windows, kill-switch state, and per-rail rules. The decision (`allow`, `review`, `deny`) and the matched rules are persisted to the audit trail. See `packages/policy` and `apps/api/src/lib/auth.ts`.',
  },
  {
    id: 'live-mode',
    question: 'Can this connect to Keeta live mode?',
    answer:
      'Yes — the Keeta adapter performs live native KTA transfers, with the signer terminating in the worker. Live mode is opt-in: the worker refuses to boot in production with `ALLOW_DEV_SIGNER=true`, and the public website only calls live read-only endpoints when both `NEXT_PUBLIC_DEMO_MODE=false` and `NEXT_PUBLIC_KEETA_API_BASE_URL` are set.',
  },
  {
    id: 'self-hosting',
    question: 'Can I self-host the whole stack?',
    answer:
      'Yes. Docker Compose ships at the repo root, Fly configs ship per app, and every package builds independently. Postgres + Redis are the only runtime infrastructure dependencies; the rest is plain Node services.',
  },
  {
    id: 'license-and-contributions',
    question: 'What is the license, and how do I contribute?',
    answer:
      'Apache-2.0. Issues, pull requests, and security advisories are accepted on GitHub. `CONTRIBUTING.md` walks through the local dev loop and the `verify:agent` gate that every change must pass.',
  },
];
