# @keeta-agent-stack/custody-guards

Runtime guards that enforce the secret-boundary contract documented in
[`docs/security/SECRET_BOUNDARY_MAP.md`](../../docs/security/SECRET_BOUNDARY_MAP.md) and
[`docs/security/CUSTODY_GUARD_AUDIT.md`](../../docs/security/CUSTODY_GUARD_AUDIT.md).

This package has **zero runtime dependencies** and is safe to import from any runtime in the
monorepo (worker, API, MCP, dashboard, public web app, SDK, build/lint scripts).

## Public surface

| Export                                         | Use it from       | What it does                                                                                                                                                                      |
| ---------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `declareRuntime(kind)`                         | App entrypoints   | Sets `process.env.KEETA_RUNTIME` once per process. Idempotent.                                                                                                                    |
| `detectRuntime()`                              | Anywhere          | Returns the current runtime, or `'unknown'` (fail-closed default).                                                                                                                |
| `assertWorkerSigningRuntime()`                 | Signer call sites | Throws `CustodyBoundaryError({ code: 'WRONG_RUNTIME_FOR_SIGNING' })` unless the runtime is `worker` or `test`.                                                                    |
| `assertNoBrowserSecretExposure()`              | App boot          | Walks `process.env`, throws if any `NEXT_PUBLIC_*` var carries a secret-shaped name or classifies as signing/admin/partner-secret.                                                |
| `assertNoInlineSeedUnlessExplicitlyAllowed(s)` | MCP tool wrappers | Single source of truth for the `MCP_ALLOW_INLINE_SEEDS` gate. Returns the seed to use (inline or env) or `undefined`.                                                             |
| `assertEnvNotPresentForRuntime(rt, name)`      | Optional boot     | Throws if a runtime holds an env var it must never own. Skips when the runtime is `'unknown'` to avoid false positives in ad-hoc scripts.                                         |
| `validateNextPublicEnvName(name)`              | Lint helpers      | Returns `{ ok, reason?, safety }` for use by `apps/dashboard/scripts/lint-security.ts` and any future `apps/web` lint hook.                                                       |
| `classifyEnvVarSafety(name)`                   | Anywhere          | Returns the `EnvVarSafety` record (class, allowed runtimes, browser-safe flag).                                                                                                   |
| `looksLikeSecretName(name)`                    | Anywhere          | Belt-and-braces regex check for secret-shaped names.                                                                                                                              |
| `redactSecret(value)`                          | Logs / errors     | Always returns `'[REDACTED]'`. Never returns hashes or partial strings.                                                                                                           |
| `redactObjectSecrets(value)`                   | MCP transcripts   | Walks an object/array, replaces values whose keys match `isSecretLikeKey`.                                                                                                        |
| `isSecretLikeKey(key)`                         | Anywhere          | Case-insensitive partial match against the documented secret-shape patterns.                                                                                                      |
| `CustodyBoundaryError`                         | Error handling    | Stable `code` enum: `WRONG_RUNTIME_FOR_SIGNING`, `BROWSER_SECRET_EXPOSED`, `INLINE_SEED_DISALLOWED`, `PRIVILEGED_ENV_IN_PUBLIC_NAMESPACE`, `PRIVILEGED_ENV_IN_NON_OWNER_RUNTIME`. |

## Wiring guide

1. **App entrypoints** — call `declareRuntime('worker' | 'api' | 'mcp' | 'dashboard' | 'web')` at
   the top of the entrypoint, _before_ any package that touches signing surface is imported.
2. **Worker signing path** — call `assertWorkerSigningRuntime()` immediately before constructing the
   signing `UserClient` (e.g. inside the lazy getter in `apps/worker/src/run.ts`).
3. **MCP tool wrappers** — replace ad-hoc `process.env.MCP_ALLOW_INLINE_SEEDS` logic with
   `assertNoInlineSeedUnlessExplicitlyAllowed(inlineSeed)`. The call de-duplicates today's
   `apps/mcp/src/tools/execute.ts` and `apps/mcp/src/tools/anchor-chaining.ts` gates.
4. **API / dashboard / web boot** — call `assertNoBrowserSecretExposure()` inside `buildApiApp` (or
   equivalent) so a misconfigured deploy fails fast before serving traffic.

## Why a separate package?

Three reasons:

- **Zero-dependency.** The guards must be importable from the dashboard's Next.js server runtime,
  the public web app, the worker, and the MCP server, without dragging the Keeta SDK or pino into
  bundles where they don't belong.
- **One source of truth.** Several guards (the MCP inline-seed gate, the dashboard `NEXT_PUBLIC_*`
  lint, the API env-var sanity check) are re-implemented today across multiple files; this package
  collapses them.
- **Auditability.** A small package is easy to review wholesale; large cross-cutting changes inside
  `packages/keeta` would mix custody policy with chain-client code.
