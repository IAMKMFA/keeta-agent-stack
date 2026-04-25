# Next Steps Roadmap

This roadmap turns the remaining platform gaps into a concrete engineering sequence. It reflects the
current `main` branch: policy packs are runtime-active, MCP control-plane parity is broad, and the
V3 dashboard cockpit foundation has landed.

## Current State

The Keeta Agent Stack is strong across the core control-plane product surface:

- API capabilities are broadly represented in the TypeScript SDK.
- MCP now covers the main operator workflow, including policy packs, wallets, chain/config reads,
  ops metrics, rails, events, and webhooks.
- Policy packs can be created, selected, assigned to strategies, inherited from wallet/global
  defaults, and applied during worker policy evaluation.
- Effective policy-pack identity is carried through intents, decisions, events, and execution
  results.
- Rails and adapters are labeled with explicit production vs mock metadata.
- The dashboard has a role-aware V3 cockpit, command center, agent surfaces, policy builder
  foundation, simulation lab, and backtest foundation.

That means the next work should focus less on parity and more on production trust, publication, and
differentiated Keeta-native depth.

## Phase 1: Lock The Signing And Custody Model

### Goal

Make the platform's wallet and execution story explicit for long-term production usage.

### Why This Comes First

The current model is coherent and safer than browser- or agent-held signing:

- imported wallets are metadata
- live signing is worker-scoped
- `KEETA_SIGNING_SEED` belongs only in the worker environment
- agents, SDK clients, dashboards, and MCP tools call the control plane rather than handling
  settlement secrets

This needs to be stated as a product decision before expanding into managed multi-wallet signing.

### Deliverables

- document worker-scoped signing as the supported production model
- define when a wallet row is metadata versus an execution signer
- publish seed rotation and incident-response guidance
- add tests or startup assertions that prevent signing material from reaching API, dashboard, or MCP
  processes
- create a separate design proposal if managed multi-wallet signing becomes a product requirement

## Phase 2: Promote Keeta-Native Primitives Into Typed Surfaces

### Goal

Graduate the highest-value lower-level Keeta capabilities from dynamic MCP paths into clear public
SDK/API methods.

### High-Value Candidates

- account inspection helpers
- asset inspection helpers
- transfer status and receipt helpers
- safer builder/block publishing workflows
- Keeta-native receipt and account-state queries

### Recommendation

Do not mirror the entire upstream Keeta SDK in one pass. Start with the small set of primitives that
unlock the most common agent-builder workflows, then document what remains intentionally
lower-level.

## Phase 3: Make Rail Metadata Backend-Authoritative

### Goal

Make production/mock rail metadata uniformly available across backend, SDK, dashboard, MCP, and
external clients from one source of truth.

### Deliverables

- keep `/rails/catalog` as the canonical public response
- enrich `/adapters` without breaking existing clients
- move any remaining SDK-local rail interpretation into shared metadata
- surface production readiness clearly in the dashboard and docs
- add regression tests that catch mismatched rail labels across API, SDK, and MCP

## Phase 4: Finish The V3 Operator Workflow

### Goal

Turn the cockpit foundation into a complete day-two operations surface.

### Deliverables

- implement the backend kill-switch mutation endpoint behind the existing dashboard CSRF/role guards
- add deeper agent detail drill-downs for recent intents, executions, policy pack assignment, and
  health
- turn the policy builder foundation into a mutation-capable editor for persisted packs
- define durable simulation/backtest job records instead of read-only setup shells
- add trace links from dashboard rows into logs/spans once the deployment has a collector target
- add Playwright persona tests for admin/operator/exec/tenant/unauthorized flows

## Phase 5: Productize The Public Developer Experience

### Goal

Make adoption feel deliberate, not just possible.

### Deliverables

- make the package-scope decision for `@keeta-agent-stack/*`
- run the first credentialed npm publish from the Changesets workflow
- enable or intentionally defer GitHub Pages with `ENABLE_GITHUB_PAGES=true`
- publish copy-paste examples for the flagship treasury rebalancer and common payment corridors
- add package provenance, release notes, and rollback guidance
- keep generated TypeDoc and OpenAPI snapshots reproducible from documented commands

## Phase 6: Production Maturity Pass

### Goal

Make the system easier to trust in serious environments.

### Areas

- CI gating for the full integration suite
- deployment profiles for local, sandbox, and production
- operational runbooks for queues, webhooks, anchors, and policy packs
- stronger telemetry/export examples
- failure-mode and chaos coverage
- backup, restore, and migration rollback procedures

## Recommended Priority Order

1. Signing and custody model
2. Typed Keeta-native primitive promotion
3. Backend-authoritative rail metadata
4. V3 operator workflow completion
5. Public docs, package publish, and release operations
6. Production maturity and runbook depth

## Short Version For Planning Meetings

If a team asks "what should we do next," the answer should be:

1. decide and document the signing/custody model
2. promote the most useful Keeta-native primitives into typed public surfaces
3. finish the operator workflows that turn the V3 cockpit from visibility into action

Those steps will define the next generation of the platform more than another round of shallow
surface expansion.
