# Custody & Signing Guard Audit — Phase 0A → 0B

> Read-only audit of the `keeta-agent-stack` repo. Originally produced under Phase 0A as a
> read-only document; updated under Phase 0B with an implementation-status section that records
> which findings have been addressed in code and which remain open. All un-marked findings are
> sourced from the `main`-tracked code, env contracts, and runtime configuration as of Phase 0A.

## 1. Executive Summary

The stack is structured around a **worker-only signing terminus**: the `apps/worker` process is
the only runtime that materialises a Keeta `UserClient` capable of signing and publishing blocks.
The API (`apps/api`), dashboard (`apps/dashboard`), public marketing site (`apps/web`), MCP server
(`apps/mcp`), and every `@keeta-agent-stack/*` package on npm are designed to drive execution
without holding signing material.

The worker resolves a `SignerProvider` via `packages/keeta`'s `resolveSigner(env)` helper, which
selects either `GcpKmsSigner` (BYOK via Google Cloud KMS) or `SeedSigner` (raw `KEETA_SIGNING_SEED`)
based on environment. The signing `UserClient` is then injected into adapters via the
`KEETA_USER_CLIENT_EXTENSION` symbol attached to `ExecuteContext.extensions`. Adapters never
read seed material directly; if the extension is absent the live execution path returns a typed
`KEETA_USER_CLIENT_MISSING` error.

Three real classes of risk remain:

1. **MCP fallback to `KEETA_SIGNING_SEED` from `process.env`.** The MCP server intentionally
   supports a server-pinned seed for `keeta_user_client_execute`, `keeta_builder_execute`,
   `keeta_anchor_execute`, and `keeta_anchor_chaining_*` so operators can run signing flows
   from outside the worker. This is documented and gated by `MCP_ALLOW_INLINE_SEEDS=false`,
   but every operator who deploys the MCP outside the worker host owns this exposure surface.
2. **Generated seeds returned in MCP tool transcripts.** `keeta_generate_seed` and
   `keeta_wallet_create_or_import` (with `include_seed=true`, the default) emit raw seeds
   in the tool's `text` content. Pino redaction does not apply to MCP transport payloads;
   transcripts that flow through agent runtimes, logs, or LLM providers will carry them.
3. **Documentation drift on the redact-paths env var.** `SECURITY.md`, `.env.example`, and
   `docs/deployment.md` reference `LOG_REDACT_EXTRA`. The actual `packages/telemetry` reader
   uses `TELEMETRY_EXTRA_REDACT_PATHS`. Operators who copy the documented variable will get
   no extra redaction, silently.

These are the items that should drive Phase 0B implementation. None of them undermines the
worker-only-signing core property; together they reduce the bite of an MCP host compromise and
prevent footguns when operators set up new environments.

## 2. Current Custody Model

| Layer                                       | Holds signing material? | Source of truth                                                                                                                                    |
| ------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/worker`                               | Yes (KMS or seed)       | `apps/worker/src/run.ts` calls `resolveSigner(env)` from `@keeta-agent-stack/keeta` and constructs `UserClient` only when `LIVE_MODE_ENABLED=true` |
| `apps/api`                                  | No                      | Only consumes JWT/`OPS_API_KEY`/`ADMIN_BYPASS_TOKEN` for auth; never imports `resolveSigner`/`createSigningUserClient`                             |
| `apps/dashboard`                            | No                      | Server-side proxy uses `OPS_API_KEY` via `x-ops-key` header to upstream API; no seed access                                                        |
| `apps/web`                                  | No                      | Public marketing site (Super Swap / Ramps / Connectivity / Agents); no env access to seeds, ops keys, or admin tokens                              |
| `apps/mcp`                                  | Conditional             | `process.env.KEETA_SIGNING_SEED` only; inline `seed` argument requires `MCP_ALLOW_INLINE_SEEDS=true`                                               |
| `packages/keeta`                            | Yes (lib)               | Houses `SeedSigner`, `GcpKmsSigner`, `resolveSigner`, `createSigningUserClient*`. Worker-only consumers in practice                                |
| `packages/adapter-keeta-transfer`           | No (live path)          | Receives a pre-built `UserClient` via `ExecuteContext.extensions[KEETA_USER_CLIENT_EXTENSION]`; refuses to run live without it                     |
| All other `@keeta-agent-stack/*` packages   | No                      | Adapter base, registry, routing, policy, simulator, storage, telemetry, types, sdk — none reference `KEETA_SIGNING_SEED`                           |

Worker boot path (`apps/worker/src/run.ts`):

1. `loadEnv()` parses `KEETA_NETWORK`, `LIVE_MODE_ENABLED`, `KEETA_SIGNING_SEED?`,
   `KEETA_KMS_PROVIDER?`, `KEETA_KMS_KEY?`, `KEETA_ACCOUNT_INDEX?`.
2. `createSigningGetter(env)` returns a memoised async getter.
3. The getter short-circuits with `null` whenever `LIVE_MODE_ENABLED=false`, so a misconfigured
   worker boots in safe mode and adapters get `extensions[KEETA_USER_CLIENT_EXTENSION] = undefined`,
   which `KeetaTransferAdapter.execute` rejects with the typed `KEETA_USER_CLIENT_MISSING` error.
4. On the first execution, the getter calls `resolveSigner(env)` →
   `createSigningUserClientFromSigner(env, signer)` and caches the resulting `UserClient`.
5. The signing client is passed into adapters via `extensions[KEETA_USER_CLIENT_EXTENSION]`
   — never serialised onto BullMQ jobs, audit rows, or webhook payloads.

KMS provisioning notes:

- `KEETA_KMS_PROVIDER=gcp` + `KEETA_KMS_KEY` selects `GcpKmsSigner`. Even if `KEETA_SIGNING_SEED`
  is also set, KMS wins (`packages/keeta/src/signer/resolve.ts`).
- `@google-cloud/kms` is an **optional peer dependency** of `@keeta-agent-stack/keeta`, installed
  only on the worker that needs KMS signing. The Keeta SDK's GCP KMS factory module is required
  via `createRequire` to keep it lazy.
- `GcpKmsSigner` rejects unsupported algorithms at lookup time (only ECDSA SECP256K1/SECP256R1).

## 3. Files That Touch Signing or Secret Material

### Signing seed and KMS key

| File                                                          | Role                                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/keeta/src/signer/seed-signer.ts`                    | Wraps `KeetaSDK.lib.Account.fromSeed(seed, accountIndex)`. Pure library, no env access on its own.     |
| `packages/keeta/src/signer/gcp-kms-signer.ts`                 | Lazy `@google-cloud/kms` loader + Keeta GCP KMS factory. Reads no env directly; takes resolved key.    |
| `packages/keeta/src/signer/resolve.ts`                        | Selects KMS vs seed based on `SignerEnv` shape. Throws if neither is configured.                       |
| `packages/keeta/src/worker-bridge.ts`                         | `createSigningUserClient(env)` and `createSigningUserClientFromSigner(env, signer)` wrappers.          |
| `apps/worker/src/run.ts`                                      | Only call site of `resolveSigner` and `createSigningUserClientFromSigner`; injects `UserClient` only.  |
| `apps/mcp/src/tools/execute.ts`                               | `resolveSeedOrThrow()` + `inlineSeedsAllowed()` gate; reads `process.env.KEETA_SIGNING_SEED`.          |
| `apps/mcp/src/tools/anchor-chaining.ts`                       | Duplicate inline-seed gate for chaining tools; reads `process.env.KEETA_SIGNING_SEED`.                 |
| `apps/mcp/src/tools/bootstrap.ts`                             | `keeta_generate_seed`, `keeta_derive_account`, `keeta_wallet_create_or_import` mint and return seeds. |
| `packages/keeta/src/signer/__tests__/{seed,resolve,gcp-kms-signer}.test.ts` | Unit tests covering signer construction, signer selection, and KMS error paths.        |

### Auth tokens (`OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, JWT)

| File                                          | Role                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/config/src/index.ts`                | Zod schema + `loadEnv` for every server env var; central definition.                                                          |
| `apps/api/src/lib/auth.ts`                    | JWT verification (HS, RS via PEM, JWKS, OIDC discovery), legacy `x-ops-key`, `x-admin-token` bypass with production gating.    |
| `apps/api/src/routes/policy-admin.ts`         | Only callers of `requireAdminAccess(... { allowAdminBypassToken: true })` — explicit opt-in per-route.                          |
| `apps/dashboard/app/api/events/stream/route.ts` | Server-only SSE proxy that re-authenticates the viewer and forwards `OPS_API_KEY` upstream via `x-ops-key`; never to client.  |
| `apps/dashboard/scripts/lint-security.ts`     | CI guard that fails the build if `OPS_API_KEY` appears in a `'use client'` file or `NEXT_PUBLIC_*KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL` is declared. |
| `apps/mcp/src/tools/{bootstrap,anchors,sdk-client,oracle-payment}.ts` | Forward `OPS_API_KEY` to upstream API as `x-ops-key`. Tools that require it fail closed with a clear error. |

### Logging, redaction, audit hygiene

| File                              | Role                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/telemetry/src/logger.ts` | Pino logger factory with `DEFAULT_REDACT_PATHS` covering `seed`, `signingSeed`, `KEETA_SIGNING_SEED`, `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, `AUTH_JWT_SECRET`, `WEBHOOK_SECRET`, `*.seed`, `*.signingSeed`, etc. Extension via `process.env.TELEMETRY_EXTRA_REDACT_PATHS`. |

## 4. Worker-Only Signing Verification

`grep` across the repo for `KEETA_SIGNING_SEED`, `SeedSigner`, `GcpKmsSigner`, `resolveSigner`,
`createSigningUserClient`, `signingSeed`, and `UserClient.fromNetwork(... account)` confirms:

- **`apps/api`:** zero references to signing material. Only `apps/api/src/lib/auth.ts` and
  `apps/api/fly.toml` mention `OPS_API_KEY`/`ADMIN_BYPASS_TOKEN`.
- **`apps/dashboard`:** zero references to seeds or `UserClient`. The only signing/seed-shaped
  string matches are unrelated docs (`Seeded blueprints` UI strings, CSRF HMAC commentary).
- **`apps/web`:** zero references to any of `KEETA_SIGNING_SEED`, `OPS_API_KEY`,
  `ADMIN_BYPASS_TOKEN`, `signingSeed`, `privateKey`. The marketing site is read-only.
- **`apps/worker`:** the only call site of `resolveSigner` and the only place a signing
  `UserClient` is materialised. Live signing is conditional on `LIVE_MODE_ENABLED`.
- **`apps/mcp`:** reads `process.env.KEETA_SIGNING_SEED` for the four signing-classified tools.
  Inline seeds are rejected by default (`inlineSeedsAllowed()` returns `false` unless
  `MCP_ALLOW_INLINE_SEEDS=true`).

The current state matches the documented "worker-only signing terminus" claim **with the
explicit and intentional MCP fallback exception**. The MCP exception is documented in
`SECURITY.md` and exists so operators can run a stdio MCP host alongside the worker without
duplicating execution wiring; it is a documented co-location requirement, not a gap.

## 5. API / SDK / Dashboard / MCP Access to Signing Secrets

| Surface       | Has `KEETA_SIGNING_SEED` access? | Has `KEETA_KMS_KEY` access? | Has `OPS_API_KEY` access? | Has `ADMIN_BYPASS_TOKEN` access? | Notes                                                                                                                                  |
| ------------- | -------------------------------- | --------------------------- | ------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`    | No                               | No                          | Yes (server-side env)     | Yes (server-side env, gated)     | Authn/authz only. Bypass token disabled in production unless `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION=true`.                              |
| `apps/worker` | Yes (production secret)          | Yes (production secret)     | No                        | No                               | Sole signer. Refuses to materialise `UserClient` unless `LIVE_MODE_ENABLED=true`.                                                       |
| `apps/dashboard` | No                            | No                          | Yes (server-only)         | No                               | Used only in `app/api/*` route handlers and SSE proxy. Never reaches the browser. Lint-security CI fails if it slips into a client file. |
| `apps/web`    | No                               | No                          | No                        | No                               | Public marketing site. No env access at all today.                                                                                      |
| `apps/mcp`    | Yes (server-pinned env)          | No                          | Yes (server-pinned env)   | No                               | Inline `seed` gated by `MCP_ALLOW_INLINE_SEEDS`. Forwards `OPS_API_KEY` to the upstream API. Generates new seeds via bootstrap tools.   |
| Published `@keeta-agent-stack/*` npm packages | No (except `@keeta-agent-stack/keeta` libs) | No (except `@keeta-agent-stack/keeta` libs) | No | No | The lib package exports signers, but consumers must opt in. No runtime env reads happen at import. |

## 6. Documentation vs Code Enforcement Gaps

| Doc claim                                                                                                | Where stated                          | Code reality                                                                                                                  | Status                          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| "Operators extend the redact list with `LOG_REDACT_EXTRA`"                                                | `SECURITY.md`, `.env.example`, `docs/deployment.md` | `packages/telemetry/src/logger.ts` reads `process.env.TELEMETRY_EXTRA_REDACT_PATHS`. `LOG_REDACT_EXTRA` is unused.            | **Drift.** Either rename the env or update the docs.            |
| "CI runs a check that pino-redact is configured before each release"                                      | `SECURITY.md`                         | No CI step, lint rule, or test asserts `redact.paths` is wired. Hand-verified by reading `logger.ts`.                          | **Aspirational.** No automated enforcement today.               |
| "Production boot refuses `ALLOW_DEV_SIGNER=true`"                                                         | `.env.example`                        | `loadEnv()` throws when `NODE_ENV=production && ALLOW_DEV_SIGNER=true` (`packages/config/src/index.ts:158-160`).               | **Enforced.**                                                   |
| "ADMIN_BYPASS_TOKEN is disabled in production by default"                                                 | `SECURITY.md`                         | `apps/api/src/lib/auth.ts:adminBypassAllowed()` honors `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION` (default `false`).              | **Enforced.**                                                   |
| "OPS_API_KEY defaults to `operator` role only" / "Mutations require `admin`"                              | `SECURITY.md`                         | `legacyOpsKeyRole()` returns `AUTH_LEGACY_OPS_API_KEY_ROLE ?? 'operator'`. `requireAdminAccess` enforces admin rank.           | **Enforced.**                                                   |
| "MCP server rejects inline seeds unless `MCP_ALLOW_INLINE_SEEDS=true`"                                    | `SECURITY.md`                         | `apps/mcp/src/tools/execute.ts:resolveSeedOrThrow` and `apps/mcp/src/tools/anchor-chaining.ts:resolveSeed` both enforce.       | **Enforced**, but logic is duplicated between two files.         |
| "Worker is the only process that signs"                                                                  | `SECURITY.md`, `docs/deployment.md`   | True for `apps/worker` and the published packages. **MCP also reads `KEETA_SIGNING_SEED` from env when present.**               | **Partially enforced.** Co-location of MCP + worker secrets is documented but not lint-enforced. |
| "Worker boot refuses public Base RPC in `NODE_ENV=production`" (Section 22 of base-evm-plugin guardrail)  | `.cursor/rules/base-evm-plugin.mdc`   | Out of scope for this repo today — the EVM plugin lives under `plugins/*` which is not yet present. Mentioned for completeness. | **N/A for current repo.**                                       |
| "Bootstrap tool seeds are not persisted by the API"                                                       | MCP `keeta_wallet_create_or_import` description | True for the API call. But seeds are still emitted in the MCP tool transcript (returned in `text` content) when `include_seed=true`. | **Footgun.** Document the transcript exposure; consider default `include_seed=false`. |

## 7. Recommended Implementation Plan for Custody Guards (Phase 0B+)

Order is roughly highest-leverage-first. Implementation lives in later phases; this audit only
flags what should be planned.

1. **Resolve the `LOG_REDACT_EXTRA` vs `TELEMETRY_EXTRA_REDACT_PATHS` drift.** Pick one name,
   update either the env reader or the docs (`SECURITY.md`, `docs/deployment.md`,
   `.env.example`), and add a startup warning if the deprecated alias is set without the
   canonical one. (P1 — hits anyone copying `.env.example`.)
2. **Add a CI lint that proves redaction is wired.** A `packages/telemetry` Vitest test that
   imports `createLogger`, logs an object containing every key in `DEFAULT_REDACT_PATHS`, and
   asserts `[REDACTED]` appears in the serialised line. Closes the "CI runs a check" claim.
3. **Default `keeta_wallet_create_or_import` to `include_seed=false`.** Operators who want the
   seed back can opt in. Today the default is `true`, which means a routine "create wallet"
   tool call leaks the seed into the MCP transcript (not just into the API). Add explicit
   inline doc warning.
4. **Add a worker boot warning when `KEETA_SIGNING_SEED` is also visible to the MCP host.**
   The MCP fallback to `process.env.KEETA_SIGNING_SEED` is intentional, but it should be a
   conscious operator choice. A simple startup line in `apps/mcp/src/index.ts` like
   "MCP host has KEETA_SIGNING_SEED in env — signing-class tools are enabled" gives operators
   visibility without changing behavior.
5. **Add a workspace import-lint that forbids `apps/api`, `apps/dashboard`, and `apps/web` from
   importing `@keeta-agent-stack/keeta`'s signer surface.** Today the boundary is conventional;
   make it mechanical. ESLint rule pinned to disallow the named exports
   (`SeedSigner`, `GcpKmsSigner`, `resolveSigner`, `createSigningUserClient`,
   `createSigningUserClientFromSigner`) from those workspaces.
6. **De-duplicate the MCP inline-seed gate.** `apps/mcp/src/tools/execute.ts:inlineSeedsAllowed`
   and `apps/mcp/src/tools/anchor-chaining.ts:resolveSeed` reimplement the same check. Move
   to a shared module so a future fix lands in one place.
7. **Add a `KEETA_KMS_PROVIDER=gcp` production-readiness check.** The `GcpKmsSigner` validates
   key algorithm at lookup time, but the worker should also assert that
   `GOOGLE_APPLICATION_CREDENTIALS` (or a platform-native ADC) is reachable at boot when KMS
   is configured. Today an unreachable ADC fails on the first signing call, several minutes
   into operation.
8. **Document the MCP-as-signer co-location.** `SECURITY.md` mentions the inline-seed gate but
   does not say plainly: "If you set `KEETA_SIGNING_SEED` on the MCP host, the MCP host
   becomes a co-signer." Spelling that out lets operators choose to deploy MCP without seed
   access (recommended) and route signing-class MCP tools to a worker bridge.

## 8. Risk Ranking Table

| Rank | Finding                                                                                                                                                                       | Impact                                                                                                                                                  | Likelihood                                                                                              | Mitigation status                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | None at the moment — no observed paths leak seeds or admin tokens to the browser, and worker-only signing holds for the canonical execution path.                            | n/a                                                                                                                                                     | n/a                                                                                                     | n/a                                                                                                                                                |
| **P1** | Env-var name drift: docs/`.env.example` say `LOG_REDACT_EXTRA`, telemetry actually reads `TELEMETRY_EXTRA_REDACT_PATHS`. Operators get no extra redaction, silently.          | Sensitive fields not on the default list (e.g. customer-specific webhook headers, internal partner IDs) flow into logs verbatim.                       | High — anyone following `SECURITY.md` or `.env.example` hits this.                                       | **Open.** Phase 0B step 1 above.                                                                                                                   |
| **P1** | `keeta_wallet_create_or_import` returns the freshly-generated seed in the MCP tool transcript by default (`include_seed=true`).                                              | Seed material flows through whatever transcript store / LLM provider / chat history backs the calling agent. Indistinguishable from inline-seed leakage. | Medium — only matters for operators who actually run the wallet bootstrap tool against a multi-tenant or cloud LLM. | **Open.** Default flip + explicit warning needed.                                                                                                  |
| **P1** | "CI runs a check that pino-redact is configured" claim in `SECURITY.md` is not enforced by code.                                                                              | A future refactor could remove `redact.paths` from `createLogger` without test failure.                                                                  | Low today, grows with codebase churn.                                                                    | **Open.** Add the asserting Vitest test.                                                                                                           |
| **P2** | MCP host can opt into being a signer simply by setting `KEETA_SIGNING_SEED` in its env; the boundary is conventional, not lint-enforced.                                     | If an operator deploys MCP on shared infra and copies `.env.production` wholesale, MCP becomes a second seed holder.                                    | Low when operators follow `apps/mcp/fly.toml` (which doesn't set the seed). Higher in ad-hoc deployments. | **Documented.** Improvements: workspace import-lint + boot-time warning when MCP boots with the seed in env.                                       |
| **P2** | Inline-seed gate logic duplicated between `apps/mcp/src/tools/execute.ts` and `apps/mcp/src/tools/anchor-chaining.ts`.                                                       | A future fix or audit change to one path won't propagate to the other.                                                                                   | Low.                                                                                                    | **Open.** Phase 0B refactor; pure code-organisation fix.                                                                                           |
| **P2** | `GcpKmsSigner` ADC reachability isn't checked until the first signing call.                                                                                                  | Worker boots green but fails on first live execution attempt, possibly under load.                                                                       | Low — operators usually catch this in staging.                                                          | **Open.** Add a startup probe call to `getAccount()` when KMS is configured.                                                                       |
| **P3** | `apps/web` has no `/security` page yet, but downstream phases will add one. Current README/SECURITY claims are not yet website-facing copy.                                  | No claim → no overclaim risk today. Risk is forward-looking.                                                                                            | n/a today.                                                                                              | **Tracked** in `SECURITY_WEBSITE_CLAIM_MAP.md`.                                                                                                    |
| **P3** | `docker-compose.prod.yml` sets `KEETA_SIGNING_SEED: ${KEETA_SIGNING_SEED:-}` on the worker only, but a typo'd compose override could put the same secret on the API service. | Operator-side misconfiguration only.                                                                                                                    | Low.                                                                                                    | **Documented.** Compose comments + `apps/worker/fly.toml` and `apps/api/fly.toml` reinforce the split. Could add a runtime assert in `apps/api/src/server.ts`. |

## 9. Next Steps for Phase 0B

The audit is the input for Phase 0B. Suggested ordering, mirroring Section 7:

1. Implement the **redact-paths env-var rename** (or alias both names, preferring the documented
   one) and update `SECURITY.md`, `docs/deployment.md`, and `.env.example` in the same change.
2. Add the **`packages/telemetry` redaction Vitest** that asserts every default path is honored.
3. Flip the **MCP `include_seed` default to `false`** and add a tool description warning.
4. Add the **workspace ESLint rule** forbidding signer-surface imports from API/dashboard/web.
5. Extract the **inline-seed gate to a shared MCP helper** and unit-test it in one place.
6. Add the **MCP boot-time warning** when `KEETA_SIGNING_SEED` is present in the MCP host env.
7. Add the **GCP KMS startup probe** call to validate ADC reachability before the first job.
8. Use this audit as the source of truth when wiring the future `apps/web`'s `/security` page;
   only ship claims that the audit (or its successors) has actually verified.

## 10. Phase 0B Implementation Status

Tracked here so future audits can diff against this document.

### Before / after summary

| Concern                                                                  | Before Phase 0B (Phase 0A snapshot)                                                                                                              | After Phase 0B                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Worker-only signing" enforcement                                        | Convention only. `createSigningUserClient` would happily run anywhere `KEETA_SIGNING_SEED` is set.                                               | Runtime guard. `createSigningUserClient` and `createSigningUserClientFromSigner` call `assertWorkerSigningRuntime()` from `@keeta-agent-stack/custody-guards`; non-`worker` runtimes throw `CustodyBoundaryError({ code: 'WRONG_RUNTIME_FOR_SIGNING' })`.                |
| API hosts holding `KEETA_SIGNING_SEED` / `KEETA_KMS_KEY`                 | Possible — only convention prevented it. No boot-time check.                                                                                     | API refuses to boot when run as a standalone runtime (`detectRuntime() === 'api'`) and any of `KEETA_SIGNING_SEED`, `KEETA_KMS_KEY`, `KEETA_KMS_PROVIDER` are present. Test/integration co-location passes through (worker entry declares `worker` runtime first).      |
| `NEXT_PUBLIC_*` secret exposure at runtime                               | CI lint (`apps/dashboard/scripts/lint-security.ts`) catches it at build time only.                                                              | API also performs a boot-time `assertNoBrowserSecretExposure()` walk over `process.env`, throwing if any `NEXT_PUBLIC_*` env carries a secret-shaped name or classifies as signing/admin/partner-secret.                                                                |
| MCP inline-seed gate                                                     | Logic duplicated between `apps/mcp/src/tools/execute.ts:resolveSeedOrThrow` and `apps/mcp/src/tools/anchor-chaining.ts:resolveSeed`.            | Both files delegate to `assertNoInlineSeedUnlessExplicitlyAllowed` from `@keeta-agent-stack/custody-guards`. Single source of truth, one set of unit tests, identical behavior.                                                                                         |
| Runtime classification                                                   | Implicit. No way to ask "what runtime is this code in?".                                                                                         | `KEETA_RUNTIME` env var + `declareRuntime` / `detectRuntime` from `@keeta-agent-stack/custody-guards`. Worker entry declares `worker`; API entry declares `api`; MCP entry declares `mcp`. `'unknown'` is the fail-closed default.                                       |
| Env-var safety classification                                            | Documented in `SECRET_BOUNDARY_MAP.md` only.                                                                                                     | Encoded in `classifyEnvVarSafety(name)` so guards, lints, and tests can branch on it.                                                                                                                                                                                  |
| String-level redaction utility                                           | `packages/telemetry`'s pino redactor only.                                                                                                       | Pino redactor is unchanged. `@keeta-agent-stack/custody-guards` adds `redactSecret` and `redactObjectSecrets` for ad-hoc strings / MCP transcripts / error envelopes. `isSecretLikeKey` exposed for tests.                                                              |
| `SECURITY.md` evidence                                                   | Vague claims ("the worker is the only signer"); a few documented-but-not-enforced statements (`LOG_REDACT_EXTRA`, "CI runs a check").           | Rewritten with file-level citations, a guard-by-guard table, and a Section 10 incident-response playbook. The `LOG_REDACT_EXTRA` documentation drift is now called out explicitly with the canonical name (`TELEMETRY_EXTRA_REDACT_PATHS`).                              |

### Files added (Phase 0B)

- `packages/custody-guards/package.json` — new workspace package, zero runtime deps.
- `packages/custody-guards/tsconfig.json`, `vitest.config.ts`, `README.md`.
- `packages/custody-guards/src/index.ts` — public surface re-exports.
- `packages/custody-guards/src/errors.ts` — `CustodyBoundaryError` + `CustodyBoundaryErrorCode`.
- `packages/custody-guards/src/runtime.ts` — `RuntimeKind`, `KEETA_RUNTIME_ENV`, `detectRuntime`, `declareRuntime`.
- `packages/custody-guards/src/env-classifier.ts` — `classifyEnvVarSafety`, `looksLikeSecretName`, the env classification table.
- `packages/custody-guards/src/redact.ts` — `redactSecret`, `redactObjectSecrets`, `isSecretLikeKey`.
- `packages/custody-guards/src/custody-boundary.ts` — `assertWorkerSigningRuntime`, `assertNoBrowserSecretExposure`, `assertNoInlineSeedUnlessExplicitlyAllowed`, `assertEnvNotPresentForRuntime`, `validateNextPublicEnvName`, `isInlineSeedFlagEnabled`.
- `packages/custody-guards/src/custody-boundary.test.ts` — unit tests covering every export.

### Files modified (Phase 0B)

- `packages/keeta/package.json` — adds `@keeta-agent-stack/custody-guards` dep.
- `packages/keeta/src/worker-bridge.ts` — calls `assertWorkerSigningRuntime()` at the innermost signing boundary.
- `packages/keeta/src/index.ts` — re-exports the runtime guard surface for ergonomic consumers.
- `apps/worker/package.json` — adds `@keeta-agent-stack/custody-guards` dep.
- `apps/worker/src/index.ts` — calls `declareRuntime('worker')` at module top-level.
- `apps/mcp/package.json` — adds `@keeta-agent-stack/custody-guards` dep.
- `apps/mcp/src/index.ts` — calls `declareRuntime('mcp')` at module top-level.
- `apps/mcp/src/tools/execute.ts` — `resolveSeedOrThrow`/`inlineSeedsAllowed` delegate to the shared helper.
- `apps/mcp/src/tools/anchor-chaining.ts` — `resolveSeed` delegates to the shared helper.
- `apps/api/package.json` — adds `@keeta-agent-stack/custody-guards` dep.
- `apps/api/src/server.ts` — `buildApiApp` declares the `api` runtime and runs the boot-time guards.
- `turbo.json` — adds `KEETA_RUNTIME` to `globalEnv` so cache keys reflect runtime declarations.
- `SECURITY.md` — rewritten "Signing Key & Inline-Seed Policy" section with a guard-by-guard table, env-var class table, and incident-response playbook.
- `docs/security/CUSTODY_GUARD_AUDIT.md` — this section.

### Audit-finding closure

| P# | Phase 0A finding                                                                                                                  | Status after Phase 0B                                                                                                                                                                                |
| -- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 | `LOG_REDACT_EXTRA` ↔ `TELEMETRY_EXTRA_REDACT_PATHS` documentation drift.                                                          | **Documented**, not yet renamed. `SECURITY.md` now names the canonical env (`TELEMETRY_EXTRA_REDACT_PATHS`) and points at this audit for the drift. Renaming the env touches `.env.example` and `docs/deployment.md`, which are outside this phase's allowed touch set. **Open for Phase 0C.** |
| P1 | `keeta_wallet_create_or_import` returns the seed in the MCP transcript by default (`include_seed=true`).                          | **Open.** Default flip is intentionally deferred — it is a user-visible behavior change for MCP callers. Tracked for Phase 0C alongside the MCP boot-time warning.                                                                                                                              |
| P1 | "CI runs a check that pino-redact is configured" claim was unenforced.                                                            | **Partially closed.** `packages/custody-guards` ships `isSecretLikeKey` and `redactObjectSecrets`, both unit-tested. A telemetry-package Vitest that asserts every `DEFAULT_REDACT_PATHS` entry is honored is still recommended for Phase 0C.                                                  |
| P2 | MCP host can opt into being a signer simply by setting `KEETA_SIGNING_SEED`. Boundary is conventional, not lint-enforced.         | **Documented** in `SECURITY.md` "Co-location warning". A workspace ESLint rule that forbids `apps/api`, `apps/dashboard`, `apps/web` from importing the signer surface is still recommended for Phase 0C.                                                                                     |
| P2 | Inline-seed gate logic duplicated between two MCP tool files.                                                                     | **Closed.** Both files delegate to `assertNoInlineSeedUnlessExplicitlyAllowed` in `@keeta-agent-stack/custody-guards`.                                                                                                                                                                         |
| P2 | `GcpKmsSigner` ADC reachability isn't checked until the first signing call.                                                        | **Open.** A startup probe call to `getAccount()` when `KEETA_KMS_PROVIDER=gcp` is recommended for Phase 0C; touches `packages/keeta` and `apps/worker`.                                                                                                                                       |
| P3 | `apps/web` has no `/security` page yet — claim map exists but not implemented.                                                    | **Tracked** in `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md`. Implementation belongs to a later web-focused phase.                                                                                                                                                                                |
| P3 | `docker-compose.prod.yml` co-location risk if operators typo'd a compose override.                                                | **Closed for the API runtime** by `assertEnvNotPresentForRuntime('api', ...)`. Compose comments still reinforce the split.                                                                                                                                                                    |

### Remaining gaps and recommended Phase 0C items

1. **Telemetry redaction Vitest.** Add a test in `packages/telemetry` that imports `createLogger`,
   logs an object containing every key in `DEFAULT_REDACT_PATHS`, and asserts `[REDACTED]` appears
   in the serialised line. This is the missing automation behind `SECURITY.md`'s "redaction is
   configured" claim.
2. **Env name canonicalization.** Pick one of `LOG_REDACT_EXTRA` / `TELEMETRY_EXTRA_REDACT_PATHS`,
   alias the other, update `.env.example` and `docs/deployment.md` in the same change.
3. **MCP `include_seed` default flip.** Default `keeta_wallet_create_or_import` to
   `include_seed=false`. Update the tool description and add a regression test.
4. **MCP boot-time warning.** Log a `pino.warn` line when MCP boots with `KEETA_SIGNING_SEED`
   present in env, so operators see "MCP host has KEETA_SIGNING_SEED in env — signing-class tools
   are enabled" without changing behavior.
5. **Workspace import-lint.** ESLint rule that forbids `apps/api`, `apps/dashboard`, `apps/web`
   from importing the signer surface (`SeedSigner`, `GcpKmsSigner`, `resolveSigner`,
   `createSigningUserClient`, `createSigningUserClientFromSigner`).
6. **GCP KMS startup probe.** When `KEETA_KMS_PROVIDER=gcp` is configured, call
   `signer.getAccount()` once at worker boot so ADC misconfigurations surface immediately
   instead of on the first execute job.
7. **Dashboard / web boot guard.** Wire `declareRuntime('dashboard')` and
   `assertNoBrowserSecretExposure()` into the dashboard server entrypoint and any future
   `apps/web` server entrypoint. This phase deliberately did not touch the dashboard source
   beyond what was required, to keep blast radius small.
