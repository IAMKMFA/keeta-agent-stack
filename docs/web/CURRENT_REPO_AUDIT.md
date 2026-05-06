# Current Repo Audit — Phase 1 (Website)

> Snapshot of the existing `keeta-agent-stack` monorepo as observed before any Phase 1 website code
> lands. Every path, package name, script, and config flag in this file was read directly from the
> repo on the day this document was written. Future website phases must treat this audit as the
> source of truth for what already exists and what they may safely depend on.
>
> **No source code outside `docs/web/` was modified to produce this document.**

---

## 1. Repository Identity

- Root `package.json` name: `keeta-agent-stack` (private, type `module`).
- Package manager pin: `pnpm@9.15.4`.
- Module graph: `pnpm-workspace.yaml` declares `apps/*`, `packages/*`, `examples/*`, `templates/*`.
- Build orchestrator: `turbo` (`turbo.json` at repo root, version `^2.3.3`).
- TypeScript base: `tsconfig.base.json` — `target: ES2022`, `module: NodeNext`, strict mode on,
  `noUncheckedIndexedAccess`, `declaration`, `declarationMap`, `sourceMap`, `noUnusedLocals`,
  `noUnusedParameters`.
- Linter: ESLint flat config (`eslint.config.js`) extending `@eslint/js` recommended and
  `typescript-eslint` recommended, with global ignores for `dist`, `.next`, `node_modules`,
  `infrastructure/migrations`, and `next-env.d.ts`.
- Formatter: Prettier 3 (`.prettierrc`) — semi `true`, single quotes, print-width 100, ES5 trailing
  commas, `proseWrap: always`.
- License: Apache-2.0.

### Top-level scripts (root)

From `package.json`:

| Script                              | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                          | Runs `apps/api`, `apps/worker`, `apps/dashboard` via Turbo.               |
| `pnpm dev:all`                      | Same as `dev` plus `apps/mcp`.                                            |
| `pnpm dev:mcp`                      | Just MCP.                                                                 |
| `pnpm build`                        | `turbo run build` workspace-wide.                                         |
| `pnpm test`                         | `turbo run test`.                                                         |
| `pnpm test:integration`             | Runs the integration-tests package gated by `RUN_INTEGRATION_TESTS=true`. |
| `pnpm format` / `pnpm format:check` | Prettier.                                                                 |
| `pnpm lint` / `pnpm lint:security`  | ESLint and the dashboard's security lint.                                 |
| `pnpm typecheck`                    | `turbo run typecheck`.                                                    |
| `pnpm verify:agent`                 | Format → typecheck → lint → test → build → docs build → publint.          |
| `pnpm db:*`                         | Drizzle generate / migrate / migrate-down / seed via the storage package. |
| `pnpm demo`                         | `bash scripts/demo.sh`.                                                   |
| `pnpm docs:generate`                | Typedoc into `docs/typedoc/`.                                             |
| `pnpm docs:serve`                   | Alias to API dev (Swagger UI at `/docs`).                                 |
| `pnpm docs:publish`                 | Placeholder, requires hosting target.                                     |
| `pnpm publint:all`                  | Custom `scripts/publint-all.mjs`.                                         |

### Turbo task graph (`turbo.json`)

- `build` depends on `^build`, outputs `dist/**` and `.next/**` (excluding `.next/cache`).
- `test`, `typecheck` both depend on `^build`.
- `dev` is `cache: false`, `persistent: true`.
- `globalEnv` already declares the public-config and operational env vars used across the stack —
  including `NEXT_PUBLIC_API_URL`, `KEETA_NETWORK`, `KEETA_RUNTIME`, `LIVE_MODE_ENABLED`,
  `OPS_API_KEY`, `KEETA_SIGNING_SEED`, `MCP_ALLOW_INLINE_SEEDS`, and integration-test variables.

---

## 2. Apps Inventory

The repo already contains six apps. **`apps/web` and `apps/docs` both exist.** Phase 1 must not
assume otherwise.

### 2.1 `apps/api` (`@keeta-agent-stack/api`)

- Fastify 5 control plane with Swagger UI at `/docs`, OpenAPI snapshot served at
  `GET /openapi.json`.
- Stack: `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/cors`, `@fastify/rate-limit`,
  `bullmq`, `drizzle-orm`, `ioredis`, `jose`, `pino`, `prom-client`, `zod`.
- Build: `tsup` ESM. Dev: `tsx watch src/server.ts`. Default port 3001 (per Typedoc nav reference).
- Internal deps: `@keeta-agent-stack/adapter-registry`, `config`, `custody-guards`, `keeta`,
  `policy`, `storage`, `telemetry`, `types`.

### 2.2 `apps/worker` (`@keeta-agent-stack/worker`)

- Background executor and the **only canonical signing process** in the stack.
- Stack: `bullmq`, `drizzle-orm`, `ioredis`, `pg`.
- Internal deps include the Keeta package (`@keeta-agent-stack/keeta`), simulator, routing, policy,
  storage, telemetry, custody-guards, utils.
- Tests configured via `vitest`.

### 2.3 `apps/mcp` (`@keeta-agent-stack/mcp`)

- Model Context Protocol server (`@modelcontextprotocol/sdk` ^1.12.1).
- Internal deps: `custody-guards`, `keeta`, `policy`, `sdk`.
- Includes a long `TOOLS.md` documenting every exposed MCP tool.
- Has `scripts/dump-tools.ts` (`pnpm docs:tools`) for tool-schema export.

### 2.4 `apps/dashboard` (`@keeta-agent-stack/dashboard`)

- Next.js 15 + React 19 operator dashboard, port 3000.
- Tailwind 3, PostCSS, autoprefixer.
- App Router routes present today: `(authenticated)`, `adapters`, `anchors`, `api`, `executions`,
  `forbidden`, `intents`, `login`, `ops`, `routes`, `simulations`, `templates`, `wallets`.
- Tests via `vitest`. Has `scripts/check-duplicate-routes.ts` and `scripts/lint-security.ts` (latter
  is the canonical CI guard against `OPS_API_KEY` leakage and
  `NEXT_PUBLIC_*KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL` names).
- Hosts the SSE proxy at `app/api/events/stream/route.ts` that forwards `OPS_API_KEY` server-side as
  `x-ops-key` to the upstream API.

### 2.5 `apps/docs` (`@keeta-agent-stack/docs`)

- **Already exists.** Static documentation generator — `build.mjs` produces a multi-page docs site
  into `apps/docs/dist`, plus a static OpenAPI snapshot at `dist/openapi.json` via
  `scripts/snapshot-openapi.ts`.
- Lint/typecheck scripts are explicit no-ops (`node -e "console.log('skip')"`).
- This is **not** a Next.js app; do not conflate it with the future `apps/web` documentation
  surface.

### 2.6 `apps/web` (`@keeta-agent-stack/web`)

- **Already exists** as a minimal Next.js 15 + React 19 + Tailwind 3 marketing surface, port 3002.
- Current routes (App Router): `/`, `/agents`, `/connectivity`, `/ramps`, `/superswap`.
- Existing components (read-only inventory): `AnchorChip`, `ConnectivityTable`, `DemoBadge`, `Hero`,
  `Nav`, `PolicyDecisionCard`, `PresetSelector`, `RailChip`, `ReceiptDrawer`, `RouteBreakdownCard`,
  `RouteGraph`, `RouteModeToggle`, `SupportLevelBadge`, `SupportLevelLegend`.
- `lib/presets.ts` (~11 KB) builds three demo `ExecutionIntent` rows (`cross-chain-stable`,
  `fiat-on-ramp`, `agent-api-payment`) through the router and policy engine.
- `lib/sdk.ts` constructs an SDK client with `KEETA_AGENT_API_URL` (server-only env, falling back to
  `http://localhost:3001`).
- `next.config.ts` enables `transpilePackages` for adapter-base, adapter-keeta-transfer,
  adapter-mpp, adapter-pay-sh, adapter-registry, adapter-x402, policy, routing, sdk, types.
- Tailwind palette pre-defined: `graphite #080b0f`, `panel #10161c`, `line #21313a`,
  `keeta #44f1a6`, `cyanline #5ad7ff`. Dark color-scheme.
- The site **has no tests yet** and no Vitest config in `apps/web/`.
- The site reads no client-side env vars and has no `NEXT_PUBLIC_*` bindings today (confirmed by
  file scan of `apps/web/`).

> **Implication.** Phase 1's "scaffold `apps/web`" item is actually a **non-destructive evolution**
> of an existing shell, not a fresh scaffold. See `WEBSITE_BUILD_PLAN.md` for how this changes the
> touch list.

---

## 3. Packages Inventory (28 packages)

All under `packages/`. Names are `@keeta-agent-stack/<dirname>` unless noted. The website may
consume any of them via workspace protocol the same way `apps/web` already does today.

| Package                  | Role                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| `adapter-base`           | Shared adapter contract (transfer, dex, anchor) and conformance helpers. |
| `adapter-keeta-transfer` | Live native KTA transfers (signer terminates in worker).                 |
| `adapter-mock-anchor`    | Mock anchor venue for demos.                                             |
| `adapter-mock-cex`       | Mock CEX venue.                                                          |
| `adapter-mock-dex`       | Mock DEX venue.                                                          |
| `adapter-mpp`            | Multi-party-payment adapter.                                             |
| `adapter-oracle-rail`    | Partner-rail (CCTP-style) adapter.                                       |
| `adapter-pay-sh`         | Pay.sh integration.                                                      |
| `adapter-registry`       | Adapter discovery + factory + metadata.                                  |
| `adapter-solana-stub`    | Stub for forthcoming Solana support.                                     |
| `adapter-template`       | Boilerplate for new adapters.                                            |
| `adapter-x402`           | x402 (HTTP 402 / agent payments) adapter.                                |
| `agent-runtime`          | Long-running agent loop (factory + runtime).                             |
| `config`                 | Loads + validates env (`loadEnv`), gates `ALLOW_DEV_SIGNER` etc.         |
| `core`                   | Shared cross-cutting types.                                              |
| `custody-guards`         | Custody boundary, env classifier, runtime guards, redaction.             |
| `events`                 | Canonical event names + payload schemas.                                 |
| `integration-tests`      | End-to-end harness (`RUN_INTEGRATION_TESTS=true`).                       |
| `keeta`                  | Keeta SDK wrapper, signer registry, anchor bonds, oracle client.         |
| `policy`                 | Policy engine + packs + rules + selection.                               |
| `routing`                | Multi-hop router.                                                        |
| `sdk`                    | Typed REST client over `apps/api`.                                       |
| `simulator`              | Pre-execute simulator.                                                   |
| `storage`                | Drizzle schema + migrations + seed.                                      |
| `telemetry`              | Pino logger, OTEL tracing, redaction list.                               |
| `types`                  | Shared Zod schemas (`ExecutionIntent`, `NormalizedReceipt`, etc.).       |
| `utils`                  | Misc utilities.                                                          |
| `wallet`                 | Wallet helpers.                                                          |

Six of these (`sdk`, `keeta`, `agent-runtime`, `routing`, `policy`, `simulator`) carry an alpha
publish version (`0.1.0-alpha.0`) with proper `publishConfig.access: public`. The rest are private
(`0.0.1`).

---

## 4. Examples & Templates

- `examples/hello-agent` — minimal SDK consumer.
- `examples/agent-api-payment` — MPP + Keeta-transfer adapter wiring.
- `examples/mock-live-run` — adapter-registry + simulator combined.
- `examples/oracle-payment-playbook` — Keeta-package oracle playbook.
- `examples/paper-trader` — SDK paper-trade flow.
- `examples/rebalance-bot` — adapter-mock-dex rebalance demo.
- `examples/route-inspector` — routing + adapter-registry.
- `examples/simulation-fidelity` — simulator + routing.
- `examples/mcp-llm-integration.md` — written walkthrough.
- `templates/treasury-rebalancer/` — flagship public template (`keeta-treasury-rebalancer`, version
  `0.1.0`, with its own `tsconfig.json`).
- `starter-agent-template/` at the repo root — the standalone "fork this" starter (own
  `package.json`, `src/`, `scripts/`, `tsconfig.json`).

---

## 5. Existing Documentation

Located under `docs/`:

- `docs/README.md` — index.
- `docs/agent-build-handbook.md`
- `docs/agent-payment-rails.md`
- `docs/capability-matrix.md`
- `docs/creating-new-adapter.md`
- `docs/deployment.md`
- `docs/keeta-agent-stack.md`
- `docs/next-steps-roadmap.md`
- `docs/sdk-reference.md`
- `docs/typedoc/` — generated from `packages/{sdk,agent-runtime,types}/src/index.ts` per
  `typedoc.json`.
- `docs/plugins/` — exists; out of scope for this phase.
- `docs/security/CUSTODY_GUARD_AUDIT.md`
- `docs/security/SECRET_BOUNDARY_MAP.md`
- `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md` — pre-existing; Phase 1 retains it and adds the four new
  docs from the prompt plus `WEBSITE_SECURITY_CLAIMS.md` alongside it.
- `apps/dashboard/docs/dashboard-v2-contract.md` — operator contract.
- `apps/mcp/TOOLS.md` — MCP tool catalogue.

### Doc generation paths the website may link to

| Asset                 | Source command                                | Output path                          |
| --------------------- | --------------------------------------------- | ------------------------------------ |
| Typedoc HTML          | `pnpm docs:generate`                          | `docs/typedoc/`                      |
| Static docs site      | `pnpm --filter @keeta-agent-stack/docs build` | `apps/docs/dist/`                    |
| OpenAPI JSON snapshot | same as above                                 | `apps/docs/dist/openapi.json`        |
| Live OpenAPI          | `pnpm dev:all`                                | `http://localhost:3001/openapi.json` |
| Live Swagger UI       | same                                          | `http://localhost:3001/docs`         |

The Typedoc nav (`typedoc.json`) explicitly links to `https://github.com/IAMKMFA/keeta-agent-stack`
and the local OpenAPI URL.

---

## 6. Security Posture (Inputs to the Website)

The repository already encodes its security story machine-readably. The website may safely _link_ to
and _summarise_ (never paraphrase as absolutes):

- `SECURITY.md` — public security policy, signing-seed boundary, `MCP_ALLOW_INLINE_SEEDS` rationale,
  KMS instructions, kill-switch, rotation procedure, coordinated disclosure.
- `docs/security/CUSTODY_GUARD_AUDIT.md` — phased custody-guard plan.
- `docs/security/SECRET_BOUNDARY_MAP.md` — every env var mapped to runtimes and browser-safety
  classification.
- `packages/custody-guards/src/` — `custody-boundary.ts`, `env-classifier.ts`, `errors.ts`,
  `redact.ts`, `runtime.ts`, with associated tests.
- `apps/dashboard/scripts/lint-security.ts` — the canonical `NEXT_PUBLIC_*` guard (also planned for
  `apps/web`).
- `packages/telemetry/src/logger.ts` — `DEFAULT_REDACT_PATHS` list.
- `apps/api/src/lib/auth.ts` — `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, JWT enforcement.

The browser-safe env whitelist for any future Next.js app today is exactly:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE`

Anything else under `NEXT_PUBLIC_*KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL` must fail the security lint.
The website extension of that lint is currently **not yet wired** for `apps/web`.

---

## 7. CI / Quality Gates Already in Place

- `eslint.config.js` (root flat config) + per-package `eslint.config.mjs` where Next.js apps are
  involved.
- `pnpm verify:agent` is the canonical pre-PR command.
- `apps/dashboard/scripts/lint-security.ts` is the only security-flavored CI guard wired today.
- `apps/dashboard/scripts/check-duplicate-routes.ts` enforces unique App Router segments.
- `scripts/publint-all.mjs` runs `publint` across publishable packages.
- `.changeset/` — Changesets is configured for releases.
- `.github/workflows/` directory exists; not enumerated here because Phase 1 must not modify CI
  workflows.

---

## 8. What This Means for the Website

1. The user-facing **public site at `apps/web` already exists** and already imports
   adapter-registry, adapter-mpp, adapter-pay-sh, adapter-x402, adapter-keeta-transfer,
   adapter-base, policy, routing, sdk, and types directly. Future phases can keep this exact set.
2. **`apps/docs` is a separate static doc site**, not a Next.js app. The website's `/docs` page
   should link to `apps/docs/dist/`'s hosted output plus `docs/typedoc/` and the live OpenAPI URL —
   it should not try to render those in-app.
3. **The Tailwind palette and Next.js config are already established.** The future build plan should
   evolve the existing palette (`graphite/panel/line/keeta/cyanline`) rather than inventing a new
   one, and respect `outputFileTracingRoot` so monorepo path tracing keeps working.
4. **Security claims** must derive from `WEBSITE_SECURITY_CLAIMS.md` (this Phase 1 deliverable)
   which itself derives from `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md` and `SECURITY.md`.
5. **No private keys, signing seeds, `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, or any other
   admin-credential env may enter the website's client bundle.** The only permitted browser env vars
   are `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE`.

---

## 9. Conflicts with the Phase 1 Prompt

The prompt says "Create a premium public site at `apps/web` later, but this phase is documentation
only." `apps/web` already exists with five routes and fourteen components. **Phase 1 still produces
only documentation** — this is fully respected — but Phase 2's "scaffold" item must be reframed as
"evolve the existing scaffold". `WEBSITE_BUILD_PLAN.md` carries the reframing.

The prompt also references "apps/docs". `apps/docs` exists, but only as a static-output build
(`apps/docs/dist`), not a Next.js docs app. The website should **link** to its hosted output and to
`docs/typedoc/` and to the live `/openapi.json`, rather than embed or duplicate either.

No other conflicts.
