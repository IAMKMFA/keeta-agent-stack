# Capability Matrix

This document answers a practical question:

How much of the current Keeta Agent product surface is covered across the backend/API, the TypeScript SDK, and the MCP server?

It is intentionally precise. It describes what is first-class today, what is partially surfaced, and what still depends on lower-level or internal paths.

## Coverage Tiers

| Tier | Meaning |
|---|---|
| Strong | Available as a public backend/API capability and surfaced in the SDK and/or MCP in a clear typed/productized way |
| Good | Available publicly and surfaced in at least one primary client layer, but still missing parity or polish somewhere |
| Partial | Real capability exists, but it is not yet promoted into a strong first-class surface |
| Not Yet Surfaced | Underlying capability may exist internally or dynamically, but there is not yet a stable public product surface |

## Control Plane Coverage

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| Create intent | Yes | Yes | Yes | Strong | Core pipeline entrypoint |
| Quote intent | Yes | Yes | Yes | Strong | Queue-backed async stage |
| Route intent | Yes | Yes | Yes | Strong | Queue-backed async stage |
| Policy-stage enqueue | Yes | Yes | Yes | Strong | MCP tool uses existing pipeline semantics |
| Execute intent | Yes | Yes | Yes | Strong | Queue-backed execution stage |
| Hold intent | Yes | Yes | Yes | Strong | Operational intervention supported |
| Release intent | Yes | Yes | Yes | Strong | Resumes pipeline from current durable state |
| Approve intent | Yes | Yes | Yes | Strong | Admin approval path supported |
| Register route override | Yes | Yes | No dedicated tool | Good | API and SDK parity present |
| List route plans | Yes | Partial | No | Partial | Backend exists; not a dedicated primary SDK surface in this pass |
| List executions | Yes | Partial | No | Partial | Backend exists; SDK can still expand here |
| Run simulation | Yes | Yes | No dedicated tool | Good | SDK parity present |
| Get simulation result | Yes | Yes | No dedicated tool | Good | MCP can add a direct wrapper later |

## Wallet Coverage

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| List wallets | Yes | Yes | Indirect | Good | Strong SDK parity |
| Create wallet locally | No server requirement | Yes | Yes | Strong | Seed derived client-side |
| Create wallet server-side | Yes | Yes | Indirect | Good | Seed return is explicit and one-time |
| Import wallet address | Yes | Yes | Yes | Strong | Registers address metadata only |
| Unified create/import flow | Yes | Yes | Yes | Strong | Now consistent across REST/SDK/MCP |
| Get wallet balances | Yes | Yes | No dedicated tool | Good | SDK parity present |
| Multi-wallet managed signing | No | No | No | Not Yet Surfaced | Current signing remains worker-scoped |

## Policy Coverage

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| List policy rules | Yes | Yes | No dedicated tool | Good | Admin preview surface exists |
| Evaluate policy preview | Yes | Yes | No dedicated preview tool | Good | Separate from pipeline policy-stage enqueue |
| Persist policy packs | Yes | Yes | No | Good | CRUD now exists |
| `allOf` / `anyOf` / `not` composition | Yes | Yes | No | Strong | Reuses engine semantics |
| Load persisted packs into runtime enforcement | Yes | Yes | Indirect | Strong | Worker now resolves intent, wallet, strategy-compat, and global defaults before policy evaluation |

## Events and Webhooks Coverage

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| List events | Yes | Yes | Yes | Strong | Supports filters |
| Stream events via SSE | Yes | Yes | Yes, bounded collection | Good | MCP returns a bounded result, not an endless open stream |
| List webhooks | Yes | Yes | Yes | Strong | |
| Create webhook subscription | Yes | Yes | Yes | Strong | |
| Update webhook subscription | Yes | Yes | No dedicated tool | Good | |
| List webhook deliveries | Yes | Yes | No dedicated tool | Good | |

## Network / Ops Reads

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| Health | Yes | Yes | Indirect | Good | |
| Chain health | Yes | Yes | No dedicated tool | Good | |
| Config modes | Yes | Yes | No dedicated tool | Good | |
| Strategy templates | Yes | Yes | No dedicated tool | Good | |
| Ops metrics | Yes | Yes | No dedicated tool | Good | |

## Anchors and Oracle

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| List/get/create/update anchors | Yes | Yes | Yes | Strong | |
| Update anchor status | Yes | Yes | Yes | Strong | |
| Update anchor bond | Yes | Yes | Yes | Strong | |
| Reconcile bonds | Yes | Yes | Yes | Strong | |
| Run onboarding | Yes | Yes | Yes | Strong | |
| Oracle status/tools/rates/compare | Yes | Yes | Yes | Strong | |
| Oracle payment planning | Yes | Yes | Yes | Strong | |

## Rails / Adapters

> **Adapter honesty caveat**: routing topology is live, but venue liquidity
> today comes from **two integration adapters** (`keeta-transfer`, native;
> `oracle-rail`, HTTP partner). Everything else is either a synthetic mock
> useful for development, a stub that quotes and simulates but cannot
> execute live, or a template you copy and fill in. See the per-adapter rows.

| Adapter / Capability | Status | Notes |
|---|---|---|
| `@keeta-agent-sdk/adapter-keeta-transfer` (native KTA) | **Live** | Real native KTA transfers via `@keetanetwork/keetanet-client` 0.16.x. Signing happens in `apps/worker`. |
| `@keeta-agent-sdk/adapter-oracle-rail` (HTTP partner) | **Live (with config)** | KTA Oracle for quotes; configurable live CCTP-style URL for execution. Set `ORACLE_RAIL_*` env vars before flipping `mode: 'live'`. |
| `@keeta-agent-sdk/adapter-mock-dex` | **Synthetic** | Used by `examples/paper-trader` and the integration harness. Not a real venue. |
| `@keeta-agent-sdk/adapter-mock-anchor` | **Synthetic** | Mock anchor venue. Used in tests and demos. |
| `@keeta-agent-sdk/adapter-mock-cex` | **Synthetic** | In-memory CLOB-style adapter. Disabled unless `KEETA_ENABLE_MOCK_CEX=true`. Quote + simulate + live (in-memory balances) all real, but balances are ephemeral. |
| `@keeta-agent-sdk/adapter-solana-stub` | **Stub (simulate only)** | Quote + simulate work for routing demos. `execute(mode='live')` throws `SolanaNotImplementedError`. Disabled unless `KEETA_ENABLE_SOLANA_STUB=true`. |
| `@keeta-agent-sdk/adapter-template` | **Boilerplate** | `execute` throws `NotImplementedError`. Copy this when integrating a real venue. See [`docs/creating-new-adapter.md`](./creating-new-adapter.md). |
| List adapters | Strong | `GET /adapters`; SDK `listAdapters()` |
| Adapter health | Good | Backend route exists; SDK has `partial` exposure |
| Shared built-in rail metadata | Good | Local registry metadata source; SDK `listRailCatalog()` / `filterRailCatalog()` |
| Enumerated fiat-push / fiat-pull / crypto rails (UAE, CAD, Plaid, PULL) | Good | Backed by `@keetanetwork/anchor` 0.0.58 enum surface |
| Anchor chaining (resolveAssets / pathOwner / distance) | Good | MCP tools `keeta_anchor_chaining_*`. Require server-held seed unless `MCP_ALLOW_INLINE_SEEDS=true`. |

## Keeta Network Primitive Coverage

| Capability Class | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| Lower-level Keeta client methods | No public typed API | Limited | Yes, dynamic execution tools | Partial | Available through dynamic MCP execution rather than broad typed product surfaces |
| User client / builder workflows | No public typed API | Limited | Yes, dynamic execution tools | Partial | Useful, but not yet the polished “first-class” path |
| Native transfer via worker | Yes | Indirect | Indirect | Good | Strong as a system capability, but not fully generalized as a public signing model |
| Full typed surface over underlying Keeta SDK | No | No | No | Not Yet Surfaced | Future platform expansion |

## What Is Fully Strong Today

The platform is strongest in these areas:

- durable intent orchestration
- wallet registration flows
- core operator lifecycle controls
- eventing and webhook infrastructure
- anchor management
- oracle-assisted flows
- control-plane parity between API, SDK, and MCP for the main operator workflow

## What Is Real But Still Needs Productization

- richer operator controls around global default policy-pack management can still improve usability
- richer adapter metadata should eventually come from the backend, not only SDK-local mapping
- more Keeta-native primitives should graduate from dynamic MCP execution into typed SDK methods
- worker-scoped signing needs a clearer long-term custody story if the platform expands beyond the current model

## Recommended Summary For External Use

Use this wording when describing the platform publicly:

> Keeta Agent SDK now covers the full control-plane workflow across API, TypeScript SDK, and MCP, including intents, routing, policy preview and persistence, wallets, events, webhooks, anchors, oracle flows, and explicit production-vs-mock rail labeling.

Use this wording internally when discussing the frontier:

> The current platform is feature-complete for the main control-plane product surface, while deeper first-class coverage of lower-level Keeta network primitives and expanded operator controls remain the next major upgrades.

## Dashboard V2 Surface (2026 refresh)

| Surface | Backend API | Dashboard Route | Role Gate | Capability Gate | Status |
|---|---|---|---|---|---|
| Viewer identity | `GET /me` | n/a | any authenticated | — | Strong |
| Role-based home redirect | — | `/` | any authenticated | — | Strong |
| Operator Command Center | existing ops APIs + `/ops/kill-switch` | `/command-center` | admin, operator | `ops:read` (+ `kill_switch:write` to mutate) | Strong |
| Live Execution Stream | `/events/stream` via hardened proxy | `/live` | admin, operator | `ops:read` | Strong |
| Policy Insights | `GET /policy/decisions` | `/policy` | admin, operator | `policy:read` | Strong |
| Anchor & Bond Health | `GET /anchors/health` | `/anchors-health` | admin, operator | `ops:read` | Strong |
| Webhook Deliveries | `GET /ops/webhooks`, `/ops/webhook-deliveries` | `/webhooks` | admin, operator | `webhooks:read` | Strong |
| Cost & Fees Analytics | `GET /ops/fees/aggregate` | `/cost` | admin, operator | `ops:read` | Good (in-memory agg; materialization planned) |
| Exec Overview | existing execution/anchor APIs | `/overview` | admin, operator, exec | `exec:read` | Strong |
| Tenant Home | tenant-scoped ops | `/home` | admin, operator, tenant | `tenant:read` | Strong |
| Rail Catalog | `GET /rails/catalog` | `/rails` | admin, operator, tenant, exec | `rails:read` | Strong |

### Security guarantees

- `OPS_API_KEY` never appears in the browser bundle, client props, logs, or
  browser requests. It is strictly a server-only service credential.
- No `NEXT_PUBLIC_DASHBOARD_V2`; rollout uses the server-only
  `DASHBOARD_V2_ENABLED` flag.
- All privileged dashboard routes are guarded at three layers: navigation
  (`lib/nav.ts`), Next layout groups (`requireRole` / `requireScope` /
  `requireTenantAccess`), and Fastify route handlers (explicit role checks).
- Tenant data is scoped on the backend; tenant viewers cannot reach
  operator/exec/global ops surfaces by URL or direct API call.
- Exec role has read-only access — no mutation controls rendered and no
  privileged capabilities granted.
- All fee aggregations redact wallet/customer identifiers at display.

