# Dashboard UI Integration Plan

This is a planning document only. Phase 10 does not modify `apps/dashboard` source code.

## Current Dashboard Shape

The dashboard is a Next.js 15 app in `apps/dashboard` with the App Router, Tailwind CSS, local
component primitives, and role-aware server layouts. The root layout in
`apps/dashboard/app/layout.tsx` loads Google fonts, resolves the viewer server-side, issues a CSRF
token, builds role-scoped navigation, and wraps all pages in `components/Shell.tsx`.

The dashboard has two generations of surfaces:

- Legacy/shared platform routes: `/intents`, `/executions`, `/simulations`, `/adapters`, `/anchors`,
  `/ops`, `/routes`, `/wallets`, `/templates`.
- V2 role-gated routes under `app/(authenticated)`: `/command-center`, `/live`, `/agents`,
  `/policy`, `/simulate`, `/backtest`, `/anchors-health`, `/webhooks`, `/cost`, `/overview`,
  `/home`, and `/rails`.

`DASHBOARD_V2_ENABLED` is a server-only rollout flag. V2 pages use `requireV2Enabled()`, role
layouts call `requireRole()`, and protected pages call `requireScope()`. These guards must remain
server-owned.

## Styling And Component Inventory

Dashboard styling is light, operational, and Keeta-token based. The canonical CSS variables live in
`apps/dashboard/app/globals.css`:

- `--keeta-bg-warm`, `--keeta-surface`, `--keeta-ink`, `--keeta-muted`
- `--keeta-line`, `--keeta-accent`, `--keeta-accent-deep`
- state colors for danger, warning, and success
- alias-first `--hub-*` variables for existing components

Local primitives live in `apps/dashboard/components/ui`:

- `Button`
- `Card`
- `EmptyState`
- `Kpi` and `KpiGrid`
- `PageHeader` and `SectionHeader`
- `StatusPill`

Shared components outside `components/ui` include `DataTable`, `StatusCard`, `ActivityFeed`,
`LiveExecutionStream`, `Shell`, command-center cards, and charts.

`packages/ui` currently targets the public dark web surface. It exports useful primitives (`Button`,
`Card`, `Badge`, `StatusPill`, `MetricCard`, `Terminal`, `CodeBlock`, `FeatureCard`, `Accordion`,
`Marquee`, `Container`, `Section`) and tokens, but its components assume dark classes such as
`bg-panel`, `text-white`, and `border-white/10`. It should not be dropped directly into dashboard
pages without a light-theme compatibility pass.

## What Can Be Safely Replaced Later

Use an adapter-first approach. Keep dashboard imports stable while swapping implementation details
internally.

Safe candidates:

- `apps/dashboard/components/ui/Button.tsx` can be aligned with `packages/ui` API concepts after
  dashboard-specific variants are preserved: `primary`, `secondary`, `ghost`, `danger`, `sm`, `md`,
  `lg`, icons, and `fullWidth`.
- `apps/dashboard/components/ui/Card.tsx` can adopt shared radius, motion, and shadow tokens while
  keeping dashboard-only header props: `title`, `kicker`, `description`, and `actions`.
- `apps/dashboard/components/ui/StatusPill.tsx` can share state-tone naming with `packages/ui`, but
  must preserve dashboard tones: `neutral`, `info`, `success`, `warning`, `danger`, and `accent`.
- `apps/dashboard/components/ui/Kpi.tsx` can reuse tokenized typography, spacing, and trend
  semantics from `packages/ui/MetricCard`.
- `EmptyState`, `PageHeader`, and `SectionHeader` can move to shared package only after
  `packages/ui` supports dashboard light-theme tokens.
- Repeated table wrappers can be consolidated later into a shared dashboard `DataTable` primitive,
  but not into `packages/ui` until both web and dashboard need the same table contract.

Recommended first replacement is token adoption, not component deletion:

1. Import design tokens from `@keeta-agent-stack/ui` where Tailwind or CSS can consume them safely.
2. Keep dashboard component filenames and exports.
3. Refactor local component internals one at a time.
4. Only move a primitive into `packages/ui` after both apps use the same semantics.

## What Should Not Be Touched

Do not replace or casually refactor these pieces during UI integration:

- `apps/dashboard/app/layout.tsx`: owns viewer resolution, CSRF issue, nav, and shell composition.
- `apps/dashboard/lib/auth.ts`: fail-closed role and scope parsing.
- `apps/dashboard/lib/csrf.ts` and `apps/dashboard/lib/csrf-public.ts`: mutation protection.
- `apps/dashboard/app/api/events/stream/route.ts`: hardened server-side SSE proxy that keeps
  `OPS_API_KEY` out of the browser.
- `apps/dashboard/app/api/ops/kill-switch/*`: guarded mutation placeholder.
- `apps/dashboard/scripts/lint-security.ts` and `apps/dashboard/scripts/check-duplicate-routes.ts`:
  security and route guards.
- Any route-level `requireRole()`, `requireScope()`, or `requireV2Enabled()` call.
- Any server-only env var path, especially `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, signing seeds,
  private keys, or service credentials.

## Dependency Risks

`packages/ui` currently depends on Tailwind utility class names and `tailwind-merge`. Dashboard
already uses Tailwind, but the public UI package is dark-theme oriented. The main risk is visual
regression from importing dark components into a light operator app.

Other risks:

- Adding client components where server components currently fetch data can increase bundle size and
  weaken streaming/server data boundaries.
- Replacing local `Button` with `packages/ui/Button` would change link support, rounded corners,
  focus ring offset color, and text contrast.
- Replacing `StatusPill` directly would change the prop contract from `tone` to `status`.
- Shared motion from the public web app may be too expressive for an operations dashboard; dashboard
  motion should remain sparse and state-driven.
- Tailwind class availability must be checked if `packages/ui` classes use names not present in
  dashboard theme extensions.

## Migration Order

1. Add a dashboard light-theme compatibility section to `packages/ui` without changing dashboard
   imports.
2. Add focused visual regression screenshots for high-traffic dashboard routes: `/command-center`,
   `/live`, `/routes`, `/simulations`, `/executions`, `/anchors`, `/adapters`, `/agents`,
   `/overview`, and `/home`.
3. Refactor `apps/dashboard/components/ui/Button.tsx` internals to shared token values while
   preserving its public props.
4. Refactor `StatusPill` tone colors to shared state tokens.
5. Refactor `Kpi` and `Card` spacing, border radius, and shadow values to shared tokens.
6. Add a dashboard-only `DataTable` accessibility pass before considering a shared table primitive.
7. Only after the local exports are stable, evaluate whether any primitive should be imported
   directly from `@keeta-agent-stack/ui`.

## Rollback Strategy

Keep each primitive migration in a separate commit. Because dashboard pages should continue
importing from `apps/dashboard/components/ui`, rollback should usually mean reverting one component
implementation file rather than every page.

Rollback triggers:

- Authenticated routes lose role gating or redirect behavior.
- `/api/events/stream` opens a direct browser connection to the upstream API.
- Any secret-like env var appears in client code or `NEXT_PUBLIC_*`.
- Lighthouse or Playwright screenshots show text overlap, invisible focus states, or contrast
  regressions.
- Bundle size rises meaningfully from UI-only work.

## Test Plan

Run these after each future UI integration slice:

```bash
pnpm --filter @keeta-agent-stack/dashboard lint
pnpm --filter @keeta-agent-stack/dashboard typecheck
pnpm --filter @keeta-agent-stack/dashboard build
pnpm --filter @keeta-agent-stack/dashboard test
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke checks:

- Anonymous viewer redirects to `/login`.
- Dev viewer roles route to the expected role home.
- `DASHBOARD_V2_ENABLED=false` hides and 404s V2-only surfaces.
- Keyboard navigation reaches sidebar links, search results, buttons, and forms.
- Focus rings are visible on light surfaces.
- `/live` still connects only through `/api/events/stream`.

## Future Cursor Prompts

### Prompt 1: Token-Only Alignment

```md
You are working in the existing TypeScript/pnpm/Turbo monorepo. This is not WordPress. Do not create
PHP or WordPress files.

Goal: align `apps/dashboard` local UI primitives with shared design tokens without changing
dashboard page imports or auth/data behavior.

Allowed touch set:

- apps/dashboard/components/ui/
- apps/dashboard/app/globals.css
- packages/ui/src/tokens/
- docs/dashboard/

Do not touch dashboard routes, auth, API proxies, or data fetching. Preserve all exported component
names and prop contracts. Run dashboard lint/typecheck/build/test and document results.
```

### Prompt 2: Safe Primitive Refactor

```md
Goal: refactor `apps/dashboard/components/ui/Button.tsx` and `StatusPill.tsx` to use shared token
values while preserving their current dashboard props and visual contrast.

Allowed touch set:

- apps/dashboard/components/ui/Button.tsx
- apps/dashboard/components/ui/StatusPill.tsx
- apps/dashboard/tests/
- docs/dashboard/

Do not import dark public-web components directly. Do not change pages. Add or update tests only if
existing test conventions support it. Run dashboard lint/typecheck/build/test.
```

### Prompt 3: Page-Level UI Smoke

```md
Goal: add dashboard UI smoke tests for core routes before visual refactors.

Allowed touch set:

- apps/dashboard/tests/
- apps/dashboard/package.json additive only if a script is missing
- docs/dashboard/

Do not modify dashboard source components or pages. Cover `/command-center`, `/live`, `/routes`,
`/simulations`, `/executions`, `/anchors`, and `/adapters` under a dev viewer role. Run dashboard
test plus lint/typecheck/build.
```
