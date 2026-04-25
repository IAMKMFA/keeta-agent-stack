# Changelog

All notable changes to the Keeta Agent Stack are documented here. Subsequent entries are managed by
[Changesets](https://github.com/changesets/changesets): `pnpm changeset` to record an intent,
`pnpm release` to cut versions and tags (automated in
[`.github/workflows/release.yml`](./.github/workflows/release.yml)).

## Unreleased

### Dashboard (Epic V3 — cockpit foundation)

- Operator/admin home is `/dashboard` (`roleHome` for admin/operator); aggregates use
  `GET /ops/dashboard-summary` (operator API auth).
- Added read-only agent surfaces: `/agents`, `/agents/[id]` backed by `GET /ops/agents` and
  `GET /ops/agents/:id`; Policy Builder shell at `/policy/builder`; Simulation Lab at `/simulate`;
  backtest foundation at `/backtest`.
- Shell: collapsible sidebar and nav search; `ActivityFeed` for compact home activity. See
  `apps/dashboard/README.md` and `apps/dashboard/docs/dashboard-v2-contract.md` for the updated
  route and API map.
- Storage: `strategyRepo.listStrategies` for repository consumers.

### Hosted sandbox & flagship template

- Added a multi-stage [`Dockerfile`](./Dockerfile) that builds slim images for any of `api`,
  `worker`, or `mcp` from a single context.
- Added [`docker-compose.prod.yml`](./docker-compose.prod.yml) for one-command prod-shaped local
  stacks, with sensible read-only defaults (`KEETA_NETWORK=test`, `MCP_ALLOW_INLINE_SEEDS=false`,
  `OPS_API_KEY` required for control-plane mutations).
- Added Fly.io configs for the hosted sandbox: [`apps/api/fly.toml`](./apps/api/fly.toml),
  [`apps/worker/fly.toml`](./apps/worker/fly.toml), and [`apps/mcp/fly.toml`](./apps/mcp/fly.toml).
  Bootstrap and deploy commands are documented in
  [`docs/deployment.md`](./docs/deployment.md#hosted-sandbox-flyio).
- Added the flagship treasury rebalancer template under
  [`templates/treasury-rebalancer/`](./templates/treasury-rebalancer): a real drift-driven rebalance
  loop with a working `treasury-rebalancer` policy pack (caps, slippage, venue + asset allowlists,
  daily-trade and unsettled-execution gates), pinned to every emitted intent.

## 0.1.0-alpha.0 — pre-publish baseline

Publishable alpha baseline for the `@keeta-agent-stack/*` package family. The packages are versioned
at `0.1.0-alpha.0`, but the scope is not yet live on npm; the first external publish is gated on the
final package-scope decision and a credentialed release run.

### Distribution

- Prepared the SDK family for npm under `@keeta-agent-stack/*`: `sdk`, `agent-runtime`, `types`,
  `policy`, `keeta`, `routing`, `simulator`, `wallet`, `utils`, `config`, `adapter-base` (+
  `/contract` and `/conformance` subpaths), `adapter-registry`, `adapter-keeta-transfer`,
  `adapter-oracle-rail`, `adapter-template`, `adapter-mock-dex`, `adapter-mock-anchor`,
  `adapter-mock-cex`, `adapter-solana-stub`. Apps (`api`, `worker`, `dashboard`, `mcp`) remain
  private.
- Added Changesets, a `release` GitHub Actions workflow gated on `NPM_TOKEN`, and `pnpm publint:all`
  in CI to catch broken `exports`/`files` before a publish.
- Fixed an adapter-base packaging bug where the main barrel re-exported test helpers (`./contract`,
  `./conformance`), which forced `vitest` into every runtime consumer of `@keeta-agent-stack/sdk`.
  Test helpers are now subpath-only.

### Examples & docs

- New top-of-funnel example [`examples/hello-agent`](./examples/hello-agent): one file, real
  `createClient` factory, intent + quote in <30 lines.
- Auto-generated [`apps/mcp/TOOLS.md`](./apps/mcp/TOOLS.md) (81 tools, 9 modules) from the live Zod
  input schemas via `apps/mcp/scripts/dump-tools.ts`. CI fails if it's stale.
- Hosted [OpenAPI spec](./apps/docs/scripts/snapshot-openapi.ts) snapshot: `apps/docs` now ships the
  canonical 3.1 document from the API (45 paths, ~58 KB) instead of an abbreviated stub. GitHub
  Pages publication is wired through [`.github/workflows/pages.yml`](./.github/workflows/pages.yml)
  and gated by `ENABLE_GITHUB_PAGES=true`.

## 0.0.1 — pre-release scaffolding

The history below predates the alpha cut and was the working notes during the upstream-sync +
deep-audit refactor. Preserved for traceability.

### Phase 1 — Upstream dependency sync

- Bumped `@keetanetwork/keetanet-client` to `^0.16.1` across `packages/keeta` and `apps/mcp` so the
  SDK, worker, and MCP share a single client version.
- Bumped `@keetanetwork/anchor` in `apps/mcp` to `^0.0.58` (latest published on npm at time of
  writing; `0.0.59` is on GitHub only and will be picked up in a follow-up).
- Audited `AccountInfo` union changes (now a discriminated union rather than a nullable record) — no
  call sites required refactors because existing reads access fields that are stable across the
  union variants.

### Phase 2 — Surface new upstream capabilities

- `packages/adapter-registry`
  - Added `RailTransport` ("fiat-push" | "fiat-pull" | "crypto") and `RailMetadataEntry` types, plus
    a built-in `RAIL_CATALOG` covering the new `FiatPushRails`, `FiatPullRails`, and `CryptoRails`
    exposed by `@keetanetwork/anchor` 0.0.58 (UAE, CAD, Plaid, PULL).
  - Added `listBuiltinRailMetadataDetailed()` and `listBuiltinRailsByTransport()` with unit tests.
- `packages/types`
  - `ExecutionResultSchema` now carries optional `pathOwner`, `pathLength`, and `resolvedAssets`
    fields sourced from Anchor chaining's `resolveAssets` + path-owner responses.
  - `ExecutionIntentSchema` now supports `validationContext` and `additionalPrincipals` for the
    0.0.52/0.0.53 context-based validation + multi-principal features.
  - `AvailableRailSchema` carries the new `transport` and `supportsManagedTransfer` fields.
- `apps/mcp`
  - New `apps/mcp/src/tools/anchor-chaining.ts` exposes `keeta_describe_anchor`,
    `keeta_anchor_chaining_resolve_assets`, `keeta_anchor_chaining_list_assets`,
    `keeta_anchor_chaining_graph_nodes`, `keeta_anchor_chaining_find_paths`, and
    `keeta_anchor_chaining_introspect`. These go through the same `MCP_ALLOW_INLINE_SEEDS` gate as
    the existing execute tools (see Phase 3).
- `packages/sdk`
  - Added `listRailCatalog()` and `filterRailCatalog(transport)` SDK methods backed by the new
    registry metadata so agent callers can discover rails without scraping the API.

### Phase 3 — Security hardening

- **Dashboard ops key is no longer public**: `apps/dashboard/app/ops/page.tsx` now reads
  `OPS_API_KEY` (server-only) via a server component and disables static rendering. The previous
  `NEXT_PUBLIC_OPS_API_KEY` variable is gone — operators using the dashboard need to set
  `OPS_API_KEY` in the dashboard process environment only.
- **Policy-admin authz tightened**:
  - New env vars: `AUTH_LEGACY_OPS_API_KEY_ROLE` (default `operator`) restricts what the legacy
    `OPS_API_KEY` can do, and `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION` (default `false`) blocks
    `ADMIN_BYPASS_TOKEN` in production unless explicitly opted in.
  - Read-only policy routes now require `operator`; mutations still require `admin`.
  - `redactedEffectiveConfig()` replaces raw `effectiveConfig` in policy audit payloads so
    venue/asset allowlists and other operational state never leak to audit sinks.
- **MCP inline-seed hardening**: `apps/mcp/src/tools/execute.ts` and the new `anchor-chaining.ts`
  tools centralize seed resolution through `resolveSeedOrThrow()`. Inline `seed` arguments are
  rejected unless `MCP_ALLOW_INLINE_SEEDS=true` (dev only) — the worker falls back to the
  server-held `KEETA_SIGNING_SEED` in all other cases.
- **Secret-redacting logger**: `packages/telemetry` now configures pino with a
  `DEFAULT_REDACT_PATHS` list covering `seed`, `signingSeed`, `privateKey`, `apiKey`,
  `authorization`, and friends. `LOG_REDACT_EXTRA` lets operators extend the list per-env.
- **CI security-audit job**: `.github/workflows/ci.yml` now runs
  `pnpm audit --prod --audit-level high`, `google/osv-scanner-action`, and a Drizzle migration-drift
  check in a dedicated `security-audit` job (non-blocking, reported via annotations).

### Phase 4 — Worker decomposition + performance

- Consolidated `defaultPolicyConfig` into `@keeta-agent-stack/policy` as
  `defaultPolicyConfigFromEnv()`, removing duplicated env parsing between
  `apps/api/src/routes/policy-admin.ts` and `apps/worker/src/run.ts`.
- Added migration `0010_hot_path_indexes.sql` with btree indexes on `execution_intents(status)`,
  `execution_intents(wallet_id, created_at DESC)`, `executions(intent_id)`, and
  `policy_decisions(intent_id)`. Drizzle schema updated to declare the same indexes so future
  `drizzle-kit generate` runs stay consistent.
- Removed an N+1 in the execution-reconciliation worker: `readChainHealth()` is now fetched once per
  tick and the audit inserts happen in parallel via `Promise.all`.

### Phase 5 — Schema, types, and API polish

- Replaced `args as unknown as CreateIntentRequest` in the MCP `keeta_create_intent` tool with a
  derived `createIntentBodySchema.parse(args) satisfies CreateIntentRequest`, so runtime validation
  and static typing agree.

### Phase 6 — Tests, CI, tooling

- Aligned every `vitest` dev dependency (and `adapter-base`'s peer dep) on `^3.2.4` across all
  packages and apps.
- Added a `test` script to `apps/worker` and a `policy-defaults.test.ts` verifying the consolidated
  `defaultPolicyConfigFromEnv()` helper.
- Added `apps/mcp/src/tools/execute.test.ts` covering `inlineSeedsAllowed()` and
  `resolveSeedOrThrow()` across allowed/disallowed/fallback seed paths.
- Extended `turbo.json` `globalEnv` with Keeta- and security-relevant env vars so Turbo's cache
  invalidates when `KEETA_NETWORK`, `KEETA_SIGNING_SEED`, auth flags, or policy toggles change.

### Phase 7 — Docs + rollout

- `.env.example` documents the new `AUTH_LEGACY_OPS_API_KEY_ROLE`,
  `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION`, `MCP_ALLOW_INLINE_SEEDS`, and `LOG_REDACT_EXTRA`
  variables.
- Added this `CHANGELOG.md` with the full phase-by-phase summary.
- Added a docs index, governance links in the README, and GitHub issue / PR templates so the
  repository is easier to navigate and contribute to.
- Added `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE` cross-links so the
  public repository surface is complete and professional.
