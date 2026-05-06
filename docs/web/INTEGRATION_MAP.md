# Website Integration Map — Phase 1

> Maps every public-facing **website section** to the **exact repo files, packages, and routes**
> that back it. Future website phases must edit only the website files (`apps/web/**` plus
> `packages/ui/**` and `packages/visualizer/**` once those exist) and **never** modify the mapped
> backend, package, or example sources to make a website page work.
>
> Every path below was confirmed in `CURRENT_REPO_AUDIT.md`.

---

## 1. Site Map (proposed routes on `apps/web`)

The five existing routes are kept intact. New routes land alongside them. **No existing route is
renamed or removed.**

Existing today (do not break):

- `/` — homepage with three preset routes.
- `/superswap` — swap demo.
- `/ramps` — ramp demo.
- `/connectivity` — connectivity table.
- `/agents` — agents demo.

New in future phases:

- `/product` — pillar overview.
- `/product/sdk`
- `/product/api`
- `/product/worker`
- `/product/dashboard`
- `/product/mcp`
- `/product/agent-runtime`
- `/product/routing`
- `/product/policy`
- `/product/simulator`
- `/product/events`
- `/product/keeta-adapter`
- `/security`
- `/docs` (link hub, not full docs site)
- `/examples` (catalogue) and `/examples/[slug]` (detail)
- `/templates` (treasury-rebalancer + starter-agent)
- `/changelog` (renders root `CHANGELOG.md`)
- `/contact` or `/community` (GitHub Discussions, Security Advisories)

---

## 2. Section → Repo Mapping

The table is the contract: future website phases may render and link these paths, but must not
modify them.

### 2.1 SDK client

| Field            | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Package          | `packages/sdk` (`@keeta-agent-stack/sdk`, `0.1.0-alpha.0`)                                   |
| Entry            | `packages/sdk/src/index.ts`                                                                  |
| Public surface   | `createClient` (already imported by `apps/web/lib/sdk.ts`).                                  |
| Tests            | `packages/sdk/src/client.test.ts`.                                                           |
| Typedoc entry    | Listed in `typedoc.json`.                                                                    |
| Website module   | `/product/sdk`. CTA links to repo `packages/sdk/README.md` and Typedoc.                      |
| Live demo source | Existing `apps/web/lib/presets.ts` already builds intents through SDK helpers — reuse as-is. |

### 2.2 API control plane

| Field            | Value                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| App              | `apps/api` (`@keeta-agent-stack/api`).                                                                                          |
| Entry            | `apps/api/src/server.ts` (`buildApiApp`).                                                                                       |
| Default port     | 3001 (per `typedoc.json` reference).                                                                                            |
| OpenAPI snapshot | `apps/docs/dist/openapi.json` (built by `apps/docs/scripts/snapshot-openapi.ts`).                                               |
| Live OpenAPI     | `GET /openapi.json` while `pnpm dev:all` runs.                                                                                  |
| Swagger UI       | `GET /docs` while `pnpm dev:all` runs.                                                                                          |
| Auth             | `apps/api/src/lib/auth.ts` (viewer/operator/admin).                                                                             |
| Website module   | `/product/api`. Links to OpenAPI snapshot and Swagger UI.                                                                       |
| Demo posture     | Website never calls `/ops/*` or admin routes from the browser. Read-only public endpoints only, gated by `NEXT_PUBLIC_API_URL`. |

### 2.3 Worker execution

| Field           | Value                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| App             | `apps/worker` (`@keeta-agent-stack/worker`).                                         |
| Entry           | `apps/worker/src/index.ts`, run loop in `apps/worker/src/run.ts`.                    |
| Signing surface | `packages/keeta/src/worker-bridge.ts` (`createSigningUserClient*`).                  |
| Reconciliation  | `apps/worker/src/run.ts` (anchor bond, executions, webhooks).                        |
| Kill switch     | Env `EXECUTION_KILL_SWITCH`, runtime check in `run.ts`.                              |
| Website module  | `/product/worker` and `/security` reference. The site **never** invokes worker code. |

### 2.4 Dashboard

| Field             | Value                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App               | `apps/dashboard` (`@keeta-agent-stack/dashboard`).                                                                                                      |
| Routes            | `(authenticated)`, `adapters`, `anchors`, `api`, `executions`, `forbidden`, `intents`, `login`, `ops`, `routes`, `simulations`, `templates`, `wallets`. |
| SSE proxy         | `apps/dashboard/app/api/events/stream/route.ts` (`x-ops-key` server-side).                                                                              |
| Security lint     | `apps/dashboard/scripts/lint-security.ts`.                                                                                                              |
| Operator contract | `apps/dashboard/docs/dashboard-v2-contract.md`.                                                                                                         |
| Website module    | `/product/dashboard` shows screenshots/anchored explanation. **No** linkable demo URL — the dashboard is operator-only.                                 |

### 2.5 MCP

| Field             | Value                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| App               | `apps/mcp` (`@keeta-agent-stack/mcp`).                                                                            |
| Entry             | `apps/mcp/src/index.ts`.                                                                                          |
| Tools             | Catalogue at `apps/mcp/TOOLS.md`.                                                                                 |
| Inline-seed gate  | `apps/mcp/src/tools/execute.ts`, `apps/mcp/src/tools/anchor-chaining.ts`, `MCP_ALLOW_INLINE_SEEDS=false` default. |
| Bootstrap helpers | `apps/mcp/src/tools/bootstrap.ts`.                                                                                |
| Website module    | `/product/mcp` summarises and links to `TOOLS.md` plus `examples/mcp-llm-integration.md`.                         |

### 2.6 Agent runtime

| Field          | Value                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Package        | `packages/agent-runtime` (`@keeta-agent-stack/agent-runtime`, alpha published).                                           |
| Entry          | `packages/agent-runtime/src/index.ts`.                                                                                    |
| Tests          | `factory.test.ts`, `runtime.test.ts`.                                                                                     |
| Website module | `/product/agent-runtime`. CTA points at `examples/hello-agent`, `examples/paper-trader`, `templates/treasury-rebalancer`. |

### 2.7 Routing

| Field          | Value                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Package        | `packages/routing`.                                                                                                            |
| Entry          | `packages/routing/src/router.ts`.                                                                                              |
| Tests          | `packages/routing/src/router.test.ts`.                                                                                         |
| Website module | `/product/routing`. The homepage `RouteGraph` already visualises router output for one preset — reuse, do not duplicate logic. |

### 2.8 Policy

| Field          | Value                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Package        | `packages/policy`.                                                                                        |
| Engine         | `packages/policy/src/engine.ts`.                                                                          |
| Pack runtime   | `packages/policy/src/pack-runtime.ts`.                                                                    |
| Pack selection | `packages/policy/src/policy-pack-selection.ts`.                                                           |
| Defaults       | `packages/policy/src/defaults.ts`.                                                                        |
| Rules          | `packages/policy/src/rules/`.                                                                             |
| Website module | `/product/policy`. The homepage `PolicyDecisionCard` already renders the engine's decision shape — reuse. |

### 2.9 Simulator

| Field             | Value                                 |
| ----------------- | ------------------------------------- |
| Package           | `packages/simulator`.                 |
| Entry             | `packages/simulator/src/simulate.ts`. |
| Companion example | `examples/simulation-fidelity/`.      |
| Website module    | `/product/simulator`.                 |

### 2.10 Events / Webhooks / Metrics

| Field            | Value                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| Events package   | `packages/events` (`names.ts`, `payloads.ts`).                                      |
| Webhook delivery | `apps/worker/src/run.ts` (HMAC `x-keeta-signature`).                                |
| Metrics          | `prom-client` in `apps/api`, gated by `METRICS_ENABLED` and `METRICS_REQUIRE_AUTH`. |
| Telemetry        | `packages/telemetry/src/{logger,emitter,tracing,context}.ts`.                       |
| Website module   | `/product/events` covers all three.                                                 |

### 2.11 Keeta adapter

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adapter        | `packages/adapter-keeta-transfer` (live native KTA transfers).                                                                                         |
| Underlying     | `packages/keeta/` (Keeta SDK wrapper, signer registry, anchor bonds, oracle client, transactions, balances, account).                                  |
| Tests          | `packages/adapter-keeta-transfer/src/contract.test.ts`, `packages/keeta/src/{anchor-bonds,oracle-client,oracle-playbook,transactions,wallet}.test.ts`. |
| Website module | `/product/keeta-adapter`.                                                                                                                              |

### 2.12 Examples — `examples/hello-agent`

| Field          | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Path           | `examples/hello-agent/`                                                   |
| Package name   | `@keeta-agent-stack/example-hello-agent` (private).                       |
| Entry          | `examples/hello-agent/src/index.ts` (run with `pnpm --filter ... start`). |
| Website module | Catalogue card on `/examples`; deep dive at `/examples/hello-agent`.      |

### 2.13 Treasury rebalancer template

| Field          | Value                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Path           | `templates/treasury-rebalancer/`                                                                                  |
| Package name   | `keeta-treasury-rebalancer` (private, `0.1.0`).                                                                   |
| Description    | "Flagship Keeta agent template that rebalances a treasury wallet against a target allocation on a fixed cadence." |
| Website module | `/templates`.                                                                                                     |

### 2.14 Security & custody-guard evidence

| Field           | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| Public policy   | `SECURITY.md`.                                                    |
| Custody package | `packages/custody-guards/`.                                       |
| Audit           | `docs/security/CUSTODY_GUARD_AUDIT.md`.                           |
| Boundary map    | `docs/security/SECRET_BOUNDARY_MAP.md`.                           |
| Claim map       | `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md`.                         |
| Website module  | `/security` — derived strictly from `WEBSITE_SECURITY_CLAIMS.md`. |

---

## 3. Data the Website May Read at Build Time

To keep "metrics" honest, build-time loaders should derive numbers from the repo **at build time**,
not from the live API. None of the loaders below should make network calls.

| Metric          | Source command                                                                             | Notes                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Adapter count   | Filesystem scan of `packages/adapter-*` (excluding `adapter-base` and `adapter-template`). | Equals 10 today: keeta-transfer, mock-anchor, mock-cex, mock-dex, mpp, oracle-rail, pay-sh, registry, solana-stub, x402. |
| Public packages | Glob `packages/*/package.json` filtered by `private !== true`.                             | Six today (sdk, keeta, agent-runtime, routing, policy, simulator).                                                       |
| Examples count  | Filesystem scan of `examples/*/package.json`.                                              | Eight runnable examples (excluding the `mcp-llm-integration.md` markdown).                                               |
| MCP tools count | Parse `apps/mcp/TOOLS.md`.                                                                 | Loader must be defensive — fall back to a fixed string if parsing fails.                                                 |
| Policy rules    | Glob `packages/policy/src/rules/*.ts`.                                                     |                                                                                                                          |
| Routing presets | Read `apps/web/lib/presets.ts` (already a known typed export).                             |                                                                                                                          |

If any loader fails at build time, the website must fall back to **neutral text** (e.g. "many
adapters") rather than a fabricated number or a broken build.

---

## 4. Live API Integration

Live API integration is **off by default** and behind a feature flag.

| Aspect               | Rule                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public env var       | `NEXT_PUBLIC_API_URL` (already in `globalEnv`).                                                                                                                                                                          |
| Server-only fallback | `KEETA_AGENT_API_URL` (already used by `apps/web/lib/sdk.ts`).                                                                                                                                                           |
| Feature flag         | `NEXT_PUBLIC_WEB_LIVE_MODE` (new, boolean, defaults `false`). When `false`, the website does not call the API at all.                                                                                                    |
| Allowed routes       | Read-only public routes only — never `/ops/*`, never `/policy/admin/*`, never anything that requires `OPS_API_KEY` or `ADMIN_BYPASS_TOKEN`.                                                                              |
| Failure mode         | If any live call fails (network, 4xx, 5xx), render the safe demo state instead and log a non-fatal warning.                                                                                                              |
| Disallowed env       | `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, `KEETA_SIGNING_SEED`, `KEETA_KMS_*`, `AUTH_JWT_SECRET`. None of these may ever appear in the website process — server or client. The future `apps/web` security lint enforces this. |

---

## 5. Documentation Surface for `/docs`

`apps/web` should not duplicate docs content. The `/docs` page is a **link hub** that points at:

1. The hosted output of `pnpm --filter @keeta-agent-stack/docs build` (`apps/docs/dist/index.html`)
   once published.
2. `docs/typedoc/` (Typedoc HTML output, generated by `pnpm docs:generate`).
3. The OpenAPI snapshot at `apps/docs/dist/openapi.json` (or the live API at `/openapi.json` and
   Swagger UI at `/docs` when running locally).
4. Curated GitHub-flavoured pages: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
   `docs/agent-build-handbook.md`, `docs/sdk-reference.md`, `docs/deployment.md`,
   `docs/creating-new-adapter.md`, `docs/capability-matrix.md`, `docs/next-steps-roadmap.md`,
   `apps/mcp/TOOLS.md`, `apps/dashboard/docs/dashboard-v2-contract.md`.

The website itself does not host the long-form docs and does not re-render Typedoc.

---

## 6. Things the Website Must Not Touch

Reaffirmed for clarity:

- It must not import `@keeta-agent-stack/keeta` signer surface (the
  `packages/keeta/src/worker-bridge.ts` and `packages/keeta/src/signer/` paths).
- It must not import `@keeta-agent-stack/storage` (server-only Postgres schema and migrations).
- It must not import `@keeta-agent-stack/telemetry` server outputs in client-bundled code.
- It must not introduce a new `NEXT_PUBLIC_*` env name matching the existing dashboard security
  regex (`/^NEXT_PUBLIC_.*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL).*$/i`).
- It must not call any admin route, kill-switch route, or policy-admin route from any code path that
  runs in the browser.

---

## 7. File-Level Touch Allowance for Future Phases

| Phase                                 | May create / edit                                                                       | May not touch            |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------ |
| 2 (apps/web evolution)                | `apps/web/**` only.                                                                     | Other apps and packages. |
| 3 (packages/ui)                       | New package `packages/ui/` (not yet created), `apps/web/**`.                            | Other apps.              |
| 4 (packages/visualizer)               | New package `packages/visualizer/`, `apps/web/**`, optional consumer in `packages/ui/`. | Other apps.              |
| 5+ (homepage, secondary pages, demos) | `apps/web/**`, `packages/ui/**`, `packages/visualizer/**`.                              | Other apps and packages. |
| 7 (tests/deployment)                  | `apps/web/**` test config, `.github/workflows/web*.yml` (only after explicit approval). | Other workflows.         |

If any future phase needs to touch backend code, **stop** and write a conflict note in `docs/web/`
instead.
