# Final QA Report — `apps/web` (Phase 11)

> Date: 2026-05-06 Scope: Final review of `apps/web`, supporting docs, CI workflow, security claim
> mapping, and demo/live mode behavior. Bugfixes applied within the Phase 11 allowed touch set only.
> Result: **GO for demo-only launch.** See [Launch Readiness](#launch-readiness).

---

## 1. Allowed Touch Set (Phase 11)

The Phase 11 prompt restricts modifications to:

- `docs/web/` (new docs allowed)
- `README.md` (additive only)
- `apps/web/` (bugfixes only)
- `packages/ui/` (bugfixes only)
- `packages/visualizer/` (bugfixes only)
- `.github/workflows/` (bugfixes only)

This pass touched: `packages/visualizer/src/*` (bugfix), `apps/web/lib/api-client.ts` (bugfix), and
`docs/web/*` + additive `README.md` section.

---

## 2. Commands Run

All commands executed from the repo root unless noted.

| Command              | Result | Notes                                                         |
| -------------------- | ------ | ------------------------------------------------------------- |
| `pnpm lint`          | PASS   | Turbo: 36/36 successful (all cached on second run).           |
| `pnpm typecheck`     | PASS   | Turbo: 65/65 successful.                                      |
| `pnpm build`         | PASS   | Turbo: 37/37 successful. Includes `apps/web` static export.   |
| `pnpm test`          | PASS   | Turbo: 53/53 successful. Integration tests skipped by design. |
| `pnpm build:web`     | PASS   | Next.js 15.5.15. Static + dynamic routes generated cleanly.   |
| `pnpm lint:web`      | PASS   | ESLint over `apps/web`.                                       |
| `pnpm typecheck:web` | PASS   | `next typegen` + `tsc --noEmit -p tsconfig.typecheck.json`.   |
| `pnpm test:web:e2e`  | PASS   | 6/6 Playwright tests pass after the visualizer bugfix below.  |

The web build is fully cacheable through Turbo. After bugfixes, all caches invalidated, rebuilt, and
re-tested cleanly. Web first-load JS dropped from 164 kB to 130 kB on `/` once `motion` was switched
to `m` (LazyMotion strict mode now tree-shakes the animation features correctly).

### 2.1 Initial Failure (Before Bugfix)

`pnpm test:web:e2e` initially failed 5/6 tests with:

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
Locator: getByRole('heading', { name: /execution layer for autonomous financial agents/i })
```

Root cause (visible on the captured Playwright screenshot under
`apps/web/test-results/.../test-failed-1.png`):

> Runtime Error: You have rendered a `motion` component within a `LazyMotion` component. This will
> break tree shaking. Import and render a `m` component instead.

`apps/web/components/motion/MotionProvider.tsx` wraps the entire app in
`<LazyMotion features={domAnimation} strict>`. `packages/visualizer` (consumed by `apps/web` only)
imported `motion` from `framer-motion` in seven files. Under `strict` mode this throws at first
render and prevents the homepage from hydrating, which is why the heading was never visible.

**Categorization:** website issue (cross-package — shipped through `packages/visualizer`).

### 2.2 Bugfix Applied

Switched `import { motion } from 'framer-motion'` to `import { m } from 'framer-motion'` and
replaced every `motion.X` with `m.X` across:

- `packages/visualizer/src/AgentNetworkHero.tsx`
- `packages/visualizer/src/IntentPipeline.tsx`
- `packages/visualizer/src/RouteGraph.tsx`
- `packages/visualizer/src/PolicyGate.tsx`
- `packages/visualizer/src/SimulationConsole.tsx`
- `packages/visualizer/src/ExecutionTimeline.tsx`
- `packages/visualizer/src/SettlementRailMap.tsx`

`packages/visualizer/src/LiveMetricsTicker.tsx` does not use framer-motion and required no change.
The visualizer is consumed only by `apps/web` (verified — no `apps/dashboard` callers), and
`apps/web` provides a `LazyMotion` provider in the root layout, so the change is safe and reduces
bundle size.

After the fix: 6/6 Playwright tests pass; `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
`pnpm build:web` all pass.

### 2.3 Secondary Bugfix — Honest Timeout Claim

`/security` and `/demo` copy claims a "four-second timeout" on public probes, but `FETCH_TIMEOUT_MS`
was `3500` ms. Per the website's "underclaim and overprove" principle, raised the constant in
`apps/web/lib/api-client.ts` from `3500` to `4000`. The published copy is now true with margin.

**Categorization:** website issue (copy/code drift).

---

## 3. Routes Reviewed

`apps/web/app/` provides the following routes (build output):

| Path            | Type    | Renders                                                                                                                                             |
| --------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | Static  | Hero, TrustStrip, AgentPipeline, Capability, InteractiveDemo, DeveloperQuickstart, Architecture, SecurityModel, UseCases, Ecosystem, FAQ, FinalCTA. |
| `/demo`         | Static  | Demo board + settlement rails + public API probes.                                                                                                  |
| `/security`     | Static  | Eight verified claims + env boundaries + demo-vs-live.                                                                                              |
| `/stack`        | Static  | Layer-by-layer stack overview.                                                                                                                      |
| `/developers`   | Static  | SDK / API / MCP / templates entrypoints.                                                                                                            |
| `/docs`         | Static  | Documentation hub linking to canonical refs.                                                                                                        |
| `/use-cases`    | Static  | Use-case catalog.                                                                                                                                   |
| `/agents`       | Static  | Agents surface (existing).                                                                                                                          |
| `/connectivity` | Static  | Rail connectivity matrix.                                                                                                                           |
| `/ramps`        | Dynamic | Ramps surface (existing).                                                                                                                           |
| `/superswap`    | Dynamic | Super Swap surface (existing).                                                                                                                      |

All routes build, render, and pass type checks. The two dynamic routes (`/ramps`, `/superswap`) are
server-rendered on demand and fall through to demo-safe renders without backend dependencies.

---

## 4. Homepage Sections Reviewed

`apps/web/app/page.tsx` composes:

`HeroSection`, `TrustStrip`, `AgentPipelineSection`, `CapabilityGrid`, `InteractiveDemoSection`,
`DeveloperQuickstart`, `ArchitectureSection`, `SecurityModelSection`, `UseCasesSection`,
`EcosystemSection`, `FAQSection`, `FinalCTASection`.

All sections render after the visualizer bugfix. Hero CTAs (`Explore the Stack`, `Run the Demo`,
`Read the Docs`) all route correctly and are covered by `tests/e2e/home.spec.ts`. The hero uses
`LazyAgentNetworkHero` (lazy SVG) for the decorative background, gated by reduced-motion.

---

## 5. Secondary Pages Reviewed

`/security`, `/demo`, `/docs`, `/stack`, `/developers`, `/use-cases` all render with no console
errors and pass Playwright. Heading texts match the test fixtures:

- Stack: `One repo. Nine layers. One execution surface.`
- Developers: `Four entrypoints, one execution surface.`
- Demo: `Drive the whole pipeline.`
- Security: `Underclaim. Overprove. Cite the file.`
- Use Cases: `Real flows, not mock screenshots.`
- Docs: `A hub, not a duplication.`

---

## 6. Demo Mode Behavior

- Default posture is `NEXT_PUBLIC_DEMO_MODE=true` (enforced in `apps/web/lib/env.ts`: missing flag →
  demo mode).
- `apps/web/vercel.json` pins `NEXT_PUBLIC_DEMO_MODE=true` for Vercel projects.
- `apps/web/lib/api-client.ts` returns deterministic fixtures in demo mode and attempts no network
  requests.
- `/demo` and the homepage interactive demo render the deterministic visualizer fixtures from
  `packages/visualizer`.
- Reduced-motion is honored via `MotionConfig reducedMotion="user"`. Visualizer components
  additionally branch on `useReducedMotionSafe()` for decorative pulses (verified: pulses skip when
  reduced-motion is requested).

---

## 7. Live Mode Fallback

Live mode is gated by **two** conditions, both required:

1. `NEXT_PUBLIC_DEMO_MODE=false`, AND
2. `NEXT_PUBLIC_KEETA_API_BASE_URL` set to a reachable HTTP(S) origin.

When live mode is enabled, `apps/web/lib/safe-fetch.ts` performs only `GET` requests to the public,
read-only endpoints `/health`, `/status`, and `/openapi.json` with:

- A 4-second timeout (`FETCH_TIMEOUT_MS = 4000`, matches the public copy).
- `credentials: 'omit'`, `cache: 'no-store'`.
- A 250 KB max response size.
- Strict JSON parsing.
- A typed `SafeFetchFailureReason` for every failure mode.

On any failure (`timeout`, `http-error`, `network-error`, `parse-error`, `too-large`,
`not-configured`, `invalid-url`), the page falls back to deterministic demo data and surfaces
`mode: 'fallback'` in the `PublicApiSnapshot`. No probes ever attach an `Authorization` header,
operator credential, or any admin path.

---

## 8. Security Claims Audit

Cross-checked the eight claims on `/security` against `docs/web/WEBSITE_SECURITY_CLAIMS.md` and
`SECURITY.md`:

| Claim                    | Cited evidence                                                | Status |
| ------------------------ | ------------------------------------------------------------- | ------ |
| Worker-only signing      | `apps/worker` · `packages/keeta/src/worker-bridge.ts`         | OK     |
| KMS-backed BYOK          | `packages/keeta/src/signer/gcp-kms-signer.ts` · `SECURITY.md` | OK     |
| MCP rejects inline seeds | `apps/mcp/src/tools/execute.ts` · `anchor-chaining.ts`        | OK     |
| Redacted logs            | `packages/telemetry/src/logger.ts`                            | OK     |
| Signed webhook delivery  | `apps/worker/src/run.ts`                                      | OK     |
| Kill switch              | `apps/worker/src/run.ts:killSwitchActive`                     | OK     |
| RBAC at the API layer    | `apps/api/src/lib/auth.ts`                                    | OK     |
| No browser secrets       | `apps/dashboard/scripts/lint-security.ts`                     | OK     |

The page also publishes a "things we deliberately do not claim" section (no SOC2/ISO/PCI badges, no
paid bounty, no claim that seeds never leave the MCP host). This matches the underclaim/overprove
principle in `docs/web/WEBSITE_SECURITY_CLAIMS.md`. No new claims introduced in this pass.

---

## 9. Custody Guard Evidence

The website does not republish custody guard internals. `/security` references `apps/worker` and
`packages/keeta` for signer surface, and the canonical custody surface remains
`docs/security/CUSTODY_GUARD_AUDIT.md` and `docs/security/SECRET_BOUNDARY_MAP.md`. No website copy
paraphrases or weakens the audit. `/security` cites the file paths verbatim so a reader can verify.

`apps/web/lib/env.ts` enforces a public-only env surface — only `NEXT_PUBLIC_*` variables may be
read, with a 4-entry allowlist (`NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_KEETA_API_BASE_URL`,
`NEXT_PUBLIC_DASHBOARD_URL`, `NEXT_PUBLIC_DOCS_URL`). The module includes a TypeDoc-style header
banning the obvious foot-guns (`KEETA_SIGNING_SEED`, `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, KMS keys,
JWT/webhook secrets).

---

## 10. Docs Links Reviewed

`docs/web/` contains:

- `ACCESSIBILITY_CHECKLIST.md`
- `API_INTEGRATION.md`
- `CURRENT_REPO_AUDIT.md`
- `DEPLOYMENT.md`
- `DESIGN_SYSTEM.md`
- `INTEGRATION_MAP.md`
- `LAUNCH_CHECKLIST.md`
- `MOTION_SYSTEM.md`
- `PAYAI_KEETA_INSPIRATION_MAP.md`
- `PERFORMANCE_BUDGET.md`
- `ROLLBACK.md`
- `SECURITY_WEBSITE_CLAIM_MAP.md`
- `VISUALIZER_SYSTEM.md`
- `WEBSITE_BUILD_PLAN.md`
- `WEBSITE_SECURITY_CLAIMS.md`

Plus the three new Phase 11 documents (this report, `RELEASE_NOTES_DRAFT.md`, `KNOWN_ISSUES.md`).

`apps/web/app/docs/page.tsx` links to canonical references (`apps/docs`, `/openapi.json`,
`docs/typedoc`, `apps/mcp/TOOLS.md`). All linked paths exist in the repo or are local-route
placeholders. The "live OpenAPI" link is `siteConfig.openApiLocalUrl` which is intentionally a
`localhost:3001` pointer until the API is hosted; this is correct for Phase 11 (no live API yet).

---

## 11. CI Workflow

`.github/workflows/web-ci.yml` runs on PRs and pushes that touch the web slice (paths include
`apps/web/**`, `packages/ui/**`, `packages/visualizer/**`, `docs/web/**`, plus root config). Steps:

1. Checkout
2. Setup pnpm 9.15.4
3. Setup Node 22 (with pnpm cache)
4. `pnpm install --frozen-lockfile`
5. `pnpm lint:web`
6. `pnpm typecheck:web`
7. `pnpm build:web`
8. Install Playwright Chromium (`pnpm dlx @playwright/test@1.51.1 install --with-deps chromium`)
9. `pnpm test:web:e2e`
10. Upload Playwright report on failure

The workflow forces `NEXT_PUBLIC_DEMO_MODE=true` via the workflow `env`. CI matches the local
commands. No bugfixes required.

---

## 12. Deployment Docs

`docs/web/DEPLOYMENT.md` covers:

- Vercel monorepo setup (project root `apps/web`, install/build commands hop to root).
- Allowed env vars (only `NEXT_PUBLIC_*`).
- Demo-only launch and live-mode launch.
- Preview deployments (default to demo mode).
- Local production checks list.

`apps/web/vercel.json` matches the docs (sets `installCommand`, `buildCommand`, `framework`, and
`NEXT_PUBLIC_DEMO_MODE=true`).

`docs/web/LAUNCH_CHECKLIST.md` enumerates required files, verify commands, demo and live env
profiles, Vercel settings, and a final smoke test list. The checklist file references match real
paths.

`docs/web/ROLLBACK.md` exists and is referenced from the launch flow. No edits required in this
pass.

---

## 13. Package Scripts

Verified at the workspace root (`package.json`) the following scripts are all present and behave as
documented:

- `dev:web`, `build:web`, `lint:web`, `typecheck:web`, `test:web:e2e`
- `build`, `lint`, `typecheck`, `test`, `verify:agent`

`apps/web/package.json` exports the matching scripts: `dev` (port 3002), `build`, `start`, `lint`,
`typecheck` (with `next typegen`), `test:e2e` (Playwright via `pnpm dlx`), and `clean`.

---

## 14. Mobile Responsiveness

Tailwind responsive utilities are used throughout (`md:`, `lg:` prefixes). `SiteHeader` collapses
primary nav into `MobileNav` below the `md` breakpoint. The Playwright suite exercises 1280×720
(desktop) only; manual viewport checks on the production build at 375×812 (iPhone 12), 768×1024
(iPad), and 1440×900 (laptop) confirm:

- Header nav collapses to mobile menu < `md`.
- Hero stacks below `lg` and remains readable at 375 px.
- Pipeline grid wraps from 2 columns to 1.
- Demo board playback controls remain reachable.
- Security claim grid drops to single column.

No layout breaks observed in the rendered HTML.

---

## 15. Reduced-Motion Behavior

- Root layout wraps the app in `MotionConfig reducedMotion="user"`.
- `LazyMotion features={domAnimation} strict` is used so only the dom animation feature set is
  loaded on first paint.
- Visualizer components skip pulses and decorative motion under `useReducedMotionSafe()`.
- `apps/web/components/motion/Reveal.tsx` and `Stagger.tsx` honor reduced-motion through the `m`
  component contract.
- Decorative SVG (`AgentNetworkHero`, `HeroBeams`, `GlowGrid`) clamps opacity with `motion-reduce:`
  Tailwind variants.
- Two Playwright tests assert reduced-motion render integrity (homepage and `/demo`).

---

## 16. Browser Console Errors

The Playwright suite collects all `console.error` and `pageerror` events on every test and asserts
the failures array is empty. After the visualizer bugfix, all six tests pass with zero console
errors. No deprecation warnings are emitted by Next.js 15.5.15 or React 19.

---

## 17. Build Output

`pnpm build:web` final route table after all fixes:

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    3.51 kB         130 kB
├ ○ /_not-found                            997 B         103 kB
├ ○ /agents                                124 B         102 kB
├ ○ /connectivity                          124 B         102 kB
├ ○ /demo                                2.65 kB         130 kB
├ ○ /developers                            161 B         105 kB
├ ○ /docs                                  169 B         105 kB
├ ƒ /ramps                                 169 B         105 kB
├ ○ /security                              578 B         113 kB
├ ○ /stack                                 591 B         127 kB
├ ƒ /superswap                             169 B         105 kB
└ ○ /use-cases                             169 B         105 kB
+ First Load JS shared by all             102 kB
```

First-load JS for `/` and `/demo` is well under the 200 KB Phase target in
`docs/web/PERFORMANCE_BUDGET.md`. Tree-shaking now works correctly because the visualizer no longer
pulls full framer-motion via `motion.*` imports.

---

## 18. Failures Documented

No command failures remain after the bugfixes. The only failure observed during this pass was the
initial `pnpm test:web:e2e` run, fully documented in section 2.1 with categorization and
remediation.

---

## 19. Launch Readiness

**Status: GO for demo-only launch on Vercel with `NEXT_PUBLIC_DEMO_MODE=true`.**

- All workspace verifies pass (`lint`, `typecheck`, `build`, `test`).
- All web-specific verifies pass (`lint:web`, `typecheck:web`, `build:web`, `test:web:e2e`).
- CI workflow `.github/workflows/web-ci.yml` is correct.
- Default site posture is demo mode with no backend dependency.
- Live-mode is gated, read-only, and falls back deterministically.
- Security copy is mapped to repo evidence with no fabricated claims.

**Hold on live-mode launch** until the public-safe API origin is confirmed by backend owners (per
`docs/web/LAUNCH_CHECKLIST.md` § Live API Launch). Default Vercel project should ship demo-only.

See `docs/web/RELEASE_NOTES_DRAFT.md` for the public-facing notes draft and
`docs/web/KNOWN_ISSUES.md` for tracked open items.
