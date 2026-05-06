# Secret Boundary Map — Phase 0A

> Companion to [`CUSTODY_GUARD_AUDIT.md`](./CUSTODY_GUARD_AUDIT.md). Lists every env var with
> security weight, the runtimes that may legitimately read it, the runtimes that must never
> read it, and whether it is safe in browser bundles.

Legend:

- ✅ — runtime may read this var.
- ❌ — runtime must never read this var (signing material, admin credentials, partner secrets).
- — — runtime is irrelevant for this var (not applicable to its function).

`apps/web` is the public marketing site (Super Swap / Ramps / Connectivity / Agents). It is a
read-only Next.js app with no env access in source today; "❌" entries below are the
must-never-grow targets that future phases must respect.

## 1. Worker-Resident Signing Material

| Env Var                          | `apps/worker` | `apps/api` | `apps/dashboard` | `apps/mcp`                     | `apps/web` | Public-safe? | Browser-safe? | Mitigation notes                                                                                                                  |
| -------------------------------- | ------------- | ---------- | ---------------- | ------------------------------ | ---------- | ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `KEETA_SIGNING_SEED`             | ✅            | ❌         | ❌               | ⚠️ co-signer fallback          | ❌         | No           | No            | MCP usage is documented. Workspace import-lint should forbid `apps/api`, `apps/dashboard`, `apps/web` from importing signer surface. |
| `KEETA_KMS_PROVIDER`             | ✅            | ❌         | ❌               | ❌                             | ❌         | No (operational) | No        | Indicates which signer backend is selected. Combined with `KEETA_KMS_KEY` it implies KMS-backed signing.                          |
| `KEETA_KMS_KEY`                  | ✅            | ❌         | ❌               | ❌                             | ❌         | No           | No            | GCP Cloud KMS resource name. Even though it's not a private key, treat it as production secret material.                           |
| `KEETA_ACCOUNT_INDEX`            | ✅            | —          | —                | ⚠️ used only when seed is set  | —          | Operational  | No (don't ship) | Public-safe in isolation, but co-locating with seed/KMS hints at signing topology; keep server-side.                              |
| `GOOGLE_APPLICATION_CREDENTIALS` | ✅            | ❌         | ❌               | ❌                             | ❌         | No           | No            | Standard ADC path; not technically a secret but reveals trust topology.                                                            |

## 2. Service-Account Authentication & Admin Tokens

| Env Var                                  | `apps/worker` | `apps/api` | `apps/dashboard`       | `apps/mcp` | `apps/web` | Public-safe? | Browser-safe? | Mitigation notes                                                                                                                                       |
| ---------------------------------------- | ------------- | ---------- | ---------------------- | ---------- | ---------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPS_API_KEY`                            | —             | ✅         | ✅ (server-only)       | ✅         | ❌         | No           | No            | Dashboard SSE proxy (`apps/dashboard/app/api/events/stream/route.ts`) forwards as `x-ops-key`. CI lint blocks any `'use client'` reference. Never `NEXT_PUBLIC_*`. |
| `ADMIN_BYPASS_TOKEN`                     | —             | ✅         | ❌                     | ❌         | ❌         | No           | No            | Disabled in production unless `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION=true`. Only `apps/api/src/routes/policy-admin.ts` opts in via `allowAdminBypassToken`. |
| `AUTH_JWT_SECRET`                        | —             | ✅         | ❌                     | ❌         | ❌         | No           | No            | Symmetric HMAC. JWT secret rotation = forced re-issue.                                                                                                  |
| `AUTH_JWT_PUBLIC_KEY_PEM`                | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | No            | Public key, but exposing it has no benefit and lets attackers fingerprint the verifier.                                                                |
| `AUTH_JWT_JWKS_URL`                      | —             | ✅         | ❌                     | ❌         | ❌         | Yes (URL only) | No (don't ship) | Public URL; still server-only because the dashboard does not need to talk to the JWKS directly.                                                        |
| `AUTH_JWT_OIDC_DISCOVERY_URL`            | —             | ✅         | ❌                     | ❌         | ❌         | Yes (URL)    | No (don't ship) | Same as above.                                                                                                                                         |
| `AUTH_JWT_OIDC_ISSUER`                   | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | No (don't ship) | Same as above.                                                                                                                                         |
| `AUTH_JWT_ISSUER`                        | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | No (don't ship) | Same as above.                                                                                                                                         |
| `AUTH_JWT_AUDIENCE`                      | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | No (don't ship) | Comma-separated allow-list. Keep server-side.                                                                                                          |
| `AUTH_JWT_REMOTE_TIMEOUT_MS`             | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | Yes (no risk) | Pure tuning knob; listed for completeness.                                                                                                             |
| `AUTH_ALLOW_LEGACY_OPS_API_KEY`          | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | Yes (no risk) | Boolean toggle. Determines whether `x-ops-key` is honored outside dev/test.                                                                            |
| `AUTH_LEGACY_OPS_API_KEY_ROLE`           | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | Yes (no risk) | `operator` (default) or `admin`. Determines blast radius of legacy key.                                                                                 |
| `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION`  | —             | ✅         | ❌                     | ❌         | ❌         | Operational  | Yes (no risk) | Boolean toggle to allow `ADMIN_BYPASS_TOKEN` in `NODE_ENV=production`. Defaults to `false`.                                                              |
| `MCP_ALLOW_INLINE_SEEDS`                 | —             | —          | —                      | ✅         | ❌         | Operational  | No (don't ship) | Toggle that allows inline `seed` arguments to MCP tool calls. Default `false`. Set `true` only in dev MCP processes.                                   |

## 3. Public-Surface URLs and Tuning Knobs

| Env Var                                 | `apps/worker` | `apps/api` | `apps/dashboard` | `apps/mcp` | `apps/web` | Public-safe? | Browser-safe?            | Mitigation notes                                                                                                                                       |
| --------------------------------------- | ------------- | ---------- | ---------------- | ---------- | ---------- | ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`                   | —             | —          | ✅               | —          | ❌ today (would be ✅ if needed) | Yes      | ✅ (only safe `NEXT_PUBLIC_*`) | Documented as the only public env var the dashboard uses. CI lint blocks `NEXT_PUBLIC_*KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL` names.            |
| `API_URL`                               | —             | —          | ✅ (server-side fallback) | ✅ | —          | Yes          | No (don't ship)          | Server-side fallback used by the dashboard SSE proxy (`apps/dashboard/app/api/events/stream/route.ts`).                                                |
| `KEETA_AGENT_API_URL`                   | —             | —          | —                | ✅         | —          | Yes          | No (don't ship)          | MCP-only alias for `API_URL` resolution in `apps/mcp/src/tools/bootstrap.ts`.                                                                          |
| `NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE` | —        | —          | ✅               | —          | —          | Yes          | ✅                       | Template for explorer deep-links (e.g. `https://explorer.test.keeta.com/{hash}`). Non-secret.                                                          |
| `KEETA_EXPLORER_TX_URL_TEMPLATE`        | ✅            | —          | ✅ (server)      | —          | —          | Yes          | No (don't ship without `NEXT_PUBLIC_` prefix) | Worker injects the template into adapter receipts; dashboard reads at render time.                              |
| `KEETA_NETWORK`                         | ✅            | ✅         | ✅               | ✅         | ❌ today    | Yes          | ✅ (operational)         | `main` / `staging` / `test` / `dev`. Public-safe.                                                                                                      |
| `KTA_ORACLE_BASE_URL`                   | ✅            | ✅         | —                | ✅         | —          | Yes          | ✅                       | URL for KTA-Oracle integration.                                                                                                                        |
| `KTA_ORACLE_TIMEOUT_MS`                 | ✅            | ✅         | —                | ✅         | —          | Operational  | Yes                      | Pure tuning.                                                                                                                                           |

## 4. Operational Toggles & Feature Flags

| Env Var                                  | `apps/worker` | `apps/api` | `apps/dashboard` | `apps/mcp` | `apps/web` | Public-safe? | Browser-safe? | Mitigation notes                                                                                                |
| ---------------------------------------- | ------------- | ---------- | ---------------- | ---------- | ---------- | ------------ | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `LIVE_MODE_ENABLED`                      | ✅            | ✅         | ✅ (read-only display) | —    | —          | Operational  | Yes (boolean) | Worker uses to decide whether to materialise a signing client.                                                  |
| `ALLOW_DEV_SIGNER`                       | ✅            | ✅         | —                | —          | —          | Operational  | No (don't ship) | `loadEnv()` rejects `NODE_ENV=production && ALLOW_DEV_SIGNER=true` (`packages/config/src/index.ts`).             |
| `EXECUTION_KILL_SWITCH`                  | ✅            | ✅         | ✅ (read-only display) | —    | —          | Operational  | Yes (boolean) | Stops live execution at worker dequeue time.                                                                    |
| `KEETA_POLICY_ENABLED`                   | ✅            | ✅         | —                | —          | —          | Operational  | Yes           | Policy gate for Keeta hints.                                                                                    |
| `IDENTITY_POLICY_ENABLED`                | ✅            | ✅         | —                | —          | —          | Operational  | Yes           | Identity-metadata policy gate.                                                                                  |
| `ANCHOR_BOND_STRICT`                     | ✅            | ✅         | —                | —          | —          | Operational  | Yes           | Strict anchor-bond verification toggle.                                                                         |
| `MOCK_ADAPTERS`                          | ✅            | ✅         | ✅ (read-only display) | —    | ❌ today    | Yes          | Yes           | Dashboard uses for the "demo vs live" badge.                                                                    |
| `DASHBOARD_V2_ENABLED`                   | —             | —          | ✅               | —          | —          | Operational  | No (server-only by design) | Documented anti-pattern: do not expose as `NEXT_PUBLIC_*`.                                                       |
| `DASHBOARD_DEV_VIEWER_ROLE`              | —             | —          | ✅ (dev only)    | —          | —          | No           | No            | Local override; ignored in production.                                                                          |
| `METRICS_ENABLED`                        | ✅            | ✅         | —                | —          | —          | Operational  | Yes           | Prometheus exposition toggle.                                                                                   |
| `METRICS_REQUIRE_AUTH`                   | ✅            | ✅         | —                | —          | —          | Operational  | Yes           | Whether `/metrics` requires operator/admin auth.                                                                |
| `OTEL_ENABLED`, `OTEL_*`                 | ✅            | ✅         | —                | —          | —          | Operational  | Yes           | Tracing configuration.                                                                                          |

## 5. Logging & Redaction

| Env Var                          | `apps/worker` | `apps/api` | `apps/dashboard` | `apps/mcp` | `apps/web` | Public-safe? | Browser-safe? | Mitigation notes                                                                                                                                                              |
| -------------------------------- | ------------- | ---------- | ---------------- | ---------- | ---------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                      | ✅            | ✅         | ✅               | ✅         | —          | Operational  | Yes           | Pure operational knob.                                                                                                                                                         |
| `LOG_REDACT_EXTRA`               | (documented)  | (documented) | (documented) | (documented) | —      | Operational  | Yes (boolean-shaped) | **Documentation drift.** `.env.example`, `SECURITY.md`, and `docs/deployment.md` reference this name, but `packages/telemetry/src/logger.ts` reads `TELEMETRY_EXTRA_REDACT_PATHS`. See P1 in `CUSTODY_GUARD_AUDIT.md`. |
| `TELEMETRY_EXTRA_REDACT_PATHS`   | ✅            | ✅         | ✅               | ✅         | —          | Operational  | No (don't ship list verbatim) | Actual env var read by the pino factory. Phase 0B should pick one canonical name.                                                                                              |

## 6. Database / Cache / Queues

| Env Var                                  | `apps/worker` | `apps/api` | `apps/dashboard` | `apps/mcp` | `apps/web` | Public-safe? | Browser-safe? | Mitigation notes                                                                                              |
| ---------------------------------------- | ------------- | ---------- | ---------------- | ---------- | ---------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                           | ✅            | ✅         | —                | —          | —          | No           | No            | Postgres DSN with credentials.                                                                                |
| `REDIS_URL`                              | ✅            | ✅         | —                | —          | —          | No           | No            | Redis/BullMQ URL.                                                                                             |
| `INTEGRATION_DATABASE_URL`               | ✅ (CI/test)  | ✅ (CI/test) | —              | —          | —          | No           | No            | Integration-test scaffolding.                                                                                 |
| `INTEGRATION_REDIS_URL`                  | ✅ (CI/test)  | ✅ (CI/test) | —              | —          | —          | No           | No            | Integration-test scaffolding.                                                                                 |
| `INTEGRATION_OPS_API_KEY`                | —             | ✅ (CI/test) | —              | —          | —          | No           | No            | Tests-only OPS key.                                                                                           |

## 7. Webhooks & Partner Rails

| Env Var                          | `apps/worker` | `apps/api` | `apps/dashboard` | `apps/mcp` | `apps/web` | Public-safe? | Browser-safe? | Mitigation notes                                                                                  |
| -------------------------------- | ------------- | ---------- | ---------------- | ---------- | ---------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------- |
| Per-subscription webhook secret  | ✅            | ✅         | —                | —          | —          | No           | No            | Stored in DB (`webhookRepo`); HMAC'd into the `x-keeta-signature` header at delivery time.        |
| `ORACLE_RAIL_CCTP_LIVE_URL`      | ✅            | ✅         | —                | —          | —          | Operational  | No (don't ship) | Partner endpoint URL for `adapter-oracle-rail`. Not secret per se but reveals operator topology. |

## 8. Browser-Safe Whitelist (for `apps/dashboard` and future `apps/web`)

The only env vars that may legitimately appear in a browser bundle today:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE`

CI guard: `apps/dashboard/scripts/lint-security.ts` — forbids any `NEXT_PUBLIC_*` env name
matching `KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL`. The same lint must be wired into `apps/web`
when that app starts reading env vars.

## 9. Co-Location Risks

The two highest-leverage co-location patterns to watch:

1. **MCP host + `KEETA_SIGNING_SEED`.** Documented and intentional, but operators should treat
   the MCP host as a co-signer if they enable this. Recommended: deploy MCP **without** the seed
   in env (use the worker as the executor and have MCP call worker-fronted control-plane tools
   instead of native signing tools). The `apps/mcp/fly.toml` reference deployment intentionally
   does **not** set the seed.
2. **Dashboard server runtime + `OPS_API_KEY`.** The dashboard server holds `OPS_API_KEY` to
   proxy upstream calls. The CI lint, the SSE proxy, and `lib/api.ts` all enforce server-only
   reads, but operators must not export the same env to the client bundle (the lint rejects
   any `NEXT_PUBLIC_OPS_*` var explicitly).
