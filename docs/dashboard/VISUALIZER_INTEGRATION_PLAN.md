# Dashboard Visualizer Integration Plan

This is a planning document only. Phase 10 does not modify `apps/dashboard` source code.

## Current Visualizer Package

`packages/visualizer` exports server-safe demo data from `src/index.ts` and client visual components
from `src/client.ts`.

Client exports:

- `AgentNetworkHero`
- `IntentPipeline`
- `RouteGraph`
- `PolicyGate`
- `SimulationConsole`
- `ExecutionTimeline`
- `SettlementRailMap`
- `LiveMetricsTicker`
- `useAnimatedNumber`
- `usePipelineDemo`
- `useReducedMotionSafe`

The components are built with React, Framer Motion, and `@keeta-agent-stack/ui` dark-theme
utilities. They already respect reduced motion in their own hooks, but the dashboard must still
avoid importing them into server components directly. Use small dashboard-local client wrappers.

## Dashboard Pages That Could Benefit

Best first candidates:

- `/command-center`: replace or augment `PipelineFunnel` with a dashboard-safe pipeline visual once
  it can accept live counts and route lifecycle state.
- `/live`: add a compact `ExecutionTimeline` panel next to `LiveExecutionStream` after mapping SSE
  events to timeline steps.
- `/simulate`: add `SimulationConsole` for the selected recent simulation or selected scenario
  preset.
- `/routes`: add `RouteGraph` for the selected recent route plan once API route payloads are mapped
  into visualizer hop/quote props.
- `/executions`: add `ExecutionTimeline` for recent execution lifecycle state.
- `/anchors` or `/anchors-health`: add `SettlementRailMap` only after its data contract supports
  anchor readiness, bond verification, and operator health.
- `/agents` and `/agents/[id]`: add `PolicyGate` or `IntentPipeline` to show agent policy posture
  and recent lifecycle activity.

Lower-priority candidates:

- `/overview`: `LiveMetricsTicker` may fit executive KPI strips, but only after the dark visual
  style has a light dashboard variant.
- `/home`: tenant workspace should remain calm and data-first; use visualizers sparingly.

## Data Mapping Required

Do not feed arbitrary API payloads directly into visualizer components. Create typed dashboard
mapper functions first.

Recommended future files:

- `apps/dashboard/components/visualizers/DashboardIntentPipeline.tsx`
- `apps/dashboard/components/visualizers/DashboardRouteGraph.tsx`
- `apps/dashboard/components/visualizers/DashboardPolicyGate.tsx`
- `apps/dashboard/components/visualizers/DashboardSimulationConsole.tsx`
- `apps/dashboard/lib/visualizer-mappers.ts`

Mapping targets:

- Intent and execution lifecycle records to `PipelineStageMeta` or a dashboard-specific pipeline
  prop.
- Route plan payloads to `DemoRouteHop[]` and `DemoQuote[]`, or a new non-demo route graph contract
  in `packages/visualizer`.
- Policy decision records to `DemoPolicyCheck[]` and a normalized decision value.
- Simulation records and scenario output to `DemoSimulationLine[]`.
- Adapter and anchor health rows to a settlement rail map contract.

If the existing `Demo*` types are too demo-specific, extend `packages/visualizer` with neutral prop
types instead of redefining route, policy, or receipt types in the dashboard.

## What Can Be Safely Added Later

Safe additions:

- Client wrapper components under `apps/dashboard/components/visualizers/`.
- Pure mapper functions under `apps/dashboard/lib/`.
- New optional props in `packages/visualizer` that allow light-theme classes, compact density, or
  dashboard-provided labels.
- New visualizer tests in `packages/visualizer` if props become less demo-only.
- Page-level visualizer panels that sit inside existing dashboard `Card` components.

Keep the existing dashboard tables as the source of truth during the first integration. Visualizers
should summarize and explain; they should not replace audit-critical rows until operators have
feature parity.

## What Should Not Be Touched

Do not change these during visualizer integration:

- Role and scope guards in layouts or pages.
- `apps/dashboard/lib/api.ts` fetch behavior without a dedicated API phase.
- `/api/events/stream` proxy behavior.
- `LiveExecutionStream` connection target. It must remain relative `/api/events/stream`.
- Server-only env var usage.
- Core dashboard route structure.
- Existing tables for executions, simulations, routes, adapters, anchors, and webhooks.

Do not import `@keeta-agent-stack/visualizer/client` directly from a server page. Use a
dashboard-local `'use client'` wrapper and pass already-fetched, serialized props from the server
page.

## Dependency Risks

`packages/visualizer` currently uses Framer Motion. The public web app already uses it, but the
dashboard does not list `framer-motion` directly. Because workspace package dependency resolution
may hide this locally, future work must confirm the dashboard production build resolves the package
cleanly through `@keeta-agent-stack/visualizer`.

Other risks:

- Dark visualizer components may clash with the light dashboard surface.
- Demo defaults can mislead operators if rendered without live data labels.
- Motion can distract from operational triage if placed above actionable tables.
- Client wrappers can increase bundle size on high-traffic dashboard routes.
- API route payloads vary by endpoint; mapper functions need validation and fallbacks.

## Migration Order

1. Add dashboard-local visualizer wrappers with hardcoded safe demo props in a hidden or docs-only
   story route, not production nav.
2. Add mapper functions for one page only: start with `/command-center` because it already has a
   `PipelineFunnel` abstraction and aggregated counts.
3. Add a compact dashboard visualizer variant to `packages/visualizer` if light styling cannot be
   achieved with `className`.
4. Place the visualizer inside an existing `Card`, below the `PageHeader`, and keep current KPIs and
   tables.
5. Repeat for `/simulate` with `SimulationConsole`.
6. Repeat for `/routes` with `RouteGraph`.
7. Repeat for `/live` with event-derived `ExecutionTimeline`, keeping `LiveExecutionStream` as the
   authoritative feed.
8. Add visual regression tests after each page integration.

## Rollback Strategy

Each page integration should be isolated to one wrapper, one mapper, and one page insertion.
Rollback should be a single commit revert or removal of the page insertion while leaving mapper
tests in place if useful.

Feature-flag high-traffic visualizer panels behind a server-only dashboard flag if they are not
ready for all operators:

```txt
DASHBOARD_VISUALIZERS_ENABLED=true
```

Do not expose this as `NEXT_PUBLIC_*`. Resolve it server-side and pass a boolean prop to client
wrappers.

Rollback triggers:

- Dashboard build adds unexpected client bundle weight.
- Visualizer renders demo data without an explicit demo/preview label.
- Reduced-motion users still see packet movement or looping animation.
- Operator tables become harder to scan.
- `/live` loses SSE reconnect, pause, clear, or filtering behavior.

## Test Plan

Future visualizer work should run:

```bash
pnpm --filter @keeta-agent-stack/visualizer lint
pnpm --filter @keeta-agent-stack/visualizer typecheck
pnpm --filter @keeta-agent-stack/visualizer build
pnpm --filter @keeta-agent-stack/dashboard lint
pnpm --filter @keeta-agent-stack/dashboard typecheck
pnpm --filter @keeta-agent-stack/dashboard build
pnpm --filter @keeta-agent-stack/dashboard test
pnpm build
```

Manual checks:

- Reduced-motion mode shows static visual states.
- Keyboard navigation reaches controls before and after visual panels.
- Screen reader labels describe the summary without duplicating table content.
- No secret-bearing API payload is serialized into client props.
- All visual panels show whether data is live, preview, or demo.

## Exact Future Cursor Prompts

### Prompt 1: Command Center Pipeline Wrapper

```md
You are working in the existing TypeScript/pnpm/Turbo monorepo. This is not WordPress. Do not create
PHP or WordPress files.

Goal: add an optional dashboard-local wrapper around `@keeta-agent-stack/visualizer/client`
`IntentPipeline` for `/command-center`.

Allowed touch set:

- apps/dashboard/components/visualizers/
- apps/dashboard/lib/visualizer-mappers.ts
- apps/dashboard/app/(authenticated)/(operator)/command-center/page.tsx
- docs/dashboard/

Do not change auth, API proxy routes, dashboard nav, or server-only env vars. Keep `PipelineFunnel`
in place; add the visualizer as a supplementary panel. Use live counts already fetched by the page,
or show an explicit preview label. Respect reduced motion. Run dashboard lint/typecheck/build/test
and visualizer build.
```

### Prompt 2: Simulation Console Panel

```md
Goal: add a dashboard-local `DashboardSimulationConsole` wrapper for `/simulate`, mapping recent
simulation data into a static console summary.

Allowed touch set:

- apps/dashboard/components/visualizers/
- apps/dashboard/lib/visualizer-mappers.ts
- apps/dashboard/app/(authenticated)/(operator)/simulate/page.tsx
- docs/dashboard/

Do not post simulation jobs. Do not change API routes. Keep existing scenario cards and recent run
list. Show a preview label if data is incomplete. Run dashboard lint/typecheck/build/test.
```

### Prompt 3: Route Graph Mapper

```md
Goal: add a route graph preview to `/routes` using existing route rows and a typed mapper into
`packages/visualizer`.

Allowed touch set:

- apps/dashboard/components/visualizers/
- apps/dashboard/lib/visualizer-mappers.ts
- apps/dashboard/app/routes/page.tsx
- packages/visualizer/src/ only if existing props cannot represent live route data safely
- docs/dashboard/

Do not redefine route types in the dashboard if an existing package type can be imported. Keep the
route table as the authoritative audit surface. Run visualizer checks, dashboard checks, and root
build.
```

### Prompt 4: Live Execution Timeline

```md
Goal: add a compact execution timeline next to `LiveExecutionStream` on `/live`.

Allowed touch set:

- apps/dashboard/components/visualizers/
- apps/dashboard/components/LiveExecutionStream.tsx only if it exposes a read-only derived event
  prop/callback without changing the EventSource target
- apps/dashboard/app/(authenticated)/(operator)/live/page.tsx
- docs/dashboard/

Do not connect the browser directly to the upstream API. EventSource must remain
`/api/events/stream`. Do not expose OPS_API_KEY or other server credentials. Run dashboard
lint/typecheck/build/test and manually verify SSE fallback.
```
