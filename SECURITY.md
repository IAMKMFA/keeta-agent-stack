# Security Policy

The Keeta Agent Stack ships infrastructure that touches signing keys, live
payments, and operator controls. We take security reports seriously and ask
that you give us a chance to fix issues before they are made public.

## Supported Versions

The Keeta Agent Stack is in active 0.x pre-release. Security fixes land on
`main`. Tagged releases will be supported on a rolling-latest basis once
1.0 ships.

| Version | Supported   |
| ------- | ----------- |
| `main`  | yes         |
| `0.x`   | best-effort |
| `< 0.x` | no          |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security reports.

Instead, use one of these private channels:

1. **GitHub Security Advisories** — preferred. Go to the repository's
   [Security tab](https://github.com/IAMKMFA/keeta-agent-stack/security/advisories/new)
   and click _Report a vulnerability_. This creates a private advisory only
   the maintainers can read.
2. **Direct contact** — if you don't have a GitHub account, open an empty
   issue titled `Security contact request` and a maintainer will reach out
   privately to set up a secure channel.

When you report, please include:

- a description of the issue and its impact
- the affected commit hash, branch, or release tag
- a minimal reproduction (PoC code, payload, or steps)
- whether the issue affects mock-only paths or live execution
- any logs, stack traces, or screenshots

We aim to respond within **3 business days** with an acknowledgement and an
initial triage. Critical issues affecting live signing or policy bypass are
prioritised over functional bugs.

## Scope

In scope:

- the API (`apps/api`), worker (`apps/worker`), dashboard (`apps/dashboard`),
  and MCP server (`apps/mcp`)
- every package under `packages/`
- the published `@keeta-agent-stack/*` npm packages once they are released
- the starter template (`starter-agent-template/`)
- documentation that recommends insecure defaults

Out of scope:

- third-party services we integrate with (Keeta network, partner anchors,
  oracle providers) — please report those to their respective vendors
- vulnerabilities in dependencies that are already publicly disclosed and
  awaiting a release; we still want to know, but they're tracked separately
- denial-of-service via traffic alone against an unauthenticated public
  endpoint with no authentication bypass

## Signing Key & Inline-Seed Policy

The SDK is split deliberately so that **signing keys never live in agent
logic**. Concretely:

- **`KEETA_SIGNING_SEED`** is read **only by `apps/worker`** (and, for local
  development scripts, by your shell). The API, dashboard, MCP server, and
  every published `@keeta-agent-stack/*` package on npm are all designed to
  drive execution without ever needing the seed in their process.
- **`apps/worker`** is the only process that materialises a signing
  `UserClient` and submits transactions. Live execution of native KTA
  transfers (`packages/adapter-keeta-transfer`) and partner-rail callbacks
  (`packages/adapter-oracle-rail`) both terminate in the worker.
- **Logging is redacted at the source.** `packages/telemetry` configures
  pino with a `DEFAULT_REDACT_PATHS` list covering `seed`, `signingSeed`,
  `privateKey`, `apiKey`, `authorization`, and friends; operators can extend
  the list per-environment with `LOG_REDACT_EXTRA`. CI runs a check that
  `pino-redact` is configured before each release.
- **Operator audit payloads** use `redactedEffectiveConfig()` so venue and
  asset allowlists never leak into long-term audit storage.

### `MCP_ALLOW_INLINE_SEEDS` (default `false`)

The MCP server (`apps/mcp`) exposes signing tools (`keeta_user_client_execute`,
`keeta_builder_execute`, `keeta_anchor_execute`, `keeta_anchor_chaining_*`).
Each one routes through `resolveSeedOrThrow()` in
[`apps/mcp/src/tools/execute.ts`](./apps/mcp/src/tools/execute.ts), which
**rejects an inline `seed` argument** unless `MCP_ALLOW_INLINE_SEEDS=true` is
explicitly set in the MCP process environment. The default falls back to the
worker-held `KEETA_SIGNING_SEED`.

The rationale:

- LLM agents prompt-inject. Allowing a tool argument named `seed` to take
  effect by default would let any compromised prompt smuggle a key into a
  conversation transcript that we then ask the worker to sign with.
- Local development sometimes needs to test with an ephemeral seed that
  isn't worth wiring into the worker. `MCP_ALLOW_INLINE_SEEDS=true` is the
  opt-in for that case.
- **Never enable `MCP_ALLOW_INLINE_SEEDS` in production.** A guarded check
  in `apps/mcp/src/tools/execute.test.ts` documents the expected behaviour.

### Seed rotation

We treat `KEETA_SIGNING_SEED` as a long-lived secret. Rotation procedure:

1. Provision a new account index (e.g. `KEETA_ACCOUNT_INDEX=N+1`) and a new
   seed in your secret manager.
2. Roll the worker's environment to point at the new seed/index. Because the
   worker is the only consumer, no other service needs to be touched.
3. Drain in-flight intents on the old account by waiting for a clean
   reconciliation window, or by engaging the kill switch
   (`POST /ops/kill-switch/engage`) to halt new live executions while you
   cut over.
4. Post-rotation, revoke the prior secret in your secret manager and verify
   no log line, audit row, or webhook payload contains the rotated value
   (`pino` redaction should already enforce this).

### `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, and policy-admin authz

- `OPS_API_KEY` is a legacy admin key. As of the upstream-sync refactor it
  defaults to the `operator` role only (`AUTH_LEGACY_OPS_API_KEY_ROLE`),
  which is **read-only** for policy administration. Mutations require the
  `admin` role.
- `ADMIN_BYPASS_TOKEN` is **disabled in production** by default. Setting
  `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION=true` is the explicit opt-in for
  break-glass scenarios.
- The dashboard's ops surface reads `OPS_API_KEY` server-side only; the
  prior `NEXT_PUBLIC_OPS_API_KEY` variable was removed in 0.0.1.

## Coordinated Disclosure

We follow standard coordinated disclosure:

1. You report the issue privately.
2. We confirm reproduction and start a fix.
3. We agree on a disclosure timeline (default: 90 days from report).
4. We ship a patch and publish a security advisory crediting you (unless
   you prefer to remain anonymous).

We do not currently run a paid bug-bounty program, but we will publicly
credit reporters in the advisory and CHANGELOG.

## Hardening Checklist for Operators

If you run this stack in production, also read:

- [docs/deployment.md](./docs/deployment.md) — production env hardening,
  network isolation, secret rotation, observability
- [.env.example](./.env.example) — every security-relevant env var with
  inline guidance
- [apps/dashboard/README.md](./apps/dashboard/README.md) — dashboard auth
  model and the three layers of access control

Thanks for helping keep the Keeta ecosystem safe.
