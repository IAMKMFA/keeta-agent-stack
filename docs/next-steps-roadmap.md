# Next Steps Roadmap

This roadmap turns the remaining platform gaps into a concrete engineering sequence.

The order matters. The goal is to deepen real platform leverage, not just add more wrappers.

## Current State

The Keeta Agent Stack is now strong across the core control-plane product surface:

- API capabilities are broadly represented in the TypeScript SDK
- the MCP layer now covers the main operator workflow
- wallet create/import flows are unified
- policy packs can be persisted
- rails/adapters are labeled with explicit production vs mock metadata

That means the next work should focus less on parity and more on platform maturity and differentiated power.

## Phase 1: Make Policy Packs Live

### Goal

Close the gap between persisted policy configuration and actual runtime enforcement.

### Why This Comes First

Right now policy packs can be created, updated, listed, and deleted, but they are not automatically loaded into the runtime policy decision path. That means the platform can manage policy packs, but not yet execute from them as a live source of truth.

### Deliverables

- define how a policy pack becomes active
- decide scope: global, per-strategy, per-wallet, or per-intent selection
- load selected pack rules and compositions into the policy engine before evaluation
- preserve current evaluation behavior when no pack is selected
- expose the effective pack identity in audit/events/policy results

### Definition of Done

- persisted packs can be selected and applied in live and simulated evaluation paths
- operators can tell which pack was used for a decision
- no breaking change to existing evaluation semantics

## Phase 2: Decide The Signing And Custody Model

### Goal

Make the platform’s wallet and execution story explicit for long-term production usage.

### Why This Is Critical

The current model is strong and safe for the existing product surface:

- imported wallets are metadata
- live signing is worker-scoped

That is a coherent model, but only if the product deliberately stays there. If the platform wants to support multiple managed signers or per-wallet execution identities, that is a larger custody system, not a small helper change.

### Decision Paths

#### Option A: Stay Metadata-First / Worker-Signed

- keep imported wallets as references
- keep execution signing worker-scoped
- document this clearly as the supported production model

#### Option B: Add Managed Multi-Wallet Signing

- define signer storage and encryption model
- map imported/generated wallets to execution signers
- add signer selection semantics to execution paths
- design audit, rotation, and secret-handling rules

### Recommendation

Start by explicitly documenting Option A as the supported model, then expand only if product requirements truly demand Option B.

## Phase 3: Promote Keeta-Native Primitives Into Typed Surfaces

### Goal

Graduate the highest-value lower-level Keeta capabilities from dynamic execution paths into clear public SDK methods.

### Why This Matters

Today, some deeper Keeta access is available through MCP dynamic execution tools. That is useful, but it is not the same as a polished, supported public interface.

### High-Value Candidates

- account inspection helpers
- asset inspection helpers
- transfer helpers
- safer builder/block publishing workflows
- Keeta-native receipt and account state queries

### Recommendation

Do not attempt full SDK mirroring of the entire upstream Keeta SDK in one pass. Start with the 20 percent of primitives that unlock 80 percent of real agent-builder workflows.

## Phase 4: Move Rail Metadata From Local SDK Knowledge To Backend Truth

### Goal

Make production/mock rail metadata uniformly available across backend, SDK, dashboard, and external clients.

### Why This Matters

The SDK now knows which built-in rails are production or non-production. That is a strong improvement, but the backend `/adapters` route still exposes only `id` and `kind`.

### Deliverables

- enrich backend adapter metadata response
- preserve backward compatibility for current clients
- use a shared metadata source where possible
- surface production readiness clearly in dashboard and docs

### Result

One source of truth for rail metadata instead of SDK-local interpretation.

## Phase 5: Finish The Remaining Operator-Facing MCP Surface

### Goal

Round out the MCP server so agents and operators can use the control plane with less surface-hopping.

### Good Candidates

- route override tool
- wallet balance tool
- chain health tool
- config modes tool
- ops metrics tool
- webhook deliveries tool
- policy pack management tools

### Principle

Prefer thin MCP wrappers over the typed SDK rather than direct HTTP calls.

## Phase 6: Productize The Public Developer Experience

### Goal

Make adoption feel deliberate, not just possible.

### Deliverables

- publish and version the SDK cleanly
- add hosted docs or a stronger docs bundle
- add copy-paste examples for flagship use cases
- make production vs mock capabilities unmistakable in docs

### Flagship Example Targets

- cross-corridor payment agent
- treasury rebalance agent
- compliance-aware quote-and-execute agent
- anchor routing optimizer

## Phase 7: Production Maturity Pass

### Goal

Make the system easier to trust in serious environments.

### Areas

- CI integration gating for full integration tests
- deployment references and environment profiles
- clearer operational runbooks
- stronger telemetry/export examples
- failure-mode and chaos coverage

## Recommended Priority Order

1. Runtime policy-pack enforcement
2. Explicit signing/custody decision
3. Typed Keeta-native primitive promotion
4. Backend rail metadata parity
5. Remaining MCP operator tools
6. Public docs/examples/package polish
7. Production maturity and runbook depth

## Short Version For Planning Meetings

If a team asks “what should we do next,” the answer should be:

1. make persisted policy packs actually govern runtime behavior
2. decide whether the platform stays worker-signed or becomes a managed signer platform
3. promote the most important Keeta-native primitives into typed public SDK methods

Those three steps will do more to define the next generation of the platform than any amount of shallow surface expansion.
