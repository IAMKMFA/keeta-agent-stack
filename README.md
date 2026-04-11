# keeta-agent-sdk

Production-oriented TypeScript monorepo for **adapter-first**, **simulation-first** execution of Keeta trading intents. Agents validate intents, gather quotes, score routes, enforce policy, simulate or execute, and persist telemetry. **Signing keys never live in agent logic** — live Keeta transfers use `UserClient` + `Account.fromSeed` **only inside `apps/worker`**, behind environment configuration.

## Stack

- **pnpm** workspaces + **Turborepo**
- **Fastify** API (`apps/api`), **BullMQ** workers (`apps/worker`), **Next.js** dashboard (`apps/dashboard`)
- **MCP** server (`apps/mcp`) with dynamic Keeta SDK execution + KTA-Oracle tool bridge
- **PostgreSQL** + **Drizzle ORM**, **Redis**
- **Zod**, **Vitest**, **Pino**
- **KeetaNet** — [`@keetanetwork/keetanet-client`](https://www.npmjs.com/package/@keetanetwork/keetanet-client) (`Client`, `UserClient`, `lib.Account`)

## Repo layout

- `packages/types` — shared Zod schemas
- `packages/adapter-*` — venue adapters + registry (includes [`adapter-oracle-rail`](packages/adapter-oracle-rail/src/cctp-rail-adapter.ts) for Oracle-guided USDC/CCTP-shaped rails)
- `packages/wallet` — `Signer` boundary + dev signer (never for production Keeta native transfers)
- `packages/keeta` — **Keeta SDK wrapper**: chain health, balances, read-only `UserClient`, worker signing helpers, native `send` via `UserClient.send`
- `packages/core` — pipeline types + **Phase 3 design hooks** ([`future-hooks.ts`](packages/core/src/future-hooks.ts))
- `packages/policy`, `routing`, `simulator`, `storage`, `telemetry`, `agent-runtime`, `sdk`
- `apps/mcp` — stdio MCP server (bootstrap/discovery/execute tools + Oracle tools)
- `infrastructure/migrations` — Drizzle SQL migrations
- `examples/*` — small CLI samples (also surfaced as **strategy templates** in the dashboard after seed); see `examples/oracle-payment-playbook`, `examples/simulation-fidelity`, and `examples/mock-live-run` (`--cctp` for the second rail)

## What is real vs placeholder

| Area | Status |
|------|--------|
| Keeta RPC reads (`Client.getChain`, `getAccountInfo`, `getAllBalances`, `getNodeStats`) | **Real** via `@keetanetwork/keetanet-client` |
| Native KTA transfer execution | **Real** via `UserClient.send` when `LIVE_MODE_ENABLED`, `KEETA_SIGNING_SEED`, and intent metadata are set (worker only) |
| `Signer.sign` + `signAndSubmit` for Keeta | **Not used** — Keeta blocks are signed by the SDK `Account`; `signAndSubmit` throws by design |
| Mock DEX / mock anchor adapters | **Simulated** (unchanged) |
| DEX / anchor adapters on Keeta venues | **Future** — plug into `VenueAdapter` + registry |
| `buildTransferTx` / `submitTx` byte paths | **Legacy stubs** for tests; real path is `sendTransferWithUserClient` |

## Security model

- **Agent runtime** only references the `Signer` **type** from `@keeta-agent-sdk/wallet` (for non-Keeta or future KMS bridges).
- **Never** import `DevSigner` or seeds into `packages/agent-runtime` or API routes.
- **Live Keeta native transfers**: `KEETA_SIGNING_SEED` is read **only in the worker**; `UserClient` is injected into `ExecuteContext.extensions` under `keetaUserClient` for the `keeta-transfer` adapter.
- **Policy**: `live_mode_enabled` policy rule still gates `intent.mode === 'live'`.
- **Keeta policy extension**: when `KEETA_POLICY_ENABLED=true`, the worker runs a chain/account preflight and passes `keetaHints` into `PolicyEngine`. The `keeta_extension` rule requires those hints; certificate-level checks are a future extension.

## Simulation fidelity (`POST /simulations/run`)

`SimulationScenario` includes `fidelityMode`:

| Mode | Behavior |
|------|----------|
| `standard` | Synthetic latency/slippage only (default). |
| `shadow` | Attaches live **Keeta chain + wallet balance** snapshot to the result — **no** transaction submit. |
| `replay` | Same as shadow plus a **`replayAnchor`** string (ledger block count + timestamp) for correlating backtests. |

Pass `scenario: { fidelityMode: 'shadow' }` (or `'replay'`) in the simulation job body. The worker fills `SimulationResult.keetaSnapshot`.

## Live Keeta integration (how to run)

1. **Environment** (see [`.env.example`](.env.example)):
   - `KEETA_NETWORK` — `main` \| `staging` \| `test` \| `dev` (default `test`).
   - `LIVE_MODE_ENABLED=true` — required for live intents at the policy layer.
   - `KEETA_SIGNING_SEED` — hex seed for the signing account (**worker only**).
   - `KEETA_ACCOUNT_INDEX` — account index for `Account.fromSeed` (default `0`).
   - `KEETA_EXPLORER_TX_URL_TEMPLATE` — optional; use `{hash}` placeholder for explorer links on execution rows.

2. **Intent metadata for `keeta-transfer`**:
   - `metadata.transferTo` — destination Keeta address string.
   - `metadata.amountAtomic` — optional base-unit amount (integer string). If omitted, the route step `sizeIn` integer part is used.

3. **Route**: the first step must target adapter `keeta-transfer` (router + policy must allow it).

4. **API / dashboard**:
   - `GET /chain/health` — node RTT, ledger counters, base token + network address (read-only client).
   - `GET /oracle/status`, `GET /oracle/tools`, `GET /oracle/rate`, `GET /oracle/compare` — KTA-Oracle passthrough endpoints.
   - `GET /oracle/mcp/tools`, `POST /oracle/mcp/tools/:name` — full KTA-Oracle MCP tool catalog + generic tool execution proxy.
   - `POST /oracle/autopilot/payment-plan` — one-call agent playbook (rate + rails + exchange + optional compliance/snippet).
   - `GET /executions` — persisted executions including `tx_hash`, `settlement_state`, `receipt`.
   - `GET /strategy-templates` — seeded product templates.
   - `GET /wallets/:id/balances` — live Keeta balances for the wallet address.

## MCP server (`apps/mcp`)

This monorepo includes a first-party MCP server that merges:

- Dynamic Keeta SDK discovery/execution from [`kta-mcp`](https://github.com/schenkty/kta-mcp) patterns
- Oracle-facing tools (`keeta_oracle_*`) plus full mirrored KTA-Oracle tool names (17 tools) backed by [`KTA-Oracle`](https://github.com/Elemzir/KTA-Oracle)
- Phase 3 orchestration tool: `keeta_agent_payment_playbook` for one-call payment planning

Mirrored KTA-Oracle tools include:
`get_kta_rate`, `get_exchange_instructions`, `compare_payment_rails`, `get_currencies_by_region`, `check_payment_status`, `get_keeta_facts`, `get_oracle_info`, `get_wallet_onboarding`, `activate_subscription`, `validate_business_entity`, `get_compliance`, `get_kta_market_data`, `get_sdk_snippet`, `get_anchor_info`, `get_agent_onboarding`, `get_legal_rights`, `manage_social_alerts`.

For forward compatibility, MCP also exposes `keeta_oracle_discover_upstream_tools` and `keeta_oracle_call` so new upstream Oracle tools can be used without waiting for a repo release.

## Agent SDK (HTTP client)

`@keeta-agent-sdk/sdk` now includes Oracle-first helpers in addition to intent/simulation methods:

- `oracleStatus()`, `oracleTools()`, `oracleRate()`, `oracleCompare()`
- `oracleListMcpTools()`, `oracleCallMcpTool(name, args)`
- `oraclePaymentPlan({...})` (calls `POST /oracle/autopilot/payment-plan`)

Run it locally:

```bash
pnpm --filter @keeta-agent-sdk/mcp dev
```

or:

```bash
pnpm --filter @keeta-agent-sdk/mcp build
pnpm --filter @keeta-agent-sdk/mcp start
```

### Runtime Middleware Hooks

`@keeta-agent-sdk/agent-runtime` now supports optional pipeline hooks for custom agent behavior:

- `beforeQuote`, `afterRoute`
- `beforePolicy`, `afterPolicy`
- `beforeSimulation`, `afterSimulation`
- `beforeExecute`, `afterExecute`

Hooks receive a mutable context with `intent`, `route`, `routes`, and current outputs, so extensions can do lightweight logging, policy overlays, or pre/post checks without forking the runtime.

## Adapter contract

Each adapter implementation should pass `runAdapterContractSuite` (see `packages/adapter-base/src/contract.ts`). Use `runAdapterConformanceSuite` for extended timeout/latency checks (`packages/adapter-base/src/conformance.ts`).

## Operational model (Trust Layer)

This repo layers **reliability**, **audit**, **observability**, **operator controls**, and **portfolio policy** without moving signing out of the worker.

| Concern | Behavior |
|--------|----------|
| **Intent lifecycle** | Row status progresses `created` → `quoted` → `routed` → `policy_checked` → `executed` or `failed`; operators may set `held` and release. |
| **BullMQ** | Centralized timeouts/backoff in `packages/config/src/bullmq.ts`. API enqueues with deterministic `jobId`s (`quote:{id}`, `route:{id}`, …) for deduplication. |
| **Execute dedup** | Live path skips a second submit when the latest execution is already `submitted` / `confirmed` / `unknown` settlement (see worker). |
| **Kill switch** | `EXECUTION_KILL_SWITCH` or `system_settings.execution_kill_switch` blocks execute jobs. |
| **Strategy pause** | `strategies.paused`; worker skips execute. Pause/unpause via `POST /ops/strategies/:id/pause` (requires `OPS_API_KEY` when set). |
| **Approvals** | `requires_approval` + `approval_status` on intents; live execute requires `approved` unless `mode === simulate`. |
| **Audit** | Append-only `execution_audit_events`; optional `policy_snapshots`, `intent_snapshots`, `route_snapshots`. |
| **Metrics** | `metric_samples` table; worker cron samples queue depths; `GET /ops/metrics` (optional `OPS_API_KEY`). |
| **Reconciliation** | Repeat job on `execution-reconciliation` scans stale `submitted`/`unknown` rows and records audit ticks. |
| **Portfolio policy** | Extra caps on `PolicyConfig` (daily trades, unsettled count, exposure, notional); contributions persisted on `policy_decisions` and summarized in `portfolio_state`. |

**What makes this production-credible:** explicit execution states, bounded Keeta retries on transient RPC errors, persisted failures (`job_failures`), stuck-job telemetry, first-party metrics API, audited admin policy evaluation (`POST /policy/evaluate`), and adapter conformance hooks.

### First-time demo

```bash
pnpm demo
```

(brings up Docker services when available, runs `db:migrate` + `db:seed`, then `pnpm dev`.)

## Local development

1. **Install**

   ```bash
   pnpm install
   ```

2. **Infra**

   ```bash
   docker compose up -d
   cp .env.example .env
   ```

3. **Database**

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   Use `pnpm db:generate` when changing Drizzle schema under `packages/storage/src/schema`.

4. **Run API + worker + dashboard**

   ```bash
   pnpm dev
   ```

   - API: `http://localhost:3001` (see `API_PORT`)
   - Dashboard: `http://localhost:3000`

   To include MCP in the same loop, run:

   ```bash
   pnpm dev:all
   ```

5. **Quality**

   ```bash
   pnpm build
   pnpm test
   pnpm test:integration
   pnpm lint
   pnpm typecheck
   ```

   `pnpm test:integration` runs the real API + worker happy path against Postgres and Redis when local infra is available.

## Environment

See [`.env.example`](.env.example). Key variables:

- `DATABASE_URL`, `REDIS_URL`
- `LIVE_MODE_ENABLED`, `ALLOW_DEV_SIGNER`
- `KEETA_NETWORK`, `KEETA_SIGNING_SEED`, `KEETA_ACCOUNT_INDEX`, `KEETA_EXPLORER_TX_URL_TEMPLATE`
- `KEETA_POLICY_ENABLED` — strict Keeta preflight hints for policy (worker)
- `NEXT_PUBLIC_API_URL` for the dashboard

## Vision alignment (how pieces fit)

- **KTA-Oracle** — global rates, rails, and compliance *intelligence* (planning), exposed via HTTP/MCP and [`buildOraclePaymentPlaybook`](packages/keeta/src/oracle-playbook.ts).
- **API + worker** — durable intent pipeline, policy, and execution (settlement) with signing only in the worker.
- **Adapters** — breadth of rails: native Keeta transfer plus rail-specific adapters (e.g. `oracle-rail-cctp-usdc`); each execution can emit a **normalized receipt** (`railKind`, `railRef`, `network`).
- **Identity policy** — optional `IDENTITY_POLICY_ENABLED` + metadata (`agentId`, `identityAttestation`, `identityCertFingerprint`) evaluated in policy; Keeta certificate verification remains an extension point on `keetaHints.identity`.

## Future expansions (Phase 3 — interfaces only)

Typed **design hooks** live in [`packages/core/src/future-hooks.ts`](packages/core/src/future-hooks.ts). **Verifiable execution journal** is implemented: Postgres table `execution_journal_entries` + [`createVerifiableExecutionJournal`](packages/storage/src/repositories/journal.ts) (worker appends after successful executes). Still interface-only:

- **Multi-account / vault** — `VaultOrchestrator` (see [`InMemoryVaultOrchestrator`](packages/core/src/vault-orchestrator.ts) for tests/dev)
- **Operator cockpit** — `OperatorCockpit`
- **Intent copilot** — `IntentCopilot`

Additional follow-ups:

- Certificate / deep account preconditions on top of `ruleKeetaExtension`
- **Read-only browser demo** route without exposing seeds or unsafe client-side signing

## Known SDK caveats

- `UserClient.send` return shape may be `voteStaple` or publish-aid `blocks`; `receiptFromPublishResult` handles both.
- Block height from the staple is not always exposed in a stable field — `block_height` is reserved for when the SDK exposes it consistently.

## License

Apache-2.0 (default for OSS; change if your org requires otherwise).
