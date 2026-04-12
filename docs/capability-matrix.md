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
| Load persisted packs into runtime enforcement | No | No | No | Not Yet Surfaced | Biggest remaining policy gap |

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

| Capability | Backend/API | TypeScript SDK | MCP | Status | Notes |
|---|---|---|---|---|---|
| List adapters | Yes | Yes | No dedicated tool | Good | Backend returns `id` and `kind` |
| Adapter health | Yes | Partial | No | Partial | Backend route exists; can be promoted in SDK/MCP |
| Production vs mock labeling | Partial | Yes | Indirect | Good | SDK now clearly marks `mock-dex` and `mock-anchor` as non-production |
| Shared built-in rail metadata | No public route | Yes | Indirect | Good | Shared local registry metadata source |

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

- persisted policy packs need runtime activation/enforcement
- richer adapter metadata should eventually come from the backend, not only SDK-local mapping
- more Keeta-native primitives should graduate from dynamic MCP execution into typed SDK methods
- worker-scoped signing needs a clearer long-term custody story if the platform expands beyond the current model

## Recommended Summary For External Use

Use this wording when describing the platform publicly:

> Keeta Agent SDK now covers the full control-plane workflow across API, TypeScript SDK, and MCP, including intents, routing, policy preview and persistence, wallets, events, webhooks, anchors, oracle flows, and explicit production-vs-mock rail labeling.

Use this wording internally when discussing the frontier:

> The current platform is feature-complete for the main control-plane product surface, while deeper first-class coverage of lower-level Keeta network primitives and runtime policy-pack enforcement remain the next major upgrades.
