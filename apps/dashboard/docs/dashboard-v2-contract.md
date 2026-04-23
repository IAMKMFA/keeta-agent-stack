# Dashboard V2 — Contract and Security Audit

Phase 0 deliverable from the "Professional Keeta-themed dashboard" plan.
Locks down the role model, auth contract, env vars, and API/data surface **before**
any new UI work.

**Status keys**: `EXISTS` = already in codebase, `NEW` = must be added as backend work
before the relevant dashboard phase can land, `EXTEND` = exists but needs additional
shape/fields for dashboard-v2 use.

---

## 1. Existing dashboard routes (pre-v2)

Enumerated from [apps/dashboard/app/](../../app) tree.

| Route                | Kind            | Audience today | Notes |
|----------------------|-----------------|----------------|-------|
| `/`                  | Server page     | Any            | Loads `/config/modes`, `/health`, `/adapters`, `/intents`, `/routes`, `/executions`, `/simulations`, oracle status. |
| `/adapters`          | Server page     | Any            | |
| `/anchors`           | Server page     | Any            | |
| `/executions`        | Server page     | Any            | |
| `/intents`           | Server page     | Any            | |
| `/ops`               | Server page     | Operator-ish   | Pulls `/ops/metrics`; requires server-only `OPS_API_KEY`. |
| `/routes`            | Server page     | Any            | |
| `/simulations`       | Server page     | Any            | |
| `/templates`         | Server page     | Any            | |
| `/wallets`           | Server page     | Any            | |
| `/api/events/stream` | Route handler   | Any            | Server-side SSE proxy to API `/events/stream`; forwards `x-ops-key` if `OPS_API_KEY` is set. |

Shared components: [components/Shell.tsx](../../components/Shell.tsx),
[components/StatusCard.tsx](../../components/StatusCard.tsx),
[components/DataTable.tsx](../../components/DataTable.tsx),
[components/LiveOpsRail.tsx](../../components/LiveOpsRail.tsx),
[components/OracleAutopilotForm.tsx](../../components/OracleAutopilotForm.tsx),
[components/McpToolConsole.tsx](../../components/McpToolConsole.tsx).

Data layer: [lib/api.ts](../../lib/api.ts) — `fetchJson`, `postJson`, `requestJson`;
`cache: 'no-store'` already set on all fetches.

---

## 2. Existing backend API routes used by the dashboard

Verified by grepping [apps/api/src/routes/](../../../api/src/routes).

### Unauthenticated / open

| Route             | File                                                            |
|-------------------|-----------------------------------------------------------------|
| `GET /health`     | [health.ts](../../../api/src/routes/health.ts)                  |
| `GET /adapters`   | [adapters.ts](../../../api/src/routes/adapters.ts)              |
| `GET /config/modes` | [config-modes.ts](../../../api/src/routes/config-modes.ts)    |
| `GET /chain/health` | [chain.ts](../../../api/src/routes/chain.ts)                  |
| `GET /openapi.json` | [openapi.ts](../../../api/src/routes/openapi.ts)              |

### `viewer`+ (JWT or ops key)

| Route                             | File                                                            |
|-----------------------------------|-----------------------------------------------------------------|
| `GET /intents`                    | [intents.ts](../../../api/src/routes/intents.ts)                |
| `GET /intents/:id`                | intents.ts                                                      |
| `GET /routes`                     | [routes.ts](../../../api/src/routes/routes.ts)                  |
| `GET /executions`                 | [executions.ts](../../../api/src/routes/executions.ts)          |
| `GET /simulations` `GET /simulations/:id` | [simulations.ts](../../../api/src/routes/simulations.ts) |
| `GET /wallets` `GET /wallets/:id/balances` | [wallets.ts](../../../api/src/routes/wallets.ts)       |
| `GET /anchors` `GET /anchors/:id` | [anchors.ts](../../../api/src/routes/anchors.ts)                |
| `GET /strategy-templates`         | [templates.ts](../../../api/src/routes/templates.ts)            |
| `GET /events` `GET /events/stream` | [events.ts](../../../api/src/routes/events.ts)                 |
| `GET /policy/rules` `GET /policy/packs` | [policy-admin.ts](../../../api/src/routes/policy-admin.ts) |
| `GET /ops/webhooks` `GET /ops/webhook-deliveries` | [webhooks.ts](../../../api/src/routes/webhooks.ts) |
| `GET /oracle/*`                   | [oracle.ts](../../../api/src/routes/oracle.ts)                  |

### `operator`+ (JWT operator or ops key)

| Route                                  | Notes |
|----------------------------------------|-------|
| `GET /ops/metrics`                     | Metric samples; 500-row cap. |
| `POST /intents` / `POST /intents/:id/{quote,route,policy,execute,hold,release,approve}` | Full pipeline. |

### `admin` (JWT admin only; bypass token where explicitly allowed)

| Route                                                | Notes |
|------------------------------------------------------|-------|
| `POST /ops/strategies/:id/pause`                     | |
| `POST /ops/strategies/:id/unpause`                   | |
| `GET|PUT|DELETE /ops/strategies/:id/policy-pack`     | |
| `POST|PATCH|DELETE /policy/packs*`                   | |
| `POST /policy/evaluate`                              | `allowAdminBypassToken: true`. |
| `POST /ops/webhooks` `PATCH /ops/webhooks/:id`       | |
| `POST /anchors` `POST /anchors/reconcile` `POST /anchors/onboarding/run` `PATCH /anchors/:id` `POST /anchors/:id/status` `PATCH /anchors/:id/bond` | |

### Kill switch

**Does not exist today** under `/ops/kill-switch`. The worker respects
`EXECUTION_KILL_SWITCH` as an env var (see [.env.example](../../../../.env.example))
but there is no REST endpoint to toggle it at runtime. See §8 (Gaps).

---

## 3. Auth / session source

Authoritative file: [apps/api/src/lib/auth.ts](../../../api/src/lib/auth.ts).

### Principal types

```ts
export type AuthRole = 'viewer' | 'operator' | 'admin';

export interface AuthPrincipal {
  authType: 'jwt' | 'ops-key' | 'admin-token';
  subject?: string;
  roles: AuthRole[];
  claims?: JWTPayload;
}
```

### Token sources (in precedence order)

1. **JWT**: `Authorization: Bearer <token>`. Validated via `AUTH_JWT_SECRET`, or a
   PEM public key (`AUTH_JWT_PUBLIC_KEY_PEM`), or `AUTH_JWT_JWKS_URL`, or
   OIDC discovery (`AUTH_JWT_OIDC_DISCOVERY_URL` / `AUTH_JWT_OIDC_ISSUER`).
   Roles extracted from `payload.roles[]`, `payload.role`, or space-separated
   `payload.scope`.
2. **Admin bypass token** (optional): `x-admin-token: <token>`, matches
   `ADMIN_BYPASS_TOKEN`. Only honored when the route opts in with
   `allowAdminBypassToken: true`. In production, additionally requires
   `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION=true`.
3. **Legacy ops key** (service credential): `x-ops-key: <key>` matches
   `OPS_API_KEY`. Grants the role configured by `AUTH_LEGACY_OPS_API_KEY_ROLE`
   (default `operator`). In production, requires
   `AUTH_ALLOW_LEGACY_OPS_API_KEY=true`.

### Critical rules (dashboard v2)

- **`OPS_API_KEY` is a server-side service credential; it never represents a
  human identity.** The dashboard may use `OPS_API_KEY` in server-only contexts
  (route handlers, server components) to call backend ops endpoints **after**
  verifying the viewer's JWT identity.
- **No `NEXT_PUBLIC_OPS_API_KEY`.** Verified: zero occurrences in the repo
  (Phase 3 removed it).
- **No `NEXT_PUBLIC_*` secrets of any kind.** `NEXT_PUBLIC_API_URL` is the
  only public var and is non-sensitive.

### Missing for v2: tenant + exec roles

The existing `AuthRole` union (`viewer | operator | admin`) does not yet
express:

- **`tenant`** — a customer-scoped user whose view is filtered by `tenantId`.
- **`exec`** — a read-only stakeholder who sees KPIs but no mutation surface.

Proposed mapping (landed alongside Phase A):

```ts
export type DashboardRole = 'admin' | 'operator' | 'tenant' | 'exec' | 'anonymous';
```

Derivation from today's principal:

| Principal                                              | DashboardRole |
|--------------------------------------------------------|---------------|
| JWT with role `admin`                                  | `admin`       |
| JWT with role `operator`                               | `operator`    |
| JWT with custom claim `dashboard_role=tenant` + `tenant_id` | `tenant`  |
| JWT with custom claim `dashboard_role=exec`            | `exec`        |
| JWT with only `viewer` and no `dashboard_role` claim   | `exec` (treat viewer-only JWTs as read-only exec by default) |
| ops-key / admin-token                                  | not a dashboard viewer identity; never returned by `/me` |
| missing auth                                           | `anonymous`   |

JWT claim schema for Phase A's `/me`:

```json
{
  "sub": "user_123",
  "role": "operator",
  "dashboard_role": "operator",       // optional override for exec/tenant
  "tenant_id": "tenant_abc",          // required when dashboard_role === 'tenant'
  "scopes": ["ops:read", "ops:write", "kill_switch:write"],
  "name": "Jane Operator"
}
```

### Capability model (dashboard-only; not enforced by the API today)

```ts
export type Capability =
  | 'ops:read'     | 'ops:write'
  | 'tenant:read'  | 'tenant:write'
  | 'exec:read'
  | 'kill_switch:read' | 'kill_switch:write'
  | 'webhooks:read'    | 'webhooks:write'
  | 'policy:read'      | 'policy:write'
  | 'rails:read';
```

The dashboard's `requireScope(cap)` helper checks `viewer.scopes`. **UI
capability checks are cosmetic**; every privileged route on the API enforces
the underlying `AuthRole` independently. V2 does not try to rewire every API
route to capability-level auth — that's a separate backend migration.

---

## 4. Current env var inventory

Reconciled with [.env.example](../../../../.env.example) and
[packages/config/src/index.ts](../../../../packages/config/src/index.ts).

### Dashboard (`apps/dashboard`)

| Var                                    | Public? | Purpose |
|----------------------------------------|---------|---------|
| `NEXT_PUBLIC_API_URL`                  | Public  | Base URL used by the server and, via `lib/api.ts`, the browser. Non-sensitive. |
| `OPS_API_KEY`                          | Server-only | Service credential forwarded to backend ops routes as `x-ops-key`. Used in `app/ops/page.tsx` and `app/api/events/stream/route.ts`. Must never leak to the browser bundle. |
| `API_URL`                              | Server-only | Fallback used by `app/api/events/stream/route.ts` when `NEXT_PUBLIC_API_URL` is absent. |
| `KEETA_EXPLORER_TX_URL_TEMPLATE`       | Server-only | Used to format explorer links. Non-sensitive; could move to public if needed. |
| `NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE` | Public | Backup of above. Non-sensitive. |

Planned additions for v2:

| Var                     | Public? | Purpose |
|-------------------------|---------|---------|
| `DASHBOARD_V2_ENABLED`  | **Server-only** | Gate new v2 routes/nav. Client components receive a safe boolean only. |
| `AUTH_COOKIE_NAME`      | Server-only | Name of the session cookie forwarded to `/me`. Defaults to `keeta_session`. |

No `NEXT_PUBLIC_DASHBOARD_V2`. No `NEXT_PUBLIC_OPS_*`. No public flags that
gate security-sensitive surfaces.

### API (`apps/api`)

All env vars are server-only. Full list in [packages/config/src/index.ts](../../../../packages/config/src/index.ts).

---

## 5. `/me` contract

New route, added in Phase A as [apps/api/src/routes/me.ts](../../../api/src/routes/me.ts).

```
GET /me
```

**Authentication**: derived **only** from the incoming
`Authorization: Bearer <jwt>` header (and/or cookie-relayed JWT if the
deployment places JWTs in a cookie). `x-ops-key` and `x-admin-token` **must
not** authenticate `/me` — they are service credentials, not identities.

**Responses**:

- `401 Unauthorized` — no JWT or JWT invalid. Body:
  `{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }`.
- `200 OK` — authenticated. Body:
  ```ts
  {
    role: 'admin' | 'operator' | 'tenant' | 'exec';
    displayName?: string;
    tenantId?: string;          // present iff role === 'tenant'
    scopes: Capability[];        // subset of the Capability union above
    authType: 'jwt';             // always jwt today
  }
  ```

**Caching**: `cache-control: no-store` on both the API and the dashboard
server fetch. The dashboard's `getViewer()` memoizes with React's
`cache()` so the same request doesn't hit `/me` twice, but **never** across
requests.

**Cookie forwarding**: the dashboard route handler proxies `cookie` and
`authorization` headers untouched to `/me`.

---

## 6. New backend endpoints required by dashboard v2

| Endpoint                                                    | Status | Required by |
|-------------------------------------------------------------|--------|-------------|
| `GET /me`                                                   | NEW    | Phase A     |
| `GET /ops/kill-switch` `POST /ops/kill-switch`              | NEW    | Phase B (Command Center) |
| `GET /anchors/health`                                       | NEW    | Phase D (Anchor & Bond Health) |
| `GET /ops/fees/aggregate`                                   | NEW (see §7) | Phase D (Cost & Fees) |
| `GET /intents?tenantId=...` (with backend enforcement)      | EXTEND | Phase E (Tenant surfaces) |
| `GET /wallets?tenantId=...` (with backend enforcement)      | EXTEND | Phase E (Tenant surfaces) |

**Guard rule**: phases that depend on a `NEW` endpoint must not build UI
until the endpoint lands. Phase D's Cost page in particular is blocked by §7.

---

## 7. Data validation — fees, indexes, materialization

### Where are fees stored today?

Reviewed [packages/storage/src/schema](../../../../packages/storage/src/schema).
There is **no dedicated fee column** on `executions` or a separate
`execution_results` table. Fees today live inside:

- `executions.payload` (jsonb) — adapter-specific execution payload.
- `executions.receipt` (jsonb) — normalized receipt after settlement.
- `executions.normalizedReceipt` (jsonb) — post-normalization layer.

### Implication for `/ops/fees/aggregate`

Aggregating fees server-side requires one of:

1. **Extract fees to a generated column** — add `executions.fee_amount
   numeric` and `executions.fee_currency text` populated via a DB trigger or
   worker write path, then index on `(created_at, adapter_id)`.
2. **Materialized view** — nightly refresh of
   `execution_fee_aggregates_daily(bucket, adapter_id, rail, asset, count,
   total_fee, p50_fee, p95_fee)`, refreshed by a worker job.
3. **On-the-fly json extraction** — scan `executions` with
   `(receipt->'fee'->>'amount')::numeric` aggregates. **Only viable for
   small windows** and requires a new index on `created_at`.

**Decision required before Phase D**: pick one of the three. This document
recommends option 1 (generated columns + index) as the smallest change that
keeps the aggregate query fast indefinitely. If picked, the migration goes
into `infrastructure/migrations/0011_execution_fee_columns.sql` and is
populated by the execute worker in [apps/worker/src/run.ts](../../../worker/src/run.ts).

### Index note

`executions_intent_id_idx` (added in migration 0010) speeds up the
intent→executions join but does **not** help time-bucketed fee aggregates.
Phase D needs its own index; that's part of the decision above.

### Phase D acceptance gate

Cost & Fees Analytics either runs against the chosen aggregate implementation
with an index plan that is verified via `EXPLAIN`, or it ships behind a
"preview" flag with a documented materialization follow-up. No dashboard code
lands assuming a fee column that doesn't exist.

---

## 8. Gaps and follow-ups

### Must-fix before a given phase

- **Phase A**: `/me` does not exist; `DashboardRole` / `Capability` unions do
  not exist; JWT claim convention for `dashboard_role` / `tenant_id` / `scopes`
  is not documented. All three land in Phase A as part of the
  [apps/api/src/routes/me.ts](../../../api/src/routes/me.ts) deliverable plus
  [apps/dashboard/lib/auth.ts](../../lib/auth.ts).
- **Phase B**: kill-switch REST endpoint does not exist. Either add
  `GET|POST /ops/kill-switch` (operator read, admin write with
  `kill_switch:write` scope) or ship the Command Center's kill-switch panel
  read-only in Phase B and wire mutation in a follow-up.
- **Phase D**: anchor health aggregate endpoint does not exist; no
  dashboard-safe shape for bond coverage / reconciliation age. Must land
  before UI.
- **Phase D**: fee storage model requires the decision in §7.

### MCP import prohibition

The dashboard **must not** import `apps/mcp/src/tools/*` files (including
[anchor-chaining.ts](../../../mcp/src/tools/anchor-chaining.ts)). Any shared
anchor-chaining logic that the dashboard needs moves to `packages/keeta` or
gets exposed via a stable `apps/api` endpoint. Phase A adds an ESLint rule
(or similar) to enforce this.

### SDK in browser prohibition

`@keeta-agent-sdk/sdk` assumes server-only use (it reads `OPS_API_KEY` /
`API_URL` from env). The dashboard imports it only from server components
and route handlers — never from `'use client'` modules. Phase A adds a lint
rule to block SDK imports from client-boundary files.

---

## 9. Sign-off checklist

- [x] Dashboard routes enumerated.
- [x] Backend API routes enumerated.
- [x] Auth principal and token precedence documented.
- [x] `OPS_API_KEY` confirmed server-only in repo.
- [x] Zero `NEXT_PUBLIC_*` secrets.
- [x] Role + capability model locked.
- [x] `/me` contract written.
- [x] New backend endpoints flagged (`NEW`/`EXTEND`).
- [x] Fees data model validated; decision logged as required before Phase D.
- [x] MCP import prohibition documented.
- [x] SDK-in-browser prohibition documented.

Phase A can begin.

---

## 10. Final rollout status (Phases A–G complete)

### New backend endpoints shipped

| Endpoint                    | File                                       | Phase |
|-----------------------------|--------------------------------------------|-------|
| `GET /me`                   | `apps/api/src/routes/me.ts`                | A     |
| `GET /policy/decisions`     | `apps/api/src/routes/policy-admin.ts`      | C     |
| `GET /rails/catalog`        | `apps/api/src/routes/rails.ts`             | D     |
| `GET /anchors/health`       | `apps/api/src/routes/anchors.ts`           | D     |
| `GET /ops/fees/aggregate`   | `apps/api/src/routes/fees.ts`              | D     |

### New dashboard routes shipped

| Route                         | Role gate                      | Capability gate |
|-------------------------------|--------------------------------|-----------------|
| `/` (redirect)                | any authenticated              | — (role-based)  |
| `/command-center`             | admin, operator                | `ops:read`      |
| `/live`                       | admin, operator                | `ops:read`      |
| `/policy`                     | admin, operator                | `policy:read`   |
| `/anchors-health`             | admin, operator                | `ops:read`      |
| `/webhooks`                   | admin, operator                | `webhooks:read` |
| `/cost`                       | admin, operator                | `ops:read`      |
| `/overview`                   | admin, operator, exec          | `exec:read`     |
| `/home`                       | admin, operator, tenant        | `tenant:read`   |
| `/rails`                      | admin, operator, tenant, exec  | `rails:read`    |
| `/forbidden`, `/login`        | any                            | —               |

All operator/admin/exec/tenant pages are wrapped in role-gated route groups
(`apps/dashboard/app/(authenticated)/(operator|exec|tenant)/layout.tsx`).
The SSE proxy at `app/api/events/stream/route.ts` enforces `requireRole(['admin','operator'])`.

### Automated tests

Unit tests run via `pnpm --filter @keeta-agent-sdk/dashboard test`
(Vitest, 24 cases across 3 files):

- `tests/permissions.test.ts` — `hasRole`, `hasScope`, `roleHome`.
- `tests/nav.test.ts` — role-scoped nav filtering; negative cases for tenant/exec/anonymous;
  `NAV_ITEMS` integrity invariants.
- `tests/flags.test.ts` — `DASHBOARD_V2_ENABLED` and `DASHBOARD_DEV_VIEWER_ROLE`
  semantics (incl. prod-safety of dev viewer override).

Playwright persona coverage (operator / tenant / exec / unauthorized) is
scoped as a follow-up. The Vitest suite proves the pure role/scope gating
logic; live route guards are exercised through server components that call
`requireRole` / `requireScope` / `requireTenantAccess` in
`apps/dashboard/lib/auth.ts`, which redirect to `/login` or `/forbidden`.

### Environment variable rollout

| Var                           | Where           | Purpose                                   |
|-------------------------------|-----------------|-------------------------------------------|
| `DASHBOARD_V2_ENABLED`        | Server only     | Rollout boolean; default `true`.          |
| `DASHBOARD_DEV_VIEWER_ROLE`   | Server only     | Dev override; ignored in production.      |
| `OPS_API_KEY`                 | Server only     | Service credential for privileged ops API calls. |
| `API_URL`                     | Server only     | Upstream Fastify base URL.                |
| `KEETA_EXPLORER_TX_URL_TEMPLATE` | Server/public | Explorer link template.                   |

No `NEXT_PUBLIC_DASHBOARD_V2` is used. No new `NEXT_PUBLIC_*` secrets were introduced.

### Theme token migration

`--keeta-*` tokens were introduced alongside `--hub-*` aliases. All refreshed
pages now reference `--keeta-*` directly; legacy components retain `--hub-*`
which continue to alias correctly. Any future drop of `--hub-*` is a single
search-and-replace follow-up.

---

## 11. Dashboard V2 Security Addendum rules

### Route-collision guard (A1)

- Any two `page.tsx` / `route.ts` files under `apps/dashboard/app/` that resolve
  to the same URL path (after stripping `(group)` and `_private` segments) are
  a hard build break.
- Enforced by `apps/dashboard/scripts/check-duplicate-routes.ts`, wired into
  `pnpm --filter @keeta-agent-sdk/dashboard test` via the `check:routes`
  script. CI fails if two pages claim the same slug, e.g. `/rails` existing
  at `(authenticated)/rails/page.tsx` and `(authenticated)/(operator)/rails/page.tsx`
  simultaneously.

### SSE proxy rule (A4)

- The browser must **never** open an `EventSource` directly to the backend
  Fastify `/events` surface. All SSE goes through the dashboard-owned proxy
  route handler `apps/dashboard/app/api/events/stream/route.ts`, which
  re-authorizes the viewer with `requireRole(['admin','operator'])` and
  forwards the server-only `OPS_API_KEY` on to the API.
- Clients (`'use client'` files) must call `new EventSource('/api/events/...')`
  with a relative path. The duplicate-route script also scans for
  `new EventSource(` calls in client components and fails the build if any
  argument is not a relative `/api/...` string literal (e.g.
  `process.env.NEXT_PUBLIC_API_URL + '/events/stream'` is rejected).

### CSRF / origin enforcement (A3)

- All dashboard mutation route handlers (any `POST|PUT|PATCH|DELETE` under
  `apps/dashboard/app/api/**`) must:
  1. Call `requireSameOriginMutation(req)` from `apps/dashboard/lib/csrf.ts`,
     which checks the HTTP method, `Origin` (fallback `Referer`), and
     `Sec-Fetch-Site`.
  2. Call `await verifyCsrfToken(req)`, which performs a double-submit cookie
     check against the `x-dashboard-csrf` header.
  3. Re-check viewer role + scope (`requireRole` / `requireScope`).
  4. Require an explicit `confirm=<ACTION>` body token for destructive
     actions.
- The root layout emits a signed `__Host-dashboard_csrf` cookie plus a
  non-httpOnly client-readable `dashboard_csrf_client` cookie on first render,
  signed with the server-only `DASHBOARD_CSRF_SECRET`.
- Today, only the kill-switch mutation routes exist; they return `501 Not
  Implemented` with `{ error: { code: 'kill_switch_backend_pending' } }`
  until the backend endpoint lands (see §8).

### Feature-flag behavior (A5)

- `DASHBOARD_V2_ENABLED=false` hides every V2-marked nav item and causes
  V2-only routes (`/command-center`, `/live`, `/policy`, `/anchors-health`,
  `/webhooks`, `/cost`, `/overview`, `/home`, `/rails`) to return `404` via
  `requireV2Enabled()` in `apps/dashboard/lib/flags.ts`.
- Legacy surfaces (`/legacy`, `/intents`, `/executions`, `/wallets`,
  `/adapters`, `/simulations`, `/anchors`, `/templates`, `/ops`, `/routes`)
  remain available regardless of the flag value so operators never lose
  their fallback.
- Backend guards are **not** gated by this flag. The flag is strictly a UI
  rollout control and never a security boundary.

### /me runtime validation (A2)

- `apps/dashboard/lib/auth.ts` runs a Zod schema on `/me` responses before
  constructing a `Viewer`. Invalid role, missing `tenantId` on a tenant, or
  invalid scopes → the viewer falls back to `ANONYMOUS_VIEWER` and the page
  redirects to `/login`. Fail-closed behavior is covered by
  `apps/dashboard/tests/auth-schema.test.ts`.

### Cache audit (A6)

- Every dashboard-to-API read must be `cache: 'no-store'` unless the endpoint
  is explicitly designed for long-lived caching (currently none are). The
  following endpoints have been audited and are confirmed no-store:

  | Endpoint family                                      | Source                                      |
  |------------------------------------------------------|---------------------------------------------|
  | `/me`                                                | `apps/dashboard/lib/auth.ts`                |
  | `/intents`, `/executions`, `/simulations`, `/wallets`, `/anchors`, `/templates`, `/routes`, `/adapters`, `/config/modes`, `/health`, `/oracle/*`, `/policy/*`, `/rails/*`, `/ops/*`, `/anchor-bonds`, `/webhook-deliveries` | `apps/dashboard/lib/api.ts` |
  | SSE `/api/events/stream`                              | `apps/dashboard/app/api/events/stream/route.ts` |
  | CSRF-guarded mutations (`/api/ops/kill-switch/*`)    | Dashboard route handlers                    |

- Enforced by an ESLint `no-restricted-syntax` rule that flags bare `fetch(`
  calls outside `apps/dashboard/lib/api.ts`, `apps/dashboard/lib/auth.ts`, and
  route-handler files under `apps/dashboard/app/api/**`.

### CI lint (A8)

- `pnpm --filter @keeta-agent-sdk/dashboard lint:security` runs
  `apps/dashboard/scripts/lint-security.ts`, which checks:
  - No `OPS_API_KEY` usage inside `'use client'` files.
  - No `NEXT_PUBLIC_*` env var whose name matches `KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL` in any `.env*` file.
  - No dashboard component prop is named `jwt`, `apiKey`, `authorization`, or `opsKey`.
  - Invokes `check-duplicate-routes.ts` for route + EventSource assertions.
- Wired into the repo `turbo` lint task so CI blocks merges.

---

## 12. Endpoint inventory (A7)

Every dashboard→API endpoint covered by Dashboard V2. Columns:

- **Method / Path** — HTTP verb and route on the upstream Fastify API (`apps/api`).
- **Owner** — file that implements the upstream route (or the dashboard route handler when the path is a dashboard-owned proxy).
- **Status** — `EXISTS` already in repo, `NEW` shipped in Phases A–D, `PROPOSED` designed but backend not yet implemented.
- **Roles / Scopes** — who may call it; see §3 for the mapping from `AuthRole` to `DashboardRole` and the capability matrix in §3.
- **Tenant scoping** — how rows are filtered for tenant viewers.
- **Pagination** — `cursor` / `limit` convention, if any.
- **Cache** — dashboard-side read mode (`no-store` is the default; no endpoint is long-cached today).
- **PII** — whether the response may carry PII that the dashboard must redact before rendering.
- **Audit** — whether the upstream writes an audit log entry.
- **DB notes** — indexes / materialization that the endpoint depends on.

### 12.1 Viewer identity

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /me` | `apps/api/src/routes/me.ts` | EXISTS (Phase A) | jwt only | — (returns the viewer's own scopes) | n/a — `/me` returns the caller's `tenantId` | cookie + `Authorization` forwarded verbatim | `{ role, displayName?, tenantId?, scopes, authType }` validated by `MeResponseSchema` in `apps/dashboard/lib/auth.ts` | none | `no-store` on both sides; memoized per-request via React `cache()` | `displayName` may be a real name | no (identity lookup) | no DB write |

### 12.2 Real-time stream

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /api/events/stream` (dashboard proxy) | `apps/dashboard/app/api/events/stream/route.ts` | EXISTS | admin, operator | `ops:read` | — (ops-only today) | relative only; no direct upstream call from browser (enforced by `check-duplicate-routes.ts`) | `text/event-stream` | infinite; MAX_EVENTS buffer client-side | `Cache-Control: no-cache, no-transform` | events may carry PII (redact before rendering) | stream-level | no DB write |
| `GET /events/stream` (upstream) | `apps/api/src/routes/events.ts` | EXISTS | viewer+ (API-level) | — | `tenant_id`-filtered topics | `Accept: text/event-stream`; `x-ops-key` when forwarded via proxy | SSE | infinite | `no-store` | same as above | no | relies on `events` table |

### 12.3 Ops / operator surface

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /ops/metrics` | `apps/api/src/routes/ops-metrics.ts` (legacy `ops.ts`) | EXISTS | operator+ | `ops:read` | — | `?range=1h|24h|7d` | `{ samples: MetricSample[] }` capped at 500 rows | row-cap; no cursor | `no-store` | no | no | indexed on `(metric_key, captured_at desc)` |
| `GET /config/modes` | `apps/api/src/routes/config-modes.ts` | EXISTS | viewer+ | `ops:read` for dashboard use | — | — | `{ liveMode, keetaNetwork, mockAdapters, executionKillSwitch }` | — | `no-store` | no | no | reads `app_modes` table |
| `GET /ops/kill-switch` | — | PROPOSED | operator+ | `kill_switch:read` | — | — | `{ engaged: boolean, actor?, updatedAt? }` | — | `no-store` | no | no | requires dedicated table or config mutation path |
| `POST /api/ops/kill-switch/engage` (dashboard proxy) | `apps/dashboard/app/api/ops/kill-switch/engage/route.ts` | EXISTS (501) | admin, operator | `kill_switch:write` | — | JSON `{ confirm: "ENGAGE" }` + `x-dashboard-csrf` header | `501` `{ error: { code: 'kill_switch_backend_pending' } }` until backend lands | — | `no-store` | no | dashboard-level audit via `lib/audit.ts` | — |
| `POST /api/ops/kill-switch/disengage` (dashboard proxy) | `apps/dashboard/app/api/ops/kill-switch/disengage/route.ts` | EXISTS (501) | admin, operator | `kill_switch:write` | — | JSON `{ confirm: "DISENGAGE" }` + `x-dashboard-csrf` header | `501` as above | — | `no-store` | no | dashboard-level audit | — |

### 12.4 Policy & rails

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /policy/decisions` | `apps/api/src/routes/policy-admin.ts` | EXISTS (Phase C) | operator+ | `policy:read` | tenant viewer forbidden today | `?limit` | `PolicyDecision[]` | limit cap (no cursor yet) | `no-store` | decision detail may reference tenant names | upstream writes audit on mutation routes | reads from `policy_decisions` |
| `GET /rails/catalog` | `apps/api/src/routes/rails.ts` | EXISTS (Phase D) | any authenticated | `rails:read` | — (catalog is global) | `?transports=crypto,native&productionOnly=true` | `{ rails: RailEntry[] }` | — | `no-store` | no | no | in-memory registry |

### 12.5 Anchors & bonds

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /anchors` | `apps/api/src/routes/anchors.ts` | EXISTS | viewer+ | `ops:read` | — | — | `Anchor[]` | — | `no-store` | operator names / treasury refs may be sensitive | no | reads `anchors` |
| `GET /anchors/health` | `apps/api/src/routes/anchors.ts` (Phase D) | EXISTS (Phase D) | operator+ | `ops:read` | — | — | `{ totals, anchors: AnchorHealthRow[] }` | — | `no-store` | same | no | aggregates `anchors`, `anchor_bonds`, `anchor_reconciliation` |
| `GET /anchor-bonds` | `apps/api/src/routes/anchors.ts` | EXISTS | viewer+ | `ops:read` | — | — | `AnchorBond[]` | — | `no-store` | yes | no | reads `anchor_bonds` |

### 12.6 Webhooks

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /ops/webhooks` | `apps/api/src/routes/webhooks.ts` | EXISTS | viewer+ | `webhooks:read` | filtered by `tenantId` for tenants | — | `WebhookEndpoint[]` | — | `no-store` | URLs are sensitive | no | reads `webhooks` |
| `GET /ops/webhook-deliveries` | `apps/api/src/routes/webhooks.ts` | EXISTS | viewer+ | `webhooks:read` | same | `?status, ?endpointId, ?limit` | `WebhookDelivery[]` | limit cap | `no-store` | request/response bodies may contain PII — redact before rendering | no | indexed on `(endpoint_id, created_at desc)` |

### 12.7 Fees aggregate

| Method / Path | Owner | Status | Roles | Scopes | Tenant scoping | Request | Response | Pagination | Cache | PII | Audit | DB notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /ops/fees/aggregate` | `apps/api/src/routes/fees.ts` | EXISTS (Phase D; on-the-fly JSON extraction) | operator+ | `ops:read` | — today | `?bucket=hour|day|week&groupBy=adapter|asset|status|none&windowDays=1..90` | `{ window, bucket, groupBy, totals, buckets: Bucket[] }` | — | `no-store` | no | no | scans `executions` with `(receipt->'fee'->>'amount')::numeric`; small-window only. §7 decision still pending on materialization. |

### 12.8 Tenant-scoped legacy surfaces

For the existing `/intents`, `/executions`, `/wallets`, `/simulations`,
`/adapters`, `/anchors`, `/templates`, `/routes`, `/oracle/*` routes:

- Tenant viewers may only see rows for their own `tenantId`. Backend
  enforcement is still partial — see §8 follow-ups. The dashboard never
  issues cross-tenant queries on behalf of a tenant viewer, and the
  `/my-wallets`, `/my-intents`, `/my-webhooks` routes filter via
  `requireTenantAccess()`.
- All reads go through `fetchJson` in `apps/dashboard/lib/api.ts` and are
  therefore `no-store`.
- Audit logging remains the upstream API's responsibility (dashboard does
  not re-audit reads).

