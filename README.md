# Keeta Agent SDK

Build Keeta-native agents that can take an intent, find the best route, enforce policy, simulate risk, execute safely, and keep users and operators informed in real time.

## Status

`v2` is in progress.

This repository is an active build of the next Keeta Agent SDK release. It is already powerful and end-to-end capable, but it is still evolving and should be treated as a working release track rather than a final public release.

## In One Minute

Keeta Agent SDK is a full execution stack for autonomous payment and trading agents on Keeta.

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
- Adapter-driven venue access through a shared contract and registry
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

| Surface | Path | Purpose |
|---|---|---|
| SDK client | `packages/sdk` | Typed client for intents, routes, simulations, events, webhooks, oracle, and anchor operations |
| API | `apps/api` | Fastify control plane with typed routes, auth, metrics, and OpenAPI |
| Worker | `apps/worker` | BullMQ-driven execution, policy, simulation, reconciliation, and delivery engine |
| Dashboard | `apps/dashboard` | Operator UI for platform visibility and control |
| MCP server | `apps/mcp` | Tool surface for LLM-driven workflows and oracle-assisted playbooks |
| Agent runtime | `packages/agent-runtime` | High-level orchestration hooks for custom agent behavior |

## What Is Real Today

| Area | Current state |
|---|---|
| Keeta chain reads | Real via `@keetanetwork/keetanet-client` |
| Native KTA transfer execution | Real in live mode through the worker |
| Oracle-assisted rate and rail planning | Real |
| Multi-hop routing | Real |
| Policy engine with custom rules and composition | Real |
| Dashboard, events, webhooks, metrics, tracing | Real |
| Integration test harness with Postgres and Redis | Real |
| Mock DEX and mock anchor venues | Simulated by design |
| Additional live third-party venue adapters | Future expansion through the adapter contract |

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
- The current `v2` branch is meant to be understandable, extensible, and operationally credible before it is declared final.

## License

Apache-2.0
