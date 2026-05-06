# Website Build Plan — Phase 1

> Implementation plan for the public marketing + product site that presents the Keeta Agent Stack.
> Phase 1 produces only documentation; the eight phases below are the sequence the future PRs must
> follow.
>
> **Allowed touch set is enforced per phase.** No PR may modify files outside its phase's allowance.
> If a real need surfaces, the PR stops and writes a conflict note in `docs/web/` instead.

---

## Reality Check (read first)

`apps/web` already exists. See `CURRENT_REPO_AUDIT.md` § 2.6 for the full inventory. The repo
currently ships:

- A working Next.js 15 + React 19 + Tailwind 3 shell.
- Five App Router routes: `/`, `/agents`, `/connectivity`, `/ramps`, `/superswap`.
- 14 components and a presets library that already build typed `ExecutionIntent` rows through the
  real router and policy engine.
- Server-only env handling (`KEETA_AGENT_API_URL` fallback).
- Tailwind palette + globals already on-brand.

Phase 2 below is therefore **not** a from-scratch scaffold. It is a non-destructive evolution: every
existing file in `apps/web/` either stays as-is or is extended in place. No file in `apps/web/` is
deleted by Phase 2. Existing routes keep working.

`packages/ui` and `packages/visualizer` do **not** exist yet. Phases 3 and 4 create them as private
workspace packages.

---

## Phase 2 — Evolve `apps/web` Scaffold

**Goal.** Bring the existing Next.js shell up to a production-ready foundation that supports a
growing site (typed env, fonts, metadata, test harness, security lint).

### Allowed touch set

- `apps/web/**` (existing files extended in place; new files added inside this folder).
- `apps/web/package.json` only to **add** dependencies and scripts — not to rename the package,
  change the port, or remove existing workspace dependencies.
- `apps/web/scripts/lint-security.ts` (new file, mirroring
  `apps/dashboard/scripts/lint-security.ts`).
- `apps/web/eslint.config.mjs` (new file, mirroring the dashboard's).
- `apps/web/vitest.config.ts` (new file).
- `apps/web/tests/**` (new folder).

### Deliverables

1. **Typed env loader** at `apps/web/lib/env.ts` that reads only the safe public envs:
   `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE`, and a new
   `NEXT_PUBLIC_WEB_LIVE_MODE` boolean (default `false`). Server-only fallbacks
   (`KEETA_AGENT_API_URL`) stay separate and never enter the client bundle.
2. **Font + metadata polish** via `next/font` (variable display + text fonts, self-hosted), shared
   `metadata` exports, OpenGraph defaults, sitemap and robots route handlers.
3. **Layout primitives** in `apps/web/components/layout/` (`Container`, `Section`, `SectionEyebrow`,
   `Footer`, expanded `Nav`).
4. **Security lint** at `apps/web/scripts/lint-security.ts` (mirror of the dashboard rule). Add
   `lint:security` script to `apps/web/package.json`.
5. **Test harness** with Vitest + Testing Library (no live network, no MSW yet). At least one render
   test for the existing `Hero`.
6. **Open-source banner** wired into the footer pointing at the repo, license, security advisories,
   and the published packages.

### Not in this phase

- Any new route.
- Any new homepage section.
- Any backend or package change.

### Done means

- `pnpm --filter @keeta-agent-stack/web build` succeeds.
- `pnpm --filter @keeta-agent-stack/web typecheck` succeeds.
- `pnpm --filter @keeta-agent-stack/web lint` succeeds.
- `pnpm --filter @keeta-agent-stack/web lint:security` succeeds.
- The five existing routes render exactly as today (visual regression — capture before/after
  screenshots).

---

## Phase 3 — `packages/ui`

**Goal.** Extract reusable presentation primitives so future website sections share a vocabulary
with the existing demo components, and so the site does not reimplement primitives that future
documentation/dev-portal apps may also need.

### Allowed touch set

- New `packages/ui/` package (new files only).
- `pnpm-workspace.yaml` — already covers `packages/*`, no change needed.
- `apps/web/package.json` — add a workspace dependency on `@keeta-agent-stack/ui`.
- `apps/web/components/**` — refactor _imports_ to use UI primitives where it is a pure substitution
  (e.g. `Button`, `Badge`, `Card`). No design changes ride along.

### Package shape

- Name: `@keeta-agent-stack/ui` (private, `0.0.1`, ESM, sideEffects `false`).
- Build: `tsup` ESM with `--dts`, mirroring `packages/sdk/package.json`.
- Test: `vitest` + Testing Library.
- Tailwind: package consumers import a shared preset from `packages/ui/tailwind/preset.ts`. The
  package itself does not emit CSS.
- Initial primitives (no business logic): `Button`, `Badge`, `Card`, `Eyebrow`, `Stat`, `Pill`,
  `Anchor`, `Code`, `Kbd`, `Callout`, `Tabs`, `DefinitionList`, plus the layout components promoted
  from Phase 2.

### Done means

- `pnpm --filter @keeta-agent-stack/ui build` succeeds.
- `pnpm --filter @keeta-agent-stack/ui test` succeeds.
- `apps/web` still builds and the existing five routes render identically (re-run the visual
  regression captures).

---

## Phase 4 — `packages/visualizer`

**Goal.** A typed, headless visualisation layer for the Intent → Quote → Route → Policy → Simulate →
Execute → Audit pipeline. The existing `RouteGraph.tsx` becomes a thin consumer of this package.

### Allowed touch set

- New `packages/visualizer/` package.
- `apps/web/components/RouteGraph.tsx` — refactored to consume the new package. Behaviour stays the
  same.
- `apps/web/package.json` — workspace dependency added.

### Package shape

- Name: `@keeta-agent-stack/visualizer` (private, `0.0.1`).
- Pure React + SVG. No `d3` global state. No canvas. No motion lib on first cut — CSS transitions
  only.
- Inputs are typed in `@keeta-agent-stack/types` shapes (already the case for `RouteGraph.tsx`).
- Components: `IntentTimeline`, `RouteHopGraph`, `PolicyDecisionTrace`, `SimulationDelta`,
  `ExecutionLadder`, `AuditTrailLane`. Each is pure presentational; data must be passed in.
- A `getDemoFixtures()` helper returns deterministic, repo-derived demo data so MDX/Storybook can
  render without live data.

### Done means

- `pnpm --filter @keeta-agent-stack/visualizer build|test` pass.
- `apps/web/` builds with the refactored `RouteGraph` and renders the same SVG output as today.

---

## Phase 5 — Homepage

**Goal.** Land the eight-section homepage rhythm from `PAYAI_KEETA_INSPIRATION_MAP.md` § 1, grounded
in repo evidence and the security claim allowlist (`WEBSITE_SECURITY_CLAIMS.md`).

### Allowed touch set

- `apps/web/app/page.tsx` (extend in place).
- `apps/web/components/home/**` (new folder).
- `apps/web/lib/metrics.ts` (new — build-time counts per `INTEGRATION_MAP.md` § 3).
- New copy strings under `apps/web/lib/copy/home.ts`.
- `packages/ui/**` if missing primitives surface during the build.
- `packages/visualizer/**` for the hero pipeline visualisation.

### Sections (in order)

1. Hero (headline + Intent → … → Audit visualisation).
2. Trust strip (open-source badge, Apache-2.0 chip, security link, MCP-ready chip).
3. Product modules (12 cards — see `INTEGRATION_MAP.md` § 2).
4. Metrics (build-time counts).
5. Ecosystem cards (Keeta network, KMS providers, MCP-compatible LLMs, Postgres/Redis, Drizzle,
   Next.js).
6. Developer CTA (3-step quickstart, link to repo).
7. FAQ (original questions; answers ground in repo files).
8. Final CTA (Run locally / Talk to maintainers).

### Done means

- The homepage builds, renders, and degrades gracefully if any build-time metric loader fails (shows
  neutral text, not a broken number).
- All copy is original (PR review per `PAYAI_KEETA_INSPIRATION_MAP.md` § 4 anti-copy checklist).
- All security-flavoured copy is grounded in `WEBSITE_SECURITY_CLAIMS.md`.

---

## Phase 6 — Secondary Pages — DELIVERED

**Status (v1).** The six required secondary pages — `/developers`, `/stack`, `/demo`, `/security`,
`/use-cases`, `/docs` — are real, responsive, and grounded in repo evidence. All workspace gates
(`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`) pass.

### Pages shipped

- **`/developers`.** SDK quickstart (`intentSnippet`) + Agent runtime quickstart
  (`agentRuntimeSnippet`, verified against `packages/agent-runtime/src/factory.ts`) + API overview
  (`apiOverviewSnippet`, references the live `/openapi.json` and Swagger at `/docs`) + MCP overview
  (`mcpSnippet`). Surface cards for SDK, Agent runtime, API, MCP. Examples catalogue with ten
  entries pulled from `examples/` and `templates/`. Explicit link to `/docs` in the hero.
- **`/stack`.** Hero + `IntentPipeline` visualizer + the seven-stage pipeline list with evidence
  paths. Reuses `CapabilityGrid`, `ArchitectureSection`, and adds a "How they fit together" panel
  for SDK / API / MCP / worker / dashboard. Per-layer mapping retained.
- **`/demo`.** New client component `components/demo/DemoPlaybackBoard.tsx` owns `usePipelineDemo`
  and exposes Play / Pause / Reset controls. Renders `IntentPipeline`, `PolicyGate`,
  `SimulationConsole`, `RouteGraph`, `DemoEventLog`, `ExecutionTimeline`, plus `SettlementRailMap`
  and `LiveMetricsTicker`. No backend calls.
- **`/security`.** Eight evidence-cited claims (each cross-referenced to a row in
  `WEBSITE_SECURITY_CLAIMS.md`), plus dedicated sections for env boundaries, demo vs live mode, and
  a "What the frontend never receives" list (seeds, OPS_API_KEY, ADMIN_BYPASS_TOKEN, KMS scopes,
  HMAC subscription secrets, infra connection strings).
- **`/use-cases`.** Rewritten to the six required entries — Treasury rebalancer, Payment-routing
  agent, Oracle-assisted settlement, Policy-gated trading agent, Operator monitoring, MCP-powered
  agent operations — each with a real evidence path.
- **`/docs`.** Acknowledges `apps/docs` exists, with the
  `pnpm --filter @keeta-agent-stack/docs build` instruction. Curated links into apps/docs, live
  OpenAPI, Typedoc HTML, MCP tools catalogue, hand-written guides (agent build handbook, SDK
  reference, capability matrix, deployment, agent payment rails, roadmap), operator docs, security
  docs, and the examples + templates trees.

### Files added in Phase 6

- `apps/web/components/demo/DemoPlaybackBoard.tsx`.
- `apps/web/content/examples-catalogue.ts`.

### Files modified in Phase 6

- `apps/web/app/{developers,stack,demo,security,use-cases,docs}/page.tsx` — full refactor per spec.
- `apps/web/content/use-cases.ts` — rewritten to the six required use cases.
- `apps/web/content/code-snippets.ts` — added `agentRuntimeSnippet` and `apiOverviewSnippet`.

### Allowed touch set (as planned)

- `apps/web/app/**` for new routes.
- `apps/web/components/**` (new shared subfolders).
- `apps/web/lib/**` for build-time loaders.
- `packages/ui/**`, `packages/visualizer/**` if a primitive is missing.

Phase 6 v1 only touched `apps/web/**` and `docs/web/**`. No changes to `packages/ui`,
`packages/visualizer`, or any other workspace package were required.

### Routes shipped vs roadmap

Shipped today: `/developers`, `/stack`, `/demo`, `/security`, `/use-cases`, `/docs`.

Deferred to a follow-up Phase 6.x:

- `/product/[slug]` deep-dive pages mapped to pillars in `INTEGRATION_MAP.md` § 2.
- `/examples` and `/examples/[slug]` standalone routes (the catalogue is currently rendered inside
  `/developers#examples`).
- `/templates` standalone route.
- `/changelog` build-time render of the root `CHANGELOG.md`.

### Done means (delivered)

- All six pages render statically (`Generating static pages (14/14)`).
- Internal nav links resolve at build time. `/docs` only links to real files (apps/docs,
  docs/typedoc, docs/\*.md, examples/, templates/).
- `/security` only restates claims with rows in `docs/web/WEBSITE_SECURITY_CLAIMS.md` and never
  amplifies them.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` all green.

### Roadmap items still owed

- Render-test coverage for the new pages (currently relies on Next's static generation pass).
- Standalone `/examples`, `/examples/[slug]`, `/templates`, `/changelog` routes.
- Build-time link checker for external links.

---

## Phase 7 — Demo / Live Integration

**Goal.** Add a small, **read-only** live mode for routes the homepage or product pages may opt
into. Off by default.

### Allowed touch set

- `apps/web/app/api/**` — only **read-only** route handlers that proxy to the public API. No writes,
  no admin routes.
- `apps/web/lib/api/**` — typed client wrappers using `@keeta-agent-stack/sdk`.
- `apps/web/components/**` — thin "live mode" affordances that fall back to demo data on any
  failure.

### Rules

- Live mode behind `NEXT_PUBLIC_WEB_LIVE_MODE=true` only.
- Public API URL via `NEXT_PUBLIC_API_URL` only.
- Failure fallback to demo presets is mandatory.
- Server-only routes never read or forward `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`,
  `KEETA_SIGNING_SEED`, or any seed/admin credential. The website lint
  (`apps/web/scripts/lint-security.ts`, added in Phase 2) blocks these names appearing in
  `apps/web/`.
- No client-side code submits an `ExecutionIntent`. Submission flows remain operator-only inside
  `apps/dashboard`.

### Done means

- With the flag off, the website performs zero network calls to the Keeta API.
- With the flag on against a public sandbox, three preset routes render live counts and the page
  degrades gracefully on any 4xx or 5xx.

---

## Phase 8 — Tests / Deployment

**Goal.** Site-level quality gates and a hosting target.

### Allowed touch set

- `apps/web/tests/**` (Vitest + Testing Library).
- `apps/web/e2e/**` (optional Playwright, behind a separate script).
- `apps/web/scripts/**` (link checker, OG-image generator, build-time metrics validator).
- A new GitHub Action under `.github/workflows/web.yml` **only after explicit approval** in a
  separate PR review. Phase 1 does not enable workflow changes.

### Done means

- `pnpm --filter @keeta-agent-stack/web test` runs render and smoke tests.
- Build-time link checker passes.
- Lighthouse CI thresholds chosen and recorded in `apps/web/README.md`: Performance ≥ 90,
  Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 — measured in CI on the homepage, `/security`,
  and `/product`.
- `axe-core` reports zero serious/critical accessibility violations on every shipped route.

---

## Phase 9 — Motion / Performance Polish

**Goal.** Light, accessible motion. No proprietary animation choreography copied from any external
site.

### Allowed touch set

- `apps/web/components/**`, `apps/web/lib/motion.ts`.
- `packages/ui/**` only if primitives need motion props.

### Rules

- Respect `prefers-reduced-motion` on every animation.
- 200–300ms hover transitions, 400–600ms enter transitions, no parallax, no auto-playing video.
- LCP target ≤ 2.5s on mid-tier mobile, INP ≤ 200ms, CLS ≤ 0.1.
- All hero / above-the-fold imagery uses `next/image` with explicit width/height. No raster assets
  above 200 KB.

### Done means

- Lighthouse mobile run on the homepage hits the targets.
- `prefers-reduced-motion` page render captured in tests.
- No new third-party JS dependency exceeding 30 KB minified.

---

## Cross-Phase Definition of Done

Phases 2 onward additionally must pass:

1. `pnpm format:check` clean for the touched paths.
2. `pnpm typecheck` workspace-wide passes.
3. `pnpm lint` workspace-wide passes.
4. `pnpm test` workspace-wide passes.
5. `pnpm build` workspace-wide passes.
6. The `apps/web/scripts/lint-security.ts` rule passes.
7. Security claims trace to rows in `WEBSITE_SECURITY_CLAIMS.md`.
8. No file outside the phase's allowed touch set is modified.

---

## Out of Scope for This Plan

The following are **not** website work and the build plan does not authorise PRs to touch them:

- Any change inside `apps/api`, `apps/worker`, `apps/mcp`, `apps/dashboard`, `apps/docs` source.
- Any change inside `packages/*` other than the new `ui` and `visualizer` packages, and only when
  their work explicitly calls for it.
- Any change to `examples/*`, `templates/*`, `starter-agent-template/`, `infrastructure/`,
  `scripts/`, `Dockerfile`, or `docker-compose*.yml`.
- Any rename of an existing package or app.
- Any change to root `package.json` scripts (the website ships through
  `pnpm --filter @keeta-agent-stack/web ...` already).
- Any change to `pnpm-workspace.yaml` (it already covers `packages/*`).
- Any change to `turbo.json` (the existing tasks cover the new packages and app).
- Any new `NEXT_PUBLIC_*` env name matching `KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL`.
- Any addition of compliance / audit / certification badges.
- Any third-party tracking script.
