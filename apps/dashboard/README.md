# Keeta Agent Hub — Dashboard

Next.js 15 (App Router) dashboard for the Keeta Agent Stack, with role-aware navigation and three
distinct personas in a single app:

| Persona     | Home         | Purpose                                                                                               |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| `admin`     | `/dashboard` | Operator cockpit (KPIs, activity, links); `/command-center` remains for the deep-dive command center. |
| `operator`  | `/dashboard` | Same as admin for navigation home; use Command Center, Live, Policy, etc. from the shell.             |
| `exec`      | `/overview`  | Read-only executive KPIs and trends.                                                                  |
| `tenant`    | `/home`      | Scoped wallets, intents, webhooks, read-only rail catalog.                                            |
| `anonymous` | `/login`     | Login gate — all privileged surfaces redirect here.                                                   |

See [`docs/dashboard-v2-contract.md`](docs/dashboard-v2-contract.md) for the full role/capability
matrix, API contracts, env vars, and rollout status. For production rollout (topology, env
hardening, scaling, observability, and platform recipes) see the
[deployment guide](../../docs/deployment.md).

## Auth model

- Human identity comes from a JWT bearer token sent to `GET /me` on the API.
- `OPS_API_KEY` is a **server-only service credential**. It is used by the dashboard server to call
  privileged ops endpoints after the viewer has already been authenticated. It is never in the
  browser bundle and never implies viewer identity.
- Three layers of access control are enforced:
  - **Nav** — `lib/nav.ts` filters links by role + capability.
  - **Layout** — `app/(authenticated)/(operator|exec|tenant)/layout.tsx` calls `requireRole(...)` in
    `lib/auth.ts`.
  - **API/backend** — every Fastify route that powers privileged surfaces performs its own role
    check; the SSE proxy at `app/api/events/stream/route.ts` enforces `requireRole` as well.

For authenticated users with the wrong role, the guards redirect to `/forbidden`. For
unauthenticated requests, the guards redirect to `/login`.

## Environment variables

All server-only unless noted:

| Var                              | Default                 | Purpose                                                                                        |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `API_URL`                        | `http://localhost:3001` | Upstream Fastify base URL.                                                                     |
| `OPS_API_KEY`                    | —                       | Service credential for ops endpoints.                                                          |
| `DASHBOARD_V2_ENABLED`           | `true`                  | Rollout boolean for v2 surfaces.                                                               |
| `DASHBOARD_DEV_VIEWER_ROLE`      | —                       | Dev-only override for local viewer role; ignored in production.                                |
| `KEETA_EXPLORER_TX_URL_TEMPLATE` | —                       | Template for explorer deep links (may use `NEXT_PUBLIC_` variant for non-secret public usage). |

`NEXT_PUBLIC_DASHBOARD_V2` is **not** used — the rollout flag is server-side and resolved per
request. If you need client-side visibility, pass the resolved boolean as a prop from a server
component.

## Local development

```bash
pnpm install
pnpm --filter @keeta-agent-stack/api dev        # upstream API
pnpm --filter @keeta-agent-stack/dashboard dev  # dashboard on :3000
```

Set `DASHBOARD_DEV_VIEWER_ROLE=operator` (or `admin`/`tenant`/`exec`) to stub a local viewer without
standing up a JWT.

## Scripts

| Script          | Purpose                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`           | Next dev server on port 3000.                                                                                                                       |
| `build`         | Production Next build.                                                                                                                              |
| `start`         | Production Next runtime.                                                                                                                            |
| `lint`          | ESLint (Next config).                                                                                                                               |
| `typecheck`     | Strict TypeScript check for all dashboard code.                                                                                                     |
| `check:routes`  | Fails if two App Router pages resolve to the same URL or a client component opens an `EventSource` against an upstream URL. Runs as part of `test`. |
| `test`          | Runs `check:routes` + Vitest unit tests (role/scope/nav/flags/csrf/auth-schema).                                                                    |
| `lint:security` | Scans for `OPS_API_KEY` in client files, `NEXT_PUBLIC_*` secrets in `.env*`, and dangerous component props.                                         |

## Test coverage

`pnpm --filter @keeta-agent-stack/dashboard test` runs route checks plus Vitest unit tests in
`tests/` (permissions, nav, flags, CSRF, auth schema):

- `permissions.test.ts` — `hasRole`, `hasScope`, `roleHome`.
- `nav.test.ts` — role-scoped nav filtering plus negative cases (tenant cannot see
  ops/live/policy/cost; exec sees only read-only surfaces; anonymous sees nothing; nav-item
  integrity invariants).
- `flags.test.ts` — `DASHBOARD_V2_ENABLED` / `DASHBOARD_DEV_VIEWER_ROLE` semantics, including
  production safety of the dev override.

Playwright persona tests (live operator/tenant/exec/unauthorized browser flows) are scoped as a
follow-up; they require a running API, seeded database, and persona JWT fixtures.

## Layout

```
app/
  page.tsx                          # role-based redirect to home
  (authenticated)/                  # requires viewer
    layout.tsx                      # requireViewer()
    (operator)/                     # requires admin|operator
      layout.tsx
      dashboard/page.tsx            # V3 cockpit home (KPIs + /ops/dashboard-summary)
      command-center/page.tsx
      live/page.tsx
      policy/page.tsx
      policy/builder/page.tsx      # policy pack / rule foundation (read-mostly)
      agents/page.tsx
      agents/[id]/page.tsx
      simulate/page.tsx
      backtest/page.tsx
      anchors-health/page.tsx
      webhooks/page.tsx
      cost/page.tsx
      legacy/page.tsx               # preserved legacy root
    (exec)/                         # requires admin|operator|exec
      overview/page.tsx
    (tenant)/                       # requires admin|operator|tenant
      home/page.tsx
    rails/page.tsx                  # any authenticated
  api/events/stream/route.ts        # hardened SSE proxy
  forbidden/page.tsx
  login/page.tsx
  (legacy root pages — refreshed with ui/* primitives)
    intents/ executions/ wallets/ simulations/ adapters/
    anchors/ templates/ ops/ routes/

components/
  Shell.tsx                         # role-aware layout shell
  ui/                               # Card, Kpi, StatusPill, PageHeader, ...
  command-center/                   # Command Center widgets
  charts/VolumeTrend.tsx            # pure-SVG sparkline
  LiveExecutionStream.tsx           # client SSE consumer
  ActivityFeed.tsx                 # compact audit list for dashboard home

lib/
  auth.ts                           # getViewer, requireRole, requireScope
  permissions.ts                    # Role, Capability, Viewer types + helpers
  flags.ts                          # server-side feature flags
  nav.ts                            # role-gated nav registry
  api.ts                            # fetchJson/postJson helpers
  dashboard-summary.ts              # types for GET /ops/dashboard-summary payload
  format.ts                         # formatDateTime/Number/shortId

docs/
  dashboard-v2-contract.md          # Phase 0 contract & security audit
```
