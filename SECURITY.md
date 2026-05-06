# Security Policy

The Keeta Agent Stack ships infrastructure that touches signing keys, live payments, and operator
controls. We take security reports seriously and ask that you give us a chance to fix issues before
they are made public.

## Supported Versions

The Keeta Agent Stack is in active 0.x pre-release. Security fixes land on `main`. Tagged releases
will be supported on a rolling-latest basis once 1.0 ships.

| Version | Supported   |
| ------- | ----------- |
| `main`  | yes         |
| `0.x`   | best-effort |
| `< 0.x` | no          |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security reports.

Instead, use one of these private channels:

1. **GitHub Security Advisories** — preferred. Go to the repository's
   [Security tab](https://github.com/IAMKMFA/keeta-agent-stack/security/advisories/new) and click
   _Report a vulnerability_. This creates a private advisory only the maintainers can read.
2. **Direct contact** — if you don't have a GitHub account, open an empty issue titled
   `Security contact request` and a maintainer will reach out privately to set up a secure channel.

When you report, please include:

- a description of the issue and its impact
- the affected commit hash, branch, or release tag
- a minimal reproduction (PoC code, payload, or steps)
- whether the issue affects mock-only paths or live execution
- any logs, stack traces, or screenshots

We aim to respond within **3 business days** with an acknowledgement and an initial triage. Critical
issues affecting live signing or policy bypass are prioritised over functional bugs.

## Scope

In scope:

- the API (`apps/api`), worker (`apps/worker`), dashboard (`apps/dashboard`), and MCP server
  (`apps/mcp`)
- every package under `packages/`
- the published `@keeta-agent-stack/*` npm packages once they are released
- the starter template (`starter-agent-template/`)
- documentation that recommends insecure defaults

Out of scope:

- third-party services we integrate with (Keeta network, partner anchors, oracle providers) — please
  report those to their respective vendors
- vulnerabilities in dependencies that are already publicly disclosed and awaiting a release; we
  still want to know, but they're tracked separately
- denial-of-service via traffic alone against an unauthenticated public endpoint with no
  authentication bypass

## Signing Key & Inline-Seed Policy

The SDK is split deliberately so that **signing keys never live in agent logic**. The boundary is
enforced at runtime by the [`@keeta-agent-stack/custody-guards`](./packages/custody-guards) package:

- **`KEETA_SIGNING_SEED`** is read **only by `apps/worker`** (and, optionally, by `apps/mcp` when
  the operator has explicitly opted into co-locating signing material there). The API, dashboard,
  public web app, and every published `@keeta-agent-stack/*` package other than `@keeta-agent-stack/keeta`
  drive execution without ever needing the seed in their process.
- **`apps/worker`** is the only process that materialises a signing `UserClient` and submits
  transactions. Live execution of native KTA transfers (`packages/adapter-keeta-transfer`) and
  partner-rail callbacks (`packages/adapter-oracle-rail`) both terminate in the worker.

### Runtime guard ([`@keeta-agent-stack/custody-guards`](./packages/custody-guards))

| Guard                                               | Wired in                                                                                                          | What it enforces                                                                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `declareRuntime('worker')`                          | [`apps/worker/src/index.ts`](./apps/worker/src/index.ts)                                                          | Sets `process.env.KEETA_RUNTIME='worker'` at the worker entrypoint, before any signer surface is touched.                                              |
| `declareRuntime('api')` + `assertNoBrowserSecretExposure()` + `assertEnvNotPresentForRuntime('api', 'KEETA_SIGNING_SEED' \| 'KEETA_KMS_KEY' \| 'KEETA_KMS_PROVIDER')` | [`apps/api/src/server.ts:buildApiApp`](./apps/api/src/server.ts) | API refuses to boot if a `NEXT_PUBLIC_*` env carries a secret-shaped name, or if Keeta signing material has leaked into the API host's environment.    |
| `declareRuntime('mcp')`                             | [`apps/mcp/src/index.ts`](./apps/mcp/src/index.ts)                                                                | Marks MCP as a non-signer for `@keeta-agent-stack/keeta`'s `createSigningUserClient*`. MCP tool wrappers go directly through the Keeta SDK with the seed gated by `assertNoInlineSeedUnlessExplicitlyAllowed`. |
| `assertWorkerSigningRuntime()`                      | [`packages/keeta/src/worker-bridge.ts`](./packages/keeta/src/worker-bridge.ts) (`createSigningUserClient` and `createSigningUserClientFromSigner`) | Throws `CustodyBoundaryError({ code: 'WRONG_RUNTIME_FOR_SIGNING' })` if any process other than `worker` (or `test`) tries to construct a signing `UserClient`. |
| `assertNoInlineSeedUnlessExplicitlyAllowed`         | [`apps/mcp/src/tools/execute.ts`](./apps/mcp/src/tools/execute.ts) and [`apps/mcp/src/tools/anchor-chaining.ts`](./apps/mcp/src/tools/anchor-chaining.ts) | Single source of truth for the `MCP_ALLOW_INLINE_SEEDS` gate. Inline seeds are rejected by default; only `MCP_ALLOW_INLINE_SEEDS=true` (or `=1`) opts in. |

Tested in [`packages/custody-guards/src/custody-boundary.test.ts`](./packages/custody-guards/src/custody-boundary.test.ts)
and [`apps/mcp/src/tools/execute.test.ts`](./apps/mcp/src/tools/execute.test.ts). See also the
[secret boundary map](./docs/security/SECRET_BOUNDARY_MAP.md).

### Logging & redaction

- Pino-level redaction is configured in [`packages/telemetry/src/logger.ts`](./packages/telemetry/src/logger.ts)
  with a `DEFAULT_REDACT_PATHS` list covering `seed`, `signingSeed`, `KEETA_SIGNING_SEED`,
  `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, `AUTH_JWT_SECRET`, `WEBHOOK_SECRET`, `*.seed`,
  `*.signingSeed`, etc. Operators can extend the list per-environment with the env var read by
  the telemetry package — `TELEMETRY_EXTRA_REDACT_PATHS` (the older `LOG_REDACT_EXTRA` name in
  some example files is a documentation drift tracked in
  [`docs/security/CUSTODY_GUARD_AUDIT.md`](./docs/security/CUSTODY_GUARD_AUDIT.md)).
- Ad-hoc string redaction is available via `redactSecret`/`redactObjectSecrets` in
  `@keeta-agent-stack/custody-guards`.
- Operator audit payloads use `redactedEffectiveConfig()` so venue and asset allowlists never
  leak into long-term audit storage.

### `MCP_ALLOW_INLINE_SEEDS` (default `false`)

The MCP server (`apps/mcp`) exposes signing-class tools (`keeta_user_client_execute`,
`keeta_builder_execute`, `keeta_anchor_execute`, `keeta_anchor_chaining_*`). Each one routes
through `resolveSeedOrThrow()` in [`apps/mcp/src/tools/execute.ts`](./apps/mcp/src/tools/execute.ts)
or `resolveSeed()` in [`apps/mcp/src/tools/anchor-chaining.ts`](./apps/mcp/src/tools/anchor-chaining.ts).
Both delegate to `assertNoInlineSeedUnlessExplicitlyAllowed` from
`@keeta-agent-stack/custody-guards`, which **rejects an inline `seed` argument** unless
`MCP_ALLOW_INLINE_SEEDS=true` is explicitly set in the MCP process environment. The default
falls back to a worker-pinned `KEETA_SIGNING_SEED` if and only if the operator has chosen to
co-locate signing material on the MCP host.

The rationale:

- LLM agents prompt-inject. Allowing a tool argument named `seed` to take effect by default would
  let any compromised prompt smuggle a key into a conversation transcript that we then ask the
  worker to sign with.
- Local development sometimes needs to test with an ephemeral seed that isn't worth wiring into the
  worker. `MCP_ALLOW_INLINE_SEEDS=true` is the opt-in for that case.
- **Never enable `MCP_ALLOW_INLINE_SEEDS` in production.** Guarded checks in
  [`apps/mcp/src/tools/execute.test.ts`](./apps/mcp/src/tools/execute.test.ts) and
  [`packages/custody-guards/src/custody-boundary.test.ts`](./packages/custody-guards/src/custody-boundary.test.ts)
  document the expected behaviour.

> **Co-location warning.** If the operator sets `KEETA_SIGNING_SEED` in the MCP host's
> environment, the MCP host becomes a co-signer with the worker. The recommended production
> deployment ([`apps/mcp/fly.toml`](./apps/mcp/fly.toml)) intentionally does not set the seed.

### Seed rotation

We treat `KEETA_SIGNING_SEED` as a long-lived secret. Rotation procedure:

1. Provision a new account index (e.g. `KEETA_ACCOUNT_INDEX=N+1`) and a new seed in your secret
   manager.
2. Roll the worker's environment to point at the new seed/index. Because the worker is the only
   consumer, no other service needs to be touched.
3. Drain in-flight intents on the old account by waiting for a clean reconciliation window, or by
   engaging the kill switch (`POST /ops/kill-switch/engage`) to halt new live executions while you
   cut over.
4. Post-rotation, revoke the prior secret in your secret manager and verify no log line, audit row,
   or webhook payload contains the rotated value (`pino` redaction should already enforce this).

### KMS-backed signing

For production live Keeta transfers, the recommended path is BYOK signing through Google Cloud KMS:

- Set `KEETA_KMS_PROVIDER=gcp` and `KEETA_KMS_KEY` in the worker environment. The key name must use
  the Cloud KMS resource format
  `projects/<project>/locations/<location>/keyRings/<ring>/cryptoKeys/<key>`, optionally pinned to
  `/cryptoKeyVersions/<version>`.
- Install the optional peer dependency `@google-cloud/kms` only in the worker runtime that needs KMS
  signing. Seed-only deployments do not need the package installed.
- Configure Google Application Default Credentials with `GOOGLE_APPLICATION_CREDENTIALS` or the
  platform-native ADC mechanism for your runtime.
- Grant the worker service account `roles/cloudkms.signer` on the specific KMS key only. Do not
  grant project-wide KMS admin/editor roles.
- When KMS is configured, `KEETA_SIGNING_SEED` is optional. If both KMS and seed env vars are set,
  the worker selects KMS.

Threat model upgrade: with KMS-backed signing, the private key never leaves Cloud KMS. The worker
can request signatures for live Keeta blocks, but it cannot export signing material. This reduces
blast radius for process compromise compared with a raw long-lived seed, while preserving the same
policy gate and execution audit trail.

The GCP KMS signer supports Keeta SECP256K1 and SECP256R1 account keys. Unsupported key algorithms
fail loudly during signer initialization or key lookup instead of falling back silently.

### `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, and policy-admin authz

- **`OPS_API_KEY`** is a legacy admin key. As of the upstream-sync refactor it defaults to the
  `operator` role only (`AUTH_LEGACY_OPS_API_KEY_ROLE`, default `operator`), which is read-only for
  policy administration. Mutations require the `admin` role. Enforced in
  [`apps/api/src/lib/auth.ts:authorizeRequest`](./apps/api/src/lib/auth.ts).
- **`ADMIN_BYPASS_TOKEN`** is disabled in production by default. Setting
  `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION=true` is the explicit opt-in for break-glass scenarios.
  Only [`apps/api/src/routes/policy-admin.ts`](./apps/api/src/routes/policy-admin.ts) opts in via
  `requireAdminAccess(... { allowAdminBypassToken: true })`.
- **Dashboard SSE proxy.** The dashboard reads `OPS_API_KEY` server-side only and forwards it as
  `x-ops-key` to the upstream API in
  [`apps/dashboard/app/api/events/stream/route.ts`](./apps/dashboard/app/api/events/stream/route.ts).
  The prior `NEXT_PUBLIC_OPS_API_KEY` variable was removed in 0.0.1.
- **CI lint guard.** [`apps/dashboard/scripts/lint-security.ts`](./apps/dashboard/scripts/lint-security.ts)
  fails the build if `OPS_API_KEY` appears in any `'use client'` file or any `.env*` file declares
  a `NEXT_PUBLIC_*KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL` name.

### Env var classes (machine-enforced)

[`@keeta-agent-stack/custody-guards`](./packages/custody-guards) exports `classifyEnvVarSafety(name)`
which returns one of these classes for any env var. The full mapping is in
[`docs/security/SECRET_BOUNDARY_MAP.md`](./docs/security/SECRET_BOUNDARY_MAP.md):

| Class               | Examples                                                                    | Allowed runtimes                                       | Browser-safe? |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `signing`           | `KEETA_SIGNING_SEED`, `KEETA_KMS_KEY`, `KEETA_KMS_PROVIDER`                 | `worker`, `test`                                       | No            |
| `admin-credential`  | `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, `AUTH_JWT_SECRET`, `MCP_ALLOW_INLINE_SEEDS` | `api`, `mcp`, `dashboard`, `test` (varies per name) | No            |
| `partner-secret`    | `WEBHOOK_SECRET`, `ORACLE_RAIL_CCTP_LIVE_URL`                              | `worker`, `api`, `test`                                | No            |
| `public-config`     | `NEXT_PUBLIC_API_URL`, `KEETA_NETWORK`, `KEETA_EXPLORER_TX_URL_TEMPLATE`    | All                                                    | Yes           |
| `internal-config`   | Database URLs, queue tuning, OTEL flags                                     | All server-side                                        | No            |
| `unknown`           | Any name not in the explicit allowlist                                      | None (fail-closed by guard checks)                     | No            |

**What must never appear in a browser-exposed env var:** anything classified as `signing`,
`admin-credential`, or `partner-secret`. The `assertNoBrowserSecretExposure` guard refuses to
boot if a `NEXT_PUBLIC_*` env carries such a name.

## Incident Response & Rotation

### If you suspect `KEETA_SIGNING_SEED` exposure

1. **Engage the kill switch.** `POST /ops/kill-switch/engage` with operator/admin auth (or set
   `EXECUTION_KILL_SWITCH=true` on the worker and roll). The worker re-checks the switch before
   every execute job (`apps/worker/src/run.ts:killSwitchActive`).
2. **Provision a new seed or KMS key.** Prefer KMS (`KEETA_KMS_PROVIDER=gcp`,
   `KEETA_KMS_KEY=...`) so the rotated key never leaves Cloud KMS.
3. **Roll the worker environment** to point at the new seed/index or KMS key. Because the worker
   is the only consumer (enforced by `assertWorkerSigningRuntime`), no other service needs to be
   touched.
4. **Drain in-flight intents** by waiting for a clean reconciliation window (the worker schedules
   `QUEUE_NAMES.executionReconciliation` on `RECONCILE_INTERVAL_MS`).
5. **Disengage the kill switch.**
6. **Revoke** the prior secret in your secret manager and verify no log line, audit row, or
   webhook payload contains the rotated value (pino redaction enforces this at write time).

### If you suspect `OPS_API_KEY` or `ADMIN_BYPASS_TOKEN` exposure

1. Rotate the value in your secret manager and roll all consumers (API, dashboard host, MCP host).
2. If `ADMIN_BYPASS_TOKEN` was exposed and `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION=true`, set the
   flag back to `false` until rotation completes.
3. Audit `policy_admin.bypass_used` audit events
   ([`apps/api/src/routes/policy-admin.ts`](./apps/api/src/routes/policy-admin.ts)) for unexpected
   actors during the exposure window.

### If you suspect a webhook subscriber secret leaked

1. Pause the affected subscription via the dashboard (or the `/webhooks` API).
2. Rotate the secret on the subscriber side and update the subscription with the new secret.
3. Re-enable. The next delivery cycle uses the new HMAC.

## Coordinated Disclosure

We follow standard coordinated disclosure:

1. You report the issue privately.
2. We confirm reproduction and start a fix.
3. We agree on a disclosure timeline (default: 90 days from report).
4. We ship a patch and publish a security advisory crediting you (unless you prefer to remain
   anonymous).

We do not currently run a paid bug-bounty program, but we will publicly credit reporters in the
advisory and CHANGELOG.

## Hardening Checklist for Operators

If you run this stack in production, also read:

- [docs/deployment.md](./docs/deployment.md) — production env hardening, network isolation, secret
  rotation, observability
- [.env.example](./.env.example) — every security-relevant env var with inline guidance
- [apps/dashboard/README.md](./apps/dashboard/README.md) — dashboard auth model and the three layers
  of access control

Thanks for helping keep the Keeta ecosystem safe.
