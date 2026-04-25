# Keeta Agent Stack

## Status

Release track: `0.1.0-alpha.0` pre-publish alpha

Current state: pushed to `main` as a working Keeta Agent Stack alpha. The
publishable packages are versioned in the monorepo, but the
`@keeta-agent-stack/*` scope is not yet live on npm; publication is gated on
the final package-scope decision and release credentials.

## Positioning

The Keeta Agent Stack is now a full agent execution platform with five aligned layers:

1. SDK surface for external agent builders
2. Shared typed contract layer
3. Execution engine packages for routing, policy, simulation, and runtime orchestration
4. Control plane services for API and worker-driven durable execution
5. Operator, observability, and developer experience surfaces

This is no longer just an app with internal code reuse. It is a packaged system for building Keeta-native autonomous agents.

## Executive Summary

The strongest capabilities now in place are:

- Durable `intent -> quote -> route -> policy -> execute` orchestration
- Multi-hop routing with explainable scoring
- Extensible policy engine with custom rules, toggles, and compositions
- Adapter registry plus contract-tested venue integrations
- Keeta-native chain, transfer, oracle, and anchor-bond integration seams
- Event-driven operations through SSE and HMAC-signed webhooks
- Integration-tested end-to-end execution harness
- Tracing, request correlation, and API hardening foundations

The frontier work is no longer architectural rescue. It is publication,
custody clarity, public-facing polish, and deeper production integrations.

## Capability Matrix

| Layer                   | Paths                        | Current Capability                                                                                                                                | Why It Matters For Agents                                                                                      | Remaining Frontier                                                                  |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SDK Client              | `packages/sdk`               | Typed HTTP client for intents, routes, executions, events, webhooks, policy, oracle, and anchor operations                                        | Gives external developers a stable agent-facing surface instead of raw endpoint juggling                       | Public npm publication, versioning guarantees, generated reference docs             |
| Shared Domain Contracts | `packages/types`             | Zod schemas, route and execution shapes, event payloads, lifecycle validators, payment-anchor domain types                                        | Makes agent behavior safe, inspectable, and consistent across packages                                         | Branded IDs, richer generated reference output                                      |
| Adapter Contract        | `packages/adapter-base`      | Venue adapter interfaces plus contract and conformance testing                                                                                    | Lets new venues plug into agent execution without worker rewrites                                              | Lifecycle hooks and versioned compatibility policy                                  |
| Adapter Registry        | `packages/adapter-registry`  | Runtime registration plus default dev factory and injectable custom registries                                                                    | Enables per-environment venue composition and deterministic test/runtime setups                                | Hot-reload, richer metadata, adapter lifecycle events                               |
| Routing Engine          | `packages/routing`           | Multi-hop DFS route construction, scoring, hop penalties, adapter scoring hooks, explainable score adjustments                                    | Gives agents route intelligence rather than static venue selection                                             | Route caching, bridge-asset awareness, advanced path heuristics                     |
| Policy Engine           | `packages/policy`            | Default rules, custom rule registration, Zod config validation, metadata discovery, enable/disable toggles, `allOf` / `anyOf` / `not` composition | Lets agent builders shape execution behavior without forking runtime internals                                 | Policy bundles, admin persistence of custom compositions, richer explainability UIs |
| Simulator               | `packages/simulator`         | Standard, shadow, and replay-flavored simulation with persisted runs/results                                                                      | Lets agents preview execution risk and route quality before live action                                        | Full PnL integration, scenario libraries, calibration against live fills            |
| Agent Runtime           | `packages/agent-runtime`     | Lifecycle orchestration and 8 hook points around quote, route, policy, simulation, and execution                                                  | Gives developers extension seams at the right moments in agent flow                                            | More packaged runtime recipes and sample agent templates                            |
| Keeta Integration       | `packages/keeta`             | Chain reads, signing bridge, native transfer path, oracle client, oracle playbook assembly, anchor-bond verification seam                         | Makes the platform genuinely Keeta-native rather than venue-agnostic with branding                             | On-chain bond proof when chain primitives land, deeper receipt normalization        |
| Event Contracts         | `packages/events`            | Typed event names and payloads for execution and anchor lifecycle domains                                                                         | Supports reactive agents and downstream subscribers                                                            | Broader event taxonomy and event versioning                                         |
| Storage Layer           | `packages/storage`           | Drizzle schema, repositories, migrations, audit trails, webhook delivery state, route and simulation persistence                                  | Gives agents durable state and operator-grade inspection after execution                                       | Partitioning strategy, archival policy, backup/runbook documentation                |
| Config Layer            | `packages/config`            | Zod-validated env contract, queue names, worker/API runtime settings, telemetry and rate-limit knobs                                              | Keeps agent stacks reproducible across local, CI, and production-like environments                             | Config profile presets and secret-management guidance                               |
| Telemetry Layer         | `packages/telemetry`         | Pino logger, buffered telemetry emitter, async log context, tracing helpers, trace/log correlation                                                | Makes it possible to debug agent execution across API and worker boundaries                                    | Full collector/export pipeline and broader runtime instrumentation                  |
| API Control Plane       | `apps/api`                   | Fastify API with typed routes, async queue enqueue, request IDs, rate limiting, OpenAPI, webhook/admin surfaces                                   | Gives agents and operators a clear remote control surface                                                      | Versioned API strategy, RBAC, deeper pagination/filtering                           |
| Worker Control Plane    | `apps/worker`                | BullMQ processors for quote, route, policy, execute, simulation, reconciliation, metrics, webhook delivery, anchor workflows                      | Delivers durable and replayable execution instead of fragile synchronous flow                                  | Worker modularization and more isolated processors                                  |
| Dashboard               | `apps/dashboard`             | Next.js V3 operator cockpit with role-aware shell, command center, agent/policy/simulation/backtest foundations, and tenant/exec surfaces         | Gives operators visibility into executions, routes, wallets, anchors, policy packs, agents, and platform state | Mutation UX, trace links, durable backtests, and deeper operational drill-downs     |
| Docs Bundle             | `apps/docs`                  | Static multi-page docs bundle with getting started, architecture, adapter, policy, and operations guides                                          | Makes external adoption possible without hand-held onboarding                                                  | Hosted docs site, search, API reference synchronization                             |
| MCP Surface             | `apps/mcp`                   | Model Context Protocol server for oracle and agent tooling workflows                                                                              | Opens a path for LLM-driven operator and agent workflows                                                       | Broader tool coverage and stronger operational playbooks                            |
| Examples                | `examples/*`                 | Runnable examples for route inspection, simulation, paper trading, rebalancing, oracle flows, and mock live runs                                  | Shows developers how to build real agents on top of the stack                                                  | More opinionated flagship agents and corridor-specific templates                    |
| Integration Harness     | `packages/integration-tests` | Real Postgres/Redis-backed e2e harness with in-process API/worker, webhook receiver, route and pipeline tests, API hardening checks               | Provides system-level confidence instead of only unit-level confidence                                         | CI adoption, load testing, chaos/failure scenario coverage                          |

## What Makes The SDK Distinct

### 1. Durable Agent Execution, Not Just Agent Orchestration

Most agent frameworks stop at task planning, prompts, or in-memory workflow orchestration.

This SDK gives agents:

- durable intent records
- queue-backed execution stages
- auditable route and policy decisions
- persisted executions and simulations
- event fanout and delivery tracking

That makes it suitable for real movement of value rather than just “assistant behavior.”

### 2. Explainable Routing With Real Market Structure

The router does not just pick the lowest fee venue. It can:

- discover intermediate paths
- score routes with weighted factors
- incorporate operator health and settlement behavior
- expose route adjustments explicitly

That is a meaningful advantage for autonomous payment and trading agents.

### 3. Policy As A First-Class SDK Surface

The policy engine now behaves like a platform primitive rather than a hardcoded checklist:

- developers can register rules
- rules can carry typed config
- rules can be enabled or disabled
- rules can be composed into higher-order policy bundles

That is exactly the kind of surface enterprise or corridor-specific agent builders need.

### 4. Keeta-Native, Not Generic

The system is built around Keeta concerns:

- native transfer support
- Keeta-aware policy hints
- chain health reads
- oracle-assisted flows
- anchor bond lifecycle and verification seams

That gives the SDK a focused identity instead of generic agent infrastructure with chain branding added later.

## Agent Builder Journey

An external agent builder can now reasonably follow this journey:

1. Install or import the SDK client from `packages/sdk`
2. Register adapters or use a provided registry
3. Create wallets and intents
4. Request quote, route, policy, and simulation steps
5. Attach custom rules and policy compositions
6. Subscribe to SSE or webhooks for state changes
7. Execute live or simulated intent flows
8. Inspect results, route plans, audit events, and webhook delivery state

That is the backbone of a credible external SDK.

## Operator Journey

Operators can now:

1. Register and manage anchors
2. Reconcile bond and onboarding state
3. Inspect route and execution outcomes
4. Monitor queue-driven system behavior
5. Subscribe external systems through signed webhooks
6. Use the `/dashboard` cockpit, command center, and live event stream to monitor activity
7. Review policy-pack coverage, agent assignments, simulation setup, and backtest foundations

This matters because real agents need a real operating surface, not just developer APIs.

## Readiness By Dimension

### Already Strong

- Core pipeline
- Type safety
- Routing
- Events and async delivery
- Extensibility
- SDK ergonomics

### Now Meaningfully Upgraded

- Testing and verification
- Observability foundations
- Production hardening
- Documentation
- Policy engine expressiveness

### Still Frontier, Not Failure

- Full OpenTelemetry deployment story
- On-chain bond proof
- More live integration adapters beyond the current two

### Adapter status (honest read)

Routing topology, policy gating, and the durable pipeline are real and live.
**Live venue liquidity** today comes from two adapters:

- `@keeta-agent-stack/adapter-keeta-transfer` — native KTA transfers via the
  worker's signing path.
- `@keeta-agent-stack/adapter-oracle-rail` — KTA Oracle for quotes plus a
  configurable HTTP partner rail (CCTP-style) for execution.

Everything else under `packages/adapter-*` is a synthetic mock used in tests
and demos (`mock-dex`, `mock-anchor`, `mock-cex`), a stub that quotes and
simulates but cannot execute live (`solana-stub` — `execute` throws
`SolanaNotImplementedError`), or a starting point for new venues
(`adapter-template`). The
[capability matrix](./capability-matrix.md#rails--adapters) has the
per-adapter breakdown.

## What Would Make It Feel Groundbreaking

The SDK is already serious. To make it feel unmistakably category-defining, the next steps should focus on visible leverage:

### Public Developer Experience

- publish `@keeta-agent-stack/sdk`
- host the docs site
- add copy-paste agent templates for key use cases

### Signature Use Cases

- cross-corridor payment agent
- treasury rebalance agent
- compliance-aware quote-and-execute agent
- anchor routing optimizer using live operator health

### Production Proof

- full OTLP collector example
- production deployment reference
- CI-backed integration gates
- public-facing stability story

### Deeper Keeta Differentiation

- on-chain bond verification when available
- richer Keeta-native receipt and identity signals
- more first-class Keeta strategy patterns

## Bottom Line

The repo now qualifies as a full agent SDK platform because it has:

- a developer-facing client
- a typed shared contract system
- pluggable execution intelligence
- durable control plane services
- event delivery infrastructure
- real operational surfaces
- system-level verification

The remaining work is mostly about making the platform easier to adopt, easier to showcase, and harder to mistake for anything less than a category-level product.
