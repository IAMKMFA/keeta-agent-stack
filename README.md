# Keeta Agent Stack

[![CI](https://github.com/IAMKMFA/keeta-agent-stack/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/IAMKMFA/keeta-agent-stack/actions/workflows/ci.yml)
[![Template smoke](https://github.com/IAMKMFA/keeta-agent-stack/actions/workflows/template-smoke.yml/badge.svg?branch=main)](https://github.com/IAMKMFA/keeta-agent-stack/actions/workflows/template-smoke.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Build Keeta-native agents that can take an intent, find the best route, enforce policy, simulate risk, execute safely, and keep users and operators informed in real time.

|                           |                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Install path today**    | **Clone the monorepo** — use workspace packages via `pnpm` (see [Get started in 30 seconds](#get-started-in-30-seconds)).                                      |
| **NPM packages**          | **`@keeta-agent-stack/*` is not on npm yet** (deliberate; first publish is gated on the scope decision).                                                       |
| **Hosted API / Typedoc**  | **Build locally** — `pnpm --filter @keeta-agent-stack/docs build` → `apps/docs/dist` + `openapi.json`. GitHub Pages is gated; no public doc URL until enabled. |
| **Fastest “see it work”** | [Quick Start](#quick-start) (`docker compose` → `db:migrate` → `pnpm dev:all` → `pnpm demo`) or run [`examples/hello-agent`](./examples/hello-agent).          |

## Status

**Pre-publish alpha (`0.1.0-alpha.0`).** The SDK family
(`@keeta-agent-stack/sdk`, `@keeta-agent-stack/agent-runtime`,
`@keeta-agent-stack/types`, `@keeta-agent-stack/policy`, plus 15 supporting
packages — see [CHANGELOG](./CHANGELOG.md)) is publish-ready and consumable
from this monorepo today via `pnpm` workspace links or by cloning. The
`@keeta-agent-stack/*` scope is **not yet live on npm** — we are deliberately
not squatting on a name the Keeta team may want to ship under. The first npm
publish is gated on that decision; until then, use the monorepo directly
(see [`docs/sdk-reference.md`](./docs/sdk-reference.md) and
[`docs/deployment.md`](./docs/deployment.md)).

Quick links: [Docs index](./docs/README.md) | [Contributing](./CONTRIBUTING.md) | [Code of Conduct](./CODE_OF_CONDUCT.md) | [Security](./SECURITY.md) | [Changelog](./CHANGELOG.md)

## Get started in 30 seconds

Until the first npm publish, install from the monorepo:

```bash
git clone https://github.com/IAMKMFA/keeta-agent-stack.git
cd keeta-agent-stack
pnpm install
pnpm build
```

Once published, the consumer-facing install will be:

```bash
pnpm add @keeta-agent-stack/sdk @keeta-agent-stack/agent-runtime @keeta-agent-stack/types
```

Three files to read first, in order:

1. **[`examples/hello-agent`](./examples/hello-agent)** — minimal `createClient` -> wallet -> intent -> quote in <30 lines. Run it against your local dev stack or your own API.
2. **[`apps/mcp/TOOLS.md`](./apps/mcp/TOOLS.md)** — every one of the 81 MCP tools, grouped by module, with input schemas and read/write/signing classification. Auto-generated from the live Zod schemas, verified in CI.
3. **[`templates/treasury-rebalancer`](./templates/treasury-rebalancer)** — the flagship template: a real drift-driven rebalance loop with a working policy pack (caps, slippage, venue + asset allowlists, daily-trade and unsettled gates), pinned to every emitted intent.

Three more things you probably want next:

- **Generated docs + OpenAPI** — build locally with `pnpm --filter @keeta-agent-stack/docs build`; the static bundle lands in `apps/docs/dist` with `openapi.json`. GitHub Pages publication is gated on `ENABLE_GITHUB_PAGES=true`, so hosted links are coming soon.
- **Deploy your own sandbox** — multi-stage [`Dockerfile`](./Dockerfile), [`docker-compose.prod.yml`](./docker-compose.prod.yml), and Fly configs at [`apps/api/fly.toml`](./apps/api/fly.toml) / [`apps/worker/fly.toml`](./apps/worker/fly.toml) / [`apps/mcp/fly.toml`](./apps/mcp/fly.toml). Bootstrap commands in [`docs/deployment.md`](./docs/deployment.md#self-hosted-sandbox-flyio). Sandbox defaults: Keeta testnet, read-only, `MCP_ALLOW_INLINE_SEEDS=false`.
- **Security model in one page** — [`SECURITY.md`](./SECURITY.md) covers `KEETA_SIGNING_SEED` handling (worker-only), `MCP_ALLOW_INLINE_SEEDS` rationale, seed rotation, and the `OPS_API_KEY` / `ADMIN_BYPASS_TOKEN` authorization surfaces.

## In One Minute

Keeta Agent Stack is a full execution stack for autonomous payment and trading agents on Keeta.

It gives an agent the infrastructure to:

- accept a durable execution intent
- gather quotes across adapters
- build explainable multi-hop routes
- enforce policy and risk controls
- simulate before going live
- execute through a worker-controlled settlement path
- emit events, webhooks, metrics, and audit records

It gives operators and users:

- safer execution because signing stays in the worker, not in agent logic
- visibility into what the agent decided and why
- dashboards, webhooks, SSE, and metrics for monitoring
- durable records for policy, routing, simulation, execution, and reconciliation

This is not a prompt wrapper. It is an execution platform.

## What The Agent Gets

- A durable `intent -> quote -> route -> policy -> execute` pipeline
- Adapter-driven venue access through a shared contract and registry — routing topology is live; venue liquidity today is **two integration adapters** (`keeta-transfer` native, `oracle-rail` HTTP partner) plus mocks for `dex`/`anchor`/`cex` and a `solana` stub. See the [capability matrix](./docs/capability-matrix.md#rails--adapters).
- Multi-hop routing with explainable scoring and route adjustments
- A policy engine with custom rules, toggles, metadata, and composition
- Simulation modes for safer decision-making before live execution
- Runtime hooks around quote, route, policy, simulation, and execution
- SDK, API, and MCP surfaces for different integration styles

## What The User And Operator Get

- Clear records of what happened, not just final outcomes
- Safer live execution because Keeta signing keys stay in `apps/worker`
- Webhooks and SSE for reactive systems
- Dashboard views for intents, routes, executions, anchors, and operations
- Metrics, traces, audit events, and job-failure visibility
- Anchor and bond lifecycle management for settlement operations

## Why This SDK Stands Out

- It is Keeta-native, not generic infrastructure with Keeta branding added later.
- It is durable, not in-memory orchestration that disappears after a run.
- It is explainable, not a black box that only returns a final action.
- It is extensible, so teams can plug in adapters, policies, and runtime hooks.
- It is built for real operations, with auditability, retries, metrics, and worker isolation.

## Core Flow

1. A client creates an intent.
2. The system gathers quotes from adapters.
3. The router builds and scores direct or multi-hop paths.
4. The policy engine decides whether execution is allowed.
5. The runtime simulates or executes.
6. The system persists outcomes and emits events, webhooks, and metrics.

## Main Surfaces

| Surface       | Path                     | Purpose                                                                                        |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| SDK client    | `packages/sdk`           | Typed client for intents, routes, simulations, events, webhooks, oracle, and anchor operations |
| API           | `apps/api`               | Fastify control plane with typed routes, auth, metrics, and OpenAPI                            |
| Worker        | `apps/worker`            | BullMQ-driven execution, policy, simulation, reconciliation, and delivery engine               |
| Dashboard     | `apps/dashboard`         | Operator UI for platform visibility and control                                                |
| MCP server    | `apps/mcp`               | Tool surface for LLM-driven workflows and oracle-assisted playbooks                            |
| Agent runtime | `packages/agent-runtime` | High-level orchestration hooks for custom agent behavior                                       |

## What Is Real Today

| Area                                             | Current state                                 |
| ------------------------------------------------ | --------------------------------------------- |
| Keeta chain reads                                | Real via `@keetanetwork/keetanet-client`      |
| Native KTA transfer execution                    | Real in live mode through the worker          |
| Oracle-assisted rate and rail planning           | Real                                          |
| Multi-hop routing                                | Real                                          |
| Policy engine with custom rules and composition  | Real                                          |
| Dashboard, events, webhooks, metrics, tracing    | Real                                          |
| Integration test harness with Postgres and Redis | Real                                          |
| Mock DEX and mock anchor venues                  | Simulated by design                           |
| Additional live third-party venue adapters       | Future expansion through the adapter contract |

## Security Model

- Signing keys do not live in agent logic.
- Live Keeta signing happens only inside `apps/worker`.
- The API and SDK can drive execution without being trusted with settlement secrets.
- Policy still gates live execution before the worker submits.
- JWT/RBAC and remote JWKS/OIDC support are in place for controlled access.

## Quick Start

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Default local surfaces:

- API: `http://localhost:3001`
- Dashboard: `http://localhost:3000`

To run API, worker, dashboard, and MCP together:

```bash
pnpm dev:all
```

For the one-command demo flow:

```bash
pnpm demo
```

## Build Your First Trading Agent in 10 Minutes

This walkthrough takes you from a fresh clone to a running agent that prices a swap, runs it through policy, simulates the result, and is ready to flip to live execution. Everything below uses the `createKeetaAgent` factory in `@keeta-agent-stack/agent-runtime`.

### 1. Install and start the dev stack

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm dev:all
```

`pnpm dev:all` boots the API (`:3001`), worker, dashboard (`:3000`), and MCP server. Leave it running.

### 2. Wire up an offline agent (no signing required)

```ts
import { createKeetaAgent } from '@keeta-agent-stack/agent-runtime';
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import { MockDexAdapter } from '@keeta-agent-stack/adapter-mock-dex';
import type { ExecutionIntent } from '@keeta-agent-stack/types';

const registry = new AdapterRegistry();
registry.register(
  new MockDexAdapter({
    id: 'mock-dex',
    spreadBps: 10,
    feeBps: 5,
    maxSlippageBps: 4,
    failureRate: 0,
  })
);

const agent = createKeetaAgent({
  name: 'tutorial-agent',
  registry,
  policy: {
    maxOrderSize: 1_000_000,
    maxSlippageBps: 500,
    venueAllowlist: [],
    assetAllowlist: [],
    liveModeEnabled: true,
  },
  hooks: {
    onIntent: (ctx) => console.log('intent', ctx.intent.id),
    afterRoute: (ctx) => console.log('best route', ctx.routes?.best.id),
    afterPolicy: (ctx) => console.log('policy allowed?', ctx.policyDecision?.allowed),
    afterSimulation: (ctx) =>
      console.log('simulated slippage bps', ctx.simulationResult?.simulatedSlippageBps),
  },
});

const intent: ExecutionIntent = {
  id: crypto.randomUUID(),
  walletId: crypto.randomUUID(),
  baseAsset: 'KTA',
  quoteAsset: 'USDC',
  side: 'sell',
  size: '25',
  maxSlippageBps: 50,
  mode: 'simulate',
  createdAt: new Date().toISOString(),
};

const result = await agent.execute(intent);
console.log(result.kind, result);
```

`result.kind` is one of `'denied' | 'simulated' | 'executed' | 'pending' | 'failed'`. With the inputs above you should see `simulated`.

### 3. Flip to live execution

Drop the `registry` + `policy` and pass an SDK client instead. The factory will create the intent, walk it through the API pipeline, and return `executed` or `failed` once a terminal event arrives. If the worker has not emitted a terminal event before the polling timeout, the result is `pending` with the events observed so far.

```ts
import { createClient } from '@keeta-agent-stack/sdk';

const sdk = createClient({
  baseUrl: process.env.KEETA_API_URL ?? 'http://localhost:3001',
  defaultHeaders: { Authorization: `Bearer ${process.env.KEETA_API_TOKEN ?? ''}` },
});

const liveAgent = createKeetaAgent({ name: 'tutorial-live', sdk });
const liveResult = await liveAgent.execute({ ...intent, mode: 'live' });
```

The worker (not the agent process) holds the Keeta signing key, so this code path stays safe to run in user-facing agents.

### 4. Productionise

- Drop your runtime config into a `starter-agent-template/` clone (next section) for a standalone deploy unit.
- Hook `onError` in production to forward failures to your observability stack.
- Pre-warm policy packs by calling `sdk.evaluatePolicy(...)` from a CI smoke test before deploying.

## Common Agent Patterns & Examples

Five turn-key reference agents live under [`examples/`](./examples). Each folder has its own README explaining the scenario, prerequisites, and run command.

| Pattern                       | Folder                                                                   | What it shows                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Hello agent (60-second smoke) | [`examples/hello-agent`](./examples/hello-agent)                         | Minimal `createClient` -> wallet -> intent -> quote in one file. Start here.  |
| Paper trader                  | [`examples/paper-trader`](./examples/paper-trader)                       | Hands-off simulation loop using `createKeetaAgent` and the mock DEX.          |
| Rebalance bot                 | [`examples/rebalance-bot`](./examples/rebalance-bot)                     | Periodic portfolio rebalancing via policy-gated route execution.              |
| Oracle payment playbook       | [`examples/oracle-payment-playbook`](./examples/oracle-payment-playbook) | Oracle-priced fiat → KTA payment with the new `oracle.payment.*` MCP tools.   |
| Route inspector               | [`examples/route-inspector`](./examples/route-inspector)                 | Pull alternates and explainable scoring out of the routing engine.            |
| Simulation fidelity           | [`examples/simulation-fidelity`](./examples/simulation-fidelity)         | Compare standard / shadow / replay simulation modes against live chain reads. |

For an end-to-end smoke harness that exercises the API + worker together, see [`examples/mock-live-run`](./examples/mock-live-run).

For a fully-formed flagship agent that points at your local API out of the box, see [`templates/treasury-rebalancer`](./templates/treasury-rebalancer) — a real rebalance loop with a working policy pack, drift math, and structured-event logs.

LLM integration recipes (Grok, Claude, LangGraph) are documented in [`examples/mcp-llm-integration.md`](./examples/mcp-llm-integration.md).

The full MCP tool inventory (81 tools, with input schemas and read/write/signing classification) lives in [`apps/mcp/TOOLS.md`](./apps/mcp/TOOLS.md). It is auto-generated from the Zod schemas in `apps/mcp/src/tools/*` and verified in CI.

## SDK Reference & OpenAPI

- **Static OpenAPI snapshot** — generated by `pnpm --filter @keeta-agent-stack/docs build` into `apps/docs/dist/openapi.json`. [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) publishes the same bundle only when `ENABLE_GITHUB_PAGES=true`.
- **Local Swagger UI** — `pnpm dev:all` (or `pnpm --filter @keeta-agent-stack/api dev`) serves the live API. Browse [`http://localhost:3001/docs`](http://localhost:3001/docs) for the Try-It-Out UI; production disables Try-It-Out unless `API_SWAGGER_TRY_IT_OUT_ENABLED=true`.
- **Typedoc** — `pnpm docs:generate` builds API docs for `@keeta-agent-stack/sdk`, `@keeta-agent-stack/agent-runtime`, and `@keeta-agent-stack/types` into `docs/typedoc/`.
- A higher-level guided tour of both surfaces lives in [`docs/sdk-reference.md`](./docs/sdk-reference.md).

## Live Keeta Mode

For live native Keeta transfers:

- set `LIVE_MODE_ENABLED=true`
- set `KEETA_NETWORK`
- set `KEETA_SIGNING_SEED` in the worker environment only
- route through the `keeta-transfer` adapter
- provide transfer metadata such as `metadata.transferTo`

Useful environment variables:

- `DATABASE_URL`
- `REDIS_URL`
- `KEETA_NETWORK`
- `KEETA_SIGNING_SEED`
- `KEETA_ACCOUNT_INDEX`
- `KEETA_POLICY_ENABLED`
- `AUTH_JWT_*`
- `METRICS_ENABLED`

See [`.env.example`](.env.example) for the full runtime contract.

## Developer Workflow

Quality checks:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
```

The integration suite runs the real API and worker against Postgres and Redis.

## Planning Docs

- [Capability Matrix](./docs/capability-matrix.md) — current product-surface coverage across API, SDK, and MCP
- [Next Steps Roadmap](./docs/next-steps-roadmap.md) — recommended engineering sequence for the next platform phase
- [Platform Overview](./docs/keeta-agent-stack.md) — higher-level positioning and architecture summary

## Repository Map

- `packages/types` — shared Zod schemas and lifecycle types
- `packages/adapter-*` — adapters and adapter registry
- `packages/routing` — multi-hop route discovery and scoring
- `packages/policy` — policy rules, registration, and composition
- `packages/simulator` — simulation pipeline
- `packages/keeta` — Keeta chain, transfer, oracle, and bond helpers
- `packages/storage` — Drizzle schema, repositories, migrations, rollback helpers
- `packages/telemetry` — logging, tracing, and metrics helpers
- `packages/agent-runtime` — agent-oriented orchestration hooks
- `packages/integration-tests` — full-stack verification harness
- `apps/api` — HTTP control plane
- `apps/worker` — durable execution worker
- `apps/dashboard` — operational UI
- `apps/mcp` — MCP server for tool-driven workflows
- `examples/*` — runnable samples for agent builders

## What A Smart Reader Should Know

- This repo is strongest at execution infrastructure, not marketing polish.
- The architecture is already shaped like a serious SDK platform: shared contracts, durable pipeline, adapter model, policy engine, control plane, and operator surfaces.
- The main frontier work is packaging and deeper production maturity, not rebuilding the core design.
- Development on `main` is meant to be understandable, extensible, and operationally credible before a stable release is declared.

## Where to next

- [Documentation index](./docs/README.md) - guided map across the long-form docs, generated references, and live API docs.
- [Deployment guide](./docs/deployment.md) — topology, env, scaling, observability, the self-hosted sandbox Fly recipe, and a reference `docker-compose.prod.yml` + Helm chart skeleton.
- [Creating a new adapter](./docs/creating-new-adapter.md) — step-by-step from `packages/adapter-template/` through routing weights and tests.
- [MCP + LLM integration](./examples/mcp-llm-integration.md) — Grok, Claude, and LangGraph wiring with the Oracle Payment Playbook walkthrough.
- [Capability matrix](./docs/capability-matrix.md) — adapter coverage and parity tracking.
- [Treasury rebalancer template](./templates/treasury-rebalancer) — flagship agent: drift math, working policy pack, local API ready.
- [Starter agent template](./starter-agent-template) — minimal standalone project; until npm publish, use its smoke script to install local tarballs from this monorepo.

## Community & Governance

- [Contributing guide](./CONTRIBUTING.md) — local setup, checks, branch conventions, and release hygiene.
- [Code of Conduct](./CODE_OF_CONDUCT.md) — expected behaviour for contributors and maintainers.
- [Security policy](./SECURITY.md) — private disclosure process for signing, auth, payment, and operator issues.
- [Changelog](./CHANGELOG.md) — user-facing changes queued for the next release.
- [License](./LICENSE) — Apache-2.0.

## License

[Apache-2.0](./LICENSE)
